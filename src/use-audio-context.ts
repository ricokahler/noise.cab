import { WorkerUrl } from 'worker-url';
import { createPromiseSuspender } from '@ricokahler/promise-suspender';

const usePromise = createPromiseSuspender();

let audioContextRef = { current: null as AudioContext | null };

export async function getAudioContext() {
  if (!audioContextRef.current) {
    const context = new AudioContext({
      sampleRate: 'chrome' in window ? 320_000 : 192_000,
    });

    await context.audioWorklet.addModule(
      new WorkerUrl(new URL('./pink-noise', import.meta.url), {
        name: 'worklet',
      }),
    );

    audioContextRef.current = context;
  }

  return audioContextRef.current;
}

export function useAudioContext() {
  return usePromise(getAudioContext, []);
}
