import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { WebhookPublisherService } from './webhook-publisher.service';
import { WebhookSecurityService } from './webhook-security.service';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [WebhookPublisherService, WebhookSecurityService],
  exports: [WebhookPublisherService, WebhookSecurityService],
})
export class WebhookModule {}
