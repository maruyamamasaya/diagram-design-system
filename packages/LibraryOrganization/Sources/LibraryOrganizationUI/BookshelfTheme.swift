import SwiftUI
#if os(macOS)
import AppKit
#else
import UIKit
#endif

/// Appearance stays on this device and never enters the organization sync document.
public enum BookshelfTheme: String, CaseIterable, Identifiable {
    case yakusugi, urushi
    public static let preferenceKey = "bookshelf.materialTheme"
    public var id: String { rawValue }
    public static func resolve(_ value: String) -> Self { Self(rawValue: value) ?? .urushi }
    public var title: String { self == .yakusugi ? "屋久杉" : "黒漆" }
    public var subtitle: String { self == .yakusugi ? "深い木目と、温かな墨茶" : "静かな艶と、柔らかな墨黒" }
    public var canvas: Color { color(wood: 0x211E1B, lacquer: 0x202123) }
    public var panel: Color { color(wood: 0x2B2520, lacquer: 0x27282A) }
    public var card: Color { color(wood: 0x302B26, lacquer: 0x2D2E30) }
    public var accent: Color { color(wood: 0xC7AB87, lacquer: 0xD09C91) }
    public var ink: Color { Color(red: 0.91, green: 0.89, blue: 0.85) }
    public var textureName: String { self == .yakusugi ? "yakusugi" : "urushi" }
    private func color(wood: UInt32, lacquer: UInt32) -> Color {
        let hex = self == .yakusugi ? wood : lacquer
        return Color(red: Double((hex >> 16) & 255) / 255,
                     green: Double((hex >> 8) & 255) / 255, blue: Double(hex & 255) / 255)
    }
}

private struct BookshelfThemeKey: EnvironmentKey { static let defaultValue = BookshelfTheme.urushi }
private enum BookshelfAssets {
    // Signed macOS apps place resource bundles inside Contents/Resources.
    static let bundle: Bundle = {
        if let url = Bundle.main.url(forResource: "LibraryOrganization_LibraryOrganizationUI", withExtension: "bundle"),
           let packaged = Bundle(url: url) { return packaged }
        return .module
    }()
    private static let yakusugi = load("yakusugi")
    private static let urushi = load("urushi")
    static func texture(for theme: BookshelfTheme) -> Image? {
        theme == .yakusugi ? yakusugi : urushi
    }
    private static func load(_ name: String) -> Image? {
        // Image(name:bundle:) produced a flat panel in rendered SwiftPM resources.
        // Decode the actual bundled PNG once and preserve its original pixels.
        guard let url = bundle.url(forResource: name, withExtension: "png") else { return nil }
        #if os(macOS)
        guard let decoded = NSImage(contentsOf: url) else { return nil }
        return Image(nsImage: decoded).renderingMode(.original)
        #else
        guard let decoded = UIImage(contentsOfFile: url.path) else { return nil }
        return Image(uiImage: decoded).renderingMode(.original)
        #endif
    }
}
public extension EnvironmentValues {
    var bookshelfTheme: BookshelfTheme {
        get { self[BookshelfThemeKey.self] }
        set { self[BookshelfThemeKey.self] = newValue }
    }
}

private struct BookshelfAppearance: ViewModifier {
    @AppStorage(BookshelfTheme.preferenceKey) private var selection = BookshelfTheme.urushi.rawValue
    func body(content: Content) -> some View {
        let theme = BookshelfTheme.resolve(selection)
        content.environment(\.bookshelfTheme, theme)
            .preferredColorScheme(.dark).tint(theme.accent)
            .foregroundStyle(theme.ink)
            .background(theme.canvas)
    }
}

/// Texture is decorative, static and clipped; accessibility contrast removes it.
public struct BookshelfMaterial: View {
    @Environment(\.bookshelfTheme) private var theme
    @Environment(\.colorSchemeContrast) private var contrast
    public init() {}
    public var body: some View {
        GeometryReader { geometry in
            ZStack {
                theme.panel
                if contrast != .increased, let texture = BookshelfAssets.texture(for: theme) {
                    texture.resizable().scaledToFill()
                        .frame(width: geometry.size.width, height: geometry.size.height)
                        .opacity(theme == .yakusugi ? 0.42 : 0.36)
                }
                LinearGradient(colors: [.white.opacity(0.025), .clear, .black.opacity(0.06)], startPoint: .topLeading, endPoint: .bottomTrailing)
            }.clipped()
        }.allowsHitTesting(false).accessibilityHidden(true)
    }
}

private struct BookshelfCard: ViewModifier {
    @Environment(\.bookshelfTheme) private var theme
    @Environment(\.colorSchemeContrast) private var contrast
    let selected: Bool
    func body(content: Content) -> some View {
        content.background(selected ? theme.accent.opacity(0.14) : theme.card, in: RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(selected ? theme.accent : theme.ink.opacity(contrast == .increased ? 0.4 : 0.10), lineWidth: selected ? 2 : 1))
            .shadow(color: .black.opacity(0.12), radius: 8, y: 3)
    }
}

public extension View {
    func bookshelfAppearance() -> some View { modifier(BookshelfAppearance()) }
    func bookshelfCard(selected: Bool = false) -> some View { modifier(BookshelfCard(selected: selected)) }
}

/// Available directly from each library, including offline/local mode.
public struct BookshelfThemePicker: View {
    @AppStorage(BookshelfTheme.preferenceKey) private var selection = BookshelfTheme.urushi.rawValue
    public init() {}
    public var body: some View {
        Menu {
            Picker("本棚のテーマ", selection: $selection) {
                ForEach(BookshelfTheme.allCases) { theme in Text(theme.title).tag(theme.rawValue) }
            }
        } label: { Label("本棚のテーマ", systemImage: "circle.lefthalf.filled") }
        .help("屋久杉・黒漆を選ぶ")
    }
}
