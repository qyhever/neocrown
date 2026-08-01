import { Project } from '../entities/project.entity'

export abstract class ProjectRepository {
  abstract create(data: Partial<Project>): Project

  abstract save(project: Project): Promise<Project>

  abstract findAll(): Promise<Project[]>
}
