"""Continue clipped Seedream petioles as fixed supports in backdrop coordinates."""

import math
from pathlib import Path
from typing import NamedTuple

from PIL import Image


class Stem(NamedTuple):
    sample_top: int
    join_y: int
    join_x: float
    join_slope: float
    bottom_x: float
    bottom_slope: float
    bottom_width: float


# Sample only the narrow stalk below each blade. The routes follow the
# petioles in the reference artwork, behind the lower-right foreground.
STEMS = {
    16: Stem(675, 700, 1165, 0.87, 1207, 0.40, 13),
    17: Stem(544, 557, 1314, 0.25, 1326, -0.10, 12),
    18: Stem(578, 600, 1253, 0.54, 1310, 0.24, 13),
    19: Stem(475, 498, 1335, -0.04, 1334, -0.08, 9),
}


class Section(NamedTuple):
    center: float
    width: float
    pixels: Image.Image


def _sample_sections(image, left, top, sx, sy, stem):
    """Isolate native scanlines on the stalk, even beside another lobe."""
    alpha = image.getchannel("A").load()
    first = math.ceil((stem.sample_top - top) * sy)
    last = math.floor((stem.join_y - top) * sy)
    sections = []
    for y in range(first, last + 1):
        world_y = top + (y + 0.5) / sy
        hint = stem.join_x + stem.join_slope * (world_y - stem.join_y)
        seed = round((hint - left) * sx - 0.5)
        if alpha[seed, y] < 128:
            raise ValueError(
                f"Disconnected Seedream petiole at ({hint:.1f}, {world_y:.1f})"
            )
        start = end = seed
        while start > 0 and alpha[start - 1, y] > 1:
            start -= 1
        while end + 1 < image.width and alpha[end + 1, y] > 1:
            end += 1
        row = image.crop((start - 1, y, end + 2, y + 1))
        sections.append(
            Section(left + (start + end + 1) / (2 * sx), row.width / sx, row)
        )
    return first, last, sections


def _continue_stem(image, bounds, stem, bottom):
    left, top, right, lower = bounds
    sx = image.width / (right - left)
    sy = image.height / (lower - top)
    first, last, source = _sample_sections(image, left, top, sx, sy, stem)
    # Start underneath the still-opaque end, above its diagonal cut.
    begin = math.floor((stem.join_y - 6 - top) * sy)
    end = math.ceil((bottom - top) * sy)
    length = bottom - stem.join_y
    cx = source[-1].center
    width = sum(row.width for row in source[-5:]) / 5
    rows = []
    for y in range(begin, end):
        if y <= last:
            rows.append(source[y - first])
            continue
        t = min(1, (top + (y + 0.5) / sy - stem.join_y) / length)
        near = 1 - t
        # A cubic continuation keeps the tangent continuous at the join.
        x = (
            near**3 * cx
            + 3 * near**2 * t * (cx + stem.join_slope * length / 3)
            + 3 * near * t**2 * (stem.bottom_x - stem.bottom_slope * length / 3)
            + t**3 * stem.bottom_x
        )
        # Mirror successive stretches of actual stem texture without a hard wrap.
        span = len(source) - 1
        sample = abs(span - (y - last) % (2 * span))
        rows.append(
            Section(x, width + t * (stem.bottom_width - width), source[sample].pixels)
        )

    x0 = math.floor(min(row.center - row.width / 2 for row in rows) * sx) / sx
    x1 = math.ceil(max(row.center + row.width / 2 for row in rows) * sx) / sx
    pixels = Image.new("RGBA", (round((x1 - x0) * sx), end - begin))
    for iy, row in enumerate(rows):
        source_per_unit = row.pixels.width / row.width
        position = (x0 - row.center) * source_per_unit + row.pixels.width / 2
        scanline = row.pixels.transform(
            (pixels.width, 1),
            Image.Transform.AFFINE,
            (source_per_unit / sx, 0, position, 0, 1, 0),
            resample=Image.Resampling.BICUBIC,
        )
        pixels.paste(scanline, (0, iy))
    return pixels, [x0, top + begin / sy, pixels.width / sx, pixels.height / sy]


def build_petiole_supports(export_dir: Path, by_id: dict):
    """Return support textures keyed by the Seedream ID of the attached leaf."""
    bottom = 774  # Extends past the 768-pixel canvas.
    result = {}
    for layer_id, stem in STEMS.items():
        layer = by_id[layer_id]
        with Image.open(export_dir / layer["file"]) as image:
            result[layer_id] = _continue_stem(
                image.convert("RGBA"),
                layer["bounding_box"]["absolute"],
                stem,
                bottom,
            )
    return result
