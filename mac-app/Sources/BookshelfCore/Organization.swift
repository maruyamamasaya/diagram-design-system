import Foundation
import LibraryOrganization

/// URL-free fallback metadata, compatible in meaning with the iOS collection member.
public struct BookReference: Codable, Equatable, Sendable, Identifiable {
    public var id: String
    public var title: String
    public var type: String
    public var version: Int
    public var formats: [String]
    public var pageCount: Int
    public var tags: [String]
    public init(book: Book) {
        id = book.id; title = book.latest.title; type = book.latest.kind; version = book.latest.version
        formats = Array(Set(book.latest.files.map { $0.pathExtension.lowercased() })).sorted()
        pageCount = book.latest.pageCount; tags = book.latest.tags
    }
    public var canCollect: Bool { type != "presentation" && formats.contains(where: { ["png", "pdf"].contains($0) }) }
}
extension LibrarySettings {
    public func classification(for book: Book) -> LibraryClassification {
        classifications[book.id] ?? LibraryClassification(tags: LibraryClassification.normalizedTags(book.latest.tags))
    }
    public mutating func setClassification(for id: String, group: LibraryGroup, tags: [String]) {
        classifications[id] = LibraryClassification(group: group, tags: LibraryClassification.normalizedTags(tags))
    }
    public mutating func saveCollection(_ value: ReadingCollection<BookReference>) throws {
        try value.validateStructure(memberID: { UUID(uuidString: $0.id)?.uuidString ?? $0.id })
        guard value.members.allSatisfy(\.canCollect) else { throw OrganizationError.invalidCollection }
        if let index = collections.firstIndex(where: { $0.id == value.id }) { collections[index] = value }
        else { collections.append(value) }
    }
    public func members(of collection: ReadingCollection<BookReference>, books: [Book]) -> [Book] {
        collection.members.compactMap { member in books.first { $0.id == member.id } }
    }
}
