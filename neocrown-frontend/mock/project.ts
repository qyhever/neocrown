import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import type { MockMethod } from 'vite-plugin-mock'

interface Project {
  id: number
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
  deletedAt: string | null
  name: string
  recruitType: string
  effectiveTimeStart: string
  effectiveTimeEnd: string
  status: string // 待开始、进行中、已结束、已取消、已过期
  useCount: number
  description: string
  isEnabled: boolean
}

type EditableProjectField =
  | 'name'
  | 'recruitType'
  | 'effectiveTimeStart'
  | 'effectiveTimeEnd'
  | 'status'
  | 'description'
  | 'isEnabled'

type ApiResponse<T> = {
  code: string
  msg: string
  data: T | null
}

interface MockRequest {
  query: Record<string, unknown>
  body: unknown
}

const projectFilePath = path.resolve(process.cwd(), 'mock/project.json')
const stringFields: EditableProjectField[] = [
  'name',
  'recruitType',
  'effectiveTimeStart',
  'effectiveTimeEnd',
  'status',
  'description',
]
const editableFields: EditableProjectField[] = [...stringFields, 'isEnabled']

function success<T>(data: T): ApiResponse<T> {
  return { code: '000', msg: 'success', data }
}

function error(code: '400' | '404' | '500', msg: string): ApiResponse<never> {
  return { code, msg, data: null }
}

function readProjects() {
  const content = readFileSync(projectFilePath, 'utf8')
  const data: unknown = JSON.parse(content)
  if (!Array.isArray(data)) throw new Error('project.json must contain an array')
  return data as Project[]
}

function writeProjects(projects: Project[]) {
  writeFileSync(projectFilePath, `${JSON.stringify(projects, null, 2)}\n`, 'utf8')
}

function getTrimmedString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function getPositiveInteger(value: unknown, defaultValue: number) {
  const parsedValue = Number(value)
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : defaultValue
}

function getRequiredId(value: unknown) {
  if ((typeof value !== 'string' && typeof value !== 'number') || value === '') return undefined
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : undefined
}

function getValidTime(value: unknown) {
  const text = getTrimmedString(value)
  if (!text) return undefined

  const time = Date.parse(text)
  return Number.isNaN(time) ? undefined : time
}

