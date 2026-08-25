<template>
  <t-dialog
    v-model:visible="visible"
    :header="dialogTitle"
    width="766px"
    :confirm-btn="{ content: '提交', loading: submitting }"
    :close-on-overlay-click="!submitting"
    @close="close"
    @confirm="onSubmit"
  >
    <t-form ref="formRef" :data="formModel" :rules="rules" label-width="100px">
      <t-form-item label="项目名称" name="name">
        <t-input v-model="formModel.name" placeholder="请输入" clearable />
      </t-form-item>
      <t-form-item label="项目类型" name="recruitType">
        <t-select v-model="formModel.recruitType" placeholder="请选择" clearable>
          <t-option value="campus" label="校招" />
          <t-option value="social" label="社招" />
        </t-select>
      </t-form-item>
      <t-form-item label="状态" name="status">
        <t-select v-model="formModel.status" placeholder="请选择" clearable>
          <t-option value="1" label="待开始" />
          <t-option value="2" label="进行中" />
          <t-option value="3" label="已结束" />
          <t-option value="4" label="已取消" />
          <t-option value="5" label="已过期" />
        </t-select>
      </t-form-item>
      <t-form-item label="有效时间" name="effectiveTimeRange">
        <t-date-range-picker
          v-model="formModel.effectiveTimeRange"
          :placeholder="['开始日期', '结束日期']"
          clearable
          style="width: 100%"
        />
      </t-form-item>
      <t-form-item label="是否启用" name="isEnabled">
        <t-switch v-model="formModel.isEnabled" />
      </t-form-item>
      <t-form-item label="备注" name="description">
        <t-textarea
          v-model="formModel.description"
          placeholder="请输入备注"
          clearable
          style="width: 100%"
        />
      </t-form-item>
    </t-form>
  </t-dialog>
</template>

<script setup lang="ts">
import { cloneDeep } from 'lodash-es'
import { computed, reactive, ref } from 'vue'
import type { FormInstanceFunctions } from 'tdesign-vue-next'
import { defaultSaveModel, projectToSaveForm } from '../model'
import type { ProjectItem, ProjectSubmitPayload } from '../type'

defineOptions({ name: 'ProjectOperationDialog' })

defineProps<{ submitting: boolean }>()

const emit = defineEmits<{
  (e: 'submit', payload: ProjectSubmitPayload): void
}>()

const visible = ref(false)
const editingId = ref<number>()
const formModel = ref(cloneDeep(defaultSaveModel))
const formRef = ref<FormInstanceFunctions>()
const rules = reactive({
  name: [{ required: true, message: '请输入项目名称' }],
  recruitType: [{ required: true, message: '请选择项目类型' }],
  status: [{ required: true, message: '请选择状态' }],
  effectiveTimeRange: [{ required: true, message: '请选择有效时间' }],
  isEnabled: [{ required: true, message: '请选择是否启用' }],
})

const dialogTitle = computed(() => (editingId.value === undefined ? '新增项目' : '编辑项目'))

const open = (row?: ProjectItem) => {
  editingId.value = row?.id
  formModel.value = row ? projectToSaveForm(row) : cloneDeep(defaultSaveModel)
  visible.value = true
}

const close = () => {
  visible.value = false
  editingId.value = undefined
  formModel.value = cloneDeep(defaultSaveModel)
  formRef.value?.clearValidate()
}

const onSubmit = async () => {
  const valid = await formRef.value?.validate()
  if (valid !== true) return

  emit('submit', {
    id: editingId.value,
    form: cloneDeep(formModel.value),
  })
}

defineExpose({ open, close })
</script>
