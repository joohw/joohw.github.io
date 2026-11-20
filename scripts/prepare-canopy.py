"""Extract the painted canopy into an underpainting, leaf atlas and picking map.

Run with Python, Pillow, NumPy and OpenCV from any directory.
"""
import hashlib
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[1]
assets = root / "public/images"
image = np.array(Image.open(assets / "indigo-canopy.webp").convert("RGB"))
height, width = image.shape[:2]
planes = json.loads((root / "scripts/canopy-strokes.json").read_text())
groups = {}
for plane in planes:
    for stroke in plane["leaves"]:
        key = stroke[6] if len(stroke) > 6 else len(groups) + 1
        groups.setdefault(key, {"depth": plane["depth"], "strokes": []})["strokes"].append(stroke[:6])

cv2.setNumThreads(1)
cv2.setRNGSeed(42)
labels = np.zeros((height, width), np.uint8)
best = np.zeros((height, width), np.float32)
geometry = {}
for index, group in enumerate(groups.values(), 1):
    strokes = group["strokes"]
    left = max(0, int(min(min(s[0], s[2]) - 2*s[4] - abs(s[5]) - 20 for s in strokes)))
    right = min(width, int(max(max(s[0], s[2]) + 2*s[4] + abs(s[5]) + 20 for s in strokes)))
    top = max(0, int(min(min(s[1], s[3]) - 2*s[4] - abs(s[5]) - 20 for s in strokes)))
    bottom = min(height, int(max(max(s[1], s[3]) + 2*s[4] + abs(s[5]) + 20 for s in strokes)))
    yy, xx = np.mgrid[top:bottom, left:right].astype(np.float32)
    prior = np.zeros_like(xx)
    for x,y,tx,ty,r,bend in strokes:
        dx,dy = tx-x,ty-y
        length = np.hypot(dx,dy)
        t = ((xx-x)*dx + (yy-y)*dy) / length**2
        u = np.clip(t,0,1)
        side = (-(xx-x)*dy + (yy-y)*dx)/length - 4*u*(1-u)*bend
        radius = r * np.maximum(0,np.sin(np.pi*u))**0.68 + 3
        deviation = (side/radius)**2 + ((t-u)*length/9)**2
        prior = np.maximum(prior, np.exp(-0.6*deviation))

    rgb = image[top:bottom,left:right].copy()
    light = cv2.cvtColor(rgb,cv2.COLOR_RGB2GRAY)
    bark = rgb[:,:,0].astype(float) > rgb[:,:,1].astype(float) + 3
    interior = (prior > 0.87) & ~bark
    if not interior.any():
        continue
    light_floor = max(15, np.percentile(light[interior],60)*0.58)
    markers = np.full(light.shape, cv2.GC_BGD, np.uint8)
    markers[prior > 0.07] = cv2.GC_PR_BGD
    markers[(prior > 0.44) & (light >= light_floor)] = cv2.GC_PR_FGD
    seeds = interior & (light >= np.percentile(light[interior],55))
    markers[seeds] = cv2.GC_FGD
    markers[bark | (light < light_floor*0.82)] = cv2.GC_BGD
    if not np.any(markers == cv2.GC_FGD):
        continue
    cv2.grabCut(rgb, markers, None, np.zeros((1,65)), np.zeros((1,65)), 3, cv2.GC_INIT_WITH_MASK)
    fg = (markers & 1).astype(np.uint8)
    n, components, stats, _ = cv2.connectedComponentsWithStats(fg)
    connected = np.unique(components[seeds & (fg != 0)])
    keep = np.isin(components, connected) & (fg != 0)
    score = 0.6*prior + 0.45*group["depth"]
    previous = best[top:bottom,left:right]
    take = keep & (score > previous)
    labels[top:bottom,left:right][take] = index
    previous[take] = score[take]

    x,y = strokes[0][:2]
    tx,ty = max((s[2:4] for s in strokes), key=lambda p:np.hypot(p[0]-x,p[1]-y))
    geometry[index] = {"id": index, "root": [x,y], "tip": [tx,ty], "depth": group["depth"]}

