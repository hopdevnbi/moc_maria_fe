# Event link preview image

The owner observed a broken image in an Ads Manager placement preview. Before this change, the page and its 640×640 WebP image both returned HTTP 200 for a normal browser and a facebookexternalhit user agent. A server-side missing file was not reproduced; stale Meta preview data or a placement-specific creative problem remains possible.

The event metadata now uses an immutable 1200×630 JPEG on the existing Bunny CDN, explicit image type, dimensions and secure URL, and matching Open Graph URL/canonical for https://event.mocmaria.com/. Twitter uses the same image. The card reuses the existing editable gift SVG; no prize, price or eligibility claim was added. The source SVG and final JPEG are retained in public/event/social.

Validation: original and CDN image headers/bytes checked with normal and Facebook crawler user agents. The new JPEG is 53,214 bytes. No authentication, cookie, signed URL or browser JavaScript is needed to fetch it. Production verification must check the rendered metadata and referenced image after deployment.

Meta error 3858385 shown in the owner's screenshot is a separate account authentication requirement. It cannot be cleared by a website or image change. No ad, budget, account security or campaign publication was changed. The owner should complete the displayed verification, refresh the page in Meta Sharing Debugger with Scrape Again, then reload the ad preview. If a saved ad creative retains its earlier image, reselect the website preview/image in the ad draft without publishing until reviewed.

No backend, schema or business data change.
