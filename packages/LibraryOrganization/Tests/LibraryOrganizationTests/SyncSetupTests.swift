import XCTest
import LibraryOrganizationUI

final class SyncSetupTests: XCTestCase {
    func testBundledActivationRequiresExplicitFlagAndCompleteFixedConfiguration() throws {
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".bundle")
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: folder) }
        func bundle(_ values: [String: Any]) throws -> Bundle {
            // A fresh path avoids Foundation's Info.plist cache between cases.
            let root = folder.appendingPathComponent(UUID().uuidString + ".bundle")
            try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
            let data = try PropertyListSerialization.data(fromPropertyList: values, format: .xml, options: 0)
            try data.write(to: root.appendingPathComponent("Info.plist"))
            return try XCTUnwrap(Bundle(path: root.path))
        }
        XCTAssertNil(try OrganizationOIDCConfiguration.bundled(bundle([:])))
        XCTAssertNil(try OrganizationOIDCConfiguration.bundled(bundle(["OrganizationSyncEnabled":false])))
        XCTAssertThrowsError(try OrganizationOIDCConfiguration.bundled(bundle(["OrganizationSyncEnabled":true])))
        var values: [String:Any] = ["OrganizationSyncEnabled":true,"OrganizationIssuer":"https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_Test","OrganizationDomain":"https://test.auth.ap-northeast-1.amazoncognito.com","OrganizationAPI":"https://api.example","OrganizationClientID":"reviewed-mac-client","OrganizationCallback":"zukanbookshelf://oauth/callback"]
        XCTAssertEqual(try OrganizationOIDCConfiguration.bundled(bundle(values))?.clientID,"reviewed-mac-client")
        values["OrganizationAPI"] = "http://127.0.0.1:9999"
        XCTAssertThrowsError(try OrganizationOIDCConfiguration.bundled(bundle(values)))
    }
}
