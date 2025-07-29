export function fft(signal: Float32Array): { real: Float32Array, imag: Float32Array } {
  // 实际应用中应使用高效的FFT实现
  // 这里仅返回一个示例实现
  const size = signal.length;
  const real = new Float32Array(size);
  const imag = new Float32Array(size);
  
  // 简单的DFT实现（仅用于演示）
  for (let k = 0; k < size; k++) {
    let re = 0, im = 0;
    for (let n = 0; n < size; n++) {
      const theta = 2 * Math.PI * k * n / size;
      re += signal[n] * Math.cos(theta);
      im -= signal[n] * Math.sin(theta);
    }
    real[k] = re;
    imag[k] = im;
  }
  
  return { real, imag };
}