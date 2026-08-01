import { Body, Controller, Get, Post, Req } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import {
  ApiAccessTokenErrorResponse,
  ApiValidationErrorResponse,
  ApiWrappedCreatedResponse,
  ApiWrappedOkResponse,
} from '../common/decorators/api-wrapped-response.decorator'
import type { RequestWithContext } from '../common/types/request-with-context'
import { CreateProjectDto } from './dto/create-project.dto'
import { Project } from './entities/project.entity'
import { ProjectService } from './project.service'

@ApiTags('项目')
@ApiBearerAuth()
@ApiAccessTokenErrorResponse()
@Controller('project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @ApiOperation({ summary: '创建项目', description: '创建一个新的项目' })
  @ApiWrappedCreatedResponse({
    description: '创建项目成功',
    message: '创建成功',
    data: { model: Project },
  })
  @ApiValidationErrorResponse()
  create(
    @Body() createProjectDto: CreateProjectDto,
    @Req() request: RequestWithContext,
  ) {
    return this.projectService.create(createProjectDto, request.user!.id)
  }

  @Get()
  @ApiOperation({ summary: '查询项目列表', description: '返回所有未删除项目' })
  @ApiWrappedOkResponse({
    description: '查询项目列表成功',
    message: '查询成功',
    data: { isArray: true, model: Project },
  })
  findAll() {
    return this.projectService.findAll()
  }
}
