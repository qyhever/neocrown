import { get, post, patch, del } from '@/utils/request'
import type { CreateProjectDto, ProjectItem, ProjectQueryDto, UpdateProjectDto } from './type'

export const getProjects = (params: ProjectQueryDto, signal?: AbortSignal) =>
  get<IPaginationResponse<ProjectItem>>('/dev/project/list', params, { signal })

export const getProjectDetail = (id: number) => get<ProjectItem>('/dev/project/detail', { id })

export const createProject = (data: CreateProjectDto) => post<ProjectItem>('/dev/project/create', data)

export const updateProject = (data: UpdateProjectDto) =>
  patch<ProjectItem>('/dev/project/update', data)

export const deleteProject = (id: number) => del<void>('/dev/project/delete', { id })

export const batchDeleteProjects = (ids: number[]) =>
  post<void>('/dev/project/batchDelete', { ids })
