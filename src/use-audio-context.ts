import { WorkerUrl } from 'worker-url';
import { createPromiseSuspender } from '@ricokahler/promise-suspender';

const usePromise = createPromiseSuspender();

const listeners = new Set<() => void>();

// notifies the promise suspender to resume. this should happen upon user input
// otherwise the audio context will not load in certain browsers
export function notify() {
  for (const listener of listeners) {
    listener();
  }
}

// returns a promise that completes onces notify is called
function ready() {
  return new Promise<void>((resolve) => {
    const listener = () => {
      listeners.delete(listener);
      resolve();
    };

    listeners.add(listener);
  });
}

export function useAudioContext() {
  return usePromise(async () => {
    await ready();

    const context = new AudioContext({
      sampleRate: 'chrome' in window ? 320_000 : 192_000,
    });

    await context.audioWorklet.addModule(
      new WorkerUrl(new URL('./pink-noise', import.meta.url), {
        name: 'worklet',
      }),
    );

    return context;
  }, []);
}
