import { CustomValidationPipe } from './validation.pipe';
import { ArgumentMetadata, BadRequestException } from '@nestjs/common';

describe('CustomValidationPipe', () => {
  let pipe: CustomValidationPipe;

  beforeEach(() => {
    pipe = new CustomValidationPipe();
  });

  it('应该被定义', () => {
    expect(pipe).toBeDefined();
  });

  describe('transform 方法', () => {
    it('应该通过普通值（没有 metatype 时）', async () => {
      const value = 'test string';
      const metadata: ArgumentMetadata = {
        metatype: undefined,
        type: 'body',
      };

      const result = await pipe.transform(value, metadata);
      expect(result).toBe(value);
    });

    it('应该通过对象（没有 metatype 时）', async () => {
      const value = { name: 'test', age: 25 };
      const metadata: ArgumentMetadata = {
        metatype: undefined,
        type: 'body',
      };

      const result = await pipe.transform(value, metadata);
      expect(result).toEqual(value);
    });

    it('应该处理数组（没有 metatype 时）', async () => {
      const value = [1, 2, 3];
      const metadata: ArgumentMetadata = {
        metatype: undefined,
        type: 'body',
      };

      const result = await pipe.transform(value, metadata);
      expect(result).toEqual(value);
    });
  });

  describe('sanitizeInput - XSS 防护', () => {
    it('应该转义 HTML 特殊字符', async () => {
      const value = '<script>alert("XSS")</script>';
      const metadata: ArgumentMetadata = {
        metatype: undefined,
        type: 'body',
      };

      const result = await pipe.transform(value, metadata);
      expect(result).toContain('&lt;script&gt;');
      expect(result).not.toContain('<script>');
    });

    it('应该转义 & 符号', async () => {
      const value = 'Tom & Jerry';
      const metadata: ArgumentMetadata = {
        metatype: undefined,
        type: 'body',
      };

      const result = await pipe.transform(value, metadata);
      expect(result).toContain('&amp;');
    });

    it('应该转义双引号', async () => {
      const value = 'He said "Hello"';
      const metadata: ArgumentMetadata = {
        metatype: undefined,
        type: 'body',
      };

      const result = await pipe.transform(value, metadata);
      expect(result).toContain('&quot;');
    });

    it('应该转义单引号', async () => {
      const value = "It's a test";
      const metadata: ArgumentMetadata = {
        metatype: undefined,
        type: 'body',
      };

      const result = await pipe.transform(value, metadata);
      expect(result).toContain('&#39;');
    });

    it('应该转义小于号', async () => {
      const value = 'a < b';
      const metadata: ArgumentMetadata = {
        metatype: undefined,
        type: 'body',
      };

      const result = await pipe.transform(value, metadata);
      expect(result).toContain('&lt;');
    });

    it('应该转义大于号', async () => {
      const value = 'b > a';
      const metadata: ArgumentMetadata = {
        metatype: undefined,
        type: 'body',
      };

      const result = await pipe.transform(value, metadata);
      expect(result).toContain('&gt;');
    });

    it('应该递归清洗数组中的项', async () => {
      const value = ['<script>', 'normal', '&'];
      const metadata: ArgumentMetadata = {
        metatype: undefined,
        type: 'body',
      };

      const result = await pipe.transform(value, metadata);
      expect(result[0]).toContain('&lt;script&gt;');
      expect(result[1]).toBe('normal');
      expect(result[2]).toContain('&amp;');
    });

    it('应该递归清洗对象的属性', async () => {
      const value = { 
        title: '<b>Bold</b>',
        content: 'Normal text',
        symbol: '&'
      };
      const metadata: ArgumentMetadata = {
        metatype: undefined,
        type: 'body',
      };

      const result = await pipe.transform(value, metadata);
      expect(result.title).toContain('&lt;b&gt;Bold&lt;/b&gt;');
      expect(result.content).toBe('Normal text');
      expect(result.symbol).toContain('&amp;');
    });

    it('空字符串应该保持不变', async () => {
      const value = '';
      const metadata: ArgumentMetadata = {
        metatype: undefined,
        type: 'body',
      };

      const result = await pipe.transform(value, metadata);
      expect(result).toBe('');
    });

    it('null 值应该保持不变', async () => {
      const value = null;
      const metadata: ArgumentMetadata = {
        metatype: undefined,
        type: 'body',
      };

      const result = await pipe.transform(value, metadata);
      expect(result).toBeNull();
    });

    it('undefined 应该保持不变', async () => {
      const value = undefined;
      const metadata: ArgumentMetadata = {
        metatype: undefined,
        type: 'body',
      };

      const result = await pipe.transform(value, metadata);
      expect(result).toBeUndefined();
    });
  });

  describe('escapeHtml 边界测试', () => {
    it('应该处理只有普通字符的字符串', async () => {
      const value = 'Hello World 123';
      const metadata: ArgumentMetadata = {
        metatype: undefined,
        type: 'body',
      };

      const result = await pipe.transform(value, metadata);
      expect(result).toBe('Hello World 123');
    });

    it('应该处理包含所有特殊字符的字符串', async () => {
      const value = '<>&"\'&';
      const metadata: ArgumentMetadata = {
        metatype: undefined,
        type: 'body',
      };

      const result = await pipe.transform(value, metadata);
      expect(result).toBe('&lt;&gt;&amp;&quot;&#39;&amp;');
    });

    it('应该处理连续的特殊字符', async () => {
      const value = '<<<>>>';
      const metadata: ArgumentMetadata = {
        metatype: undefined,
        type: 'body',
      };

      const result = await pipe.transform(value, metadata);
      expect(result).toBe('&lt;&lt;&lt;&gt;&gt;&gt;');
    });
  });

  describe('formatErrors 方法', () => {
    it('应该格式化验证错误', () => {
      const mockErrors = [
        {
          property: 'username',
          constraints: {
            isNotEmpty: 'username should not be empty',
            minLength: 'username must be longer than 3 characters',
          },
          children: [],
        },
      ];

      const formatted = (pipe as any).formatErrors(mockErrors);
      
      expect(formatted).toHaveLength(1);
      expect(formatted[0].property).toBe('username');
      expect(formatted[0].constraints).toBeDefined();
    });

    it('应该格式化嵌套错误', () => {
      const mockErrors = [
        {
          property: 'user',
          constraints: null,
          children: [
            {
              property: 'email',
              constraints: {
                isEmail: 'email must be an email',
              },
              children: [],
            },
          ],
        },
      ];

      const formatted = (pipe as any).formatErrors(mockErrors);
      
      expect(formatted).toHaveLength(1);
      expect(formatted[0].children).toBeDefined();
      expect(formatted[0].children.length).toBeGreaterThan(0);
    });

    it('没有子元素时 children 应该是 undefined', () => {
      const mockErrors = [
        {
          property: 'email',
          constraints: {
            isEmail: 'invalid email',
          },
          children: [],
        },
      ];

      const formatted = (pipe as any).formatErrors(mockErrors);
      
      expect(formatted[0].children).toBeUndefined();
    });
  });

  describe('集成测试', () => {
    it('应该同时执行 sanitization（当没有 metatype 时）', async () => {
      const value = { name: '<script>alert("xss")</script>' };
      const metadata: ArgumentMetadata = {
        metatype: undefined,
        type: 'body',
      };

      const result = await pipe.transform(value, metadata);
      expect(result.name).toContain('&lt;script&gt;');
    });

    it('应该处理复杂的嵌套结构', async () => {
      const value = {
        user: {
          name: '<b>John</b>',
          posts: [
            { title: '<h1>Title</h1>', content: 'Normal' },
            { title: 'Normal Title', content: '& Special' },
          ],
        },
      };
      const metadata: ArgumentMetadata = {
        metatype: undefined,
        type: 'body',
      };

      const result = await pipe.transform(value, metadata);
      expect(result.user.name).toContain('&lt;b&gt;John&lt;/b&gt;');
      expect(result.user.posts[0].title).toContain('&lt;h1&gt;Title&lt;/h1&gt;');
      expect(result.user.posts[1].content).toContain('&amp; Special');
    });
  });
});