import Foundation
import LibraryOrganization

/// Counts settings, not files or bytes. One tag is one setting.
public struct SyncChangeCounts: Equatable {
    public var added = 0
    public var changed = 0
    public var removed = 0
    public var label: String { "追加 \(added)件・変更 \(changed)件・解除 \(removed)件" }
    static func compare(_ before: [String: SyncValue<OrganizationDocument>], _ after: [String: SyncValue<OrganizationDocument>]) -> Self {
        var result = Self()
        func live(_ value: SyncValue<OrganizationDocument>?) -> SyncValue<OrganizationDocument>? {
            if case .deleted = value { return nil }; return value
        }
        for key in Set(before.keys).union(after.keys) {
            let old = live(before[key]), new = live(after[key])
            if old == new { continue }
            if old == nil { result.added += 1 }
            else if new == nil { result.removed += 1 }
            else { result.changed += 1 }
        }
        return result
    }
}

struct SyncRecoveryPoint: Codable {
    var schemaVersion = 1
    var createdAt = Date()
    var payload: Data
    var restoring = false
    var restored = false
}
