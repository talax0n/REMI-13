import { toPng } from 'html-to-image';

export async function captureLeaderboardSnapshot(opts: {
  phase: number;
  players?: number;
  width?: number;
  height?: number;
  settleMs?: number;
}): Promise<void> {
  const width = opts.width ?? 1280;
  // Auto-scale height with player count. Leaderboard packs into columns based
  // on container size; widen the canvas so cells stay readable past ~150.
  const players = opts.players ?? 0;
  const colsAtBase = 4;
  const rowH = 56;
  const headerH = 240;
  const autoHeight = Math.ceil(players / colsAtBase) * rowH + headerH;
  const height = opts.height ?? Math.max(1800, autoHeight);
  const settleMs = opts.settleMs ?? 2200;

  const iframe = document.createElement('iframe');
  iframe.src = '/?snapshot=1';
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = `${width}px`;
  iframe.style.height = `${height}px`;
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';

  document.body.appendChild(iframe);

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Leaderboard iframe load timeout')), 8000);
      iframe.addEventListener(
        'load',
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true }
      );
    });

    await new Promise((r) => setTimeout(r, settleMs));

    const doc = iframe.contentDocument;
    const target = doc?.body;
    if (!doc || !target) throw new Error('Cannot access leaderboard iframe document');

    const dataUrl = await toPng(target, {
      width,
      height,
      backgroundColor: '#0a0a0b',
      pixelRatio: 2,
      cacheBust: true,
    });

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `leaderboard-phase-${opts.phase}-${stamp}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    iframe.remove();
  }
}
