<template>
  <t-table
    row-key="id"
    :data="dataSource"
    :columns="columns"
    :loading="loading"
    :pagination="pagination"
    :selected-row-keys="selectedRowKeys"
    table-layout="fixed"
    @change="emit('change', $event)"
    @select-change="onSelectChange"
  >
    <template #isEnabled="{ row }">
      <span :class="row.isEnabled ? 'text-blue-400' : 'text-red-400'">
        {{ row.isEnabled ? '已启用' : '已禁用' }}
      </span>
    </template>
    <template #operation="{ row }">
      <div class="flex gap-x-3">
        <t-link theme="primary" hover="color" @click="emit('update', row)">编辑</t-link>
        <t-link theme="danger" hover="color" @click="emit('delete', row)">删除</t-link>
        <t-link
          :theme="row.isEnabled ? 'danger' : 'primary'"
          hover="color"
          @click="emit('toggle-enable', row)"
        >
          {{ row.isEnabled ? '禁用' : '启用' }}
        </t-link>
      </div>
    </template>
  </t-table>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TableChangeData } from 'tdesign-vue-next'
import { columns } from '../model'
import type { ProjectItem } from '../type'

defineOptions({ name: 'ViewList' })

const props = defineProps<{
  dataSource: ProjectItem[]
  loading: boolean
  currentPage: number
  pageSize: number
  total: number
  selectedRowKeys: number[]
}>()

const emit = defineEmits<{
  (e: 'change', data: TableChangeData): void
  (e: 'update:selected-row-keys', keys: number[]): void
  (e: 'update', row: ProjectItem): void
  (e: 'delete', row: ProjectItem): void
  (e: 'toggle-enable', row: ProjectItem): void
}>()

const pagination = computed(() => ({
  current: props.currentPage,
  pageSize: props.pageSize,
  total: props.total,
  showJumper: true,
  showPageSize: true,
  pageSizeOptions: [10, 20, 50, 100],
}))

const onSelectChange = (keys: Array<string | number>) => {
  emit('update:selected-row-keys', keys.map(Number).filter(Number.isFinite))
}
</script>
