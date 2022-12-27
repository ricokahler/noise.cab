import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
} from 'react';
import styles from './player.module.css';
import { useStableCallback } from '@ricokahler/stable-hooks';
import { useAudioContext } from './use-audio-context';
import { useVisualizer } from './use-visualizer';
import { useNoiseGenerator } from './use-noise-generator';

interface Props {
  className?: string;
  onStateChange: (state: 'paused' | 'playing') => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  angle: number;
  center: number;
}

export const Player = forwardRef(
  (
    { className, volume, angle, center, ...props }: Props,
    incomingRef: React.Ref<HTMLAudioElement>,
  ) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const audioEl = useMemo(() => document.createElement('audio'), []);

    useEffect(() => {
      // play on mount
      setTimeout(() => {
        audioEl.play();
      }, 0);
    }, [audioEl]);

    useImperativeHandle(incomingRef, () => audioEl, [audioEl]);

    const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
    const onStateChange = useStableCallback(props.onStateChange);
    const onVolumeChange = useStableCallback(props.onVolumeChange);

    const audioContext = useAudioContext();

    // append the audio element to the root div
    useEffect(() => {
      const rootEl = rootRef.current;
      if (!rootEl) return;

      rootEl.appendChild(audioEl);

      return () => {
        rootEl.removeChild(audioEl);
      };
    }, [rootRef, audioEl]);

    // sync play/pause
    useEffect(() => {
      const handlePause = () => {
        audioContext.suspend();
        onStateChange('paused');
      };
      const handlePlay = () => {
        audioContext.resume();
        onStateChange('playing');
      };

      audioEl.addEventListener('pause', handlePause);
      audioEl.addEventListener('play', handlePlay);

      return () => {
        audioEl.removeEventListener('pause', handlePause);
        audioEl.removeEventListener('play', handlePlay);
      };
    }, [audioEl, audioContext, onStateChange]);

    // sync volume
    useEffect(() => {
      const handler = () => {
        // normalize muted as a volume of 0
        const nextVolume = audioEl.muted ? 0 : audioEl.volume * 100;
        onVolumeChange(nextVolume);

        // if no volume, then pause
        if (!nextVolume) audioEl.pause();
        // otherwise unpause
        else audioEl.play();
      };

      audioEl.addEventListener('volumechange', handler);
      return () => audioEl.removeEventListener('volumechange', handler);
    }, [volume, audioEl]);

    const noiseGenerator = useNoiseGenerator(audioContext, angle, center);
    const visualizer = useVisualizer(ctx, audioContext, volume);

    // wire up the noise generator to the audio element and the visualizer
    useEffect(() => {
      const audioElSrc = audioContext.createMediaStreamDestination();
      audioEl.srcObject = audioElSrc.stream;

      noiseGenerator.connect(audioElSrc);
      noiseGenerator.connect(visualizer);
    }, [audioContext, noiseGenerator, visualizer]);

    return (
      <div className={className} ref={rootRef}>
        <canvas
          className={styles.canvas}
          ref={(el) => setCtx(el?.getContext('2d') || null)}
        />
      </div>
    );
  },
);

Player.displayName = 'Player';
