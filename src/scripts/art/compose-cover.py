from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math, os
W, H = 2560, 1440
out = './artifacts/cover'
os.makedirs(out, exist_ok=True)

def gradient_bg(w, h):
    bg = Image.new('RGB', (w, h))
    px = bg.load()
    c0 = (9, 18, 36); c1 = (14, 48, 76); c2 = (8, 92, 104)
    for y in range(h):
        for x in range(0, w):
            t = (x / w) * 0.6 + (y / h) * 0.4
            if t < 0.55:
                k = t / 0.55; c = tuple(int(c0[i] + (c1[i] - c0[i]) * k) for i in range(3))
            else:
                k = (t - 0.55) / 0.45; c = tuple(int(c1[i] + (c2[i] - c1[i]) * k) for i in range(3))
            px[x, y] = c
    return bg

def glow(base, center, radius, color, strength):
    layer = Image.new('RGBA', base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse([center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius], fill=color + (strength,))
    layer = layer.filter(ImageFilter.GaussianBlur(radius * 0.6))
    base.alpha_composite(layer)

def grid(base, spacing=96, alpha=22):
    layer = Image.new('RGBA', base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    w, h = base.size
    # subtle perspective-free dot grid
    for y in range(0, h, spacing):
        for x in range(0, w, spacing):
            d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=(180, 220, 240, alpha))
    base.alpha_composite(layer)

def compose(size, layout):
    w, h = size
    bg = gradient_bg(w, h).convert('RGBA')
    grid(bg, spacing=int(w / 26))
    glow(bg, (int(w * layout['glow_x']), int(h * layout['glow_y'])), int(w * 0.28), (40, 170, 190), 110)
    glow(bg, (int(w * 0.12), int(h * 0.15)), int(w * 0.22), (80, 120, 230), 70)
    # 3D layer
    art = Image.open('artifacts/cover/raw/cover-3d.png').convert('RGBA')
    bbox = art.getbbox(); art = art.crop(bbox)
    target_w = int(w * layout['art_w'])
    scale = target_w / art.width
    art = art.resize((target_w, int(art.height * scale)), Image.LANCZOS)
    # soft shadow under art
    shadow = Image.new('RGBA', art.size, (0, 0, 0, 0))
    alpha = art.split()[3]
    shadow.paste((0, 0, 0, 150), mask=alpha)
    shadow = shadow.filter(ImageFilter.GaussianBlur(40))
    ax = int(w * layout['art_x']) ; ay = int(h * layout['art_y'])
    bg.alpha_composite(shadow, (ax + 10, ay + 60))
    bg.alpha_composite(art, (ax, ay))
    d = ImageDraw.Draw(bg)
    # text block
    title_font = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc', int(h * layout['title_size']))
    sub_font = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', int(h * layout['sub_size']))
    pill_font = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', int(h * layout['pill_size']))
    tx, ty = int(w * layout['text_x']), int(h * layout['text_y'])
    lines = layout['title']
    for line in lines:
        d.text((tx + 4, ty + 6), line, font=title_font, fill=(0, 0, 0, 110))
        d.text((tx, ty), line, font=title_font, fill=(246, 250, 255, 255))
        ty += int(h * layout['title_size'] * 1.08)
    ty += int(h * 0.02)
    for line in layout['subtitle']:
        d.text((tx, ty), line, font=sub_font, fill=(200, 228, 240, 255))
        ty += int(h * layout['sub_size'] * 1.35)
    ty += int(h * 0.03)
    px = tx
    for label, color in [('Cloud', (74, 143, 214)), ('On-premise', (201, 138, 46)), ('Hybrid', (155, 107, 209))]:
        tw = d.textlength(label, font=pill_font)
        pad = int(h * 0.014); ph = int(h * layout['pill_size'] * 1.9)
        d.rounded_rectangle([px, ty, px + tw + pad * 2, ty + ph], radius=ph // 2, fill=color + (255,))
        d.text((px + pad, ty + (ph - int(h * layout['pill_size'] * 1.25)) // 2), label, font=pill_font, fill=(255, 255, 255, 255))
        px += int(tw + pad * 2 + h * 0.014)
    if layout.get('footer'):
        foot_font = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', int(h * 0.022))
        d.text((tx, int(h * 0.93)), layout['footer'], font=foot_font, fill=(170, 200, 215, 255))
    return bg.convert('RGB')

landscape = compose((2560, 1440), dict(glow_x=0.7, glow_y=0.6, art_w=0.62, art_x=0.4, art_y=0.05, title=['Architecture', 'Decision Workspace'], title_size=0.085, subtitle=['Decide where your web application should run.', 'Compare cloud, on-premise and hybrid side by side,', 'change one requirement and see every consequence.'], sub_size=0.03, pill_size=0.024, text_x=0.055, text_y=0.3, footer='Immersive, hands-first decision support. Conceptual patterns, traceable findings, exportable records.'))
landscape.save(f'{out}/cover-landscape-2560x1440.png', optimize=True)
landscape.resize((1920, 1080), Image.LANCZOS).save(f'{out}/cover-1920x1080.jpg', quality=90)
square = compose((1440, 1440), dict(glow_x=0.6, glow_y=0.65, art_w=0.88, art_x=0.08, art_y=0.42, title=['Architecture', 'Decision', 'Workspace'], title_size=0.075, subtitle=['Decide where your web application should run.'], sub_size=0.03, pill_size=0.024, text_x=0.07, text_y=0.07))
square.save(f'{out}/cover-square-1440x1440.png', optimize=True)
portrait = compose((1008, 1440), dict(glow_x=0.5, glow_y=0.72, art_w=1.15, art_x=-0.1, art_y=0.44, title=['Architecture', 'Decision', 'Workspace'], title_size=0.06, subtitle=['Decide where your web', 'application should run.'], sub_size=0.028, pill_size=0.022, text_x=0.08, text_y=0.07))
portrait.save(f'{out}/cover-portrait-1008x1440.png', optimize=True)
print('ok')
