// Pointer Events cover mouse, pen and touch without the native image drag UI.
export function installPortraitDrag({ board, canDrag, onDrop }) {
  let gesture = null;
  let suppressedClick = null;

  function highlightTarget() {
    if (!gesture?.active) return;
    const element = document.elementFromPoint(gesture.x, gesture.y);
    const target = element?.closest(".row-active .guess-tile[data-slot]");
    gesture.target?.classList.remove("drag-target");
    gesture.target = target && board.contains(target) ? target : null;
    gesture.target?.classList.add("drag-target");
  }

  function positionGhost() {
    const { x, y, size, touch, ghost } = gesture;
    ghost.style.transform = `translate3d(${x - size / 2}px, ${y - size / 2 - (touch ? 24 : 0)}px, 0)`;
    highlightTarget();
  }

  function scrollFrame(time) {
    if (!gesture?.active) return;
    const dt = Math.min(32, time - (gesture.lastFrame ?? time));
    gesture.lastFrame = time;
    const edge = 72;
    const velocity = gesture.y < edge ? -(edge - gesture.y) / edge
      : gesture.y > innerHeight - edge ? (gesture.y - innerHeight + edge) / edge : 0;
    if (velocity) {
      window.scrollBy({ top: velocity * dt * .8, behavior: "instant" });
      highlightTarget();
    }
    gesture.frame = requestAnimationFrame(scrollFrame);
  }

  function start() {
    if (!gesture || !canDrag()) return cancel();
    gesture.active = true;
    board.setPointerCapture(gesture.id);
    const ghost = gesture.source.cloneNode(true);
    ghost.className = "guess-tile portrait-drag-ghost";
    ghost.removeAttribute("id");
    ghost.removeAttribute("data-slot");
    ghost.removeAttribute("aria-current");
    ghost.setAttribute("aria-hidden", "true");
    ghost.tabIndex = -1;
    ghost.dataset.copy = String(gesture.copy);
    gesture.size = Math.max(48, Math.min(96, gesture.source.getBoundingClientRect().width));
    ghost.style.width = `${gesture.size}px`;
    ghost.style.height = `${gesture.size}px`;
    gesture.ghost = ghost;
    document.body.append(ghost);
    gesture.source.classList.add("drag-origin");
    document.body.classList.add("portrait-dragging");
    positionGhost();
    gesture.frame = requestAnimationFrame(scrollFrame);
  }

  function cancel() {
    if (!gesture) return;
    const previous = gesture;
    gesture = null;
    clearTimeout(previous.timer);
    cancelAnimationFrame(previous.frame);
    previous.ghost?.remove();
    previous.source.classList.remove("drag-origin");
    previous.target?.classList.remove("drag-target");
    document.body.classList.remove("portrait-dragging");
    if (previous.active || previous.moved) suppressedClick = { id: previous.id, until: performance.now() + 500 };
    if (board.hasPointerCapture(previous.id)) board.releasePointerCapture(previous.id);
  }

  board.addEventListener("pointerdown", event => {
    suppressedClick = null;
    if (!event.isPrimary || event.button !== 0 || !canDrag()) return;
    const source = event.target.closest(".guess-tile[data-hero]");
    if (!source || !board.contains(source)) return;
    cancel();
    gesture = {
      id: event.pointerId, source, hero: source.dataset.hero,
      copy: !source.closest(".row-active"), slot: Number(source.dataset.slot),
      downX: event.clientX, downY: event.clientY, x: event.clientX, y: event.clientY,
      touch: event.pointerType === "touch", active: false,
    };
    gesture.timer = setTimeout(start, 260);
  });

  window.addEventListener("pointermove", event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const previousY = gesture.y;
    gesture.x = event.clientX;
    gesture.y = event.clientY;
    if (gesture.scrolling) {
      event.preventDefault();
      window.scrollBy({ top: previousY - gesture.y, behavior: "instant" });
      return;
    }
    if (!gesture.active) {
      if (Math.hypot(gesture.x - gesture.downX, gesture.y - gesture.downY) > 10) {
        gesture.moved = true;
        if (gesture.touch) {
          // A swipe before the hold threshold scrolls instead of picking up.
          clearTimeout(gesture.timer);
          gesture.scrolling = true;
          event.preventDefault();
          window.scrollBy({ top: gesture.downY - gesture.y, behavior: "instant" });
        } else cancel();
      }
      return;
    }
    event.preventDefault();
    positionGhost();
  }, { passive: false });

  window.addEventListener("pointerup", event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const current = gesture;
    if (current.active) {
      event.preventDefault();
      current.x = event.clientX;
      current.y = event.clientY;
      highlightTarget();
    }
    const target = current.target;
    cancel();
    if (current.active && target && canDrag()) {
      onDrop({ hero: current.hero, sourceSlot: current.slot, targetSlot: Number(target.dataset.slot), copy: current.copy });
    }
  }, { passive: false });

  board.addEventListener("click", event => {
    if (suppressedClick && performance.now() < suppressedClick.until && event.detail > 0
      && (event.pointerId === undefined || event.pointerId === suppressedClick.id)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      suppressedClick = null;
    }
  }, true);
  board.addEventListener("contextmenu", event => {
    if (event.target.closest(".guess-tile[data-hero]") && canDrag()) event.preventDefault();
  });
  board.addEventListener("dragstart", event => event.preventDefault());
  board.addEventListener("lostpointercapture", event => { if (event.target === board) cancel(); });
  window.addEventListener("pointercancel", event => { if (gesture?.id === event.pointerId) cancel(); });
  window.addEventListener("blur", cancel);
  window.addEventListener("resize", cancel);
  document.addEventListener("visibilitychange", () => { if (document.hidden) cancel(); });

  return { cancel, snapshot: () => gesture?.active ? { hero: gesture.hero, copy: gesture.copy, targetSlot: gesture.target ? Number(gesture.target.dataset.slot) : null } : null };
}
