// Signature motif shared by the timer, top-5, and top-teams sections: a
// playing-card suit pip keyed off round/rank position, so the tournament's
// card-game identity shows up in the chrome, not just the score tables.
const SUITS = [
  { glyph: '♠', color: 'text-zinc-200' },
  { glyph: '♥', color: 'text-rose-400' },
  { glyph: '♦', color: 'text-rose-400' },
  { glyph: '♣', color: 'text-zinc-200' },
] as const;

export function suitForIndex(index: number) {
  return SUITS[Math.abs(index) % SUITS.length];
}

export function SuitPip({ index, className = '' }: { index: number; className?: string }) {
  const suit = suitForIndex(index);
  return (
    <span aria-hidden="true" className={`${suit.color} ${className}`}>
      {suit.glyph}
    </span>
  );
}
