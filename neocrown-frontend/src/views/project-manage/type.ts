export interface ProjectItem {
  id: number
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
  name: string
  recruitType: string
  effectiveTimeStart: string
  effectiveTimeEnd: string
  status: string
  useCount: number
  description: string
  isEnabled: boolean
}

// ============= 查询相关类型 =============

/**
 * 项目查询基础字段（公共部分）
 * - 表单和 API 都共享的字段
 */
interface ProjectQueryBase extends IPaginationQuery {
  keyword: string
  name: string
  recruitType: string
  status: string
}

/**
 * 项目查询表单模型（页面绑定）
 * - 包含 UI 特有的类型（如 Dayjs）
 * - 用于表单组件、状态管理
 */
export interface ProjectQueryForm extends ProjectQueryBase {
  effectiveTimeRange: string[] // 用于日期选择器
}

/**
 * 项目查询参数（API 请求）
 * - 已转换为后端可接收的格式
 * - 如果需要与后端约定不同的字段，在这里定义
 */
export interface ProjectQueryDto extends ProjectQueryBase {
  effectiveTimeStart: string // ISO 字符串
  effectiveTimeEnd: string // ISO 字符串
}

// ============= 创建/更新相关类型 =============

/**
 * 项目表单模型（创建/编辑表单绑定）
 */
export interface ProjectSaveForm {
  name: string
  recruitType: string
  status: string
  effectiveTimeRange: string[]
  description: string
  isEnabled: boolean
}

/**
 * 创建项目 DTO
 */
export interface CreateProjectDto {
  name: string
  recruitType: string
  status: string
  effectiveTimeStart: string
  effectiveTimeEnd: string
  description: string
  isEnabled: boolean
}

/**
 * 更新项目 DTO
 */
export type UpdateProjectDto = Partial<CreateProjectDto> & {
  id: number
}

export interface ProjectSubmitPayload {
  id?: number
  form: ProjectSaveForm
}
