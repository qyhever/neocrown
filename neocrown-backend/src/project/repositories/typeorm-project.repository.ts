import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Project } from '../entities/project.entity'
import { ProjectRepository } from './project.repository'

@Injectable()
export class TypeOrmProjectRepository implements ProjectRepository {
  constructor(
    @InjectRepository(Project)
    private readonly repository: Repository<Project>,
  ) {}

  create(data: Partial<Project>): Project {
    return this.repository.create(data)
  }

  save(project: Project): Promise<Project> {
    return this.repository.save(project)
  }

  findAll(): Promise<Project[]> {
    return this.repository.find({
      order: { createdAt: 'DESC' },
    })
  }
}
