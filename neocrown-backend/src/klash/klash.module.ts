import { Module } from '@nestjs/common'
import { KlashController } from './klash.controller'
import { KlashService } from './klash.service'

@Module({ controllers: [KlashController], providers: [KlashService] })
export class KlashModule {}
