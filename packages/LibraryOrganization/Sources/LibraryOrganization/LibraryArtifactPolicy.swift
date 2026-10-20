import Foundation

/// Exact human-approved immutable artifacts. Unlisted bytes keep the 20 MB limit.
public enum LibraryArtifactPolicy {
    public static let maximumCacheBytes: Int64 = 10_000_000_000
    private struct Entry { let id: String; let version: Int; let name: String; let size: Int; let hash: String }
    private static let approved: [Entry] = [
        Entry(id: "4f2af5d0-86c9-4709-9dad-9f6a67e5ac10", version: 1, name: "document.pdf", size: 29640691, hash: "eb08beebf657a1582423e48f3602207169828b5ec906c5ce9c9a3a18acbf620a"),
        Entry(id: "4f2af5d0-86c9-4709-9dad-9f6a67e5ac10", version: 1, name: "presentation.pptx", size: 20067274, hash: "80e86b33ad702a9642f615e475885a48847288a365469b36778d689211ed870b"),
        Entry(id: "e64e2471-56b8-4583-bc89-45e549053c22", version: 3, name: "document.pdf", size: 43829069, hash: "8f920050c622a7c7e263f8b922020d4dfd8385b818949927d0dfeca265093c1e"),
        Entry(id: "e64e2471-56b8-4583-bc89-45e549053c22", version: 3, name: "presentation.pptx", size: 30136175, hash: "f3e96371bcb3735e66a8a5da5b3939fc5df6f5197ed3da2be865fc9260beb97f"),
    ]
    public static func allows(name: String, size: Int, hash: String, id: String? = nil, version: Int? = nil) -> Bool {
        guard size > 0 else { return false }
        if size < 20_000_000 { return true }
        return approved.contains { $0.name == name && $0.size == size && $0.hash == hash &&
            (id == nil || $0.id == id?.lowercased()) && (version == nil || $0.version == version) }
    }
}
