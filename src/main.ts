import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    // 创建应用
    const app = await NestFactory.create(AppModule);
    
    // 获取配置
    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT', 3000);
    const apiPrefix = configService.get<string>('API_PREFIX', '/api/v1');
    
    // 设置全局前缀
    app.setGlobalPrefix(apiPrefix);
    
    // 启用 CORS
    app.enableCors({
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });
    
    // 配置 Swagger
    const swaggerConfig = new DocumentBuilder()
      .setTitle('客户标签智能推荐系统 API')
      .setDescription('提供客户标签推荐、评分和反馈管理的完整 API 接口')
      .setVersion('1.0')
      .addBearerAuth({
        description: 'JWT Token 认证，格式：Bearer <token>',
        name: 'Authorization',
        in: 'header',
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      })
      .addTag('auth', '用户认证相关接口')
      .addTag('recommendations', '标签推荐相关接口')
      .addTag('scores', '标签评分相关接口')
      .addTag('feedback', '反馈统计相关接口')
      .build();
    
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
      customCssUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.0.0/swagger-ui.min.css',
      customJs: [
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.0.0/swagger-ui-bundle.min.js',
      ],
    });
    
    logger.log(`📚 Swagger UI: http://localhost:${port}/api/docs`);
    
    // 启动应用
    await app.listen(port);
    
    logger.log(`🚀 Application started successfully!`);
    logger.log(`📍 API Prefix: ${apiPrefix}`);
    logger.log(`❤️  Redis: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`);
    logger.log(`❤️  PostgreSQL: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_DATABASE || 'customer_label'}`);
    
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();
