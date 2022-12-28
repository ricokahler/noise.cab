import { useMemo, useEffect } from 'react';

const guard = (lower: number, value: number, upper: number) =>
  Math.min(Math.max(value, lower), upper);

interface Props {
  audioContext: AudioContext;
  angle: number;
  center: number;
  volume: number;
}

export function useNoiseGenerator({
  angle,
  audioContext,
  center,
  volume,
}: Props): AudioNode {
  // converts degrees to radians
  const theta = -(angle / 360) * Math.PI * 2;
  // converts the angle to a slope
  const slope = Math.sin(theta) / Math.cos(theta);

  // create an audio node using the pink noise audio worklet
  const noiseNode = useMemo(() => {
    return new AudioWorkletNode(audioContext, 'pink-noise', {
      outputChannelCount: [2, 2],
      numberOfOutputs: 2,
    });
  }, [audioContext]);

  // create an array of audio nodes derived from the pink noise node above.
  // in order to create a brown noise gradient, the pink noise is piped through
  // a series of biquad bandpass filters that segment the full sound frequency
  // range. each segment only lets a particular range of frequencies through.
  // each segment will get a different volume/gain level based on the input
  // angle and center point
  const segmentedNoiseNodes = useMemo(() => {
    const maxRange = 24000;
    const step = 0.25;

    // a generator that yields segments by yielding a pair of upper and lower
    // bounds based on the exponential function. the exponential function is
    // used to segment the frequencies because human hearing perceives pitch on
    // a logarithmic/exponential scale. this generator finishes when the upper
    // bound of frequencies exceeds `maxRange`
    function* calculateSegments() {
      const { exp } = Math;
      let i = step;

      for (i = step; exp(i) < maxRange; i += step) {
        yield [exp(i - step), exp(i)];
      }

      yield [exp(i), maxRange];
    }

    const segments = Array.from(calculateSegments());

    return segments.map(([lowerBound, upperBound], i) => {
      // create the filter
      const filter = audioContext.createBiquadFilter();
      filter.type = 'bandpass';

      // set the bounds of the filter according to the calculated segment bounds
      const range = upperBound - lowerBound;
      const mid = range / 2 + lowerBound;
      filter.frequency.value = mid;
      filter.Q.value = mid / range;

      // pipe the noise node through the filter
      noiseNode.connect(filter);

      // pipe the filter through a gain node for volume control
      const gain = audioContext.createGain();
      filter.connect(gain);

      return gain;
    });
  }, [audioContext, noiseNode]);

  // create a gain node to be used to normalize the final output volume level
  // based on the current angle and center point
  const compensationGain = useMemo(
    () => audioContext.createGain(),
    [audioContext],
  );

  // wire up each segment to the final compensation gain node
  useEffect(() => {
    for (const segment of segmentedNoiseNodes) {
      segment.connect(compensationGain);
    }
  }, [audioContext, compensationGain, segmentedNoiseNodes]);

  // adjusts the gain per segment to create brown noise
  useEffect(() => {
    // adjust the gain on each segment based on the the input slope and center
    for (let i = 0; i < segmentedNoiseNodes.length; i++) {
      const filter = segmentedNoiseNodes[i];
      const t = i / segmentedNoiseNodes.length;
      const value = slope * (t - center) + 0.5;

      filter.gain.value = guard(0, value, 1);
    }

    // adjust the compensation gain based on the area underneath the curve
    const b = 1 - center;
    const a = -slope * b;
    const gain = a * b * 4 + 1;

    compensationGain.gain.value = gain;
  }, [segmentedNoiseNodes, slope, center, compensationGain]);

  // create a gain node to react to volume slider changes
  const volumeGain = useMemo(() => audioContext.createGain(), [audioContext]);

  useEffect(() => {
    compensationGain.connect(volumeGain);
  }, [compensationGain, volumeGain]);

  // react to volume changes
  useEffect(() => {
    volumeGain.gain.value = (volume / 100) * 0.5; // `0.5` prevents distortion
  }, [volumeGain, volume]);

  return volumeGain;
}
