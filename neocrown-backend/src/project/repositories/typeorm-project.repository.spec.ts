import { getRepositoryToken } from '@nestjs/typeorm'
import { Test, TestingModule } from '@nestjs/testing'
import { Repository } from 'typeorm'
import { Project } from '../entities/project.entity'
import { TypeOrmProjectRepository } from './typeorm-project.repository'

type TypeOrmRepositoryMock = {
  [Method in 'find']: jest.MockedFunction<Repository<Project>[Method]>
}

describe('TypeOrmProjectRepository', () => {
  let repository: TypeOrmProjectRepository
  let typeOrmRepository: TypeOrmRepositoryMock

  beforeEach(async () => {
    typeOrmRepository = {
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

  it('findAll 应该按创建时间倒序查询全部未软删除项目', async () => {
    const projects = [{ id: 1, name: '2026 社招项目' }] as Project[]
    typeOrmRepository.find.mockResolvedValue(projects)

    await expect(repository.findAll()).resolves.toBe(projects)
    expect(typeOrmRepository.find).toHaveBeenCalledWith({
      order: { createdAt: 'DESC' },
    })
  })
})
