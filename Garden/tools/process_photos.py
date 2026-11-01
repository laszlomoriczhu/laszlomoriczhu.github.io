"""Read originals without modifying them; regenerate the embedded gallery and WebP assets.
Usage: python tools/process_photos.py [source directory]
Requires Pillow with WebP support. ZIP image members are read directly, never extracted.
"""
from pathlib import Path
from PIL import Image, ImageOps
from io import BytesIO
import hashlib, json, re, sys, zipfile
ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path(sys.argv[1]) if len(sys.argv)>1 else Path('C:/Garden')
EXT={'.jpg','.jpeg','.png','.webp','.tif','.tiff'}
VERSION='webp-1600-q80-480-q73-v1'
cache_path=ROOT/'tools/photo-cache.json'
cache=json.loads(cache_path.read_text(encoding='utf-8')) if cache_path.exists() else {}
photos=[]; seen=set(); duplicates=[]; errors=[]; missing=[]; dates=[]; original_bytes=0; output_bytes=0; reused=0

def sources():
    for folder,album in [('KEZDETEK','kezdetek'),('LAKOINK','lakok'),('VIRAGOK',None)]:
        for p in sorted((SOURCE/folder).rglob('*')):
            if not p.is_file(): continue
            if p.suffix.lower() in EXT: yield album,str(p.relative_to(SOURCE)),p.read_bytes()
            elif p.suffix.lower()=='.zip':
                try:
                    with zipfile.ZipFile(p) as z:
                        for info in z.infolist():
                            if not info.is_dir() and Path(info.filename).suffix.lower() in EXT:
                                yield album,str(p.relative_to(SOURCE))+'::'+info.filename,z.read(info)
                except Exception as e: errors.append({'source':str(p),'error':str(e)})

def get_date(im):
    exif=im.getexif()
    try: sub=exif.get_ifd(34665)
    except Exception: sub={}
    for value in [sub.get(36867),sub.get(36868),exif.get(36867),exif.get(306)]:
        m=re.match(r'^(\d{4})[:\-](\d{2})[:\-](\d{2})',str(value or ''))
        if m:
            import datetime
            try: return datetime.date(*map(int,m.groups())).isoformat()
            except ValueError: pass
    return None

for special,name,data in sources():
    digest=hashlib.sha256(data).hexdigest(); key=(special,digest)
    if key in seen: duplicates.append(name); continue
    seen.add(key)
    try:
        with Image.open(BytesIO(data)) as original:
            date=get_date(original)
            if date:
                year=int(date[:4])-(int(date[5:7])<3)
                album=special or str(year)
            else: album=special or 'undated'; missing.append(name)
            stem=digest[:20]; thumb=f'images/{album}/thumbs/{stem}.webp'; large=f'images/{album}/large/{stem}.webp'
            old=cache.get(digest,{})
            if old.get('version')==VERSION and (ROOT/thumb).exists() and (ROOT/large).exists(): reused+=1
            else:
                im=ImageOps.exif_transpose(original).convert('RGB')
                for relative,size,quality in [(thumb,480,73),(large,1600,80)]:
                    target=ROOT/relative;target.parent.mkdir(parents=True,exist_ok=True)
                    web=im.copy();web.thumbnail((size,size),Image.Resampling.LANCZOS)
                    web.save(target,'WEBP',quality=quality,method=6)
            width,height=original.size
            photo={'album':album,'date':date,'thumb':thumb,'src':large,'alt':{'kezdetek':'A kert kezdetei','lakok':'A kert lakója'}.get(special,'Csilla és Laci kertje')}
            photos.append(photo);cache[digest]={'version':VERSION,'source':name,'date':date,'width':width,'height':height}
            original_bytes+=len(data);output_bytes+=(ROOT/thumb).stat().st_size+(ROOT/large).stat().st_size
    except Exception as e: errors.append({'source':name,'error':str(e)})
photos.sort(key=lambda p:(p['date'] or '',p['src']))
page=ROOT/'Garden.html';html=page.read_text(encoding='utf-8-sig')
html,n=re.subn(r'const photos=\[.*?\];',lambda _: 'const photos='+json.dumps(photos,ensure_ascii=False,separators=(',',':'))+';',html,count=1,flags=re.S)
if n!=1: raise RuntimeError('Embedded photo data marker not found')
page.write_text(html,encoding='utf-8')
cache_path.write_text(json.dumps(cache,ensure_ascii=False,indent=2),encoding='utf-8')
from collections import Counter
report={'photos':len(photos),'albums':dict(Counter(p['album'] for p in photos)),'original_bytes':original_bytes,'web_bytes':output_bytes,'reused':reused,'duplicates_skipped':duplicates,'missing_exif_date':missing,'errors':errors}
(ROOT/'tools/processing-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=True,indent=2))
