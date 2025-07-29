<template>
  <div class="speaker-training">
    <h2>声纹训练系统</h2>

    <!-- 文件上传区域 -->
    <div class="file-upload">
      <input type="file" multiple accept="audio/wav" @change="handleFiles" />

      <div v-if="files.length" class="file-list">
        <h4>已上传文件:</h4>
        <ul>
          <li v-for="(file, index) in files" :key="index">
            {{ file.name }} - {{ formatDuration(file.duration) }}
          </li>
        </ul>
      </div>
    </div>

    <!-- 训练参数设置 -->
    <div class="training-params">
      <label
        >起始位置:
        <input type="number" v-model.number="startPos" />
      </label>

      <label
        >帧长度:
        <input type="number" v-model.number="frameLength" />
      </label>

      <button @click="startTraining" :disabled="isProcessing">
        {{ isProcessing ? "处理中..." : "开始训练" }}
      </button>
    </div>

    <!-- 特征展示 -->
    <div v-if="mfccData.length" class="results">
      <h3>MFCC特征数据</h3>
      <div class="feature-container">
        <div
          v-for="(speaker, idx) in mfccData"
          :key="idx"
          class="speaker-features"
        >
          <h4>{{ speaker.name }}</h4>
          <div class="feature-matrix">
            <div
              v-for="(frame, frameIdx) in speaker.features"
              :key="frameIdx"
              class="feature-frame"
            >
              <span
                v-for="(val, valIdx) in frame"
                :key="valIdx"
                class="feature-value"
              >
                {{ val.toFixed(3) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
import { MFCCProcessor } from "../../utils/mfcc";

// 界面状态
const files = ref<File[]>([]);
const startPos = ref(601);
const frameLength = ref(399);
const isProcessing = ref(false);
const mfccData = ref<FeatureData[]>([]);

// 文件处理相关
interface AudioFile {
  name: string;
  audioBuffer: AudioBuffer;
}

interface FeatureData {
  name: string;
  features: number[][]; // [帧][系数]
}

// 处理文件上传
function handleFiles(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files) {
    files.value = Array.from(target.files);
  }
}

// 格式化持续时间
function formatDuration(duration: number): string {
  return duration ? `${duration.toFixed(2)}s` : "";
}

// MFCC处理核心
class MFCCCalculator {
  private mfccProcessor: MFCCProcessor;
  private frameSize = 256;
  private frameStep = 80;
  private numCoefficients = 12;

  constructor(sampleRate: number) {
    this.mfccProcessor = new MFCCProcessor(
      sampleRate,
      this.frameSize,
      this.numCoefficients
    );
  }

  // 预加重处理
  private preEmphasis(signal: Float32Array): Float32Array {
    const result = new Float32Array(signal.length);
    result[0] = signal[0];
    for (let i = 1; i < signal.length; i++) {
      result[i] = signal[i] - 0.9375 * signal[i - 1];
    }
    return result;
  }

  // 分帧处理
  private frameSignal(signal: Float32Array): Float32Array[] {
    const frames: Float32Array[] = [];
    const window = this.hammingWindow(this.frameSize);

    for (let i = 0; i <= signal.length - this.frameSize; i += this.frameStep) {
      const frame = new Float32Array(this.frameSize);
      for (let j = 0; j < this.frameSize; j++) {
        frame[j] = signal[i + j] * window[j];
      }
      frames.push(frame);
    }
    return frames;
  }

  // 汉明窗
  private hammingWindow(size: number): Float32Array {
    const window = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      window[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (size - 1));
    }
    return window;
  }

  // 提取MFCC特征
  async extractMFCC(audioBuffer: AudioBuffer): Promise<Float32Array[]> {
    const signal = this.preEmphasis(audioBuffer.getChannelData(0));
    const frames = this.frameSignal(signal);
    const features: number[][] = [];

    for (const frame of frames) {
      const mfcc = await this.mfccProcessor.compute(frame);
      features.push([...mfcc]);
    }

    return features;
  }
}

// 开始训练处理
async function startTraining() {
  if (!files.value.length) {
    alert("请先上传音频文件");
    return;
  }

  isProcessing.value = true;
  mfccData.value = [];

  try {
    // 创建音频上下文
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();

    // 处理每个文件
    for (const file of files.value) {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // 提取MFCC特征
      const mfccCalculator = new MFCCCalculator(audioBuffer.sampleRate);
      const features = await mfccCalculator.extractMFCC(audioBuffer);

      // 存储结果
      mfccData.value.push({
        name: file.name,
        features: features.slice(
          startPos.value,
          startPos.value + frameLength.value
        ),
      });
    }
  } catch (error) {
    console.error("声纹训练失败:", error);
    alert("处理音频时发生错误，请检查文件格式");
  } finally {
    isProcessing.value = false;
  }
}
</script>

<style scoped>
.speaker-training {
  max-width: 800px;
  margin: 2rem auto;
  padding: 1rem;
  font-family: Arial, sans-serif;
}

.file-upload {
  margin: 1rem 0;
}

.file-list {
  margin-top: 0.5rem;
}

.training-params {
  margin: 2rem 0;
  display: flex;
  gap: 1rem;
  align-items: center;
}

.feature-container {
  margin-top: 1rem;
  max-height: 400px;
  overflow-y: auto;
}

.feature-matrix {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1rem;
}

.speaker-features {
  border: 1px solid #ddd;
  padding: 1rem;
  border-radius: 5px;
}

.feature-frame {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem;
  margin-bottom: 0.5rem;
}

.feature-value {
  display: inline-block;
  width: 40px;
  text-align: right;
  font-size: 0.8rem;
}
</style>
