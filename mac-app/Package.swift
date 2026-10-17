// swift-tools-version: 5.10
import PackageDescription
let package = Package(name: "Bookshelf", platforms: [.macOS(.v14)], products: [
    .library(name: "BookshelfCore", targets: ["BookshelfCore"]),
    .executable(name: "Bookshelf", targets: ["Bookshelf"])
], dependencies: [.package(path: "../packages/LibraryOrganization")], targets: [.target(name: "BookshelfCore", dependencies: [.product(name: "LibraryOrganization", package: "LibraryOrganization")]), .target(name: "BookshelfWatching"), .executableTarget(name: "Bookshelf", dependencies: ["BookshelfCore", "BookshelfWatching", .product(name: "LibraryOrganizationUI", package: "LibraryOrganization"), .product(name: "LibraryOrganization", package: "LibraryOrganization")]), .testTarget(name: "BookshelfDragTests", dependencies: ["Bookshelf", "BookshelfCore"]), .testTarget(name: "BookshelfCoreTests", dependencies: ["BookshelfCore"]), .testTarget(name: "BookshelfWatchingTests", dependencies: ["BookshelfWatching", "BookshelfCore"])])
