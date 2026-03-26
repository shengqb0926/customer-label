import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Request, Response } from 'express';

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
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
    });
    
    // 全局验证管道配置
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true, // 自动移除未装饰的属性
        forbidNonWhitelisted: true, // 禁止非白名单属性
        transform: true, // 自动转换类型
        transformOptions: {
          enableImplicitConversion: true,
        },
        validationError: {
          target: false,
          value: false,
        },
      })
    );
    
    // Swagger 文档配置（必须在全局前缀设置之后）
    const swaggerConfig = new DocumentBuilder()
      .setTitle('客户标签智能推荐系统 API')
      .setDescription('完整的 RESTful API 文档')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();
    
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        // 禁用 OAuth2 重定向，使用简单的 JWT token 输入
        oauth2RedirectUrl: undefined,
      },
      // 自定义 Swagger 页面，添加 JWT Token 输入框说明
      customCss: `
        .swagger-ui .topbar { display: none; }
        .auth-wrapper { margin-right: 20px; }
      `,
      customSiteTitle: '客户标签 API 文档',
    });
    
    // 添加根路径重定向到 Swagger 文档（放在最后，避免拦截其他路由）
    app.use('/', (req: Request, res: Response, next) => {
      if (req.path === '/') {
        res.redirect('/api/docs');
      } else {
        next(); // 让其他路径继续由 NestJS 路由处理
      }
    });
    
    // 启动应用，监听所有网络接口
    await app.listen(port, '0.0.0.0');
    
    logger.log(`🚀 应用启动成功！`);
    logger.log(`📡 API 地址：http://localhost:${port}${apiPrefix}`);
    logger.log(`📚 Swagger 文档：http://localhost:${port}/api/docs`);
    logger.log(`❤️ 健康检查：http://localhost:${port}/health`);
    logger.log(`📊 Prometheus 指标：http://localhost:${port}/metrics`);
    logger.log(`\n🔑 默认账号：admin / admin123`);
    
  } catch (error) {
    logger.error('应用启动失败', error);
    process.exit(1);
  }
}

bootstrap();
