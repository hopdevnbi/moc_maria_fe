# Mộc Maria brand homepage — 2026-10-13

Owner-supplied logo is now used in the shared public header and homepage hero. Header uses a CSS viewport of the supplied monogram with readable HTML brand name and the correct WELLNESS LOUNGE tagline. Hero displays the complete transparent logo with an ivory/sage background, restrained gold details and clear links to KTV selection and services. Existing provider cards, complete service rows, filters, chat and booking links are retained.

Assets:
- `public/brand/moc-maria-official-20261013.png`: full 1254 × 1254 transparent PNG, 648178 bytes.
- `public/brand/moc-maria-official-20261013.webp`: 640 × 640 transparent web export, 99348 bytes, used on the website (about 85% less transfer).
- CDN PNG: https://giangxa-media-cdn.b-cdn.net/moc-maria/brand/moc-maria-logo-transparent-20261013-v1.png
- CDN WebP: https://giangxa-media-cdn.b-cdn.net/moc-maria/brand/moc-maria-logo-transparent-20261013-v1.webp

Creation: built-in imagegen edit, followed by WebP encoding/downscaling for delivery. Prompt: “Remove ONLY the white background, including all white interior negative spaces, to genuine transparent alpha. Preserve the supplied green monogram with leaves/flames, proportions, green gradient, serif lettering and gold tagline. Exact text: MỘC MARIA and WELLNESS LOUNGE with botanical decorations. Do not redraw, simplify, rearrange or add elements, shadows or effects. Center the complete logo with a small transparent safe margin.” Source image remains untouched. Both new CDN assets uploaded with HTTP201 and served with HTTP200 and correct MIME types.

Validation: format/lint/typecheck/build and all 106 existing tests pass, including all ten service filters. Browser visual checks at desktop1440, tablet768 and phone390/320; no horizontal document overflow. Browser Gội đầu sạch filter returns the same three KTV with complete assignments/prices. Exact main source, CI, production deployment and live confirmation are recorded in the own release claim in Plan/14_ACTIVE_WORK.json.
