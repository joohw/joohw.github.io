"""Publish native Seedream cutouts and register them in backdrop coordinates."""

import argparse
import hashlib
import json
from io import BytesIO
from pathlib import Path

from PIL import Image
from canopy_frond import build_right_frond
from canopy_petioles import build_petiole_supports
from canopy_twigs import build_twig_repairs
from canopy_missing import build_missing_leaves
from canopy_sprig import build_bottom_sprig


root = Path(__file__).resolve().parents[1]
images = root / "public/images"
masters = Path(__file__).with_name("canopy-masters")
source = json.loads(
    Path(__file__).with_name("canopy-source-layers.json").read_text(encoding="utf-8")
)


def publish(image, kind):
    output = BytesIO()
    image.save(output, format="WEBP", lossless=True, exact=kind == "base", method=5)
    data = output.getvalue()
    # Keep the dark paper grain and the fine brown twig lossless. Other large
    # leaves can compress their color channels while preserving the original alpha.
    if kind not in ("base", "layer-26") and len(data) >= 16 * 1024:
        compact = BytesIO()
        image.save(compact, format="WEBP", quality=96, alpha_quality=100, method=5)
        if compact.tell() < len(data):
            data = compact.getvalue()
    filename = f"canopy-seedream-{kind}-{hashlib.sha256(data).hexdigest()[:10]}.webp"
    path = images / filename
    if not path.exists() or path.read_bytes() != data:
        path.write_bytes(data)
    return filename


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument(
    "export",
    type=Path,
    help="Directory containing the original Seedream layers.json and PNGs",
)
args = parser.parse_args()

package = json.loads((args.export / "layers.json").read_text(encoding="utf-8"))
backdrop = Image.open(images / source["background_edit"]).convert("RGB")
if (
    list(backdrop.size) != source["size"]
    or package.get("model") != source["model"]
    or package.get("calibration")
):
    raise ValueError(
        "Expected the original Seedream export used to register this canopy."
    )

by_id = {row["z_index"]: row for row in package["layers"]}
leaves = []


def add_mesh(entry, sprite, bounds):
    leaves.append(
        {
            **{key: entry[key] for key in ("id", "motion", "root", "tip", "pin")},
            "spread": entry.get("spread", 0),
            "bounds": bounds,
            "texture": publish(sprite, f"layer-{entry['id']:02d}"),
            "textureSize": sprite.size,
        }
    )


# The long petioles run behind the painted leaves and wood.
for owner_id, (sprite, bounds) in build_petiole_supports(args.export, by_id).items():
    add_mesh(
        {"id": 100 + owner_id, "motion": 0, "root": [0, 0], "tip": [1, 0], "pin": 0},
        sprite,
        bounds,
    )

inserts = [
    *build_twig_repairs(args.export, by_id),
    *build_missing_leaves(args.export, by_id),
]
draw_order = {entry["id"] for entry in source["layers"]}
if any(before_id not in draw_order for before_id, *_ in inserts):
    raise ValueError("A restored leaf or stem has no insertion point in the scene.")
for entry in source["layers"]:
    for before_id, part, sprite, bounds in inserts:
        if entry["id"] == before_id:
            add_mesh(part, sprite, bounds)
    if entry["id"] == 9:
        frond, bounds = build_right_frond(args.export, by_id)
        add_mesh(entry, frond, bounds)
        continue
    if entry["id"] == 30:
        sprig, bounds = build_bottom_sprig(args.export, by_id)
        add_mesh(entry, sprig, bounds)
        continue
    layer = by_id[entry["id"]]
    asset = masters / entry["replacement"] if "replacement" in entry else args.export / layer["file"]
    image = Image.open(asset).convert("RGBA")
    if "rgb_offset" in entry:
        # A constant per-channel offset preserves the native vein detail and alpha.
        red, green, blue, alpha = image.split()
        channels = [
            band.point([max(0, min(255, i + delta)) for i in range(256)])
            for band, delta in zip((red, green, blue), entry["rgb_offset"], strict=True)
        ]
        image = Image.merge("RGBA", (*channels, alpha))
    alpha = image.getchannel("A")
    crop = alpha.getbbox()
    if crop is None or alpha.getextrema()[0] == 255:
        raise ValueError(f"Missing transparent shape for layer {entry['id']}.")

    left, top, right, bottom = entry.get("placement", layer["bounding_box"]["absolute"])
    scale_x = (right - left) / image.width
    scale_y = (bottom - top) / image.height
    # Trim only transparent padding. Display size and texture resolution are independent.
    sprite = image.crop(crop)
    add_mesh(
        entry,
        sprite,
        [
            left + crop[0] * scale_x,
            top + crop[1] * scale_y,
            sprite.width * scale_x,
            sprite.height * scale_y,
        ],
    )

if len({layer["id"] for layer in leaves}) != len(leaves):
    raise ValueError("Each rendered layer must have a unique ID.")
manifest = {
    "background": publish(backdrop, "base"),
    "size": backdrop.size,
    "leaves": leaves,
}
(root / "app/canopy-layers.json").write_text(
    json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
)
print(f"Published {len(leaves)} registered Seedream meshes.")
