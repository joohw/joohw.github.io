"""Register small twig attachments absent from the Seedream decomposition."""

import math

from PIL import Image, ImageChops, ImageDraw, ImageStat


def _basis(root, tip):
    dx, dy = tip[0] - root[0], tip[1] - root[1]
    length = math.hypot(dx, dy)
    return dx / length, dy / length, length


def _leaf(export, donor, source_root, source_tip, root, tip, across, *, seed=None):
    """Register the donor's whole native silhouette to two measured landmarks."""
    image = Image.open(export / donor["file"]).convert("RGBA")
    if seed is not None:
        alpha = image.getchannel("A")
        connected = alpha.point(lambda value: 255 if value else 0)
        if connected.getpixel(seed) == 0:
            raise ValueError(f"Seedream blade missing at native pixel {seed}")
        ImageDraw.floodfill(connected, seed, 128)
        image.putalpha(
            ImageChops.multiply(
                alpha, connected.point(lambda value: 255 if value == 128 else 0)
            )
        )
    left, top, right, bottom = donor["bounding_box"]["absolute"]
    sx = image.width / (right - left)
    sy = image.height / (bottom - top)
    du, dv, source_length = _basis(source_root, source_tip)
    tu, tv, length = _basis(root, tip)
    scale = length / source_length
    density = max(sx, sy) / (scale * min(1, abs(across)))

    def place(px, py):
        x, y = left + px / sx - source_root[0], top + py / sy - source_root[1]
        along = (x * du + y * dv) * scale
        normal = (-x * dv + y * du) * scale * across
        return root[0] + tu * along - tv * normal, root[1] + tv * along + tu * normal

    x0, y0, x1, y1 = image.getchannel("A").getbbox()
    corners = [place(x, y) for x in (x0, x1) for y in (y0, y1)]
    out_x = (math.floor(min(x for x, _ in corners) * density) - 1) / density
    out_y = (math.floor(min(y for _, y in corners) * density) - 1) / density
    width = math.ceil((max(x for x, _ in corners) - out_x) * density) + 1
    height = math.ceil((max(y for _, y in corners) - out_y) * density) + 1

    def sample(x, y):
        along = ((x - root[0]) * tu + (y - root[1]) * tv) / scale
        normal = (-(x - root[0]) * tv + (y - root[1]) * tu) / (scale * across)
        return (
            (source_root[0] + du * along - dv * normal - left) * sx,
            (source_root[1] + dv * along + du * normal - top) * sy,
        )

    ax, ay = sample(out_x, out_y)
    bx, by = sample(out_x + 1 / density, out_y)
    cx, cy = sample(out_x, out_y + 1 / density)
    sprite = image.transform(
        (width, height),
        Image.Transform.AFFINE,
        (bx - ax, cx - ax, ax, by - ay, cy - ay, ay),
        resample=Image.Resampling.BICUBIC,
    )
    crop = sprite.getchannel("A").getbbox()
    sprite = sprite.crop(crop)
    return sprite, [
        out_x + crop[0] / density,
        out_y + crop[1] / density,
        sprite.width / density,
        sprite.height / density,
    ]


def _stalk_samples(export, donor):
    image = Image.open(export / donor["file"]).convert("RGBA")
    left, top, right, bottom = donor["bounding_box"]["absolute"]
    sx, sy = image.width / (right - left), image.height / (bottom - top)
    alpha = image.getchannel("A").load()
    samples = []
    for y in range(math.ceil((584 - top) * sy), math.floor((598 - top) * sy)):
        at = top + (y + 0.5) / sy
        center = 1251 + 0.54 * (at - 596)
        start = end = round((center - left) * sx - 0.5)
        if alpha[start, y] < 100:
            continue
        while start and alpha[start - 1, y] > 1:
            start -= 1
        while end + 1 < image.width and alpha[end + 1, y] > 1:
            end += 1
        samples.append(
            image.crop((start - 1, y, end + 2, y + 1)).transpose(
                Image.Transpose.TRANSPOSE
            )
        )
    if len(samples) < 2:
        raise ValueError("No native texture samples for small twig repair")
    return samples


def _twig(samples, start, end, slopes, widths):
    """Follow the original attachment with a strip of Seedream stem texture."""
    x0, y0 = start
    x1, y1 = end
    length = x1 - x0
    density = 5
    columns = math.ceil(length * density)
    rows = []
    for i in range(columns):
        t = min(1, (i + 0.5) / (length * density))
        u = 1 - t
        center = (
            u**3 * y0
            + 3 * u * u * t * (y0 + slopes[0] * length / 3)
            + 3 * u * t * t * (y1 - slopes[1] * length / 3)
            + t**3 * y1
        )
        rows.append((center, widths[0] * u + widths[1] * t))
    top = math.floor(min(c - w / 2 for c, w in rows) * density - 1) / density
    bottom = max(c + w / 2 for c, w in rows)
    height = math.ceil((bottom - top) * density) + 1
    sprite = Image.new("RGBA", (columns, height))
    span = len(samples) - 1
    for i, (center, width) in enumerate(rows):
        column = samples[abs(span - i % (2 * span))]
        scale = column.height / width
        paint = column.transform(
            (1, height),
            Image.Transform.AFFINE,
            (1, 0, 0, 0, scale / density, (top - center) * scale + column.height / 2),
            resample=Image.Resampling.BICUBIC,
        )
        sprite.paste(paint, (i, 0))
    return sprite, [x0, top, columns / density, height / density]


