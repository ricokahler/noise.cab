class PinkNoiseProcessor
  extends AudioWorkletProcessor
  implements AudioWorkletProcessorImpl
{
  process(_inputs: Float32Array[][], outputs: Float32Array[][]) {
    const output = outputs[0];

    let b0, b1, b2, b3, b4, b5, b6;
    b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;

    for (const channel of output) {
      for (let i = 0; i < channel.length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        channel[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        channel[i] *= 0.11; // (roughly) compensate for gain
        b6 = white * 0.115926;
      }
    }

    return true;
  }
}

registerProcessor('pink-noise', PinkNoiseProcessor);