function formatLocalTime(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validateFieldTypes(body: Record<string, unknown>, fields: EditableProjectField[]) {
  for (const field of fields) {
    if (!(field in body)) continue
    if (field === 'isEnabled') {
      if (typeof body[field] !== 'boolean') return `参数 ${field} 必须是布尔值`
    } else if (typeof body[field] !== 'string') {
      return `参数 ${field} 必须是字符串`
    }
  }
  return undefined
}

const projectModule: MockMethod[] = [
  {
    url: '/dev/project/list',
    method: 'get',
    response: ({ query }: MockRequest) => {
      try {
        const projects = readProjects()
        const currentPage = getPositiveInteger(query.currentPage, 1)
        const pageSize = getPositiveInteger(query.pageSize, 10)
        const name = getTrimmedString(query.name)
        const recruitType = getTrimmedString(query.recruitType)
        const status = getTrimmedString(query.status)
        const effectiveTimeStart = getValidTime(query.effectiveTimeStart)
        const effectiveTimeEnd = getValidTime(query.effectiveTimeEnd)

        const filteredProjects = projects.filter((project) => {
          if (project.deletedAt !== null) return false
          if (name && !project.name.includes(name)) return false
          if (recruitType && project.recruitType !== recruitType) return false
          if (status && project.status !== status) return false

          const projectStart = Date.parse(project.effectiveTimeStart)
          const projectEnd = Date.parse(project.effectiveTimeEnd)
          if (effectiveTimeStart !== undefined && projectEnd < effectiveTimeStart) return false
          if (effectiveTimeEnd !== undefined && projectStart > effectiveTimeEnd) return false

          return true
        })

        const startIndex = (currentPage - 1) * pageSize
        return success({
          list: filteredProjects.slice(startIndex, startIndex + pageSize),
          total: filteredProjects.length,
        })
      } catch (cause) {
        console.error('读取项目数据失败', cause)
        return error('500', '读取项目数据失败')
      }
    },
  },
  {
    url: '/dev/project/create',
    method: 'post',
    response: ({ body }: MockRequest) => {
      if (!isRecord(body)) return error('400', '请求体不能为空')

      const typeError = validateFieldTypes(body, editableFields)
      if (typeError) return error('400', typeError)

      for (const field of ['name', 'recruitType', 'effectiveTimeStart', 'effectiveTimeEnd'] as const) {
        if (!(field in body) || body[field] === '') return error('400', `参数 ${field} 不能为空`)
      }

      try {
        const projects = readProjects()
        const now = formatLocalTime()
        const project: Project = {
          id: projects.reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1,
          createdBy: 'admin',
          createdAt: now,
          updatedBy: 'admin',
          updatedAt: now,
          deletedAt: null,
          name: body.name as string,
          recruitType: body.recruitType as string,
          effectiveTimeStart: body.effectiveTimeStart as string,
          effectiveTimeEnd: body.effectiveTimeEnd as string,
          status: (body.status as string | undefined) ?? 'draft',
          useCount: 0,
          description: (body.description as string | undefined) ?? '',
          isEnabled: (body.isEnabled as boolean | undefined) ?? false,
        }

        writeProjects([...projects, project])
        return success(project)
      } catch (cause) {
        console.error('新增项目失败', cause)
        return error('500', '新增项目失败')
      }
    },
  },
  {
    url: '/dev/project/detail',
    method: 'get',
    response: ({ query }: MockRequest) => {
      const id = getRequiredId(query.id)
      if (id === undefined) return error('400', '参数 id 必须是正整数')

      try {
        const projects = readProjects()
        const project = projects.find((item) => item.id === id && item.deletedAt === null)
        return project ? success(project) : error('404', '项目不存在')
      } catch (cause) {
        console.error('读取项目详情失败', cause)
        return error('500', '读取项目详情失败')
      }
    },
  },
  {
    url: '/dev/project/update',
    method: 'patch',
    response: ({ body }: MockRequest) => {
      if (!isRecord(body)) return error('400', '请求体不能为空')

      const id = getRequiredId(body.id)
      if (id === undefined) return error('400', '参数 id 必须是正整数')

      const fieldsToUpdate = editableFields.filter((field) => field in body)
      if (fieldsToUpdate.length === 0) return error('400', '没有可更新的字段')

      const typeError = validateFieldTypes(body, fieldsToUpdate)
      if (typeError) return error('400', typeError)

      try {
        const projects = readProjects()
        const projectIndex = projects.findIndex(
          (project) => project.id === id && project.deletedAt === null,
        )
        if (projectIndex === -1) return error('404', '项目不存在')

        const updatedProject = { ...projects[projectIndex] }
        for (const field of fieldsToUpdate) {
          Object.assign(updatedProject, { [field]: body[field] })
        }
        updatedProject.updatedAt = formatLocalTime()
        updatedProject.updatedBy = 'admin'

        const updatedProjects = [...projects]
        updatedProjects[projectIndex] = updatedProject
        writeProjects(updatedProjects)
        return success(updatedProject)
      } catch (cause) {
        console.error('修改项目失败', cause)
        return error('500', '修改项目失败')
      }
    },
  },
  {
    url: '/dev/project/delete',
    method: 'delete',
    response: ({ query }: MockRequest) => {
      const id = getRequiredId(query.id)
      if (id === undefined) return error('400', '参数 id 必须是正整数')

      try {
        const projects = readProjects()
        const projectIndex = projects.findIndex(
          (project) => project.id === id && project.deletedAt === null,
        )
        if (projectIndex === -1) return error('404', '项目不存在')

        const now = formatLocalTime()
        const updatedProjects = [...projects]
        updatedProjects[projectIndex] = {
          ...projects[projectIndex],
          deletedAt: now,
          updatedAt: now,
          updatedBy: 'admin',
        }
        writeProjects(updatedProjects)
        return success(null)
      } catch (cause) {
        console.error('删除项目失败', cause)
        return error('500', '删除项目失败')
      }
    },
  },
]

export default projectModule
