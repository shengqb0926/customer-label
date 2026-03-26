import { Module, Global, DynamicModule } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway';
import { JwtModule } from '@nestjs/jwt';
import { JwtService } from '@nestjs/jwt';

@Global()
@Module({
  imports: [JwtModule],
  providers: [NotificationGateway, JwtService],
  exports: [NotificationGateway],
})
export class WebSocketModule {
  static forRoot(): DynamicModule {
    return {
      module: WebSocketModule,
      imports: [JwtModule.register({
        secret: process.env.JWT_SECRET || 'default-secret',
      })],
      providers: [NotificationGateway, JwtService],
      exports: [NotificationGateway],
    };
  }
}
