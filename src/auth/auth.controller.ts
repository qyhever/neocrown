import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { SuccessMessage } from '../common/decorators/success-message.decorator'
import { ResponseMessageEnum } from '../common/enums/response-message.enum'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { RefreshTokenDto } from './dto/refresh-token.dto'
import { RegisterDto } from './dto/register.dto'
import { SendRegistrationCodeDto } from './dto/send-registration-code.dto'
import { VerificationCodeService } from './verification-code.service'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly verificationCodeService: VerificationCodeService,
  ) {}

  @Post('registration-code')
  sendRegistrationCode(@Body() dto: SendRegistrationCodeDto) {
    return this.verificationCodeService.sendRegistrationCode(dto.email)
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto)
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @SuccessMessage(ResponseMessageEnum.LOGIN_SUCCESS)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @SuccessMessage(ResponseMessageEnum.REFRESH_TOKEN_SUCCESS)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken)
  }
}
