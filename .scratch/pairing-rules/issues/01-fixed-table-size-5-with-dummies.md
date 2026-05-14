---
Status: needs-triage
Category: enhancement
Source: user feedback 2026-05-14
---

# Each table holds 5 players; fill with dummies if total not multiple of 5

## Original feedback

> Setiap table berisi 5 pemain, jika jumlah pemain bukan kelipatan 5 maka akan di tambahkan nama pemain dummy

## Summary

Pairing must always produce tables of exactly 5. If `players % 5 != 0`, inject dummy players to reach the next multiple of 5.

## Codebase pointers

- `lib/shuffle-engine.ts` — table assignment
- `lib/tables-store.ts` — table model

## Open questions

- Dummy naming convention (`Dummy-1`, `Bot-A`)?
- Dummies score 0? Or excluded from leaderboard?
- Are dummies visible to other players at the table?

## Comments
