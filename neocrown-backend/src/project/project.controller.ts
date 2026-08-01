import { Controller, Get } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import {
  ApiAccessTokenErrorResponse,
  ApiWrappedOkResponse,
} from '../common/decorators/api-wrapped-response.decorator'
import { Project } from './entities/project.entity'
import { ProjectService } from './project.service'

@ApiTags('项目')
@ApiBearerAuth()
@ApiAccessTokenErrorResponse()
@Controller('project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

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
