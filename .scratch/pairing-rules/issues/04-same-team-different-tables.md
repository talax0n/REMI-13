---
Status: needs-triage
Category: enhancement
Source: user feedback 2026-05-14
---

# Players from same Team must sit at different tables

## Original feedback

> Pembagian table pada saat pairing, asal Team (Gereja/Sektor) harus berbeda table

## Summary

Pairing constraint: no two players sharing a team end up at the same table. Hard constraint when feasible; document fallback if `max-team-size > num-tables`.

## Codebase pointers

- `lib/shuffle-engine.ts` — add team-disjoint constraint
- Depends on `peserta-management/03-rename-church-to-team`

## Open questions

- If constraint infeasible (one team has more players than tables), error out or relax with warning?
- Hard fail or soft penalty when balancing other constraints?

## Comments
