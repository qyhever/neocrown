import { Injectable } from '@nestjs/common'
import { Project } from './entities/project.entity'
import { ProjectRepository } from './repositories/project.repository'

@Injectable()
export class ProjectService {
  constructor(private readonly projectRepository: ProjectRepository) {}

  findAll(): Promise<Project[]> {
    return this.projectRepository.findAll()
  }
}