# The broad left blade extends outside the artwork. Seed its complete edge so
# the textured half above its midrib stays with the blade during a pull.
left_blade = next(i for i, g in geometry.items() if g["tip"] == [424,224])
outline = np.array([(0,290),(35,266),(88,249),(134,214),(186,198),(233,192),
    (273,183),(319,190),(370,202),(425,225),(381,239),(345,260),(317,303),
    (288,328),(242,345),(211,358),(192,395),(182,423),(155,440),(119,444),
    (90,451),(76,474),(54,501),(19,517),(0,536)],np.int32)
roi = image[158:550,:441].copy()
shape = np.zeros(roi.shape[:2],np.uint8)
cv2.fillPoly(shape,[outline-[0,158]],255)
markers = np.zeros_like(shape)
markers[cv2.dilate(shape,np.ones((27,27),np.uint8))>0] = cv2.GC_PR_BGD
markers[shape>0] = cv2.GC_PR_FGD
markers[cv2.erode(shape,np.ones((19,19),np.uint8))>0] = cv2.GC_FGD
cv2.grabCut(roi,markers,None,np.zeros((1,65)),np.zeros((1,65)),3,cv2.GC_INIT_WITH_MASK)
labels[labels==left_blade] = 0
labels[158:550,:441][(markers & 1) != 0] = left_blade

occupied = (labels > 0).astype(np.uint8)*255
small = cv2.resize(image,None,fx=0.25,fy=0.25,interpolation=cv2.INTER_AREA)
small_mask = cv2.resize(occupied,(small.shape[1],small.shape[0]),interpolation=cv2.INTER_AREA)
under = cv2.inpaint(small,(small_mask>0).astype(np.uint8),4,cv2.INPAINT_TELEA)
under = cv2.resize(under,(width,height),interpolation=cv2.INTER_CUBIC)
under[occupied==0] = image[occupied==0]
rim = occupied - cv2.erode(occupied,np.ones((15,15),np.uint8))
under = cv2.inpaint(under,rim,3,cv2.INPAINT_TELEA)

sprites = []
for index, leaf in geometry.items():
    ys,xs = np.where(labels==index)
    if not xs.size:
        continue
    x,y = max(0,int(xs.min())-1),max(0,int(ys.min())-1)
    x1,y1 = min(width,int(xs.max())+2),min(height,int(ys.max())+2)
    alpha = (labels[y:y1,x:x1]==index).astype(np.uint8)*255
    sprite = Image.fromarray(image[y:y1,x:x1])
    sprite.putalpha(Image.fromarray(alpha))
    leaf["bounds"] = [x,y,x1-x,y1-y]
    sprites.append((leaf,sprite))

atlas_width = 2048
ax,ay,shelf = 2,2,0
for leaf,sprite in sorted(sprites,key=lambda pair:-pair[1].height):
    if ax+sprite.width+2 > atlas_width:
        ax,ay,shelf = 2,ay+shelf+4,0
    leaf["atlas"] = [ax,ay]
    ax += sprite.width+4
    shelf = max(shelf,sprite.height)
atlas = Image.new("RGBA",(atlas_width,ay+shelf+2))
for leaf,sprite in sprites:
    atlas.paste(sprite,tuple(leaf["atlas"]))
def publish_image(name, data, quality):
    from io import BytesIO
    stream = BytesIO()
    data.save(stream,format="WEBP",quality=quality,method=5)
    content = stream.getvalue()
    filename = f"{name}-{hashlib.sha256(content).hexdigest()[:10]}.webp"
    if not (assets/filename).exists():
        (assets/filename).write_bytes(content)
    return filename

metadata = {
    "underpaint": publish_image("canopy-paper", Image.fromarray(under),93),
    "atlas": publish_image("canopy-leaves",atlas,95),
    "atlasSize":list(atlas.size),
    "leaves":[leaf for leaf,_ in sprites],
}
(root/"app/canopy-layers.json").write_text(json.dumps(metadata,separators=(",",":"))+"\n")
print(f"Separated {len(sprites)} leaves into a {atlas.width} x {atlas.height} atlas")
