"""Complete the small, dark bottom-center sprig from Seedream's own blades."""

import math

from PIL import Image

from canopy_twigs import _leaf, _stalk_samples, _twig


# Landmarks and connected-component seeds in the native layer 30 PNG.
_BLADES = {
    "arched": ((730, 635), (604.5, 637), (362, 402)),
    "upright": ((747.7, 663), (799.8, 538.5), (666, 346)),
}


def _shade(image, kind, offsets):
    midpoint = (33, 43, 67) if kind == "arched" else (25, 33, 55)
    lut = [
        min(255, max(0, round((value - mid) * 0.58 + mid + shift)))
        for mid, shift in zip(midpoint, offsets)
        for value in range(256)
    ]
    return image.point(lut + list(range(256)))


def build_bottom_sprig(export_dir, by_id):
    """Return a single native-density sprite containing all attached leaves."""
    layer = by_id[30]
    native = Image.open(export_dir / layer["file"]).convert("RGBA")
    left, top, right, bottom = layer["bounding_box"]["absolute"]
    sx, sy = native.width / (right - left), native.height / (bottom - top)
    canvas = Image.new("RGBA", (native.width, math.ceil((825 - top) * sy)))

    def place(sprite, bounds):
        x, y, w, h = bounds
        tile = sprite.resize((round(w * sx), round(h * sy)), Image.Resampling.LANCZOS)
        canvas.alpha_composite(tile, (round((x - left) * sx), round((y - top) * sy)))

    # The central stalk runs upward behind the leaf bases. Transposing lets
    # us use genuine transverse petiole samples for these nearly vertical arcs.
    native_stalk = _stalk_samples(export_dir, by_id[18])
    samples = [
        sample.point(
            [round(v * factor) for factor in (0.49, 0.5, 0.60) for v in range(256)]
            + list(range(256))
        )
        for sample in native_stalk
    ]
    for start, end, slopes, widths in (
        ((708, 579), (751, 682), (0.69, 0.19), (1.0, 2.6)),
        ((750.4, 679), (759, 773), (0.2, 0.04), (2.6, 3.8)),
        ((729, 633), (744, 653), (0.77, 0.42), (1.3, 2.3)),
        ((732, 653), (751, 679), (0.94, 0.50), (1.2, 2.2)),
    ):
        stalk, (y, x, h, w) = _twig(
            samples, (start[1], start[0]), (end[1], end[0]), slopes, widths
        )
        place(stalk.transpose(Image.Transpose.TRANSPOSE), (x, y, w, h))

    # Draw the darker rear leaves first. The original four bright Seedream
    # blades sit over these junctions, as in the reference illustration.
    for kind, root, tip, across, shade in (
        ("arched", (709, 582), (606, 598), 1.10, (-10, -10, -11)),
        ("upright", (738, 641), (709, 579), -0.77, (-6, -5, -6)),
        ("arched", (756, 721), (659, 675), 0.86, (-9, -10, -13)),
        ("arched", (757, 750), (616, 746), 0.88, (-8, -9, -10)),
        ("arched", (755, 750), (672, 751), 0.77, (-3, -4, -3)),
        ("arched", (744, 751), (621, 824), 1.36, (0, 1, 4)),
        ("arched", (744, 751), (798, 768), -0.82, (0, 1, 4)),
    ):
        source_root, source_tip, seed = _BLADES[kind]
        blade, bounds = _leaf(
            export_dir, layer, source_root, source_tip, root, tip, across, seed=seed
        )
        place(_shade(blade, kind, shade), bounds)

    canvas.alpha_composite(native)
    x0, y0, x1, y1 = canvas.getchannel("A").getbbox()
    return canvas.crop((x0, y0, x1, y1)), [
        left + x0 / sx,
        top + y0 / sy,
        (x1 - x0) / sx,
        (y1 - y0) / sy,
    ]
