# Optional counter reference — 2026-10-16

Owner direction: Mộc Maria reconciles internally without a POS system. Invoice or sales-slip references are optional, including for percentage vouchers.

- Counter field is now “Mã đối soát nội bộ (không bắt buộc)”. It can be left empty and has no invoice-format or minimum-length requirement. A supplied note remains limited to 100 characters.
- After online verification and a positive catalog-based discount quote, staff can confirm without a reference. CODE and QR paths both send the selected catalog items; blank references are omitted from the request.
- Backend redemption requires catalog items for percentage vouchers, independently of the optional reference. It still recalculates prices and checks branch permission, credential/reward expiry, stock reward status and one-time/idempotent redemption.
- Empty or whitespace-only references are omitted from redemption metadata. The existing unique index continues to protect supplied references; unrelated blank-reference redemptions do not collide. No schema migration is needed.
- Existing reward/history IDs, staff, branch, timestamp, basket and discount totals provide internal reconciliation. No fake invoice number or payment-system verification is generated.
- Real PostgreSQL tests also exposed a pre-existing redemption failure: raw TypeORM `UPDATE ... RETURNING` produced an update result tuple instead of the assumed row array, so formatting `redeemed_at` threw `Invalid time value` and rolled back. A data-modifying CTE followed by `SELECT` now returns the row shape consistently, with the same atomic status guard and server timestamp.
- Credential expiry/replacement during pricing now prompts staff to request a new code and verify again. The generic pricing error also explains the five-minute credential lifetime. This does not prolong or bypass credential validity.

Regression coverage includes both frontend credential modes with no reference, optional human-readable notes, minimum-spend blocking, expired credentials, DTO validation, and actual isolated PostgreSQL pricing/redemption with no reference. Production pricing was checked read-only for the owner's 20% voucher and Kiện Tỳ Trà: 69,000 VND subtotal, 13,800 discount, 55,200 payable. This check did not redeem a real voucher.

Release commits, image, CI and production checks are recorded in the project tracker and backend scoped deployment record. Production redemption and receipt data are not modified for QA.
