---
Status: needs-triage
Category: enhancement
Source: user feedback 2026-05-14
---

# Final cutoff configurable: top 5 or top 10, with pairing

## Original feedback

> Babak Final tergantung penentuan dari Panitia, apakah ambil 5 nilai tertinggi atau 10 nilai tertinggi dan pairing juga

## Summary

Admin chooses final cutoff after semi-final: top 5 or top 10. Final round also requires pairing (same constraints as prior rounds — see `pairing-rules/05`).

## Codebase pointers

- Recent commit `bf36ed1` mentions snake-draft table assignment for top 10
- `lib/shuffle-engine.ts` — final-phase entry

## Open questions

- Top 5 = single table; top 10 = two tables via snake-draft (already implemented?). Confirm.
- Tie-breaking at cutoff boundary?

## Comments
