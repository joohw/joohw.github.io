"""Restore small leaves missing from Seedream's branch cutouts."""

import math

from PIL import Image

from canopy_twigs import _leaf as register_leaf, _twig as register_twig


# Native donor attachment points and tips in the 1365 x 768 backdrop.
_DONORS = {
    22: ((1093, 24.4), (991.7, 72.9), (60, 79, 96)),
    26: ((223.35, 317.15), (327, 403), (64, 82, 99)),
    27: ((214, 320), (306, 262), (44, 77, 87)),
}

# All on-screen roots join the corresponding existing twig. Several tips
# deliberately extend beyond the canvas, as they do in the reference.
# Each tuple is (insert before, mesh id, donor, root, tip, transverse
# scale, color midpoint). A negative scale mirrors the blade.
_MISSING = (
    (1, 302, 26, (34, 94), (99, -20), 1.27, (55, 74, 92)),
    (9, 303, 22, (66, 78), (158, 141), -1.45, (36, 52, 74)),
    (22, 304, 22, (1117, 26), (1071, 109), 1.27, (60, 78, 95)),
    (22, 305, 22, (1230, 81), (1281, -38), -1.45, (68, 86, 103)),
    (22, 306, 27, (1257, 94), (1267, 194), -1.0, (38, 53, 75)),
    (22, 307, 26, (1279, 65), (1397, 118), 1.12, (44, 61, 82)),
    (1, 308, 26, (24, 105), (-55, 58), -1.45, (44, 62, 83)),
    (4, 309, 26, (1141, 31), (1136, -72), 1.45, (51, 67, 85)),
    (4, 310, 27, (1149, -36), (1208, 38), 1.45, (35, 49, 75)),
    (4, 311, 27, (1255, -45), (1371, 40), 1.27, (43, 59, 80)),
)


def _top_twig(export_dir, layer):
    image = Image.open(export_dir / layer["file"]).convert("RGBA")
    left, top, right, bottom = layer["bounding_box"]["absolute"]
    sx, sy = image.width / (right - left), image.height / (bottom - top)
    alpha = image.getchannel("A").load()
    strips = []
    # This part of Seedream's upper-right twig has bark across its entire
    # section. Sample the antialiased edges with the interior texture.
    for x in range(math.ceil((1109 - left) * sx), math.floor((1126 - left) * sx)):
        at = left + (x + 0.5) / sx
        y = round((21.6 + 0.40 * (at - 1109) - top) * sy - 0.5)
        if alpha[x, y] < 128:
            continue
        start = end = y
        while start > 0 and alpha[x, start - 1] > 0:
            start -= 1
        while end + 1 < image.height and alpha[x, end + 1] > 0:
            end += 1
        strips.append(image.crop((x, start - 1, x + 1, end + 2)))
    if len(strips) < 2:
        raise ValueError("Upper-right Seedream branch has no usable bark sample.")
    return register_twig(strips, (1058, -3), (1093, 12.9), (0.47, 0.4), (4.0, 3.4))


def build_missing_leaves(export_dir, by_id):
    """Return registered native Seedream blades and their sway pivots."""
    repairs = []
    for before, id, donor, root, tip, across, target_color in _MISSING:
        source_root, source_tip, source_color = _DONORS[donor]
        sprite, bounds = register_leaf(
            export_dir, by_id[donor], source_root, source_tip, root, tip, across
        )
        # Match the depth of the reference branch across each color band,
        # retaining the anti-aliased outline and interior Seedream texture.
        gains = [target / source for target, source in zip(target_color, source_color)]
        lut = [min(255, round(v * gain)) for gain in gains for v in range(256)]
        sprite = sprite.point(lut + list(range(256)))
        motion = {
            "id": id,
            "motion": id,
            "root": list(root),
            "tip": list(tip),
            "pin": 9,
        }
        repairs.append((before, motion, sprite, bounds))
    sprite, bounds = _top_twig(export_dir, by_id[4])
    repairs.append(
        (
            4,
            {"id": 312, "motion": 0, "root": [0, 0], "tip": [1, 0], "pin": 0},
            sprite,
            bounds,
        )
    )
    return repairs
