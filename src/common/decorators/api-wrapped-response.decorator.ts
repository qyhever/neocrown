import { applyDecorators, type Type } from '@nestjs/common'
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger'
import { ApiErrorResponseDto, ApiResponseDto } from '../dto/api-response.dto'

type SchemaObject = Record<string, unknown>

type DataSchema =
  | { type: 'null' }
  | { type: 'string'; example?: string }
  | { type: 'object'; additionalProperties?: true; example?: unknown }
  | { isArray: true; model: Type<unknown> }
  | { model: Type<unknown> }

interface ApiWrappedResponseOptions {
  description: string
  message: string
  data: DataSchema
}

const toOpenApiDataSchema = (data: DataSchema): SchemaObject => {
  if ('model' in data) {
    const modelSchema = { $ref: getSchemaPath(data.model) }

    return 'isArray' in data && data.isArray
      ? { type: 'array', items: modelSchema }
      : modelSchema
  }

  return data
}

const getExtraModels = (data: DataSchema): Type<unknown>[] => {
  if ('model' in data) return [data.model]
  return []
}

const createWrappedSchema = ({
  data,
  message,
}: ApiWrappedResponseOptions): SchemaObject => ({
  allOf: [
    { $ref: getSchemaPath(ApiResponseDto) },
    {
      properties: {
        data: toOpenApiDataSchema(data),
        message: {
          type: 'string',
          example: message,
        },
      },
    },
  ],
})

export const ApiWrappedOkResponse = (options: ApiWrappedResponseOptions) =>
  applyDecorators(
    ApiExtraModels(ApiResponseDto, ...getExtraModels(options.data)),
    ApiOkResponse({
      description: options.description,
      schema: createWrappedSchema(options),
    }),
  )

export const ApiWrappedCreatedResponse = (options: ApiWrappedResponseOptions) =>
  applyDecorators(
    ApiExtraModels(ApiResponseDto, ...getExtraModels(options.data)),
    ApiCreatedResponse({
      description: options.description,
      schema: createWrappedSchema(options),
    }),
  )

export const ApiValidationErrorResponse = () =>
  applyDecorators(
    ApiExtraModels(ApiErrorResponseDto),
    ApiBadRequestResponse({
      description: '请求参数校验失败',
      type: ApiErrorResponseDto,
    }),
  )

export const ApiAccessTokenErrorResponse = () =>
  applyDecorators(
    ApiExtraModels(ApiErrorResponseDto),
    ApiUnauthorizedResponse({
      description: '访问令牌缺失、无效或已过期',
      type: ApiErrorResponseDto,
    }),
  )
