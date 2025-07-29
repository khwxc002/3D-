export function createMelFilterBank(
  numFilters: number, 
  fftSize: number, 
  sampleRate: number
): Float32Array[] {
  const filters: Float32Array[] = [];
  const maxMel = freqToMel(sampleRate / 2);
  const melPoints = new Float32Array(numFilters + 2);
  
  // 生成等间距的Mel刻度
  for (let i = 0; i < melPoints.length; i++) {
    melPoints[i] = melToFreq(maxMel * i / (numFilters + 1));
  }
  
  // 计算FFT频率点
  const fftFreqs = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i++) {
    fftFreqs[i] = (i * sampleRate) / fftSize;
  }
  
  // 创建滤波器组
  for (let m = 1; m <= numFilters; m++) {
    const filter = new Float32Array(fftSize);
    const left = melPoints[m - 1];
    const center = melPoints[m];
    const right = melPoints[m + 1];
    
    for (let i = 0; i < fftSize; i++) {
      const freq = fftFreqs[i];
      if (freq < left) {
        filter[i] = 0;
      } else if (freq < center) {
        filter[i] = (freq - left) / (center - left);
      } else if (freq < right) {
        filter[i] = (right - freq) / (right - center);
      } else {
        filter[i] = 0;
      }
    }
    filters.push(filter);
  }
  
  return filters;
}

// 频率到Mel转换
export function freqToMel(freq: number): number {
  return 2595 * Math.log10(1 + freq / 700);
}

// Mel到频率转换
export function melToFreq(mel: number): number {
  return 700 * (Math.exp(mel / 1127) - 1);
}