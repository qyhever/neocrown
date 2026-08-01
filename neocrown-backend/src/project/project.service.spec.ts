import { Test, TestingModule } from '@nestjs/testing'
import { Project } from './entities/project.entity'
import { ProjectRepository } from './repositories/project.repository'
import { ProjectService } from './project.service'

type ProjectRepositoryMock = {
  [Method in keyof ProjectRepository]: jest.MockedFunction<
    ProjectRepository[Method]
  >
}

describe('ProjectService', () => {
  let service: ProjectService
  let projectRepository: ProjectRepositoryMock

  beforeEach(async () => {
    projectRepository = {
      findAll: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        {
          provide: ProjectRepository,
          useValue: projectRepository,
        },
      ],
    }).compile()

    service = module.get<ProjectService>(ProjectService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('findAll 应该返回仓储查询结果', async () => {
    const projects = [{ id: 1, name: '2026 社招项目' }] as Project[]
    projectRepository.findAll.mockResolvedValue(projects)

    await expect(service.findAll()).resolves.toBe(projects)
    expect(projectRepository.findAll).toHaveBeenCalledTimes(1)
  })
})
