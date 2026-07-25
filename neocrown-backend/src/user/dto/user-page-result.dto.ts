import { ApiProperty } from '@nestjs/swagger'
import { PageResultDto } from '../../common/dto/page-result.dto'
import { User } from '../entities/user.entity'

export class UserPageResultDto extends PageResultDto<User> {
  @ApiProperty({ description: '用户列表', type: [User] })
  declare list: User[]
}
