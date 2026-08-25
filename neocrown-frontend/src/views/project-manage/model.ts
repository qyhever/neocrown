import { ref } from 'vue'
import type { TableProps } from 'tdesign-vue-next'
import type {
  CreateProjectDto,
  ProjectItem,
  ProjectQueryDto,
  ProjectQueryForm,
  ProjectSaveForm,
  UpdateProjectDto,
} from './type'

export const defaultQueryModel: ProjectQueryForm = {
  currentPage: 1,
  pageSize: 10,
  sortField: '',
  sortValue: '',
  keyword: '',
  name: '',
  recruitType: '',
  status: '',
  effectiveTimeRange: [],
}

export const defaultSaveModel: ProjectSaveForm = {
  name: '',
  recruitType: '',
  status: '',
  effectiveTimeRange: [],
  description: '',
  isEnabled: true,
}

export const queryFormToDto = (form: ProjectQueryForm): ProjectQueryDto => ({
  currentPage: form.currentPage,
  pageSize: form.pageSize,
  sortField: form.sortField,
  sortValue: form.sortValue,
  keyword: form.keyword.trim(),
  name: form.name.trim(),
  recruitType: form.recruitType,
  status: form.status,
  effectiveTimeStart: form.effectiveTimeRange[0] ?? '',
  effectiveTimeEnd: form.effectiveTimeRange[1] ?? '',
})

export const projectToSaveForm = (project: ProjectItem): ProjectSaveForm => ({
  name: project.name,
  recruitType: project.recruitType,
  status: project.status,
  effectiveTimeRange: [project.effectiveTimeStart, project.effectiveTimeEnd],
  description: project.description,
  isEnabled: project.isEnabled,
})

export const saveFormToCreateDto = (form: ProjectSaveForm): CreateProjectDto => ({
  name: form.name.trim(),
  recruitType: form.recruitType,
  status: form.status,
  effectiveTimeStart: form.effectiveTimeRange[0] ?? '',
  effectiveTimeEnd: form.effectiveTimeRange[1] ?? '',
  description: form.description.trim(),
  isEnabled: form.isEnabled,
})

export const saveFormToUpdateDto = (id: number, form: ProjectSaveForm): UpdateProjectDto => ({
  id,
  ...saveFormToCreateDto(form),
})

export const enabledToUpdateDto = (id: number, isEnabled: boolean): UpdateProjectDto => ({
  id,
  isEnabled,
})

export const columns = ref<TableProps<ProjectItem>['columns']>([
  {
    colKey: 'row-select',
    type: 'multiple',
    width: '50',
  },
  {
    colKey: 'id',
    title: 'ID',
    width: '200',
    ellipsis: {
      theme: 'light',
      placement: 'top',
    },
  },
  {
    colKey: 'name',
    title: '项目名称',
    width: '180',
  },
  {
    colKey: 'recruitType',
    title: '项目类型',
    width: '100',
  },
  {
    colKey: 'status',
    title: '状态',
    width: '100',
  },
  {
    colKey: 'isEnabled',
    title: '启用/禁用',
    width: '100',
  },
  {
    colKey: 'description',
    title: '描述',
    width: '180',
    ellipsis: {
      theme: 'light',
      placement: 'top',
    },
  },
  {
    colKey: 'effectiveTimeStart',
    title: '生效开始时间',
    width: '180',
  },
  {
    colKey: 'effectiveTimeEnd',
    title: '生效结束时间',
    width: '180',
  },
  {
    colKey: 'useCount',
    title: '使用数量',
    width: '100',
  },
  {
    colKey: 'createdBy',
    title: '创建人',
    width: '120',
  },
  {
    colKey: 'createdAt',
    title: '创建时间',
    sortType: 'all',
    sorter: true,
    width: '180',
  },
  {
    colKey: 'updatedBy',
    title: '更新人',
    width: '120',
  },
  {
    colKey: 'updatedAt',
    title: '更新时间',
    sortType: 'all',
    sorter: true,
    width: '180',
  },
  {
    colKey: 'operation',
    title: '操作',
    width: '140',
    fixed: 'right',
  },
])
