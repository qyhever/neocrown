import { Project } from '../entities/project.entity'

export abstract class ProjectRepository {
  abstract findAll(): Promise<Project[]>
}
