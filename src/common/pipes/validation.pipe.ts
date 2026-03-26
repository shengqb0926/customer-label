import {
  ArgumentMetadata,
  BadRequestException,
  ValidationPipe,
  Injectable,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class CustomValidationPipe extends ValidationPipe {
  async transform(value: any, metadata: ArgumentMetadata) {
    // 清洗输入数据，防止 XSS
    value = this.sanitizeInput(value);

    // 如果是 DTO 对象，进行验证
    if (metadata.metatype) {
      const object = plainToInstance(metadata.metatype, value);
      const errors = await validate(object, this.validatorOptions);

      if (errors.length > 0) {
        throw new BadRequestException({
          statusCode: 400,
          message: '验证失败',
          errors: this.formatErrors(errors),
          timestamp: new Date().toISOString(),
        });
      }

      return object;
    }

    return value;
  }

  /**
   * 清洗输入数据，防止 XSS 攻击
   */
  private sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      return this.escapeHtml(input);
    }

    if (Array.isArray(input)) {
      return input.map((item) => this.sanitizeInput(item));
    }

    if (input !== null && typeof input === 'object') {
      const sanitized = {};
      for (const key in input) {
        if (Object.prototype.hasOwnProperty.call(input, key)) {
          sanitized[key] = this.sanitizeInput(input[key]);
        }
      }
      return sanitized;
    }

    return input;
  }

  /**
   * HTML 转义，防止 XSS
   */
  private escapeHtml(text: string): string {
    if (!text) return text;
    
    const htmlEscapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return text.replace(
      /[&<>"']/g,
      (char) => htmlEscapes[char]
    );
  }

  /**
   * 格式化验证错误
   */
  private formatErrors(errors: any[]): any {
    return errors.map((err) => ({
      property: err.property,
      constraints: err.constraints,
      children: err.children?.length ? this.formatErrors(err.children) : undefined,
    }));
  }
}
