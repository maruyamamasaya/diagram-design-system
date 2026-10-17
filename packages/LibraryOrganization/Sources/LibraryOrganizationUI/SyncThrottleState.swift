import Foundation
import LibraryOrganization

struct SyncThrottleState: Codable {
    var attemptID: UUID?
    var permit: SyncPermit?
    var quota: SyncQuota?
    var endpoint: String?
    var libraryID: UUID?
    var retry: SyncRetryState?
}
