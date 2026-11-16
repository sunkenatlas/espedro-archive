# Image asset preparation

42 genuine source PNGs cover EA-001 through EA-035. All 42 images were reviewed in contact sheets under `assets/qa/`; no content was cropped, retouched, recolored or overlaid. Originals are copied intact; each copied original was checked against its source SHA-256. The index stores the original file byte count and SHA-256.

## Delivery

| Variant | Bytes | Size |
| --- | ---: | ---: |
| original | 91,523,175 | 87.28 MiB |
| display | 7,643,238 | 7.29 MiB |
| thumb | 1,500,368 | 1.43 MiB |

There are 42 originals, 42 display WebPs and 42 thumbnail WebPs. Display files use a maximum side of 1920 px, quality 90, method 6. Thumbnails use a maximum side of 700 px, quality 86, method 6. Both preserve source aspect ratio and never upscale. Source PNG dimensions and actual display dimensions are indexed.

Exactly 35 images are primary, one per entity. Latest explicit versions are primary for 02, 15, 20, 21, 22 and 32. EA-025 deliberately uses the higher-resolution `25流苏.png`; its 2.0 companion remains accessible. EA-007 has only `07云彩1.0.png`. Unversioned names retain the label 原始版 rather than receiving an invented version.

## Source labels

Source types and bilingual labels describe visible photographic treatment, not authenticated provenance. Clear examples include document pages (13, 35), elevated surveillance/infrared framing (16, 21), a vehicle dashboard/window framing (14, 22, 26, 30, 31), and visible military equipment (25). Uncertain views fall back to 现场影像 / Field image. No new timestamps, camera identifiers, organizations or overlays were invented. Existing markings remain part of the unchanged source pixels.

## Sources smaller than the display limit

These retain their original dimensions in the display output; no missing detail is manufactured.

| Source | Dimensions |
| --- | --- |
| 01指节.png | 1024 × 1024 |
| 02掌心.png | 1024 × 1024 |
| 02掌心2.0.png | 1448 × 1086 |
| 03多指.png | 1086 × 1448 |
| 04海葵.png | 1008 × 1792 |
| 05口腔.png | 1024 × 1024 |
| 06脸颊.png | 1448 × 1086 |
| 07云彩1.0.png | 1086 × 1448 |
| 08远方.png | 1008 × 1792 |
| 09魔方.png | 1672 × 941 |
| 10万花筒.png | 1792 × 1008 |
| 11眼球.png | 1086 × 1448 |
| 12古茨曼.png | 1008 × 1792 |
| 13薛定谔.png | 1024 × 1344 |
| 14尸体.png | 1008 × 1792 |
| 15母亲.png | 1008 × 1792 |
| 15母亲2.0.png | 941 × 1672 |
| 16透明.png | 1448 × 1086 |
| 17黑暗.png | 1008 × 1792 |
| 18爱人.png | 1008 × 1792 |
| 19密友.png | 1008 × 1792 |
| 20门户.png | 1008 × 1792 |
| 20门户2.0.png | 941 × 1672 |
| 21探员1.0.png | 1008 × 1792 |
| 21探员2.0.png | 941 × 1672 |
| 22士兵.png | 1792 × 1008 |
| 22士兵2.0.png | 1672 × 941 |
| 23播客.png | 1008 × 1792 |
| 24旅客.png | 1448 × 1086 |
| 25流苏.png | 1672 × 941 |
| 25流苏2.0.png | 695 × 452 |
| 26委员.png | 1672 × 941 |
| 27常数.png | 1008 × 1792 |
| 28相切.png | 1008 × 1792 |
| 29正割.png | 1008 × 1792 |
| 30余数.png | 941 × 1672 |
| 31哨卡.png | 1792 × 1008 |
| 32法拉第.png | 1086 × 1448 |
| 32法拉第2.0.png | 1448 × 1086 |
| 33人群.png | 1008 × 1792 |
| 34塔楼.png | 1448 × 1086 |
| 35降神.png | 1448 × 1086 |

## Rebuild

From the 2.0 directory, run `python scripts/prepare-assets.py`. An alternate read-only source directory may be supplied with `--source`. The script checks the exact entity/pair counts, PNG format, copied hashes and primary selection before writing `data/images.json`.
