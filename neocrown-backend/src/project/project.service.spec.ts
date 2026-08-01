import { Test, TestingModule } from '@nestjs/testing'
import { CreateProjectDto } from './dto/create-project.dto'
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
      create: jest.fn(),
      save: jest.fn(),
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

  it('create 应该写入创建人、更新人和非系统默认标记并返回保存结果', async () => {
    const createProjectDto: CreateProjectDto = {
      name: '2026 社招项目',
      type: '1',
      description: '社招项目',
      effectiveTimeStart: '2026-08-01T00:00:00.000Z',
      effectiveTimeEnd: '2026-12-31T23:59:59.000Z',
      isEnabled: true,
    }
    const createdProject = { id: 1 } as Project
    const savedProject = { id: 1, name: '2026 社招项目' } as Project
    projectRepository.create.mockReturnValue(createdProject)
    projectRepository.save.mockResolvedValue(savedProject)

    await expect(service.create(createProjectDto, 7)).resolves.toBe(
      savedProject,
    )
    expect(projectRepository.create).toHaveBeenCalledWith({
      name: createProjectDto.name,
      type: createProjectDto.type,
      description: createProjectDto.description,
      effectiveTimeStart: new Date(createProjectDto.effectiveTimeStart!),
      effectiveTimeEnd: new Date(createProjectDto.effectiveTimeEnd!),
      isEnabled: createProjectDto.isEnabled,
      createdBy: 7,
      updatedBy: 7,
      isSystemDefault: false,
    })
    expect(projectRepository.save).toHaveBeenCalledWith(createdProject)
  })

  it('findAll 应该返回仓储查询结果', async () => {
    const projects = [{ id: 1, name: '2026 社招项目' }] as Project[]
    projectRepository.findAll.mockResolvedValue(projects)

    await expect(service.findAll()).resolves.toBe(projects)
    expect(projectRepository.findAll).toHaveBeenCalledTimes(1)
  })
})
