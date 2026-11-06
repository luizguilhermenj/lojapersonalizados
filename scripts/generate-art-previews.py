"""Derivados locais de visualização. Não altera originais, manifest ou IDs comerciais.
Requer Pillow 12.3 (ferramenta de desenvolvimento; não é dependência do servidor).
"""
import json, re
from pathlib import Path
from PIL import Image, ImageOps
root = Path(__file__).resolve().parent.parent
public = root / 'public'
arts = json.loads((public / 'data/caneca-ceramica-artes.json').read_text())
assert len({a['id'] for a in arts}) == len(arts), 'IDs duplicados'
out = public / 'img/art-previews'
out.mkdir(exist_ok=True)
manifest = {}
for art in arts:
    identifier = art['id']
    assert re.fullmatch(r'[a-zA-Z0-9_-]+', identifier), 'ID inválido'
    source = (public / art['image'].lstrip('/')).resolve()
    assert source.is_relative_to(public.resolve()), 'Caminho fora de public'
    with Image.open(source) as original:
        image = ImageOps.exif_transpose(original).convert('RGBA')
        background = Image.new('RGBA', image.size, '#FFFFFF')
        background.alpha_composite(image)
        image = background.convert('RGB')
        entry = {}
        for key, size, quality in [('small',200,72),('medium',400,76),('preview',800,82)]:
            version = ImageOps.pad(image, (size,size), method=Image.Resampling.LANCZOS, color='#FFFFFF')
            filename = f'{identifier}-{size}.webp'
            version.save(out / filename, 'WEBP', quality=quality, method=6)
            entry[key] = f'/img/art-previews/{filename}'
        manifest[identifier] = entry
(public / 'data/art-previews.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(f'{len(manifest)} IDs preservados; {len(manifest)*3} derivados; {sum(p.stat().st_size for p in out.glob("*.webp"))} bytes')
