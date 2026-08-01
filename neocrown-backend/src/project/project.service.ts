import { Injectable } from '@nestjs/common'
import { CreateProjectDto } from './dto/create-project.dto'
import { Project } from './entities/project.entity'
import { ProjectRepository } from './repositories/project.repository'

@Injectable()
export class ProjectService {
  constructor(private readonly projectRepository: ProjectRepository) {}

  async create(
    createProjectDto: CreateProjectDto,
    userId: number,
  ): Promise<Project> {
    const project = this.projectRepository.create({
      name: createProjectDto.name,
      type: createProjectDto.type,
      description: createProjectDto.description,
      effectiveTimeStart: createProjectDto.effectiveTimeStart
        ? new Date(createProjectDto.effectiveTimeStart)
        : undefined,
      effectiveTimeEnd: createProjectDto.effectiveTimeEnd
        ? new Date(createProjectDto.effectiveTimeEnd)
        : undefined,
      isEnabled: createProjectDto.isEnabled,
      createdBy: userId,
      updatedBy: userId,
      isSystemDefault: false,
    })

    return this.projectRepository.save(project)
  }

  findAll(): Promise<Project[]> {
    return this.projectRepository.findAll()
  }
}
