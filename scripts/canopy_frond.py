"""Reconnect the detached right-hand leaflets using their own Seedream rachis."""

from math import hypot
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw


def _extend_shaft(source: Image.Image, layer: dict) -> tuple[Image.Image, list[float]]:
    x0, y0, x1, y1 = layer["bounding_box"]["absolute"]
    sx, sy = source.width / (x1 - x0), source.height / (y1 - y0)

    # This interval on the surviving shaft is clear of neighboring blades.
    # Straighten it while keeping its fine crosswise shading and alpha.
    strip = source.transform(
        (round(16 * sx), round(8 * sy)),
        Image.Transform.AFFINE,
        (1, 0, (1041 - x0) * sx, 0.31 * sy / sx, 1, (383.75 - y0 - 4) * sy),
        Image.Resampling.BICUBIC,
    )

    # Coordinates of the arc are in the 1365 x 768 Seedream backdrop.
    # Its ends run under layers 9 and 12, passing the roots of 11 and 10.
    left, top, right, bottom = 893, 370, 1046, 402
    width = round((right - left) * sx)
    height = round((bottom - top) * sy)
    support = Image.new("RGBA", (width, height))
    for x in range(width):
        t = (x + 0.5) / width
        u = 1 - t
        center = (
            397.6 * u**3 + 3 * 379.2 * u**2 * t + 3 * 364.7 * u * t**2 + 385.5 * t**3
        )
        center_px = (center - top) * height / (bottom - top)
        thickness = (0.40 + 0.54 * t) * min(1, (x + 1) / (4 * sx))

        # Reflect the sample at its ends so adjoining columns match.
        period = 2 * (strip.width - 1)
        sample_x = abs((x % period) - (strip.width - 1))
        column = strip.transform(
            (1, height),
            Image.Transform.AFFINE,
            (
                1,
                0,
                sample_x,
                0,
                1 / thickness,
                strip.height / 2 - center_px / thickness,
            ),
            Image.Resampling.BICUBIC,
        )
        support.paste(column, (x, 0))

    bounds = [left, top, right - left, bottom - top]
    return support, bounds


# Native coordinates of an isolated Seedream leaflet, root and tip. Width
# is measured perpendicular to the midrib halfway along its length.
_BLADES = {
    # A mirrored leaflet follows the stronger arc of the upper row.
    "curve": (7, (498, 424), (187.5, 7.5), (542.5, 945.5), -98),
    "long": (10, (598, 533), (799.5, 317.5), (526.5, 818.5), 71),
    "swept": (11, (262, 496), (453.5, 318.5), (143.5, 832.5), 68),
    "tall": (11, (503, 568), (664.5, 342.5), (447.5, 841.5), 73),
    "short": (11, (655, 532), (766.5, 375.5), (577.5, 706.5), 71),
}

# Endpoints and widths on the reference illustration, expressed on the
# 1365 x 768 backdrop. Each entry places one intact native leaflet.
_ATTACHED_BLADES = (
    # Upper side, sweeping left from the rachis.
    ("curve", (931, 382), (768, 407), 12.5),
    ("curve", (974, 376), (809, 367), 14.0),
    ("curve", (1023, 379), (877, 338), 15.5),
    ("long", (1067, 392), (965, 321), 18.0),
    # Lower side. The first pair and the right-hand side are already
    # present together in the original Seedream layers 9 and 12.
    ("tall", (931, 382), (849, 519), 18.5),
    ("swept", (974, 376), (894, 516), 17.5),
    ("long", (1008, 376), (936, 516), 18.0),
    ("short", (1101, 407), (1038, 524), 16.0),
)


def _isolated_blade(image, seed):
    alpha = image.getchannel("A")
    connected = alpha.point(lambda value: 255 if value else 0)
    if connected.getpixel(seed) == 0:
        raise ValueError(f"Seedream leaflet seed {seed} fell outside its silhouette")
    ImageDraw.floodfill(connected, seed, 128)
    blade = image.copy()
    blade.putalpha(
        ImageChops.multiply(
            alpha, connected.point(lambda value: 255 if value == 128 else 0)
        )
    )
    return blade


def build_right_frond(export_dir: Path, by_id: dict) -> tuple[Image.Image, list[float]]:
    """Assemble both sides of the right palm from native Seedream sprites."""
    left, top, right, bottom = 737, 309, 1174, 530
    scale = 4
    output = Image.new("RGBA", ((right - left) * scale, (bottom - top) * scale))
    native = {
        number: Image.open(export_dir / by_id[number]["file"]).convert("RGBA")
        for number in (7, 9, 10, 11, 12)
    }
    blades = {
        key: _isolated_blade(native[number], seed)
        for key, (number, seed, *_) in _BLADES.items()
    }

    def place(image, bounds):
        x, y, width, height = bounds
        output.alpha_composite(
            image.resize(
                (round(width * scale), round(height * scale)), Image.Resampling.LANCZOS
            ),
            (round((x - left) * scale), round((y - top) * scale)),
        )

    support, bounds = _extend_shaft(native[12], by_id[12])
    place(support, bounds)
    for number in (9, 12):
        x0, y0, x1, y1 = by_id[number]["bounding_box"]["absolute"]
        place(native[number], [x0, y0, x1 - x0, y1 - y0])

    for key, root, tip, width in _ATTACHED_BLADES:
        _, _, source_root, source_tip, source_width = _BLADES[key]
        dx, dy = tip[0] - root[0], tip[1] - root[1]
        ax, ay = source_tip[0] - source_root[0], source_tip[1] - source_root[1]
        length, source_length = hypot(dx, dy), hypot(ax, ay)
        dx, dy = dx / length, dy / length
        along = source_length / length
        across = source_width / width
        sx, sy = ax / source_length, ay / source_length
        # Inverse affine map from backdrop pixels to the native image.
        a, b = sx * dx * along + sy * dy * across, sx * dy * along - sy * dx * across
        d, e = sy * dx * along - sx * dy * across, sy * dy * along + sx * dx * across
        c = source_root[0] + a * (left - root[0]) + b * (top - root[1])
        f = source_root[1] + d * (left - root[0]) + e * (top - root[1])
        placed = blades[key].transform(
            output.size,
            Image.Transform.AFFINE,
            (a / scale, b / scale, c, d / scale, e / scale, f),
            Image.Resampling.BICUBIC,
        )
        output.alpha_composite(placed)

    # Color grade the Seedream pixels to the reference frond's muted navy.
    r, g, b, alpha = output.split()
    output = Image.merge(
        "RGBA",
        (
            r.point(lambda v: round(0.54 * v)),
            g.point(lambda v: round(0.47 * v)),
            b.point(lambda v: round(0.70 * v)),
            alpha,
        ),
    )
    crop = output.getchannel("A").getbbox()
    if crop is None:
        raise ValueError("Right frond has no visible pixels")
    x0, y0, x1, y1 = crop
    return output.crop(crop), [
        left + x0 / scale,
        top + y0 / scale,
        (x1 - x0) / scale,
        (y1 - y0) / scale,
    ]
