"""Copy and index the approved source PNGs, preserving originals byte for byte.

Run: python scripts/prepare-assets.py [--source PATH]
Only files below this 2.0 project are written. Pillow is required.
"""
from __future__ import annotations

import argparse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import re
import shutil

from PIL import Image, features

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT.parent / "Espedro异常生物图鉴"
LABELS = {
    "civilian": ("民间摄影", "Civilian photograph"),
    "dashcam": ("车载视角", "Dashcam perspective"),
    "cctv": ("监控画面", "Surveillance image"),
    "bodycam": ("随身视角", "Bodycam perspective"),
    "military": ("军事视角", "Military perspective"),
    "document": ("研究文档", "Research document"),
    "field": ("现场影像", "Field image"),
}
# These describe visible photographic treatment, never verified origin.
TYPES = {
    1: "field", 2: "field", 3: "civilian", 4: "field", 5: "field",
    6: "field", 7: "civilian", 8: "civilian", 9: "field", 10: "bodycam",
    11: "civilian", 12: "field", 13: "document", 14: "dashcam",
    15: "civilian", 16: "cctv", 17: "field", 18: "civilian",
    19: "field", 20: "field", 21: "cctv", 22: "dashcam", 23: "civilian",
    24: "civilian", 25: "military", 26: "dashcam", 27: "civilian",
    28: "civilian", 29: "field", 30: "dashcam", 31: "dashcam",
    32: "field", 33: "civilian", 34: "field", 35: "document",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def prepare(source: Path) -> list[dict]:
    assert features.check("webp"), "Pillow needs WebP support"
    source = source.resolve(strict=True)
    assert source != ROOT and ROOT not in source.parents, "Source must be outside output"
    files = sorted(source.glob("*.png"), key=lambda p: (int(p.name[:2]), "2.0" in p.stem, p.name))
    assert len(files) == 42, f"Expected 42 PNGs, found {len(files)}"
    counts = Counter(int(p.name[:2]) for p in files)
    assert set(counts) == set(range(1, 36))
    assert {n for n, count in counts.items() if count == 2} == {2, 15, 20, 21, 22, 25, 32}
    for folder in ("assets/originals", "assets/images", "assets/thumbs", "data", "docs"):
        (ROOT / folder).mkdir(parents=True, exist_ok=True)
    ordinals: Counter = Counter()
    tasks = []
    for path in files:
        number = int(path.name[:2])
        ordinals[number] += 1
        tasks.append((path, number, ordinals[number]))

    def convert(task: tuple[Path, int, int]) -> dict:
        path, number, ordinal = task
        image_id = f"ea-{number:03d}-{ordinal:02d}"
        original = ROOT / "assets/originals" / path.name
        display = ROOT / "assets/images" / f"{image_id}.webp"
        thumb = ROOT / "assets/thumbs" / f"{image_id}.webp"
        digest = sha256(path)
        shutil.copy2(path, original)
        assert sha256(original) == digest, f"Original copy mismatch: {path.name}"
        with Image.open(path) as opened:
            assert opened.format == "PNG", path.name
            width, height = opened.size
            image = opened.convert("RGBA" if "A" in opened.getbands() else "RGB")
            full = image.copy()
            full.thumbnail((1920, 1920), Image.Resampling.LANCZOS)
            full.save(display, "WEBP", quality=90, method=6)
            small = image.copy()
            small.thumbnail((700, 700), Image.Resampling.LANCZOS)
            small.save(thumb, "WEBP", quality=86, method=6)
        source_type = TYPES[number]
        version_match = re.search(r"(\d+\.\d+)$", path.stem)
        primary = (ordinal == 1) if number == 25 else (ordinal == counts[number])
        return {
            "id": image_id, "entityId": f"EA-{number:03d}", "number": number,
            "filename": path.name, "version": version_match.group(1) if version_match else "原始版",
            "primary": primary,
            "original": original.relative_to(ROOT).as_posix(),
            "display": display.relative_to(ROOT).as_posix(),
            "thumb": thumb.relative_to(ROOT).as_posix(),
            "width": width, "height": height,
            "displayWidth": full.width, "displayHeight": full.height,
            "bytes": path.stat().st_size, "sha256": digest,
            "sourceType": source_type, "sourceLabel": LABELS[source_type][0],
            "sourceEnglish": LABELS[source_type][1],
        }

    with ThreadPoolExecutor(max_workers=4) as executor:
        images = list(executor.map(convert, tasks))
    assert len(images) == 42 and sum(item["primary"] for item in images) == 35
    assert all(sum(x["primary"] for x in images if x["number"] == n) == 1 for n in range(1, 36))
    (ROOT / "data/images.json").write_text(json.dumps(images, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    sizes = {name: sum((ROOT / image[name]).stat().st_size for image in images) for name in ("original", "display", "thumb")}
    rows = "\n".join(f"| {key} | {value:,} | {value / 1024**2:.2f} MiB |" for key, value in sizes.items())
    small = [image for image in images if max(image["width"], image["height"]) < 1920]
    small_rows = "\n".join(f"| {image['filename']} | {image['width']} × {image['height']} |" for image in small)
    report = f"""# Image asset preparation

42 genuine source PNGs cover EA-001 through EA-035. All 42 images were reviewed in contact sheets under `assets/qa/`; no content was cropped, retouched, recolored or overlaid. Originals are copied intact; each copied original was checked against its source SHA-256. The index stores the original file byte count and SHA-256.

## Delivery

| Variant | Bytes | Size |
| --- | ---: | ---: |
{rows}

There are 42 originals, 42 display WebPs and 42 thumbnail WebPs. Display files use a maximum side of 1920 px, quality 90, method 6. Thumbnails use a maximum side of 700 px, quality 86, method 6. Both preserve source aspect ratio and never upscale. Source PNG dimensions and actual display dimensions are indexed.

Exactly 35 images are primary, one per entity. Latest explicit versions are primary for 02, 15, 20, 21, 22 and 32. EA-025 deliberately uses the higher-resolution `25流苏.png`; its 2.0 companion remains accessible. EA-007 has only `07云彩1.0.png`. Unversioned names retain the label 原始版 rather than receiving an invented version.

## Source labels

Source types and bilingual labels describe visible photographic treatment, not authenticated provenance. Clear examples include document pages (13, 35), elevated surveillance/infrared framing (16, 21), a vehicle dashboard/window framing (14, 22, 26, 30, 31), and visible military equipment (25). Uncertain views fall back to 现场影像 / Field image. No new timestamps, camera identifiers, organizations or overlays were invented. Existing markings remain part of the unchanged source pixels.

## Sources smaller than the display limit

These retain their original dimensions in the display output; no missing detail is manufactured.

| Source | Dimensions |
| --- | --- |
{small_rows}

## Rebuild

From the 2.0 directory, run `python scripts/prepare-assets.py`. An alternate read-only source directory may be supplied with `--source`. The script checks the exact entity/pair counts, PNG format, copied hashes and primary selection before writing `data/images.json`.
"""
    (ROOT / "docs/assets-report.md").write_text(report, encoding="utf-8")
    print(json.dumps({"images": len(images), "primary": sum(i["primary"] for i in images), "bytes": sizes, "small": [{"filename": i["filename"], "width": i["width"], "height": i["height"]} for i in small]}, ensure_ascii=False, indent=2))
    return images


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    prepare(parser.parse_args().source)
