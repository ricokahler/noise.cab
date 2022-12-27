import { useMemo, useEffect } from 'react';

export function useVisualizer(
  ctx: CanvasRenderingContext2D | null,
  audioContext: AudioContext,
  volume: number,
): AudioNode {
  // create an analyzer that will be used to draw onto the 2d context
  const analyzer = useMemo(() => audioContext.createAnalyser(), [audioContext]);
  // create a gain node used for audio input
  const inputGain = useMemo(() => audioContext.createGain(), [audioContext]);

  // adjust the input gain relative the current volume
  useEffect(() => {
    inputGain.gain.value = volume / 100;
  }, [inputGain, volume]);

  // wire up the input gain to the analyzer
  useEffect(() => {
    inputGain.connect(analyzer);
  }, [inputGain, analyzer]);

  // use the analyzer to draw to the canvas context
  useEffect(() => {
    const canceledRef = { current: false };

    const drawSpectrum = () => {
      if (!ctx) return;
      if (canceledRef.current) return;

      var width = ctx.canvas.width;
      var height = ctx.canvas.height;
      var freqData = new Uint8Array(analyzer.frequencyBinCount);
      var scaling = height / 256;

      analyzer.getByteFrequencyData(freqData);

      ctx.fillStyle = 'rgba(15, 15, 15, 0.2)';
      ctx.fillRect(0, 0, width, height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'white';
      ctx.beginPath();

      for (var x = 0; x < width; x++) {
        ctx.lineTo(x, height - freqData[x] * scaling);
      }

      ctx.stroke();
    };

    const loop = () => {
      requestAnimationFrame(() => {
        if (canceledRef.current) return;

        drawSpectrum();
        loop();
      });
    };

    loop();

    return () => {
      canceledRef.current = true;
      analyzer.disconnect();
    };
  }, [analyzer, ctx]);

  return inputGain;
}
