import Foundation
import CoreServices

/// macOS-only adapter. The shared document models do not depend on FSEvents.
@MainActor public final class FolderWatcher {
    private var stream: FSEventStreamRef?
    private var paths: [String] = []
    private var quietTimer: Timer?
    private var deadlineTimer: Timer?
    private var recoveryTimer: Timer?
    private let quietInterval: TimeInterval
    private let maximumDelay: TimeInterval
    private let onChange: @MainActor () -> Void

    public init(quietInterval: TimeInterval = 1, maximumDelay: TimeInterval = 5,
                onChange: @escaping @MainActor () -> Void) {
        self.quietInterval = quietInterval; self.maximumDelay = maximumDelay; self.onChange = onChange
    }

    @discardableResult public func watch(_ roots: [URL]) -> Bool {
        let next = Array(Set(roots.map { $0.standardizedFileURL.path })).sorted()
        if next == paths && (stream != nil || next.isEmpty) { return true }
        stop(); paths = next
        guard !next.isEmpty else { return true }
        var context = FSEventStreamContext(version: 0, info: Unmanaged.passUnretained(self).toOpaque(), retain: nil, release: nil, copyDescription: nil)
        let callback: FSEventStreamCallback = { _, info, _, _, _, _ in
            guard let info else { return }
            let watcher = Unmanaged<FolderWatcher>.fromOpaque(info).takeUnretainedValue()
            // FSEvents is explicitly delivered on the main dispatch queue.
            MainActor.assumeIsolated { watcher.signalChange() }
        }
        stream = FSEventStreamCreate(nil, callback, &context, next as CFArray,
            FSEventStreamEventId(kFSEventStreamEventIdSinceNow), 0.3,
            FSEventStreamCreateFlags(kFSEventStreamCreateFlagFileEvents | kFSEventStreamCreateFlagWatchRoot))
        if let stream {
            FSEventStreamSetDispatchQueue(stream, .main)
            if FSEventStreamStart(stream) { return true }
            FSEventStreamInvalidate(stream); FSEventStreamRelease(stream); self.stream = nil
        }
        // A failed native watch must not silently disable automatic updates.
        recoveryTimer = Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in self?.onChange() }
        }
        return false
    }

    public func stop() {
        quietTimer?.invalidate(); deadlineTimer?.invalidate(); recoveryTimer?.invalidate()
        quietTimer = nil; deadlineTimer = nil; recoveryTimer = nil
        if let stream { FSEventStreamStop(stream); FSEventStreamInvalidate(stream); FSEventStreamRelease(stream) }
        stream = nil; paths = []
    }

    private func signalChange() {
        quietTimer?.invalidate()
        quietTimer = Timer.scheduledTimer(withTimeInterval: quietInterval, repeats: false) { [weak self] _ in
            Task { @MainActor [weak self] in self?.deliver() }
        }
        if deadlineTimer == nil {
            deadlineTimer = Timer.scheduledTimer(withTimeInterval: maximumDelay, repeats: false) { [weak self] _ in
                Task { @MainActor [weak self] in self?.deliver() }
            }
        }
    }

    private func deliver() {
        quietTimer?.invalidate(); deadlineTimer?.invalidate()
        quietTimer = nil; deadlineTimer = nil; onChange()
    }

    deinit {
        quietTimer?.invalidate(); deadlineTimer?.invalidate(); recoveryTimer?.invalidate()
        if let stream { FSEventStreamStop(stream); FSEventStreamInvalidate(stream); FSEventStreamRelease(stream) }
    }
}
