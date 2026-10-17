import Foundation
import AuthenticationServices
import CryptoKit
import Security
import LibraryOrganization
#if os(macOS)
import AppKit
#else
import UIKit
#endif

public struct OrganizationOIDCConfiguration: Sendable {
    public let issuer: URL, domain: URL, api: URL
    public let clientID: String, redirect: String
    public init(issuer: URL, domain: URL, api: URL, clientID: String, redirect: String) throws {
        guard issuer.absoluteString.range(of: "^https://cognito-idp\\.ap-northeast-1\\.amazonaws\\.com/ap-northeast-1_[A-Za-z0-9]+$", options: .regularExpression) != nil,
              domain.scheme == "https", domain.host?.hasSuffix(".auth.ap-northeast-1.amazoncognito.com") == true,
              domain.user == nil, domain.password == nil, domain.port == nil, domain.query == nil, domain.fragment == nil, domain.path.isEmpty || domain.path == "/",
              ["zukanbookshelf://oauth/callback", "presentationviewer://oauth/callback"].contains(redirect), !clientID.isEmpty else { throw OrganizationConnectionError.invalidEndpoint }
        guard api.scheme == "https", api.host != nil, api.user == nil, api.password == nil,
              api.query == nil, api.fragment == nil, api.path.isEmpty || api.path == "/" else { throw OrganizationConnectionError.invalidEndpoint }
        self.issuer = issuer; self.domain = domain; self.api = api; self.clientID = clientID; self.redirect = redirect
    }
    var account: String { SHA256.hash(data: Data([issuer.absoluteString, api.absoluteString, clientID].joined(separator: "\n").utf8)).map { String(format: "%02x", $0) }.joined() }
}
public enum OrganizationPKCE {
    public static func random() throws -> String {
        var bytes = [UInt8](repeating: 0, count: 32)
        guard SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess else { throw OrganizationConnectionError.authentication }
        return base64(Data(bytes))
    }
    private static func base64(_ value: Data) -> String { value.base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "") }
    public static func challenge(_ verifier: String) -> String { base64(Data(SHA256.hash(data: Data(verifier.utf8)))) }
    public static func code(_ callback: URL, redirect: String, state: String) throws -> String {
        guard var parts = URLComponents(url: callback, resolvingAgainstBaseURL: false), let query = parts.queryItems else { throw OrganizationConnectionError.authentication }
        parts.query = nil
        guard parts.string == redirect, callback.fragment == nil, query.count == 2,
              query.filter({ $0.name == "state" }).map(\.value) == [state],
              let code = query.first(where: { $0.name == "code" })?.value, !code.isEmpty else { throw OrganizationConnectionError.authentication }
        return code
    }
}
/// Explicit user login only. Refresh never opens a browser. Credentials stay in Keychain.
@MainActor public final class OrganizationOIDC: NSObject, ASWebAuthenticationPresentationContextProviding {
    private struct Tokens: Codable { var access: String; var refresh: String; var expires: Date; var subject: String }
    public let config: OrganizationOIDCConfiguration
    private var tokens: Tokens?
    private var browser: ASWebAuthenticationSession?
    private var refreshing: Task<OrganizationAccess, Error>?
    private var generation = UUID()
    private let session: URLSession
    public var subject: String? { tokens?.subject }
    private var query: [String: Any] { [kSecClass as String:kSecClassGenericPassword, kSecAttrService as String:"jp.zukan.organization.oidc", kSecAttrAccount as String:config.account] }
    public init(config: OrganizationOIDCConfiguration) throws {
        self.config = config
        let settings = URLSessionConfiguration.ephemeral; settings.httpShouldSetCookies = false; settings.urlCache = nil; settings.timeoutIntervalForRequest = 15
        session = URLSession(configuration: settings, delegate: OIDCNoRedirect(), delegateQueue: nil)
        super.init()
        var q = query; q[kSecReturnData as String] = true; q[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?; let status = SecItemCopyMatching(q as CFDictionary, &result)
        if status == errSecSuccess, let data = result as? Data { tokens = try JSONDecoder().decode(Tokens.self, from: data) }
        else if status != errSecItemNotFound { throw OrganizationConnectionError.authentication }
    }
    private func save(_ value: Tokens) throws {
        let attrs:[String:Any] = [kSecValueData as String:try JSONEncoder().encode(value), kSecAttrAccessible as String:kSecAttrAccessibleWhenUnlockedThisDeviceOnly]
        let status = SecItemUpdate(query as CFDictionary, attrs as CFDictionary)
        if status == errSecItemNotFound { guard SecItemAdd(query.merging(attrs) { _,new in new } as CFDictionary,nil) == errSecSuccess else { throw OrganizationConnectionError.authentication } }
        else if status != errSecSuccess { throw OrganizationConnectionError.authentication }
        tokens = value
    }
    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        #if os(macOS)
        NSApplication.shared.keyWindow ?? ASPresentationAnchor()
        #else
        UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.flatMap(\.windows).first(where: \.isKeyWindow) ?? ASPresentationAnchor()
        #endif
    }
    public func login() async throws {
        guard browser == nil, refreshing == nil else { throw OrganizationConnectionError.authentication }
        let expected = generation
        let verifier = try OrganizationPKCE.random(), state = try OrganizationPKCE.random()
        var parts = URLComponents(url: config.domain.appendingPathComponent("oauth2/authorize"), resolvingAgainstBaseURL: false)!
        parts.queryItems = ["response_type":"code", "client_id":config.clientID,"redirect_uri":config.redirect,"scope":"openid diagram-library/read diagram-library/organization.sync","state":state,"code_challenge_method":"S256","code_challenge":OrganizationPKCE.challenge(verifier)].map { URLQueryItem(name: $0.key,value: $0.value) }
        defer { browser = nil }
        let callback: URL = try await withCheckedThrowingContinuation { continuation in
            browser = ASWebAuthenticationSession(url: parts.url!, callbackURLScheme: URL(string: config.redirect)!.scheme) { url,error in
                if let url { continuation.resume(returning: url) } else { continuation.resume(throwing: error ?? OrganizationConnectionError.authentication) }
            }
            browser?.presentationContextProvider = self; browser?.prefersEphemeralWebBrowserSession = true
            if browser?.start() != true { browser = nil; continuation.resume(throwing: OrganizationConnectionError.authentication) }
        }
        browser = nil
        let code = try OrganizationPKCE.code(callback, redirect: config.redirect, state: state)
        let value = try await exchange(["grant_type":"authorization_code","client_id":config.clientID,"redirect_uri":config.redirect,"code":code,"code_verifier":verifier], old: nil)
        guard expected == generation, !Task.isCancelled else { throw OrganizationConnectionError.authentication }
        generation = UUID(); try save(value)
    }
    private func exchange(_ values: [String:String], old: Tokens?) async throws -> Tokens {
        var request = URLRequest(url: config.domain.appendingPathComponent("oauth2/token")); request.httpMethod = "POST"
        var form = URLComponents(); form.queryItems = values.map { URLQueryItem(name: $0.key,value: $0.value) }
        request.httpBody = Data((form.percentEncodedQuery ?? "").replacingOccurrences(of: "+", with: "%2B").utf8); request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        let (data,response) = try await session.data(for: request)
        struct Reply: Decodable { var access_token: String; var refresh_token: String?; var expires_in: Int; var token_type: String }
        guard (response as? HTTPURLResponse)?.statusCode == 200, data.count <= 100000 else { throw OrganizationConnectionError.authentication }
        let reply = try JSONDecoder().decode(Reply.self, from: data)
        guard reply.token_type.lowercased() == "bearer", (1...86400).contains(reply.expires_in), !reply.access_token.isEmpty, let refresh = reply.refresh_token ?? old?.refresh, !refresh.isEmpty else { throw OrganizationConnectionError.authentication }
        var identityRequest = URLRequest(url: config.api.appendingPathComponent("v1/me")); identityRequest.setValue("Bearer " + reply.access_token, forHTTPHeaderField: "Authorization")
        let (bytes, identityResponse) = try await session.data(for: identityRequest)
        struct Identity: Decodable { var issuer: String; var subject: String }
        guard (identityResponse as? HTTPURLResponse)?.statusCode == 200, bytes.count <= 100000 else { throw OrganizationConnectionError.authentication }
        let identity = try JSONDecoder().decode(Identity.self, from: bytes)
        guard identity.issuer == config.issuer.absoluteString, !identity.subject.isEmpty, old == nil || old?.subject == identity.subject else { throw OrganizationConnectionError.accountChanged }
        return Tokens(access: reply.access_token, refresh: refresh, expires: Date().addingTimeInterval(Double(reply.expires_in)), subject: identity.subject)
    }
    public func access(forceRefresh: Bool = false) async throws -> OrganizationAccess {
        guard let old = tokens else { throw OrganizationConnectionError.authentication }
        if !forceRefresh, old.expires > Date().addingTimeInterval(60) { return OrganizationAccess(token: old.access, issuer: config.issuer.absoluteString, subject: old.subject) }
        if let refreshing { return try await refreshing.value }
        let expected = generation
        let task = Task { @MainActor in
            let updated = try await self.exchange(["grant_type":"refresh_token","client_id":self.config.clientID,"refresh_token":old.refresh], old: old)
            guard expected == self.generation, !Task.isCancelled else { throw OrganizationConnectionError.authentication }
            try self.save(updated); return OrganizationAccess(token: updated.access, issuer: self.config.issuer.absoluteString, subject: updated.subject)
        }
        refreshing = task; defer { refreshing = nil }; return try await task.value
    }
    public func connection() throws -> AuthenticatedSyncConnection {
        guard let subject else { throw OrganizationConnectionError.authentication }
        return try AuthenticatedSyncConnection(baseURL: config.api, issuer: config.issuer.absoluteString, subject: subject) { [weak self] refresh in
            guard let self else { throw OrganizationConnectionError.authentication }; return try await self.access(forceRefresh: refresh)
        }
    }
    public func logout() throws {
        generation = UUID(); refreshing?.cancel(); refreshing = nil; browser?.cancel(); browser = nil
        let status = SecItemDelete(query as CFDictionary); guard status == errSecSuccess || status == errSecItemNotFound else { throw OrganizationConnectionError.authentication }; tokens = nil
    }
}
private final class OIDCNoRedirect: NSObject, URLSessionTaskDelegate, @unchecked Sendable {
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) { completionHandler(nil) }
}
