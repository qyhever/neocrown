import { Module } from '@nestjs/common'
import { CrawlerController } from './crawler.controller'
import { CrawlerSchedulerService } from './crawler.scheduler.service'
import { CrawlerService } from './crawler.service'

@Module({
  controllers: [CrawlerController],
  providers: [CrawlerService, CrawlerSchedulerService],
})
export class CrawlerModule {}
