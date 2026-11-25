import confetti from 'canvas-confetti';

export function triggerConfetti() {
  confetti({
    particleCount: 50,
    spread: 60,
    origin: { y: 0.8 },
    colors: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b']
  });
}

export function triggerScheduleSyncConfetti() {
  const end = Date.now() + 600;
  const colors = ['#10b981', '#3b82f6', '#06b6d4'];

  (function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}
