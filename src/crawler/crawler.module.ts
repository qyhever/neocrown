import { Module } from '@nestjs/common'
import { MailModule } from '../mail/mail.module'
import { CrawlerController } from './crawler.controller'
import { CrawlerSchedulerService } from './crawler.scheduler.service'
import { CrawlerService } from './crawler.service'

@Module({
  imports: [MailModule],
  controllers: [CrawlerController],
  providers: [CrawlerService, CrawlerSchedulerService],
})
export class CrawlerModule {}
