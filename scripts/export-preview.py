#!/usr/bin/env python3
"""Export a portable review artifact; the normal website remains unbundled."""
import base64
import json
import mimetypes
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs/qa/preview.html"


def data_url(path):
    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode()}"


html = (ROOT / "index.html").read_text()
for stylesheet in ("assets/fonts/fonts.css", "src/styles.css", "src/map.css"):
    path = ROOT / stylesheet
    css = path.read_text()
    css = re.sub(r"url\(([^)]+)\)", lambda match: "url(" + data_url(path.parent / match[1].strip("\"'")) + ")", css)
    html = html.replace(f'<link rel="stylesheet" href="./{stylesheet}">', f"<style>{css}</style>")

data = json.loads((ROOT / "data/popes.json").read_text())
for era in data["eras"]:
    era["marker"] = data_url(ROOT / era["marker"])

geography = (ROOT / "src/map-geography.js").read_text().replace("export const countries", "const countries", 1)
map_code = (ROOT / "src/map.js").read_text().replace("import { countries } from './map-geography.js';", "", 1)
map_code = map_code.replace("export function ", "function ")
app = (ROOT / "src/app.js").read_text()
fetch_code = "const response=await fetch('./data/popes.json');"
import_code = "const{createMap}=await import('./map.js');"
assert app.count(fetch_code) == 1 and app.count(import_code) == 1, "Update export transforms for changed initialization"
app = app.replace(fetch_code, "const response={ok:true,json:async()=>embeddedData};", 1).replace(import_code, "", 1)
embedded = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
script = f"const embeddedData={embedded};\nconst {{createMap}}=(()=>{{\n{geography}\n{map_code}\nreturn {{createMap}};\n}})();\n{app}"
for artwork in (ROOT / "assets/artwork").glob("*.webp"):
    local = "assets/artwork/" + artwork.name
    encoded = data_url(artwork)
    html = html.replace("./" + local, encoded)
    script = script.replace("./" + local, encoded)
script = script.replace("</script", "<\\/script")
html = html.replace('<script type="module" src="./src/app.js"></script>', f'<script type="module">{script}</script>')
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(html)
print(f"Exported {OUTPUT.relative_to(ROOT)} ({OUTPUT.stat().st_size:,} bytes)")
