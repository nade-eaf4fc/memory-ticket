// Presentation-only: the canvas and exported layers remain flat and unchanged.
export function attachTilt(card) {
  const surface = document.createElement('div');
  surface.className = 'ticket-interaction';
  surface.tabIndex = 0;
  surface.setAttribute('aria-label', 'チケットを傾ける。矢印キーでも操作できます。');
  card.before(surface); surface.append(card);
  const sheen = document.createElement('div');
  sheen.className = 'ticket-sheen'; sheen.setAttribute('aria-hidden', 'true');
  card.append(sheen);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, lastTime = 0, maskUrl, pressed = false, suspended = false;
  let current = { x: 0, y: 0, light: 0 }, target = { ...current };
  function animate(time) {
    const amount = 1 - Math.exp(-Math.min(64, time - (lastTime || time - 16)) / 75);
    lastTime = time;
    let pending = false;
    for (const key of ['x', 'y', 'light']) {
      current[key] += (target[key] - current[key]) * amount;
      if (Math.abs(target[key] - current[key]) > .002) pending = true;
      else current[key] = target[key];
    }
    // A true untransformed resting state avoids retaining a resampled GPU texture.
    card.style.transform = current.light === 0 && current.x === 0 && current.y === 0
      ? 'none'
      : `perspective(1100px) rotateX(${-current.y * 10}deg) rotateY(${current.x * 12}deg)`;
    card.style.setProperty('--light-x', `${50 + current.x * 38}%`);
    card.style.setProperty('--light-y', `${50 + current.y * 38}%`);
    card.style.setProperty('--shine', current.light.toFixed(3));
    card.style.setProperty('--shadow-x', `${-current.x * 12}px`);
    card.style.setProperty('--shadow-y', `${20 - current.y * 8}px`);
    frame = pending ? requestAnimationFrame(animate) : 0;
    if (!pending) lastTime = 0;
  }
  function update(x, y, light) {
    if (reduced.matches || suspended) return;
    target = { x, y, light };
    if (!frame) frame = requestAnimationFrame(animate);
  }
  function reset() { pressed = false; update(0, 0, 0); }
  function point(event) {
    if (event.pointerType === 'touch' && !pressed) return;
    const rect = surface.getBoundingClientRect();
    const clamp = value => Math.max(-1, Math.min(1, value));
    update(clamp((event.clientX - rect.left) / rect.width * 2 - 1), clamp((event.clientY - rect.top) / rect.height * 2 - 1), 1);
  }
  surface.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') point(event); });
  surface.addEventListener('pointermove', point);
  surface.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch') { pressed = true; surface.setPointerCapture(event.pointerId); }
    point(event);
  });
  surface.addEventListener('pointerleave', reset);
  surface.addEventListener('pointerup', event => { if (event.pointerType === 'touch') reset(); });
  surface.addEventListener('pointercancel', reset);
  surface.addEventListener('lostpointercapture', reset);
  surface.addEventListener('blur', reset);
  surface.addEventListener('keydown', event => {
    const directions = { ArrowLeft: [-.6, 0], ArrowRight: [.6, 0], ArrowUp: [0, -.6], ArrowDown: [0, .6], Escape: [0, 0] };
    if (!directions[event.key]) return;
    event.preventDefault(); update(...directions[event.key], event.key === 'Escape' ? 0 : 1);
  });
  reduced.addEventListener('change', () => {
    cancelAnimationFrame(frame); frame = 0; lastTime = 0;
    current = target = { x: 0, y: 0, light: 0 };
    card.style.transform = 'none'; card.style.setProperty('--shine', '0');
  });
  return {
    suspend(value) {
      suspended = value;
      cancelAnimationFrame(frame); frame = 0; lastTime = 0;
      current = { x: 0, y: 0, light: 0 }; target = { ...current };
      card.style.transform = 'none'; card.style.setProperty('--shine', '0');
    },
    setMask(blob) {
      const next = URL.createObjectURL(blob);
      sheen.style.maskImage = `url("${next}")`;
      if (maskUrl) URL.revokeObjectURL(maskUrl);
      maskUrl = next;
    },
  };
}
