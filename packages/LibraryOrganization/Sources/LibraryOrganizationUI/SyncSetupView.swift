import SwiftUI
import LibraryOrganization


/// A deliberate login step before the existing backup and merge review flow.
public struct SyncSetupView: View {
    private let available: Bool
    private let connect: @MainActor () async throws -> SyncLabSession
    @State private var session: SyncLabSession?
    @State private var working = false
    @State private var failure: String?
    @Environment(\.dismiss) private var dismiss
    public init(available: Bool, connect: @escaping @MainActor () async throws -> SyncLabSession) {
        self.available = available; self.connect = connect
    }
    public var body: some View {
        NavigationStack {
            Form {
                Section("Mac・iPhoneの整理情報を同期") {
                    Text("フォルダ・所属・タグ・まとめを同じアカウントで共有します。資料本体は引き続きS3から読み込みます。")
                    Text("ログイン後、管理データを自動バックアップし、統合件数と競合を確認してから開始します。")
                    Text("通常は全端末合計で1時間に5回まで。失敗時は送信待ちを残し、待機後に再試行できます。")
                }
                if !available {
                    Section { Text("接続準備中です。AWS構成と料金の確認・適用が完了すると利用できます。現在の本棚はそのまま使えます。") }
                }
                if let failure { Text(failure).foregroundStyle(.red) }
                Button(working ? "ログインを確認中…" : "ログインして統合内容を確認") {
                    working = true; failure = nil
                    Task { @MainActor in
                        defer { working = false }
                        do { session = try await connect() }
                        catch { failure = "接続できませんでした。ログインまたは接続設定を確認して再試行してください。現在の整理情報は保持しています。" }
                    }
                }.disabled(!available || working)
                Text("バックアップはこの端末の管理JSONだけです。復元は同期を停止してこの端末に適用し、他の端末やS3を巻き戻しません。") .font(.caption)
            }
            .navigationTitle("整理情報の同期")
            .toolbar { Button("閉じる") { dismiss() }.disabled(working) }
            .sheet(item: $session) { SyncLabView(session: $0) }
        }
        #if os(macOS)
        .frame(minWidth: 620, minHeight: 440)
        #endif
    }
}

extension OrganizationOIDCConfiguration {
    /// Release configuration is bundled with the reviewed app; no user-supplied host field.
    public static func bundled(_ bundle: Bundle = .main) throws -> OrganizationOIDCConfiguration? {
        guard bundle.object(forInfoDictionaryKey: "OrganizationSyncEnabled") as? Bool == true else { return nil }
        func value(_ key: String) throws -> String {
            guard let value = bundle.object(forInfoDictionaryKey: key) as? String, !value.isEmpty else { throw OrganizationConnectionError.invalidEndpoint }; return value
        }
        guard let issuer = URL(string: try value("OrganizationIssuer")), let domain = URL(string: try value("OrganizationDomain")), let api = URL(string: try value("OrganizationAPI")) else { throw OrganizationConnectionError.invalidEndpoint }
        return try .init(issuer: issuer, domain: domain, api: api, clientID: value("OrganizationClientID"), redirect: value("OrganizationCallback"))
    }
}
