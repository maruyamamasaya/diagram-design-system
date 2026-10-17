import AppKit
import ImageIO
import UniformTypeIdentifiers

/// App-owned thumbnails; settings contain an opaque filename, never an external image path.
struct FolderIconFiles {
    let directory: URL
    func url(for name: String?) -> URL? {
        guard let name, name.hasSuffix(".png"), UUID(uuidString: String(name.dropLast(4))) != nil else { return nil }
        return directory.appendingPathComponent(name)
    }
    func importImage(_ source: URL) throws -> String {
        guard let imageSource = CGImageSourceCreateWithURL(source as CFURL, nil),
              let image = CGImageSourceCreateThumbnailAtIndex(imageSource, 0, [
                kCGImageSourceCreateThumbnailFromImageAlways: true,
                kCGImageSourceCreateThumbnailWithTransform: true,
                kCGImageSourceThumbnailMaxPixelSize: 128
              ] as CFDictionary) else { throw IconError.unreadable }
        let data = NSMutableData()
        guard let destination = CGImageDestinationCreateWithData(data, UTType.png.identifier as CFString, 1, nil) else { throw IconError.unreadable }
        CGImageDestinationAddImage(destination, image, nil)
        guard CGImageDestinationFinalize(destination) else { throw IconError.unreadable }
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let name = UUID().uuidString + ".png"
        try (data as Data).write(to: directory.appendingPathComponent(name), options: .atomic)
        return name
    }
    func remove(_ name: String?) { if let url = url(for: name) { try? FileManager.default.removeItem(at: url) } }
    enum IconError: LocalizedError {
        case unreadable
        var errorDescription: String? { "この画像を読み込めませんでした。PNG・JPEGなどの画像を選んでください。" }
    }
}

extension ShelfStore {
    func iconURL(for folder: BookshelfCore.ShelfFolder) -> URL? { iconFiles.url(for: folder.iconFile) }
    func chooseFolderIcon(_ id: UUID) {
        let panel = NSOpenPanel(); panel.allowedContentTypes = [.image]
        panel.canChooseDirectories = false; panel.allowsMultipleSelection = false
        panel.prompt = "アイコンに設定"; panel.message = "フォルダのアイコンに使う画像を選んでください。"
        guard panel.runModal() == .OK, let source = panel.url else { return }
        let scoped = source.startAccessingSecurityScopedResource()
        defer { if scoped { source.stopAccessingSecurityScopedResource() } }
        do { try setFolderIcon(id, from: source) }
        catch { self.error = error.localizedDescription }
    }
    func setFolderIcon(_ id: UUID, from source: URL) throws {
        guard let index = settings.folders.firstIndex(where: { $0.id == id }) else { return }
        let previous = settings.folders[index].iconFile
        let name = try iconFiles.importImage(source)
        change { $0.folders[index].iconFile = name }
        if settings.folders.first(where: { $0.id == id })?.iconFile == name { iconFiles.remove(previous) }
        else { iconFiles.remove(name) }
    }
    func resetFolderIcon(_ id: UUID) {
        guard let index = settings.folders.firstIndex(where: { $0.id == id }) else { return }
        let previous = settings.folders[index].iconFile
        change { $0.folders[index].iconFile = nil }
        if settings.folders.first(where: { $0.id == id })?.iconFile == nil { iconFiles.remove(previous) }
    }
}

import BookshelfCore
