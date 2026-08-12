# Movimento V2 source masters

This directory contains private production masters for the nineteen approved visual families. Source masters may be high-quality JPEG (`quality 92`) or PNG:

- chapters use one `<SCENE-ID>.<jpg|png>` landscape master, at least `1440 × 940`, for both native crops;
- heroes use `<SCENE-ID>-mobile.<jpg|png>` at least `768 × 1365` and `<SCENE-ID>-desktop.<jpg|png>` at least `1440 × 810` so each direction keeps native art direction.

The accepted IDs and their order are defined in `scripts/build-movement-assets.mjs`. Masters are never served directly. The script creates metadata-free AVIF, WebP and progressive JPEG renditions under `public/movimento/v2/` without upscaling.

Chapter mobile renditions use `480` and `752` pixels. `752 × 940` is the largest native 4:5 crop of the approved `1672 × 940` scene masters; using `768` would upscale and reduce iPhone quality. Hero mobile masters remain native portrait assets at `480` and `768` pixels.

No master may contain a generated or redrawn Bentô wordmark, product, package or sponsor name. `scripts/build-movement-assets.mjs` applies the official wordmark through an explicit coordinate map, and composes the approved shirt reference or real product lineup only in their declared scene IDs. Sponsor personalization remains an external HTML/CSS callout and never enters the raster. The Movement surface transfers no full TTF files: it uses native system serif and sans-serif stacks because no deterministic WOFF2 subsetter is part of this repository.