def _left_crown_shaft(export, layer):
    """Lift one continuous existing rachis, including its natural edge and texture."""
    image = Image.open(export / layer["file"]).convert("RGBA")
    left, top, right, bottom = layer["bounding_box"]["absolute"]
    sx = image.width / (right - left)
    sy = image.height / (bottom - top)
    # Clip only the attached blades off this span of the right palm's shaft.
    upper = [
        (1025, 377),
        (1042, 381.1),
        (1058, 385.8),
        (1072, 391.5),
        (1088, 400.1),
        (1105, 409.6),
    ]
    lower = [
        (1025, 382),
        (1042, 387),
        (1058, 392.1),
        (1072, 397.9),
        (1088, 406.4),
        (1105, 416.8),
    ]
    mask = Image.new("L", image.size)
    polygon = [((x - left) * sx, (y - top) * sy) for x, y in upper + lower[::-1]]
    ImageDraw.Draw(mask).polygon(polygon, fill=255)
    image.putalpha(ImageChops.multiply(image.getchannel("A"), mask))
    # Reflect the intact shaft into the gap between the wood and existing fan.
    # The thicker end sits on the bark; the tapered end is hidden in the crown.
    ox, oy, width, height = 134, 8, 94, 29
    density = 5

    def source(x, y):
        along = (x - 136.5) / 1.12
        return (
            (1104 - along - left) * sx,
            (412.5 + (y - 31.5 - 0.02 * along) / 0.60 - top) * sy,
        )

    x0, y0 = source(ox, oy)
    x1, y1 = source(ox + 1 / density, oy)
    x2, y2 = source(ox, oy + 1 / density)
    placed = image.transform(
        (width * density, height * density),
        Image.Transform.AFFINE,
        (x1 - x0, x2 - x0, x0, y1 - y0, y2 - y0, y0),
        Image.Resampling.BICUBIC,
    )
    return placed, [ox, oy, width, height]


def _upper_left_palm(export, by_id):
    # The original has three successive drooping blades here. Its middle
    # blade survives in layer 5; restore only the neighbors on either side.
    native = by_id[11]
    left, top, right, bottom = native["bounding_box"]["absolute"]
    w, h = native["size"]

    def world(point):
        return (
            left + point[0] * (right - left) / w,
            top + point[1] * (bottom - top) / h,
        )

    motion = {"motion": 5, "root": [191, 20], "tip": [450, 230], "pin": 18}
    shaft, bounds = _left_crown_shaft(export, by_id[12])
    parts = [(5, {"id": 208, **motion}, shaft, bounds)]
    for before, id, donor, seed, source_root, source_tip, root, tip, across, tone in (
        (
            5,
            209,
            22,
            None,
            (1093, 24.4),
            (991.7, 72.9),
            (163, 24),
            (154.3, 161.6),
            -0.52,
            (46, 66, 84),
        ),
        (
            5,
            210,
            11,
            (262, 496),
            world((453.5, 318.5)),
            world((143.5, 832.5)),
            (215.5, 15),
            (261.5, 157.6),
            -0.92,
            (46, 66, 84),
        ),
        (
            1,
            211,
            22,
            None,
            (1093, 24.4),
            (991.7, 72.9),
            (148, -13),
            (106, 166),
            -0.35,
            (22, 36, 54),
        ),
    ):
        blade, b = _leaf(
            export, by_id[donor], source_root, source_tip, root, tip, across, seed=seed
        )
        alpha = blade.getchannel("A")
        solid = alpha.point(lambda a: 255 if a >= 220 else 0)
        midpoint = ImageStat.Stat(blade.convert("RGB"), solid).median
        gains = [target / value for target, value in zip(tone, midpoint)]
        lookup = [min(255, round(v * gain)) for gain in gains for v in range(256)]
        anchor = {"motion": id, "root": list(root), "tip": list(tip), "pin": 8}
        parts.append(
            (before, {"id": id, **anchor}, blade.point(lookup + list(range(256))), b)
        )
    return parts


def build_twig_repairs(export_dir, by_id):
    """Return (insert-before source ID, motion metadata, image, world bounds)."""
    stalk = _stalk_samples(export_dir, by_id[18])
    repairs = _upper_left_palm(export_dir, by_id)
    for before, id, start, end, slopes, widths in (
        (21, 204, (1231, 685), (1268, 691), (0.07, -0.13), (2.3, 2.0)),
        (20, 205, (1286, 615.4), (1296, 617.9), (0.22, 0), (1.8, 2.3)),
    ):
        sprite, bounds = _twig(stalk, start, end, slopes, widths)
        repairs.append(
            (
                before,
                {"id": id, "motion": 0, "root": [0, 0], "tip": [1, 0], "pin": 0},
                sprite,
                bounds,
            )
        )
    # Restore the missing blade at the lower-right fork.
    root, tip = [1295, 617.7], [1195, 659]
    sprite, bounds = _leaf(
        export_dir, by_id[24], (1261, 94.9), (1172, 202.5), root, tip, 0.92
    )
    repairs.append(
        (20, {"id": 207, "motion": 207, "root": root, "tip": tip, "pin": 9}, sprite, bounds)
    )
    return repairs
