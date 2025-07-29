// src/utils/mfcc.ts
// import { DCT } from './dct.ts';

export class MFCCProcessor {
  private sampleRate: number;
  private frameSize: number;
  private numCoefficients: number;
  private melFilters: Float32Array[];
  private dctMatrix: Float32Array;

  constructor(sampleRate: number, frameSize: number, numCoefficients: number) {
    this.sampleRate = sampleRate;
    this.frameSize = frameSize;
    this.numCoefficients = numCoefficients;

    // 创建Mel滤波器组
    this.melFilters = this.createMelFilterBank(24, 129);

    // 创建DCT矩阵
    this.dctMatrix = this.createDCTMatrix(numCoefficients, 24);
  }

  // 创建Mel滤波器组
  private createMelFilterBank(numFilters: number, numFFT: number): Float32Array[] {
    const filters: Float32Array[] = [];
    const maxMel = this.freqToMel(this.sampleRate / 2);
    const melPoints = new Float32Array(numFilters + 2);

    // 生成等间距的Mel刻度
    for (let i = 0; i < melPoints.length; i++) {
      melPoints[i] = this.melToFreq(maxMel * i / (numFilters + 1));
    }

    // 计算滤波器中心频率
    const fftFreqs = new Float32Array(numFFT);
    for (let i = 0; i < numFFT; i++) {
      fftFreqs[i] = (i * this.sampleRate) / this.frameSize;
    }

    // 创建滤波器组
    for (let m = 1; m <= numFilters; m++) {
      const filter = new Float32Array(numFFT);
      const left = melPoints[m - 1];
      const center = melPoints[m];
      const right = melPoints[m + 1];

      for (let i = 0; i < numFFT; i++) {
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

  // 创建DCT矩阵
  private createDCTMatrix(numCoefficients: number, numFilters: number): Float32Array {
    const matrix = new Float32Array(numCoefficients * numFilters);
    for (let k = 1; k <= numCoefficients; k++) {
      const norm = Math.sqrt(2 / numFilters);
      for (let n = 0; n < numFilters; n++) {
        matrix[(k - 1) * numFilters + n] = norm * Math.cos(Math.PI * k * (n + 0.5) / numFilters);
      }
    }
    return matrix;
  }

  // Mel频率转换
  private freqToMel(freq: number): number {
    return 2595 * Math.log10(1 + freq / 700);
  }

  // Mel到频率转换
  private melToFreq(mel: number): number {
    return 700 * (Math.exp(mel / 1127) - 1);
  }

  // 提取MFCC特征
  async compute(signal: Float32Array): Promise<Float32Array> {
    // 1. 预加重
    const emphasized = new Float32Array(signal);

    // 2. FFT变换
    const fftSize = this.frameSize;
    const spectrum = this.computeSpectrum(emphasized, fftSize);

    // 3. Mel滤波
    const melEnergies = this.applyMelFilter(spectrum);

    // 4. 取对数
    const logEnergies = new Float32Array(melEnergies.length);
    for (let i = 0; i < melEnergies.length; i++) {
      logEnergies[i] = Math.log(Math.max(melEnergies[i], 1e-10));
    }

    // 5. DCT变换
    const mfcc = new Float32Array(this.numCoefficients);
    for (let k = 0; k < this.numCoefficients; k++) {
      let sum = 0;
      for (let n = 0; n < melEnergies.length; n++) {
        sum += logEnergies[n] * this.dctMatrix[k * melEnergies.length + n];
      }
      mfcc[k] = sum;
    }

    // 6. 倒谱提升
    const liftCoefficients = [1, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0];
    for (let i = 0; i < mfcc.length; i++) {
      mfcc[i] *= liftCoefficients[i] || 1;
    }

    return mfcc;
  }

  // 实现FFT和能量计算
  private computeSpectrum(signal: Float32Array, fftSize: number): Float32Array {
    const real = new Float32Array(fftSize);
    const imag = new Float32Array(fftSize);

    // 填充信号到FFT大小
    for (let i = 0; i < signal.length && i < fftSize; i++) {
      real[i] = signal[i];
    }

    // 实现FFT
    // 这里应该使用高效的FFT实现，比如https://github.com/corbanbrook/dsp.js
    // 为了简化，这里仅返回能量值
    let energy = 0;
    for (let i = 0; i < fftSize / 2; i++) {
      energy += real[i] * real[i] + imag[i] * imag[i];
    }

    const spectrum = new Float32Array(this.melFilters.length);
    for (let i = 0; i < this.melFilters.length; i++) {
      let sum = 0;
      for (let j = 0; j < fftSize / 2; j++) {
        sum += this.melFilters[i][j] * spectrum[i];
      }
      spectrum[i] = sum;
    }

    return spectrum;
  }

  // 应用Mel滤波器
  private applyMelFilter(spectrum: Float32Array): Float32Array {
    const energies = new Float32Array(this.melFilters.length);

    for (let i = 0; i < this.melFilters.length; i++) {
      let sum = 0;
      for (let j = 0; j < spectrum.length; j++) {
        sum += this.melFilters[i][j] * spectrum[j];
      }
      energies[i] = sum;
    }

    return energies;
  }
}

// DCT变换实现
class DCT {
  private size: number;
  private matrix: Float32Array;

  constructor(size: number) {
    this.size = size;
    this.matrix = this.createDCTMatrix(size);
  }

  private createDCTMatrix(size: number): Float32Array {
    const matrix = new Float32Array(size * size);
    const norm = Math.sqrt(2 / size);

    for (let k = 0; k < size; k++) {
      for (let n = 0; n < size; n++) {
        matrix[k * size + n] = norm * Math.cos(Math.PI * k * (n + 0.5) / size);
      }
    }

    return matrix;
  }

  transform(data: Float32Array): Float32Array {
    const result = new Float32Array(this.size);
    for (let k = 0; k < this.size; k++) {
      let sum = 0;
      for (let n = 0; n < data.length; n++) {
        sum += data[n] * this.matrix[k * data.length + n];
      }
      result[k] = sum;
    }
    return result;
  }
}