"""Rebuild animated leaf layers while preserving every visible pixel at rest."""

import hashlib
import json
from collections import deque
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


root = Path(__file__).resolve().parents[1]
images = root / "public/images"
source = json.loads(Path(__file__).with_name("canopy-source-layers.json").read_text(encoding="utf-8"))
original = Image.open(images / source["image"]).convert("RGB")
donor = Image.open(images / source["hiddenBackdrop"]).convert("RGB")
masks = Image.open(images / source["atlas"]).getchannel("A")
outlines = source.get("outlines", {})
width, height = original.size
rgb = original.tobytes()
leaves = sorted(source["leaves"], key=lambda leaf: (leaf["depth"], leaf["id"]))
rank = {leaf["id"]: index + 1 for index, leaf in enumerate(leaves)}
rank[0] = 0
underlap = 14


def register_outline(registration, leaf, outline):
    # Pick up the original antialiased fringe immediately outside the trace.
    # This keeps pale edges from staying on the backdrop when a leaf moves.
    margin = 4
    xs, ys = zip(*outline)
    left, top = max(0, min(xs) - margin), max(0, min(ys) - margin)
    right, bottom = min(width, max(xs) + margin + 1), min(height, max(ys) + margin + 1)
    w, h = right - left, bottom - top
    traced = Image.new("L", (w, h))
    ImageDraw.Draw(traced).polygon([(x - left, y - top) for x, y in outline], fill=255)
    core = traced.load()
    edge = traced.filter(ImageFilter.MaxFilter(2 * margin + 1)).tobytes()
    complete = traced.copy()
    colors = original.load()
    current = registration.load()
    for index, near_outline in enumerate(edge):
        x, y = index % w, index // w
        if not near_outline or core[x, y]:
            continue
        color = colors[left + x, top + y]
        if color[1] < 43 or color[0] > color[1] + 2 or color[2] < color[1] + 8:
            continue
        if rank[current[left + x, top + y]] >= rank[leaf["id"]]:
            continue
        if any(core[nx, ny] and sum(abs(a - b) for a, b in zip(color, colors[left + nx, top + ny])) <= 42
               for ny in range(max(0, y - margin), min(h, y + margin + 1))
               for nx in range(max(0, x - margin), min(w, x + margin + 1))):
            complete.putpixel((x, y), 255)

    registration.paste(leaf["id"], (left, top, right, bottom), complete)
    x0, y0, x1, y1 = complete.getbbox()
    leaf["bounds"] = [left + x0, top + y0, x1 - x0, y1 - y0]


def register_visible_pixels():
    labels = bytearray(width * height)
    for leaf in leaves:
        if str(leaf["id"]) in outlines:
            continue
        left, top, w, h = leaf["bounds"]
        u, v = leaf["atlas"]
        alpha = masks.crop((u, v, u + w, v + h)).tobytes()
        for y in range(h):
            start = (top + y) * width + left
            for x in range(w):
                if alpha[y * w + x] >= 128:
                    labels[start + x] = leaf["id"]
    registration = Image.frombytes("L", original.size, bytes(labels))
    for leaf in leaves:
        outline = outlines.get(str(leaf["id"]))
        if outline:
            register_outline(registration, leaf, outline)
    return registration.tobytes()


def complete_backdrop(labels):
    # Only hidden pixels are filled. A normalized local average continues
    # original color across exposed edges, with the leafless painting below it.
    known = Image.frombytes("L", original.size, bytes(255 if label == 0 else 0 for label in labels))
    blur = ImageFilter.GaussianBlur(4.5)
    support = known.filter(blur).tobytes()
    neighbors = [ImageChops.multiply(channel, known).filter(blur).tobytes() for channel in original.split()]
    hidden = donor.tobytes()
    pixels = bytearray(rgb)
    for i, label in enumerate(labels):
        if not label:
            continue
        weight = min(0.86, support[i] / 92)
        for channel in range(3):
            target = i * 3 + channel
            nearby = min(255, neighbors[channel][i] * 255 / support[i]) if support[i] else 0
            pixels[target] = round(hidden[target] + (nearby - hidden[target]) * weight)
    return Image.frombytes("RGB", original.size, bytes(pixels))


