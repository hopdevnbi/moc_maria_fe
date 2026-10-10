# Service list responsive presentation

## Audit and change

The mobile service card used a tall 94px-wide image column. Its picture wrapper did not fill that column, so the photo kept its short intrinsic height and left large blank bands. Desktop photos were also squeezed into an 82px strip.

Service cards now stack a full-width 16:10 photo above the details. The picture and image both fill the reserved cover with object-fit:cover; reserving the aspect ratio prevents layout shift. Mobile uses one column, tablet two, and desktop three. Prices, names and durations are easier to read; existing actions have visible labels and a 44px minimum touch height. Their destinations are unchanged. Long content can wrap without horizontal overflow.

Reuse the 10 existing owner photographs traced to the local photo folder in demo-services.json. Their 480px/960px WebP variants and versioned Bunny CDN URLs remain unchanged; sizes now matches the full card width rather than 95px. The browser selects the appropriate resized variant and crops into the cover. The first three images load eagerly; other cards use lazy loading. No new image upload, fabricated photo or business-data change is necessary.

## Validation

Browser checks at 320, 390, 768, 1024 and 1440px: all 10 images fill their covers at ratio 1.6, all action buttons fit and are 44px high, and the page has no horizontal overflow. Search for cổ vai gáy returns one result; the action opens the existing detail route with its original prices and consultation links. Clear search restores all 10 results.

Local npm run quality passed: formatting, ESLint, TypeScript, 46 tests and production build. Production rollout evidence will be recorded after release. Changes are limited to ServiceTile presentation, responsive service selectors and the image-loading hint. Service IDs, prices, variants, eligibility, search/filter logic, booking/chat paths, API and backend are unchanged.

