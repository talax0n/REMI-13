---
Status: needs-triage
Category: enhancement
Source: user feedback 2026-05-14
---

# Delete or archive players no longer needed

## Original feedback

> Jika data peserta sdh tidak diperlukan, bisa di delete atau pindahkan ke archived

## Summary

Provide a way to remove or archive player records. Archive preferred for history; hard-delete optional.

## Codebase pointers

- `lib/player-store.ts` — add `archived` field or soft-delete column
- `app/admin/components/ParticipantTable.tsx` — row action menu

## Open questions

- Archived players excluded from pairing automatically?
- Restore from archive needed?
- Hard-delete kept as separate admin action?

## Comments
