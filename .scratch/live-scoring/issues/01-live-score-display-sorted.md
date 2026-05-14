---
Status: needs-triage
Category: enhancement
Source: user feedback 2026-05-14
---

# Per-round live score display, sorted by score desc + table number

## Original feedback

> Pada setiap babak langsung tampilkan nilai per-peserta dan langsung sorting dari nilai tertinggi & nomor table

## Summary

After each round, leaderboard shows per-participant scores live, sorted by score descending then by table number. Likely already partially supported via SSE stream.

## Codebase pointers

- `app/components/LeaderboardScreen.tsx`
- `app/api/tables/stream/route.ts` — SSE feed
- `app/admin/components/TableScoring.tsx` — score entry

## Open questions

- Cumulative score across all rounds or per-round only?
- Show table number column always, or only for current round?

## Comments
