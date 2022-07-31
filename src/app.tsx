import { useEffect, useMemo, useState, useRef } from 'react';
import { WorkerUrl } from 'worker-url';
import { createPromiseSuspender } from '@ricokahler/promise-suspender';
import { RangeSlider } from './range-slider';
import styles from './app.module.css';

const usePromise = createPromiseSuspender();

function useAudioContext() {
  return usePromise(async () => {
    const context = new AudioContext({
      sampleRate: 320_000,
    });

    await context.audioWorklet.addModule(
      new WorkerUrl(new URL('./pink-noise', import.meta.url), {
        name: 'worklet',
      }),
    );

    context.suspend();

    return context;
  }, []);
}

export function App() {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(25);
  const [angle, setAngle] = useState(85);
  const [center, setCenter] = useState(0.5);
  const audioContext = useAudioContext();
  const canvasRef = useRef<any>();

  const noiseNode = useMemo(() => {
    return new AudioWorkletNode(audioContext, 'pink-noise', {
      outputChannelCount: [2, 2],
      numberOfOutputs: 2,
    });
  }, [audioContext]);

  const compensationGain = useMemo(
    () => audioContext.createGain(),
    [audioContext],
  );

  const filters = useMemo(() => {
    const f = (x: number) => Math.exp(x);

    const maxRange = 24000;
    const step = 0.25;

    function* calculateBounds() {
      let i = step;

      for (i = step; f(i) < maxRange; i += step) {
        yield [f(i - step), f(i)];
      }

      yield [f(i), maxRange];
    }
    const bounds = Array.from(calculateBounds());

    return bounds.map(([lowerBound, upperBound]) => {
      const filter = audioContext.createBiquadFilter();
      filter.type = 'bandpass';

      const range = upperBound - lowerBound;
      const center = range / 2 + lowerBound;

      filter.frequency.value = center;
      filter.Q.value = center / range;

      noiseNode.connect(filter);

      const gain = audioContext.createGain();
      filter.connect(gain);

      return gain;
    });
  }, [audioContext, noiseNode]);

  useEffect(() => {
    if (playing) {
      audioContext.resume();
    } else {
      audioContext.suspend();
    }
  }, [audioContext, playing]);

  useEffect(() => {
    const guard = (lower: number, value: number, upper: number) =>
      Math.min(Math.max(value, lower), upper);

    const theta = -(angle / 360) * Math.PI * 2;
    const slope = Math.sin(theta) / Math.cos(theta);

    const values = filters.map((_, i) => {
      const t = i / filters.length;
      const value = slope * (t - center) + 0.5;
      return guard(0, value, 1);
    });

    for (let i = 0; i < filters.length; i++) {
      const filter = filters[i];
      const value = values[i];

      filter.gain.value = value;
    }

    const b = 1 - center;
    const a = -slope * b;
    const gain = a * b * 4 + 1;

    compensationGain.gain.value = gain;
  }, [filters, angle, center, compensationGain]);

  const mainGain = useMemo(() => audioContext.createGain(), [audioContext]);

  useEffect(() => {
    mainGain.connect(audioContext.destination);
    compensationGain.connect(mainGain);

    for (const filter of filters) {
      filter.connect(compensationGain);
    }
  }, [audioContext, compensationGain, filters, mainGain]);

  const analyser = useMemo(() => audioContext.createAnalyser(), [audioContext]);

  useEffect(() => {
    if (!playing) return;

    const ctx = canvasRef.current.getContext('2d');
    const canceledRef = { current: false };

    function drawSpectrum() {
      var width = ctx.canvas.width;
      var height = ctx.canvas.height;
      var freqData = new Uint8Array(analyser.frequencyBinCount);
      var scaling = height / 256;

      analyser.getByteFrequencyData(freqData);

      ctx.fillStyle = 'rgba(15, 15, 15, 0.2)';
      ctx.fillRect(0, 0, width, height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'white';
      ctx.beginPath();

      for (var x = 0; x < width; x++) {
        ctx.lineTo(x, height - freqData[x] * scaling);
      }

      ctx.stroke();
    }

    function loop() {
      requestAnimationFrame(() => {
        if (canceledRef.current) return;

        drawSpectrum();
        loop();
      });
    }

    loop();
    mainGain.connect(analyser);

    return () => {
      canceledRef.current = true;
      analyser.disconnect();
    };
  }, [analyser, mainGain, playing]);

  useEffect(() => {
    mainGain.gain.value = volume / 100;
  }, [mainGain, volume]);

  return (
    <div className={styles.app}>
      <div className={styles.container}>
        <div className={styles.player}>
          <header>
            <h1>noise.cab</h1>
            <p>a simple website that generates noise</p>
          </header>

          <canvas className={styles.canvas} ref={canvasRef}></canvas>

          <div className={styles.sliders}>
            <RangeSlider
              label="depth"
              type="range"
              min={0}
              max={85}
              step={1}
              value={angle}
              onChange={(e) => {
                setAngle(e.currentTarget.valueAsNumber);
              }}
            />
            <RangeSlider
              label="cutoff"
              type="range"
              min={0.2}
              max={1}
              step={0.01}
              value={center}
              onChange={(e) => {
                setCenter(e.currentTarget.valueAsNumber);
              }}
            />
            <RangeSlider
              label="vol"
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => {
                setVolume(e.currentTarget.valueAsNumber);
              }}
            />
          </div>

          <button
            className={styles.button}
            onClick={() => setPlaying(!playing)}
          >
            {playing ? 'stop' : 'start'}
          </button>
        </div>
      </div>
    </div>
  );
}
