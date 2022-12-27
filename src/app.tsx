import classNames from 'classnames';
import { Suspense, useEffect, useRef, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import styles from './app.module.css';
import { Player } from './player';
import { RangeSlider } from './range-slider';
import { notify } from './use-audio-context';

export function App() {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [volume, setVolume] = useState(25);
  const [angle, setAngle] = useState(85);
  const [center, setCenter] = useState(0.5);

  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    const handlePlay = () => setPlaying(true);
    const handlePause = () => setPlaying(false);

    audioEl.addEventListener('play', handlePlay);
    audioEl.addEventListener('pause', handlePause);

    return () => {
      audioEl.removeEventListener('play', handlePlay);
      audioEl.removeEventListener('pause', handlePause);
    };
  }, []);

  return (
    <div className={styles.app}>
      <header>
        <h1>noise.cab</h1>
        <p>a simple website that generates noise</p>
      </header>

      <Suspense
        fallback={
          <div
            className={classNames(styles.player, styles.loading)}
            aria-label="Loading"
          />
        }
      >
        <ErrorBoundary fallback={<>Error</>}>
          <Player
            ref={audioRef}
            className={styles.player}
            volume={volume}
            onVolumeChange={setVolume}
            angle={angle}
            center={center}
            onStateChange={(state) => {
              setPlaying(state === 'playing');
            }}
          />
        </ErrorBoundary>
      </Suspense>

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
          label="cut"
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
          onChange={(e) => setVolume(e.currentTarget.valueAsNumber)}
        />
      </div>

      <button
        className={styles.button}
        onClick={() => {
          notify();

          if (playing) {
            audioRef.current?.pause();
          } else {
            audioRef.current?.play();
          }
        }}
      >
        {playing ? 'stop' : 'start'}
      </button>
    </div>
  );
}
