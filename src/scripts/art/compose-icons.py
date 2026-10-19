from PIL import Image, ImageDraw, ImageFilter
import os

from narwhals import Unknown
out = './artifacts/cover'; pub = './public/icons'; os.makedirs(pub, exist_ok=True)
art = Image.open('artifacts/cover/raw/icon-3d.png').convert('RGBA')



def make(size, rounded):
    px: PixelAccess | Unknown = None

    bg = Image.new('RGBA', (size, size))
    px = bg.load(); c0 = (16, 34, 66); c1 = (10, 96, 112)
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * size); px[x, y] = tuple(int(c0[i] + (c1[i] - c0[i]) * t) for i in range(3)) + (255,)
    glow = Image.new('RGBA', (size, size), (0, 0, 0, 0)); d = ImageDraw.Draw(glow); r = int(size * 0.42)
    d.ellipse([size // 2 - r, int(size * 0.58) - r, size // 2 + r, int(size * 0.58) + r], fill=(60, 180, 200, 120)); glow = glow.filter(ImageFilter.GaussianBlur(size * 0.12)); bg.alpha_composite(glow)
    a = art.crop(art.getbbox()); scale = (size * (0.78 if rounded else 0.7)) / max(a.size); a = a.resize((int(a.width * scale), int(a.height * scale)), Image.LANCZOS)
    shadow = Image.new('RGBA', a.size, (0, 0, 0, 0)); shadow.paste((0, 0, 0, 140), mask=a.split()[3]); shadow = shadow.filter(ImageFilter.GaussianBlur(size * 0.02))
    pos = ((size - a.width) // 2, int((size - a.height) / 2 + size * 0.03))
    bg.alpha_composite(shadow, (pos[0] + int(size * 0.01), pos[1] + int(size * 0.03))); bg.alpha_composite(a, pos)
    if rounded:
        mask = Image.new('L', (size, size), 0); ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.22), fill=255)
        bg.putalpha(mask)
        return bg
    return bg.convert('RGB')
make(1024, True).save(f'{out}/icon-1024.png')
make(512, True).save(f'{pub}/icon-512.png'); make(192, True).save(f'{pub}/icon-192.png')
make(512, False).save(f'{pub}/icon-512-maskable.png')
make(512, True).save(f'{out}/icon-512.png')
print('icons ok')
