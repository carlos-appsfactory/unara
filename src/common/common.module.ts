import { Module, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './services/email.service';
import { SecurityLoggingMiddleware } from './middleware/security-logging.middleware';

@Module({
  imports: [ConfigModule],
  providers: [EmailService, SecurityLoggingMiddleware],
  exports: [EmailService, SecurityLoggingMiddleware],
})
export class CommonModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SecurityLoggingMiddleware)
      .forRoutes('*'); // Apply to all routes
  }
}
