<template>
  <div class="flex flex-1 flex-col p-5">
    <div class="rounded-lg bg-white p-5">
      <SearchForm @search="onSearch" @reset="handleReset" @create="onCreate" />
      <ViewList
        :data-source="dataSource"
        :loading="loading"
        :current-page="queryModel.currentPage"
        :page-size="queryModel.pageSize"
        :total="total"
        :selected-row-keys="selectedRowKeys"
        @change="handleTableChange"
        @update:selected-row-keys="setSelectedRowKeys"
        @update="onUpdate"
        @delete="onDelete"
        @toggle-enable="onToggleEnable"
      />
    </div>
    <OperationDialog
      ref="operationDialogRef"
      :submitting="createLoading || updateLoading"
      @submit="onSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { usePagination } from '@/hooks/usePagination'
import OperationDialog from './components/operation-dialog.vue'
import SearchForm from './components/search-form.vue'
import ViewList from './components/view-list.vue'
import {
  defaultQueryModel,
  enabledToUpdateDto,
  queryFormToDto,
  saveFormToCreateDto,
  saveFormToUpdateDto,
} from './model'
import { createProject, updateProject, deleteProject, getProjects } from './service'
import type {
  CreateProjectDto,
  ProjectItem,
  ProjectQueryDto,
  ProjectQueryForm,
  ProjectSubmitPayload,
  UpdateProjectDto,
} from './type'

defineOptions({ name: 'ProjectManageView' })

const operationDialogRef = ref<InstanceType<typeof OperationDialog>>()

const {
  loading,
  dataSource,
  total,
  queryModel,
  create,
  update,
  deleteItems,
  createLoading,
  updateLoading,
  selectedRowKeys,
  setSelectedRowKeys,
  handleTableChange,
  handleSearch,
  handleReset,
} = usePagination<ProjectItem, ProjectQueryDto, CreateProjectDto, UpdateProjectDto>({
  queryKey: 'projects',
  queryFn: getProjects,
  initialQuery: queryFormToDto(defaultQueryModel),
  createMutation: { mutationFn: createProject },
  updateMutation: { mutationFn: updateProject },
  deleteMutation: {
    mutationFn: ({ ids }) => Promise.all(ids.map(deleteProject)),
  },
})

const onSearch = (form: ProjectQueryForm) => {
  const params = queryFormToDto(form)
  return handleSearch({
    ...params,
    pageSize: queryModel.value.pageSize,
    sortField: queryModel.value.sortField,
    sortValue: queryModel.value.sortValue,
  })
}

const onCreate = () => operationDialogRef.value?.open()

const onUpdate = (row: ProjectItem) => operationDialogRef.value?.open(row)

const onSubmit = async ({ id, form }: ProjectSubmitPayload) => {
  try {
    if (id === undefined) {
      await create?.(saveFormToCreateDto(form))
      MessagePlugin.success('新增成功')
    } else {
      await update?.(saveFormToUpdateDto(id, form))
      MessagePlugin.success('编辑成功')
    }
    operationDialogRef.value?.close()
  } catch {
    // 请求层统一展示错误；保留弹窗和表单，方便用户修正后重试。
  }
}

const onDelete = async (row: ProjectItem) => {
  try {
    await deleteItems?.([row.id])
  } catch {
    // 请求层统一展示错误。
  }
}

const onToggleEnable = async (row: ProjectItem) => {
  try {
    await update?.(enabledToUpdateDto(row.id, !row.isEnabled))
    MessagePlugin.success(row.isEnabled ? '禁用成功' : '启用成功')
  } catch {
    // 请求层统一展示错误。
  }
}
</script>
