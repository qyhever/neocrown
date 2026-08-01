import { getRepositoryToken } from '@nestjs/typeorm'
import { Test, TestingModule } from '@nestjs/testing'
import { Repository } from 'typeorm'
import { Project } from '../entities/project.entity'
import { TypeOrmProjectRepository } from './typeorm-project.repository'

type TypeOrmRepositoryMock = {
  create: jest.MockedFunction<Repository<Project>['create']>
  save: jest.MockedFunction<Repository<Project>['save']>
  find: jest.MockedFunction<Repository<Project>['find']>
}

describe('TypeOrmProjectRepository', () => {
  let repository: TypeOrmProjectRepository
  let typeOrmRepository: TypeOrmRepositoryMock

  beforeEach(async () => {
    typeOrmRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TypeOrmProjectRepository,
        {
          provide: getRepositoryToken(Project),
          useValue: typeOrmRepository,
        },
      ],
    }).compile()

    repository = module.get<TypeOrmProjectRepository>(TypeOrmProjectRepository)
  })

  it('should be defined', () => {
    expect(repository).toBeDefined()
  })

  it('create 应该代理到 TypeORM repository.create', () => {
    const data = { name: '2026 社招项目' } as Partial<Project>
    const project = { id: 1, name: '2026 社招项目' } as Project
    typeOrmRepository.create.mockReturnValue(project)

    expect(repository.create(data)).toBe(project)
    expect(typeOrmRepository.create).toHaveBeenCalledWith(data)
  })

  it('save 应该代理到 TypeORM repository.save', async () => {
    const project = { id: 1, name: '2026 社招项目' } as Project
    typeOrmRepository.save.mockResolvedValue(project)

    await expect(repository.save(project)).resolves.toBe(project)
    expect(typeOrmRepository.save).toHaveBeenCalledWith(project)
  })

  it('findAll 应该按创建时间倒序查询全部未软删除项目', async () => {
    const projects = [{ id: 1, name: '2026 社招项目' }] as Project[]
    typeOrmRepository.find.mockResolvedValue(projects)

    await expect(repository.findAll()).resolves.toBe(projects)
    expect(typeOrmRepository.find).toHaveBeenCalledWith({
      order: { createdAt: 'DESC' },
    })
  })
})
