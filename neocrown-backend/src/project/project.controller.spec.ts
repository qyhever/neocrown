import { Test, TestingModule } from '@nestjs/testing'
import type { RequestWithContext } from '../common/types/request-with-context'
import { CreateProjectDto } from './dto/create-project.dto'
import { Project } from './entities/project.entity'
import { ProjectController } from './project.controller'
import { ProjectService } from './project.service'

describe('ProjectController', () => {
  let controller: ProjectController
  let projectService: {
    create: jest.MockedFunction<ProjectService['create']>
    findAll: jest.MockedFunction<ProjectService['findAll']>
  }

  beforeEach(async () => {
    projectService = {
      create: jest.fn(),
      findAll: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectController],
      providers: [
        {
          provide: ProjectService,
          useValue: projectService,
        },
      ],
    }).compile()

    controller = module.get<ProjectController>(ProjectController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  it('create 应该将 DTO 和当前用户 ID 传给 ProjectService', async () => {
    const createProjectDto: CreateProjectDto = {
      name: '2026 社招项目',
      type: '1',
      description: '社招项目',
      effectiveTimeStart: '2026-08-01T00:00:00.000Z',
      effectiveTimeEnd: '2026-12-31T23:59:59.000Z',
      isEnabled: true,
    }
    const request = { user: { id: 7 } } as RequestWithContext
    const project = { id: 1, ...createProjectDto } as unknown as Project
    projectService.create.mockResolvedValue(project)

    await expect(controller.create(createProjectDto, request)).resolves.toBe(
      project,
    )
    expect(projectService.create).toHaveBeenCalledWith(createProjectDto, 7)
  })

  it('findAll 应该调用 ProjectService 查询全部项目', async () => {
    const projects = [{ id: 1, name: '2026 社招项目' }] as Project[]
    projectService.findAll.mockResolvedValue(projects)

    await expect(controller.findAll()).resolves.toBe(projects)
    expect(projectService.findAll).toHaveBeenCalledTimes(1)
  })
})
