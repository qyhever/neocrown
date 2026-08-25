import { Module } from '@nestjs/common'
import { AttachController } from './attach.controller'
import { AttachService } from './attach.service'

@Module({
  controllers: [AttachController],
  providers: [AttachService],
})
export class AttachModule {}
