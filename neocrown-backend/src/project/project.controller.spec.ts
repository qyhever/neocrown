import { Test, TestingModule } from '@nestjs/testing'
import { Project } from './entities/project.entity'
import { ProjectController } from './project.controller'
import { ProjectService } from './project.service'

describe('ProjectController', () => {
  let controller: ProjectController
  let projectService: {
    findAll: jest.MockedFunction<ProjectService['findAll']>
  }

  beforeEach(async () => {
    projectService = {
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

  it('findAll 应该调用 ProjectService 查询全部项目', async () => {
    const projects = [{ id: 1, name: '2026 社招项目' }] as Project[]
    projectService.findAll.mockResolvedValue(projects)

    await expect(controller.findAll()).resolves.toBe(projects)
    expect(projectService.findAll).toHaveBeenCalledTimes(1)
  })
})