def complete_leaf(leaf, labels):
    x, y, w, h = leaf["bounds"]
    left, top = max(0, x - underlap), max(0, y - underlap)
    right, bottom = min(width, x + w + underlap), min(height, y + h + underlap)
    w, h = right - left, bottom - top
    visible = leaf["id"]
    depth = rank[visible]
    region = [labels[(top + row) * width + left:(top + row) * width + right] for row in range(h)]
    pixels = bytearray(w * h * 4)
    queue = deque()

    def hidden_neighbors(column, row):
        for nx, ny in ((column - 1, row), (column + 1, row), (column, row - 1), (column, row + 1)):
            if 0 <= nx < w and 0 <= ny < h and rank[region[ny][nx]] > depth:
                yield nx, ny

    for row in range(h):
        for column in range(w):
            if region[row][column] != visible:
                continue
            source_pixel = ((top + row) * width + left + column) * 3
            target = (row * w + column) * 4
            color = rgb[source_pixel:source_pixel + 3]
            pixels[target:target + 4] = color + b"\xff"
            for nx, ny in hidden_neighbors(column, row):
                queue.append((nx, ny, color, 1))

    # Extend a cutout only behind surfaces that cover it in the original.
    # Its visible silhouette and color remain exactly the source pixels.
    while queue:
        column, row, color, distance = queue.popleft()
        target = (row * w + column) * 4
        if pixels[target + 3]:
            continue
        alpha = min(255, (underlap + 1 - distance) * 85)
        pixels[target:target + 4] = color + bytes([alpha])
        if distance < underlap:
            for nx, ny in hidden_neighbors(column, row):
                if not pixels[(ny * w + nx) * 4 + 3]:
                    queue.append((nx, ny, color, distance + 1))

    sprite = Image.frombytes("RGBA", (w, h), bytes(pixels))
    crop = sprite.getbbox()
    if crop is None:
        raise ValueError(f"Leaf {visible} contains no source pixels")
    sprite = sprite.crop(crop)
    bounds = [left + crop[0], top + crop[1], sprite.width, sprite.height]
    return {**leaf, "bounds": bounds}, sprite


def pack_atlas(sprites):
    width = 2048
    x, y, row_height = 2, 2, 0
    for leaf, sprite in sorted(sprites, key=lambda entry: -entry[1].height):
        if x + sprite.width + 2 > width:
            x, y, row_height = 2, y + row_height + 4, 0
        leaf["atlas"] = [x, y]
        x += sprite.width + 4
        row_height = max(row_height, sprite.height)
    atlas = Image.new("RGBA", (width, y + row_height + 2))
    for leaf, sprite in sprites:
        atlas.paste(sprite, tuple(leaf["atlas"]))
    return atlas


def publish(image, prefix):
    output = BytesIO()
    image.save(output, format="WEBP", method=4, lossless=True)
    data = output.getvalue()
    filename = f"{prefix}-{hashlib.sha256(data).hexdigest()[:10]}.webp"
    (images / filename).write_bytes(data)
    return filename


if donor.size != original.size:
    raise ValueError("The hidden backdrop must be registered to the original illustration")
labels = register_visible_pixels()
backdrop = complete_backdrop(labels)
sprites = [complete_leaf(leaf, labels) for leaf in leaves]
reconstructed = backdrop.convert("RGBA")
for leaf, sprite in sprites:
    reconstructed.alpha_composite(sprite, tuple(leaf["bounds"][:2]))
if ImageChops.difference(reconstructed.convert("RGB"), original).getbbox() is not None:
    raise ValueError("The separated layers do not reconstruct the original pixel for pixel")
atlas = pack_atlas(sprites)

manifest = {
    "background": publish(backdrop, "canopy-layered-background"),
    "atlas": publish(atlas, "canopy-layered-leaves"),
    "size": original.size,
    "atlasSize": atlas.size,
    "leaves": [leaf for leaf, _ in sprites],
    "poster": source["image"],
}
(root / "app/canopy-layers.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
print(f"Reconstructed {len(sprites)} transparent leaves with pixel-exact composition at rest.")
