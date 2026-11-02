# Quick account creation during booking

Date: 2026-11-02. Owner authorized integration into main and immediate production deployment.

## Customer journey

An anonymous visitor selects a KTV, service, location and time as before. The booking action opens a branded native modal on the same page. The customer can register with name, phone (or email) and password, or switch to login for an existing account. Completing either action automatically submits the selected appointment inquiry. Success remains a request awaiting KTV response and confirmation, consistent with the existing booking workflow.

The registration password schema is extracted unchanged from the regular registration form and shared with the modal. Existing authentication and inquiry APIs, customer permissions, address/time validation and server idempotency remain authoritative. No backend, database or provider-directory changes are introduced.

## Reliability

- Registration/login returns an authenticated response. The first inquiry uses its access token directly, avoiding a React context timing race. Subsequent manual retries use the normal authenticated request helper.
- Synchronous in-flight guards prevent duplicate registration or inquiry submissions. An unchanged request retains its UUID when the network fails.
- An account created successfully is retained even if the inquiry fails; the modal closes and the page retains the booking fields with an error and normal retry action.
- Signup errors remain in the modal. A duplicate account can switch to login with the contact value retained.
- Time is checked again after account creation. An expired choice returns the customer to the preserved form without silently changing or submitting it.
- Passwords remain in component memory, are cleared after authentication and never enter booking URLs, booking payloads or browser storage. No new automatic request is triggered by a page load or generic authentication change.

## Mobile and accessibility

The action button remains above the mobile navigation. The popup becomes a bottom sheet on small screens, follows VisualViewport height/offset for the software keyboard, and condenses its header on shorter screens. Inputs use 16px text, suitable autocomplete and phone/email keyboard modes. Primary actions are at least 48px high; secondary controls have 44px targets.

Native dialog modality provides background isolation and focus containment. Opening focuses the heading without opening the keyboard; closing restores focus and body scrolling. Submission prevents accidental closing while its account/inquiry requests are running. Inline errors describe their related fields, status labels describe pending work, and reduced-motion preferences are respected.

## Validation evidence

- Full frontend suite: 235 tests in 59 files pass. Six guest-flow regressions cover fresh-token registration and exactly-once submission under delay, duplicate-account login, network failure with stable retry UUID, cancel/home-address preservation, shared password validation/email signup and expired-time revalidation.
- Browser with live read-only public KTV data: selected Nguyệt Nguyễn and service are retained in the popup. Native modal mode and no horizontal overflow verified at 320×568, 390×844 and 1440×900. At a 390×420 visible viewport, the dialog fits from y=12 to y=420 and its submit button remains within the viewport. Switching to login stays on the same booking page.
- Existing backend registration contract was traced through customer-role/session creation; the inquiry service validates customer permissions, provider/service availability, time, address and idempotency, then persists status PENDING. These backend paths are unchanged. Automated frontend request/response tests use mocked transport; no production accounts, inquiries, messages or business fixtures are created for QA.
- Formatting, lint and TypeScript pass (three inherited lint warnings outside the implementation). Dependency audit reports zero vulnerabilities. Deployment and exact live commit evidence are recorded separately in the workspace Plan claim.
