<template>
  <main class="klash-page">
    <section class="klash-panel">
      <header>
        <h1>配置生成</h1>
        <p>输入 IP 地址，批量生成节点配置。</p>
      </header>
      <t-form :data="form" label-align="top" @submit="handleSubmit">
        <t-form-item label="IP 地址（每行一个 IP）" name="ips">
          <t-textarea
            v-model="form.ips"
            :disabled="submitting"
            :autosize="{ minRows: 10, maxRows: 20 }"
            placeholder="192.0.2.1&#10;2001:db8::1"
          />
        </t-form-item>
        <div class="form-footer">
          <p>支持 IPv4、IPv6，重复 IP 将保留。同日生成会覆盖当天文件。</p>
          <t-button type="submit" :loading="submitting" :disabled="submitting">生成配置</t-button>
        </div>
      </t-form>
      <section v-if="result" class="generation-result" role="status" aria-live="polite">
        <p class="result-heading">配置已生成</p>
        <dl>
          <div>
            <dt>文件名</dt>
            <dd class="filename">{{ result.filename }}</dd>
          </div>
          <div>
            <dt>输入 IP 数</dt>
            <dd>{{ result.ipCount }}</dd>
          </div>
          <div>
            <dt>源节点数</dt>
            <dd>{{ result.sourceNodeCount }}</dd>
          </div>
          <div>
            <dt>新增节点数</dt>
            <dd>{{ result.generatedNodeCount }}</dd>
          </div>
        </dl>
      </section>
    </section>
  </main>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { generateKlash } from './service'
import type { GenerateKlashResult } from './service'

const form = reactive({ ips: '' })
const submitting = ref(false)
const result = ref<GenerateKlashResult>()

watch(
  () => form.ips,
  () => {
    result.value = undefined
  },
)

async function handleSubmit() {
  if (submitting.value) return
  result.value = undefined
  if (!form.ips.trim()) {
    MessagePlugin.warning('请至少输入一个 IP 地址')
    return
  }
  submitting.value = true
  try {
    result.value = await generateKlash({ ips: form.ips })
  } catch {
    // 失败提示由统一请求层处理。
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.klash-page {
  padding: 20px;
}
.klash-panel {
  max-width: 960px;
  padding: 32px;
  border-radius: 8px;
  background: var(--td-bg-color-container);
}
header {
  margin-bottom: 28px;
  border-left: 3px solid var(--td-brand-color);
  padding-left: 16px;
}
h1 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 6px;
}
header p,
.form-footer p {
  color: var(--td-text-color-secondary);
  font-size: 14px;
  line-height: 1.6;
}
:deep(textarea) {
  font-family: ui-monospace, monospace;
  line-height: 1.8;
}
.form-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}
.generation-result {
  margin-top: 32px;
  padding: 24px;
  border: 1px solid var(--td-success-color-3);
  border-radius: 6px;
  background: var(--td-success-color-1);
}
.result-heading {
  color: var(--td-success-color-7);
  font-weight: 600;
  margin-bottom: 20px;
}
dl {
  display: grid;
  grid-template-columns: 2fr repeat(3, 1fr);
  gap: 24px;
}
dt {
  font-size: 13px;
  color: var(--td-text-color-secondary);
  margin-bottom: 8px;
}
dd {
  margin: 0;
  font-size: 22px;
  font-variant-numeric: tabular-nums;
}
.filename {
  font-family: ui-monospace, monospace;
  font-size: 18px;
  line-height: 30px;
}
@media (max-width: 700px) {
  .klash-panel {
    padding: 20px;
  }
  .form-footer {
    align-items: flex-start;
    flex-direction: column;
  }
  dl {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
