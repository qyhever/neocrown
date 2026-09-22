<template>
  <main class="video-probe">
    <section class="panel">
      <h1>视频信息解析</h1>
      <p class="hint">上传单个不超过 500 MB 的视频，解析完成后服务端会删除临时文件。</p>
      <label class="file-picker">
        <span>选择视频文件</span>
        <input type="file" accept="video/*" :disabled="busy" @change="selectFile" />
      </label>
      <p v-if="selectedFile" class="selected">
        {{ selectedFile.name }} · {{ fileSize(selectedFile.size) }}
      </p>
      <button type="button" :disabled="!selectedFile || busy" @click="submit">
        {{ busy ? (progress < 100 ? '上传中…' : '解析中…') : '上传并解析' }}
      </button>
      <div
        v-if="busy"
        class="progress"
        role="progressbar"
        :aria-valuenow="progress"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div :style="{ width: `${progress}%` }"></div>
      </div>
      <p v-if="busy" class="hint">
        {{ progress < 100 ? `已上传 ${progress}%` : '上传完成，正在读取媒体信息…' }}
      </p>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
    </section>

    <section v-if="result" class="panel result">
      <h2>文件与容器</h2>
      <dl class="details">
        <div>
          <dt>文件名</dt>
          <dd>{{ result.fileName }}</dd>
        </div>
        <div>
          <dt>文件大小</dt>
          <dd>{{ fileSize(result.fileSize) }}</dd>
        </div>
        <div>
          <dt>容器格式</dt>
          <dd>{{ show(result.formatLongName ?? result.format) }}</dd>
        </div>
        <div>
          <dt>格式标识</dt>
          <dd>{{ show(result.format) }}</dd>
        </div>
        <div>
          <dt>时长</dt>
          <dd>{{ seconds(result.duration) }}</dd>
        </div>
        <div>
          <dt>总码率</dt>
          <dd>{{ bitrate(result.bitrate) }}</dd>
        </div>
      </dl>
    </section>

    <section v-if="result" class="panel result">
      <h2>媒体流（{{ result.streams.length }}）</h2>
      <article
        v-for="stream in result.streams"
        :key="stream.index ?? result.streams.indexOf(stream)"
        class="stream"
      >
        <h3>{{ stream.type === 'video' ? '视频流' : '音频流' }} #{{ stream.index ?? '—' }}</h3>
        <dl class="details">
          <div>
            <dt>编码</dt>
            <dd>{{ show(stream.codecLongName ?? stream.codec) }}</dd>
          </div>
          <div>
            <dt>编码标识</dt>
            <dd>{{ show(stream.codec) }}</dd>
          </div>
          <div>
            <dt>配置</dt>
            <dd>{{ show(stream.profile) }}</dd>
          </div>
          <div>
            <dt>流码率</dt>
            <dd>{{ bitrate(stream.bitrate) }}</dd>
          </div>
          <div>
            <dt>时长</dt>
            <dd>{{ seconds(stream.duration) }}</dd>
          </div>
          <template v-if="stream.type === 'video'">
            <div>
              <dt>分辨率</dt>
              <dd>
                {{
                  stream.width !== null && stream.height !== null
                    ? `${stream.width} × ${stream.height}`
                    : '—'
                }}
              </dd>
            </div>
            <div>
              <dt>像素格式</dt>
              <dd>{{ show(stream.pixelFormat) }}</dd>
            </div>
            <div>
              <dt>帧率</dt>
              <dd>{{ frameRate(stream.frameRate) }}</dd>
            </div>
          </template>
          <template v-else>
            <div>
              <dt>采样率</dt>
              <dd>{{ stream.sampleRate === null ? '—' : `${stream.sampleRate} Hz` }}</dd>
            </div>
            <div>
              <dt>声道数</dt>
              <dd>{{ show(stream.channels) }}</dd>
            </div>
            <div>
              <dt>声道布局</dt>
              <dd>{{ show(stream.channelLayout) }}</dd>
            </div>
          </template>
        </dl>
      </article>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { probeVideo, type VideoProbeResult } from '@/api/video'

const MAX_SIZE = 500 * 1024 * 1024
const selectedFile = ref<File | null>(null)
const result = ref<VideoProbeResult | null>(null)
const progress = ref(0)
const busy = ref(false)
const error = ref('')

function selectFile(event: Event) {
  const input = event.target as HTMLInputElement
  selectedFile.value = input.files?.[0] ?? null
  result.value = null
  error.value = ''
  progress.value = 0
  if (selectedFile.value && selectedFile.value.size > MAX_SIZE) {
    error.value = '文件超过 500 MB 上限'
    selectedFile.value = null
  }
  input.value = ''
}

async function submit() {
  if (!selectedFile.value || busy.value) return
  busy.value = true
  error.value = ''
  result.value = null
  progress.value = 0
  try {
    result.value = await probeVideo(selectedFile.value, (value) => {
      progress.value = value
    })
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '视频解析失败'
  } finally {
    busy.value = false
  }
}

function show(value: string | number | null) {
  return value ?? '—'
}
function fileSize(value: number) {
  return `${(value / 1024 / 1024).toFixed(2)} MB`
}
function seconds(value: number | null) {
  return value === null ? '—' : `${value.toFixed(2)} 秒`
}
function bitrate(value: number | null) {
  return value === null ? '—' : `${(value / 1000).toFixed(0)} kbps`
}
function frameRate(value: string | null) {
  if (!value) return '—'
  const [numerator, denominator] = value.split('/').map(Number)
  return denominator && numerator ? `${(numerator / denominator).toFixed(2)} fps (${value})` : value
}
</script>

<style scoped>
.video-probe {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px;
  color: #1f2329;
}
.panel {
  padding: 28px;
  margin-bottom: 20px;
  background: #fff;
  border: 1px solid #e7e7e7;
  border-radius: 8px;
}
h1 {
  margin: 0 0 8px;
  font-size: 24px;
}
h2 {
  margin: 0 0 20px;
  font-size: 19px;
}
h3 {
  margin: 0 0 16px;
  font-size: 16px;
}
.hint {
  color: #646a73;
  font-size: 14px;
}
.file-picker {
  display: inline-block;
  padding: 10px 16px;
  margin: 12px 12px 12px 0;
  border: 1px solid #0052d9;
  border-radius: 4px;
  color: #0052d9;
  cursor: pointer;
}
.file-picker input {
  display: none;
}
.selected {
  overflow-wrap: anywhere;
}
button {
  padding: 11px 18px;
  background: #0052d9;
  border: 0;
  border-radius: 4px;
  color: white;
  cursor: pointer;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.progress {
  height: 8px;
  margin-top: 16px;
  border-radius: 4px;
  background: #edf1f7;
  overflow: hidden;
}
.progress > div {
  height: 100%;
  background: #0052d9;
  transition: width 0.2s;
}
.error {
  color: #c62828;
}
.details {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 24px;
  margin: 0;
}
.details div {
  min-width: 0;
}
dt {
  color: #646a73;
  font-size: 13px;
}
dd {
  margin: 4px 0 0;
  overflow-wrap: anywhere;
}
.stream {
  padding: 20px 0;
  border-top: 1px solid #e7e7e7;
}
@media (max-width: 640px) {
  .video-probe {
    padding: 16px;
  }
  .panel {
    padding: 20px;
  }
  .details {
    grid-template-columns: 1fr;
  }
}
</style>
