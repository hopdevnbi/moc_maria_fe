
## Before C2 migration12
Private public-schema backup73690 bytes, SHA25654a88d739a61e2b8d560f833e63155815c0f85ff533aa8fdb3db8b7fe85023fe. Fresh disposable restore PASS11 migrations/30 tables/7 roles/8 permissions before apply11→12; pod and Secret removed. Manual rehearsal only; automated schedule/retention remains open.

## Before D1 migration13
Private public-schema backup89146 bytes, SHA256b6a0d56b885c340e32c727675dc6f1f436fbde6323f5f729ddfffe77e2e0a781. Fresh disposable restore PASS12 migrations/34 tables/7 roles/8 permissions before apply12→13. Manual drill only; automated retention remains open. Source rollback keeps attendance/history tables and data.

## Before D2 migration14
Private schema13 backup106514 bytes SHA25698777e56f627857e7a99f0ddaa7d851d1e1934fd4db2fc20018d35176ab21947. Fresh disposable restore PASS13 migrations/39 tables/7 roles/8 permissions before13→14. Initial migration guard stopped before writes due optional migration name; read-only13 verified, corrected class-name fallback job v2 succeeded. Automated retention remains open; rollback keeps assessment/issuance tables and history.


## Before E1 migration15
Private schema14 backup118265 bytes SHA2566d2fa14ce55dbb321c7574e36f30d5893c962d7f42d52889878d1c38b649be20. Fresh disposable restore PASS14 migrations/42 tables/7 roles/8 permissions before14→15. Manual drill only; automated retention remains open. Source rollback preserves appointment/quote/history tables after live writes.
