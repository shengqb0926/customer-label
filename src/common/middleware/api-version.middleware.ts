import {
  NestMiddleware,
  Injectable,
  Next,
  Request,
  Response,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * API 版本中间件
 * 支持通过 URI 前缀进行版本控制（/api/v1/, /api/v2/）
 */
@Injectable()
export class ApiVersionMiddleware implements NestMiddleware {
  private readonly defaultVersion: string;
  private readonly supportedVersions: string[];

  constructor(private readonly configService: ConfigService) {
    this.defaultVersion = this.configService.get<string>('API_VERSION', 'v1');
    this.supportedVersions = this.configService.get<string[]>('API_SUPPORTED_VERSIONS', ['v1']);
  }

  use(@Request() req: any, @Response() res: any, @Next() next: () => void) {
    const url = req.url as string;
    
    // 检查是否已经是版本化路径
    const versionMatch = url.match(/^\/api\/(v\d+)\//);
    
    if (versionMatch) {
      const version = versionMatch[1];
      
      // 检查是否是支持的版本
      if (!this.supportedVersions.includes(version)) {
        return res.status(400).json({
          statusCode: 400,
          message: `不支持的 API 版本：${version}。支持的版本：${this.supportedVersions.join(', ')}`,
          error: 'Bad Request',
        });
      }
      
      // 在请求对象中设置版本信息
      req.apiVersion = version;
    } else {
      // 如果没有指定版本，使用默认版本
      req.apiVersion = this.defaultVersion;
    }
    
    // 添加版本响应头
    res.setHeader('X-API-Version', req.apiVersion);
    
    next();
  }
}
