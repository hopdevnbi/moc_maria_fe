# Linked KTV booking preselection

A provider/service query identifies the appointment form instance so client navigation cannot retain another KTV from a previous booking route. The clicked provider takes precedence over a stored sign-in draft; a draft for a different provider is discarded rather than mixing private address, service and provider contexts. Same-provider sign-in drafts still restore.

Provider links accept the directory ID and its real chat receiver ID. A linked KTV is displayed in a compact selected card, with an explicit Change KTV action. Services remain filtered to that provider. General booking still offers the full provider picker. Backend contracts, prices and booking confirmation rules are unchanged.

Validation: full quality passed (format, lint, typecheck, 61 tests, Next build). Three added interaction cases cover both ID forms and conflicting sign-in draft. Browser client navigation Mai Anh → home → Bảo Ngọc selects Bảo Ngọc correctly, without page reload; compact selected card visible, service options filtered. Mobile 390px shows the correct selected card and no horizontal overflow.
