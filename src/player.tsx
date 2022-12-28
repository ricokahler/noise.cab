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
  volume: number;
  angle: number;
  center: number;
  onVolumeChange: (volume: number) => void;
  onStateChange: (state: 'paused' | 'playing') => void;
}

export const Player = forwardRef(
  (
    { className, volume, angle, center, ...props }: Props,
    incomingRef: React.Ref<HTMLAudioElement>,
  ) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const audioContext = useAudioContext();
    const audioDestination = useMemo(
      () => audioContext.createMediaStreamDestination(),
      [audioContext],
    );

    const audioEl = useMemo(() => {
      const el = document.createElement('audio');
      el.srcObject = audioDestination.stream;

      return el;
    }, [audioDestination]);

    useImperativeHandle(incomingRef, () => audioEl, [audioEl]);

    const [renderingContext, setRenderingContext] =
      useState<CanvasRenderingContext2D | null>(null);
    const onStateChange = useStableCallback(props.onStateChange);
    const onVolumeChange = useStableCallback(props.onVolumeChange);

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

    // add media session metadata and controls
    useEffect(() => {
      if (!('mediaSession' in navigator)) return;
      const { mediaSession } = navigator;

      mediaSession.metadata = new MediaMetadata({
        title: 'noise.cab',
        album: 'a simple website that generates noise',
      });

      mediaSession.setActionHandler('play', () => audioEl.play());
      mediaSession.setActionHandler('pause', () => audioEl.pause());

      const handlePlay = () => (mediaSession.playbackState = 'playing');
      const handlePause = () => (mediaSession.playbackState = 'playing');

      audioEl.addEventListener('play', handlePlay);
      audioEl.addEventListener('pause', handlePause);

      return () => {
        mediaSession.setActionHandler('play', null);
        mediaSession.setActionHandler('pause', null);

        audioEl.removeEventListener('play', handlePlay);
        audioEl.removeEventListener('pause', handlePause);
      };
    }, [audioEl]);

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
    }, [volume, audioEl, onVolumeChange]);

    // wire up the noise generator to the audio element and the visualizer
    const noiseGenerator = useNoiseGenerator({
      audioContext,
      angle,
      center,
      volume,
    });
    const visualizer = useVisualizer({
      audioContext,
      renderingContext,
    });

    useEffect(() => {
      noiseGenerator.connect(visualizer);
      noiseGenerator.connect(audioDestination);
    }, [audioDestination, audioEl, noiseGenerator, visualizer]);

    return (
      <div className={className} ref={rootRef}>
        <canvas
          className={styles.canvas}
          ref={(el) => setRenderingContext(el?.getContext('2d') || null)}
        />
      </div>
    );
  },
);

Player.displayName = 'Player';
