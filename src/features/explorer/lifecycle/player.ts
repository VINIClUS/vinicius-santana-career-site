export type Phase = 'orient' | 'focus' | 'action' | 'settle';
export interface Playback {
  index: number; beat: number; phase: Phase; playing: boolean;
  guided: boolean; complete: boolean; generation: number;
}
interface Options {
  count: number;
  beatCount(index: number): number;
  apply(index: number): void;
  rebuild(index: number): void;
  changed(): void;
  schedule(callback: () => void, delay: number): () => void;
  durations: Record<Phase, number>;
}
export function createPlayer(options: Options) {
  const state: Playback = { index: 0, beat: 0, phase: 'orient', playing: false, guided: true, complete: false, generation: 0 };
  let disposed = false;
  let cancel: (() => void) | undefined;
  const invalidate = () => { state.generation++; cancel?.(); cancel = undefined; };
  const notify = () => options.changed();
  function schedule() {
    if (!state.playing || disposed) return;
    const generation = state.generation;
    const operation = `${state.index}:${state.beat}:${state.phase}`;
    cancel = options.schedule(() => {
      if (disposed || !state.playing || state.generation !== generation || operation !== `${state.index}:${state.beat}:${state.phase}`) return;
      invalidate();
      const phases: Phase[] = ['orient', 'focus', 'action', 'settle'];
      const nextPhase = phases.indexOf(state.phase) + 1;
      if (nextPhase < phases.length) state.phase = phases[nextPhase]!;
      else if (state.beat + 1 < options.beatCount(state.index)) { state.beat++; state.phase = 'orient'; }
      else advance();
      notify(); schedule();
    }, options.durations[state.phase]);
  }
  function advance() {
    if (state.index + 1 >= options.count) { state.playing = false; state.complete = true; return; }
    state.index++; state.beat = 0; state.phase = 'orient'; options.apply(state.index);
  }
  function pause() { if (disposed) return; invalidate(); state.playing = false; notify(); }
  function seek(index: number) {
    if (disposed || !state.guided) return;
    invalidate(); state.playing = false; state.complete = false;
    state.index = Math.max(0, Math.min(options.count - 1, index));
    state.beat = 0; state.phase = 'orient'; options.rebuild(state.index); notify();
  }
  return {
    snapshot: (): Readonly<Playback> => ({ ...state }),
    play() { if (disposed || !state.guided || state.complete || state.playing) return; state.playing = true; notify(); schedule(); },
    pause,
    next() {
      if (disposed || !state.guided) return;
      pause();
      if (state.phase !== 'settle' || state.beat !== options.beatCount(state.index) - 1) {
        state.beat = options.beatCount(state.index) - 1; state.phase = 'settle';
      } else advance();
      notify();
    },
    seek,
    previous() { seek(state.index - 1); },
    reset() { if (disposed) return; state.guided = true; seek(0); },
    interrupt() { if (disposed) return; pause(); state.guided = false; state.phase = 'settle'; notify(); },
    dispose() { if (disposed) return; invalidate(); state.playing = false; disposed = true; },
  };
}
