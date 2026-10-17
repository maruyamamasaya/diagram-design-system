#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
export CLANG_MODULE_CACHE_PATH="$PWD/.build/clang-cache"
swift build --disable-sandbox -c release --cache-path "$PWD/.build/cache"
APP="$PWD/dist/Zukan Bookshelf.app"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
swift scripts/make-icon.swift "$PWD/.build/Bookshelf.iconset"
python3 scripts/pack-icon.py "$PWD/.build/Bookshelf.iconset" "$APP/Contents/Resources/Bookshelf.icns"
cp "$PWD/.build/Bookshelf.iconset/icon_512x512@2x.png" "$PWD/assets/Bookshelf.png"
cp .build/release/Bookshelf "$APP/Contents/MacOS/Bookshelf"
cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleExecutable</key><string>Bookshelf</string>
<key>CFBundleIdentifier</key><string>jp.local.zukan.bookshelf</string>
<key>CFBundleName</key><string>Zukan Bookshelf</string>
<key>CFBundleDisplayName</key><string>図鑑 — 資料の本棚</string>
<key>CFBundleIconFile</key><string>Bookshelf</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleShortVersionString</key><string>0.1.0</string>
<key>LSMinimumSystemVersion</key><string>14.0</string>
<key>NSHighResolutionCapable</key><true/>
</dict></plist>
PLIST
codesign --force --sign - "$APP"
printf '%s\n' "$APP"
