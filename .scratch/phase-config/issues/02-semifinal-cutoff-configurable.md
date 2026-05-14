---
Status: needs-triage
Category: enhancement
Source: user feedback 2026-05-14
---

# Semi-final cutoff configurable: top 10 or top 20

## Original feedback

> Babak Semi Final tergantung penentuan dari Panitia, apakah yg akan di ambil dari 10 nilai tertinggai atau 20 nilai tertinggi

## Summary

Admin chooses semi-final cutoff at end of penyisihan: top 10 or top 20 by cumulative score. UI presents choice before triggering semi-final pairing.

## Codebase pointers

- `app/admin/page.tsx` + `PhaseStatus.tsx` — phase transition control
- `lib/shuffle-engine.ts` — accepts cutoff arg

## Open questions

- Allow arbitrary N or only the two presets?
- Tie-breaking when cutoff falls in middle of a tie (e.g. 11th & 12th tied at #10)?

## Comments
