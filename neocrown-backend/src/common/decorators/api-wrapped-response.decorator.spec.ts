import { Controller, Get, Module, type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { ApiProperty, DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { ApiWrappedOkResponse } from './api-wrapped-response.decorator'

class SwaggerUser {
  @ApiProperty({ example: 1 })
  id!: number
}

@Controller('test')
class SwaggerController {
  @Get('me')
  @ApiWrappedOkResponse({
    description: '查询当前登录用户成功',
    message: '查询成功',
    data: { model: SwaggerUser },
  })
  findCurrentUser(): SwaggerUser {
    return { id: 1 }
  }
}

@Module({ controllers: [SwaggerController] })
class SwaggerTestModule {}

describe('ApiWrappedOkResponse', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SwaggerTestModule],
    }).compile()

    app = moduleRef.createNestApplication()
  })

  afterAll(async () => {
    await app.close()
  })

  it('生成 Knife4j 可解析的独立包装响应模型', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().build(),
    )
    const response = document.paths['/test/me']?.get?.responses['200']

    if (!response || '$ref' in response) {
      throw new Error('未生成 200 响应文档')
    }

    const responseSchema = response.content?.['application/json'].schema

    expect(responseSchema).toHaveProperty('$ref')

    if (!responseSchema || !('$ref' in responseSchema)) {
      throw new Error('包装响应未引用组件 schema')
    }

    expect(responseSchema.$ref).toMatch(
      /^#\/components\/schemas\/ApiWrappedSwaggerUserResponse/,
    )
    const schemaName = responseSchema.$ref.split('/').at(-1)!

    expect(document.components?.schemas?.[schemaName]).toEqual({
      type: 'object',
      required: ['success', 'data', 'message'],
      properties: {
        success: {
          type: 'boolean',
          description: '请求是否成功',
          example: true,
        },
        data: { $ref: '#/components/schemas/SwaggerUser' },
        message: {
          type: 'string',
          description: '响应消息',
          example: '查询成功',
        },
      },
    })
    expect(document.components?.schemas?.SwaggerUser).toBeDefined()
  })
})
