import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Project } from './entities/project.entity'
import { ProjectController } from './project.controller'
import { ProjectService } from './project.service'
import { ProjectRepository } from './repositories/project.repository'
import { TypeOrmProjectRepository } from './repositories/typeorm-project.repository'

@Module({
  imports: [TypeOrmModule.forFeature([Project])],
  controllers: [ProjectController],
  providers: [
    ProjectService,
    {
      provide: ProjectRepository,
      useClass: TypeOrmProjectRepository,
    },
  ],
  exports: [ProjectService, ProjectRepository],
})
export class ProjectModule {}
