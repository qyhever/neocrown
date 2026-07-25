import { applyDecorators, type Type } from '@nestjs/common'
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiProperty,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger'
import { ApiErrorResponseDto } from '../dto/api-response.dto'

type DataSchema =
  | { type: null }
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

const getExtraModels = (data: DataSchema): Type<unknown>[] => {
  if ('model' in data) return [data.model]
  return []
}

const createSchemaName = (options: ApiWrappedResponseOptions): string => {
  const dataIdentity =
    'model' in options.data
      ? `${options.data.model.name}:${'isArray' in options.data && options.data.isArray}`
      : JSON.stringify(options.data)
  const identity = `${options.description}:${options.message}:${dataIdentity}`
  let hash = 2166136261

  for (const character of identity) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619)
  }

  const dataName = 'model' in options.data ? options.data.model.name : 'Data'
  return `ApiWrapped${dataName}Response${(hash >>> 0).toString(16)}`
}

const createWrappedResponseModel = (
  options: ApiWrappedResponseOptions,
): Type<unknown> => {
  class WrappedResponseModel {}

  Object.defineProperty(WrappedResponseModel, 'name', {
    value: createSchemaName(options),
  })
  ApiProperty({
    description: '请求是否成功',
    example: true,
    type: Boolean,
  })(WrappedResponseModel.prototype, 'success')

  if ('model' in options.data) {
    ApiProperty({
      type: options.data.model,
      isArray: 'isArray' in options.data && options.data.isArray,
    })(WrappedResponseModel.prototype, 'data')
  } else if (options.data.type === null || options.data.type === 'null') {
    ApiProperty({
      description: '响应数据，失败时为 null',
      type: 'null',
      example: null,
    })(WrappedResponseModel.prototype, 'data')
  } else if (options.data.type === 'string') {
    ApiProperty({
      description: '响应数据，失败时为 null',
      type: String,
      example: options.data.example,
    })(WrappedResponseModel.prototype, 'data')
  } else {
    ApiProperty({
      description: '响应数据，失败时为 null',
      type: 'object',
      additionalProperties: options.data.additionalProperties ?? true,
      example: options.data.example,
    })(WrappedResponseModel.prototype, 'data')
  }

  ApiProperty({
    description: '响应消息',
    example: options.message,
    type: String,
  })(WrappedResponseModel.prototype, 'message')

  return WrappedResponseModel
}

export const ApiWrappedOkResponse = (options: ApiWrappedResponseOptions) => {
  const responseModel = createWrappedResponseModel(options)

  return applyDecorators(
    ApiExtraModels(responseModel, ...getExtraModels(options.data)),
    ApiOkResponse({
      description: options.description,
      type: responseModel,
    }),
  )
}

export const ApiWrappedCreatedResponse = (
  options: ApiWrappedResponseOptions,
) => {
  const responseModel = createWrappedResponseModel(options)

  return applyDecorators(
    ApiExtraModels(responseModel, ...getExtraModels(options.data)),
    ApiCreatedResponse({
      description: options.description,
      type: responseModel,
    }),
  )
}

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
