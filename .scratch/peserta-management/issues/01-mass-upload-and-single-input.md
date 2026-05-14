---
Status: needs-triage
Category: enhancement
Source: user feedback 2026-05-14
---

# Mass upload + single-entry input for peserta

## Original feedback

> Input data peserta dengan cara upload mass atau input satu per satu

## Summary

Admin needs two paths for adding players: bulk upload (CSV/Excel) and one-by-one form entry. Both should land in the same `players` store.

## Codebase pointers

- `app/admin/components/BulkImportUploader.tsx` — bulk path may already exist; verify format + UX
- `app/admin/components/ParticipantForm.tsx` — single-entry form
- `lib/player-store.ts` — persistence layer

## Open questions

- Bulk format: CSV, XLSX, or both?
- Required columns (name, team, paid status, ...)?
- Validation rules on duplicate names within same team?

## Comments
