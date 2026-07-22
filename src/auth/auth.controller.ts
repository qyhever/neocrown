import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import {
  ApiValidationErrorResponse,
  ApiWrappedCreatedResponse,
  ApiWrappedOkResponse,
} from '../common/decorators/api-wrapped-response.decorator'
import { SuccessMessage } from '../common/decorators/success-message.decorator'
import { Public } from '../common/decorators/public.decorator'
import { ResponseMessageEnum } from '../common/enums/response-message.enum'
import { AuthService } from './auth.service'
import { AuthTokensDto } from './dto/auth-tokens.dto'
import { LoginDto } from './dto/login.dto'
import { RefreshTokenDto } from './dto/refresh-token.dto'
import { RegisterDto } from './dto/register.dto'
import { SendRegistrationCodeDto } from './dto/send-registration-code.dto'
import { VerificationCodeService } from './verification-code.service'

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly verificationCodeService: VerificationCodeService,
  ) {}

  @Post('registration-code')
  @Public()
  @ApiOperation({
    summary: '发送注册验证码',
    description:
      '向指定邮箱发送注册验证码。邮箱已注册、发送过频或邮件发送失败时返回业务失败响应',
  })
  @ApiWrappedCreatedResponse({
    description: '验证码发送请求已处理',
    message: '请求成功',
    data: { type: 'null' },
  })
  @ApiValidationErrorResponse()
  sendRegistrationCode(@Body() dto: SendRegistrationCodeDto) {
    return this.verificationCodeService.sendRegistrationCode(dto.email)
  }

  @Post('register')
  @Public()
  @ApiOperation({
    summary: '用户注册',
    description:
      '使用邮箱验证码创建新用户。用户名、邮箱重复或验证码错误时返回业务失败响应',
  })
  @ApiWrappedCreatedResponse({
    description: '注册请求已处理',
    message: '请求成功',
    data: { type: 'null' },
  })
  @ApiValidationErrorResponse()
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto)
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @SuccessMessage(ResponseMessageEnum.LOGIN_SUCCESS)
  @ApiOperation({
    summary: '用户登录',
    description:
      '使用邮箱和密码登录，成功后返回访问令牌和刷新令牌。用户不存在或密码错误时返回业务失败响应',
  })
  @ApiWrappedOkResponse({
    description: '登录请求已处理',
    message: ResponseMessageEnum.LOGIN_SUCCESS,
    data: { model: AuthTokensDto },
  })
  @ApiValidationErrorResponse()
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @SuccessMessage(ResponseMessageEnum.REFRESH_TOKEN_SUCCESS)
  @ApiOperation({
    summary: '刷新令牌',
    description: '使用刷新令牌换取新的访问令牌和刷新令牌',
  })
  @ApiWrappedOkResponse({
    description: '刷新令牌成功',
    message: ResponseMessageEnum.REFRESH_TOKEN_SUCCESS,
    data: { model: AuthTokensDto },
  })
  @ApiValidationErrorResponse()
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken)
  }
}
