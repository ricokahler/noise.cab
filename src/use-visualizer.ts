import { useMemo, useEffect } from 'react';

interface Props {
  renderingContext: CanvasRenderingContext2D | null;
  audioContext: AudioContext;
}

export function useVisualizer({
  audioContext,
  renderingContext,
}: Props): AudioNode {
  // create an analyzer that will be used to draw onto the 2d context
  const analyzer = useMemo(() => audioContext.createAnalyser(), [audioContext]);

  // use the analyzer to draw to the canvas context
  useEffect(() => {
    const canceledRef = { current: false };

    const drawSpectrum = () => {
      if (!renderingContext) return;
      if (canceledRef.current) return;

      var width = renderingContext.canvas.width;
      var height = renderingContext.canvas.height;
      var freqData = new Uint8Array(analyzer.frequencyBinCount);
      var scaling = height / 256;

      analyzer.getByteFrequencyData(freqData);

      renderingContext.fillStyle = 'rgba(15, 15, 15, 0.2)';
      renderingContext.fillRect(0, 0, width, height);
      renderingContext.lineWidth = 2;
      renderingContext.strokeStyle = 'white';
      renderingContext.beginPath();

      for (var x = 0; x < width; x++) {
        renderingContext.lineTo(x, height - freqData[x] * scaling);
      }

      renderingContext.stroke();
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
  }, [analyzer, renderingContext]);

  return analyzer;
}
