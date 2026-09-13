import type { Object3D } from 'three';
import { createAmbientMotion } from './ambient-motion.ts';
import './motion.css';

interface Options {
  world: Object3D;
  controlHost: HTMLElement;
  active(): boolean;
  render(): void;
  focusFallback?: HTMLElement | null;
}

/** One presentation owns its clock, control and listeners, starting after authored t=0. */
export function createMotionPlayback(options: Options) {
  const motion = createAmbientMotion(options.world);
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  // The native getter can update query state before its change event is delivered.
  // Sample once at mount; later transitions belong to the event, not the frame loop.
  let reducedMotion = preference.matches;
  const lifetime = new AbortController();
  const control = document.createElement('button');
  control.type = 'button';
  control.dataset.motionControl = '';
  control.className = 'atlas-motion-control';
  let paused = false;
  let disposed = false;
  let running = false;
  let seconds = 0;
  let previous = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let frame: number | undefined;
  const enabled = () => !disposed && motion.size > 0 && !paused && !reducedMotion && options.active();
  const cancel = () => {
    running = false;
    clearTimeout(timer);
    timer = undefined;
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = undefined;
  };
  const schedule = () => {
    // No continuously spinning RAF: request one frame only after the 24fps interval.
    timer = setTimeout(() => {
      timer = undefined;
      if (!enabled()) { cancel(); return; }
      frame = requestAnimationFrame(() => {
        frame = undefined;
        if (!enabled()) { cancel(); return; }
        const now = performance.now();
        seconds += (now - previous) / 1000;
        previous = now;
        motion.sample(seconds);
        options.render();
        if (enabled()) schedule();
        else cancel();
      });
    }, Math.ceil(1000 / 24));
  };
  const update = () => {
    if (disposed) return;
    control.disabled = reducedMotion;
    control.textContent = reducedMotion ? 'Motion off (reduced motion)' : paused ? 'Resume motion' : 'Pause motion';
    control.dataset.motionState = reducedMotion ? 'reduced' : paused ? 'paused' : 'running';
    if (!enabled()) cancel();
    else if (!running) {
      running = true;
      // Inactive time is excluded. Resume from the last displayed transform.
      previous = performance.now();
      schedule();
    }
  };
  control.addEventListener('click', () => {
    if (reducedMotion) return;
    paused = !paused;
    update();
  }, { signal: lifetime.signal });
  preference.addEventListener('change', event => {
    reducedMotion = event.matches;
    if (reducedMotion) {
      cancel();
      seconds = 0;
      motion.sample(0);
      options.render();
    }
    update();
  }, { signal: lifetime.signal });
  if (motion.size > 0) options.controlHost.append(control);
  update();
  return {
    update,
    dispose() {
      if (disposed) return;
      disposed = true;
      cancel();
      lifetime.abort();
      if (document.activeElement === control) options.focusFallback?.focus({ preventScroll: true });
      control.remove();
    },
  };
}
