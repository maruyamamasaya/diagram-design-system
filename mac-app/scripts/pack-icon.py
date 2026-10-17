"""Package already-rendered PNG representations in the standard ICNS container."""
import pathlib
import struct
import sys
source, target = map(pathlib.Path, sys.argv[1:])
representations = [(b'icp4', '16x16'), (b'icp5', '32x32'), (b'icp6', '32x32@2x'),
                   (b'ic07', '128x128'), (b'ic08', '256x256'), (b'ic09', '512x512'),
                   (b'ic10', '512x512@2x'), (b'ic11', '16x16@2x'),
                   (b'ic12', '32x32@2x'), (b'ic13', '128x128@2x'), (b'ic14', '256x256@2x')]
chunks = []
for kind, name in representations:
    png = (source / f'icon_{name}.png').read_bytes()
    assert png.startswith(b'\x89PNG\r\n\x1a\n')
    chunks.append(kind + struct.pack('>I', len(png) + 8) + png)
body = b''.join(chunks)
target.write_bytes(b'icns' + struct.pack('>I', len(body) + 8) + body)
