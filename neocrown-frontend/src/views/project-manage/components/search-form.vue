<template>
  <div class="mb-3">
    <div class="flex items-center justify-between pb-2">
      <div class="flex gap-x-5">
        <t-input
          v-model="formModel.keyword"
          placeholder="请输入名称/ID查询"
          clearable
          style="width: 240px"
          @change="onInputChangeDebounced"
          @enter="search"
        >
          <template #suffixIcon>
            <SearchIcon class="w-4 text-gray-500" />
          </template>
        </t-input>
        <ExpandButton v-model:expand="expand" />
      </div>
      <t-button @click="emit('create')">新增项目</t-button>
    </div>

    <div v-show="expand" class="pb-2">
      <div
        class="grid grid-cols-1 gap-6 rounded-md bg-[#fafafb] p-4 xl:grid-cols-2 2xl:grid-cols-3"
      >
        <div class="flex items-center">
          <div class="basis-25 pr-5 text-gray-500">项目名称:</div>
          <div class="min-w-0 flex-1">
            <t-input v-model="formModel.name" placeholder="请输入" clearable />
          </div>
        </div>

        <div class="flex items-center">
          <div class="basis-25 pr-5 text-gray-500">项目类型:</div>
          <div class="min-w-0 flex-1">
            <t-select v-model="formModel.recruitType" placeholder="请选择" clearable>
              <t-option value="campus" label="校招" />
              <t-option value="social" label="社招" />
            </t-select>
          </div>
        </div>

        <div class="flex items-center">
          <div class="basis-25 pr-5 text-gray-500">状态:</div>
          <div class="min-w-0 flex-1">
            <t-select v-model="formModel.status" placeholder="请选择" clearable>
              <t-option value="1" label="待开始" />
              <t-option value="2" label="进行中" />
              <t-option value="3" label="已结束" />
              <t-option value="4" label="已取消" />
              <t-option value="5" label="已过期" />
            </t-select>
          </div>
        </div>

        <div class="flex items-center">
          <div class="basis-25 pr-5 text-gray-500">有效时间:</div>
          <div class="min-w-0 flex-1">
            <t-date-range-picker
              v-model="formModel.effectiveTimeRange"
              :placeholder="['开始日期', '结束日期']"
              clearable
              style="width: 100%"
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 xl:col-span-2 2xl:col-span-3">
          <t-button theme="default" @click="reset">重置</t-button>
          <t-button theme="primary" @click="search">查询</t-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { cloneDeep, debounce } from 'lodash-es'
import { onBeforeUnmount, ref } from 'vue'
import { SearchIcon } from '@lucide/vue'
import ExpandButton from '@/components/ExpandButton.vue'
import { defaultQueryModel } from '../model'
import type { ProjectQueryForm } from '../type'

defineOptions({ name: 'SearchForm' })

const emit = defineEmits<{
  (e: 'search', form: ProjectQueryForm): void
  (e: 'reset'): void
  (e: 'create'): void
}>()

const formModel = ref(cloneDeep(defaultQueryModel))
const expand = ref(false)

const emitSearch = () => emit('search', cloneDeep(formModel.value))
const onInputChangeDebounced = debounce(emitSearch, 480)

const search = () => {
  onInputChangeDebounced.cancel()
  emitSearch()
}

const reset = () => {
  onInputChangeDebounced.cancel()
  formModel.value = cloneDeep(defaultQueryModel)
  emit('reset')
}

onBeforeUnmount(() => onInputChangeDebounced.cancel())
</script>
