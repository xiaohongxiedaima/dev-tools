import { describe, it, expect } from 'vitest';
import { formatRedisLuaArrayAsJson } from '../src/lib/redis-lua';

describe('formatRedisLuaArrayAsJson', () => {
  describe('基础格式化', () => {
    it('应该将空数组格式化为空 JSON 数组', () => {
      const result = formatRedisLuaArrayAsJson([]);
      expect(result).toBe('[]');
    });

    it('应该将单个字符串格式化为 JSON 数组', () => {
      const result = formatRedisLuaArrayAsJson(['hello']);
      expect(result).toBe('["hello"]');
    });

    it('应该将多个字符串格式化为 JSON 数组', () => {
      const result = formatRedisLuaArrayAsJson(['key1', 'key2', 'key3']);
      expect(result).toBe('["key1","key2","key3"]');
    });

    it('应该处理空字符串元素', () => {
      const result = formatRedisLuaArrayAsJson(['']);
      expect(result).toBe('[""]');
    });
  });

  describe('特殊字符转义', () => {
    it('应该正确转义双引号', () => {
      const result = formatRedisLuaArrayAsJson(['value with "quotes"']);
      expect(result).toBe('["value with \\"quotes\\""]');
      // 验证格式化后的 JSON 可以正确解析
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('应该正确转义换行符', () => {
      const result = formatRedisLuaArrayAsJson(['line1\nline2']);
      expect(result).toBe('["line1\\nline2"]');
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('应该正确转义制表符', () => {
      const result = formatRedisLuaArrayAsJson(['tab\there']);
      expect(result).toBe('["tab\\there"]');
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('应该正确转义反斜杠', () => {
      const result = formatRedisLuaArrayAsJson(['path\\to\\file']);
      expect(result).toBe('["path\\\\to\\\\file"]');
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('应该处理多种特殊字符的组合', () => {
      const result = formatRedisLuaArrayAsJson(['text with "quotes" and \n newlines']);
      const expected = '["text with \\"quotes\\" and \\n newlines"]';
      expect(result).toBe(expected);
      expect(() => JSON.parse(result)).not.toThrow();
    });
  });

  describe('JSON 对象和数组', () => {
    it('应该将 JSON 对象字符串作为数组元素', () => {
      const jsonObj = '{"name": "Alice", "age": 30}';
      const result = formatRedisLuaArrayAsJson([jsonObj]);
      expect(result).toBe('["{\\"name\\": \\"Alice\\", \\"age\\": 30}"]');
      // 验证可以正确解析
      const parsed = JSON.parse(result);
      expect(parsed[0]).toBe(jsonObj);
    });

    it('应该将 JSON 数组字符串作为数组元素', () => {
      const jsonArr = '[1, 2, 3]';
      const result = formatRedisLuaArrayAsJson([jsonArr]);
      expect(result).toBe('["[1, 2, 3]"]');
      const parsed = JSON.parse(result);
      expect(parsed[0]).toBe(jsonArr);
    });

    it('应该处理多个 JSON 对象', () => {
      const obj1 = '{"user": "Alice"}';
      const obj2 = '{"user": "Bob"}';
      const result = formatRedisLuaArrayAsJson([obj1, obj2]);
      const parsed = JSON.parse(result);
      expect(parsed[0]).toBe(obj1);
      expect(parsed[1]).toBe(obj2);
    });
  });

  describe('数字和布尔值', () => {
    it('应该将数字字符串格式化为 JSON 字符串', () => {
      const result = formatRedisLuaArrayAsJson(['42', '3.14', '-100']);
      expect(result).toBe('["42","3.14","-100"]');
      // 验证解析后仍然是字符串
      const parsed = JSON.parse(result);
      expect(typeof parsed[0]).toBe('string');
      expect(parsed[0]).toBe('42');
    });

    it('应该将布尔值字符串格式化为 JSON 字符串', () => {
      const result = formatRedisLuaArrayAsJson(['true', 'false']);
      expect(result).toBe('["true","false"]');
      const parsed = JSON.parse(result);
      expect(typeof parsed[0]).toBe('string');
      expect(parsed[0]).toBe('true');
    });
  });

  describe('边界情况', () => {
    it('应该处理非常长的字符串', () => {
      const longString = 'a'.repeat(10000);
      const result = formatRedisLuaArrayAsJson([longString]);
      const parsed = JSON.parse(result);
      expect(parsed[0]).toBe(longString);
    });

    it('应该处理 Unicode 字符', () => {
      const result = formatRedisLuaArrayAsJson(['你好世界', '🌍🌎🌏']);
      const parsed = JSON.parse(result);
      expect(parsed[0]).toBe('你好世界');
      expect(parsed[1]).toBe('🌍🌎🌏');
    });

    it('应该处理 null 和 undefined（转换为空字符串）', () => {
      // 测试函数如何处理非字符串输入
      const result = formatRedisLuaArrayAsJson(['value', '', 'another']);
      const parsed = JSON.parse(result);
      expect(parsed).toEqual(['value', '', 'another']);
    });
  });

  describe('与 parseRedisLuaArrayInput 的往返一致性', () => {
    it('应该保持简单字符串的往返一致性', () => {
      const input = ['key1', 'key2', 'key3'];
      const formatted = formatRedisLuaArrayAsJson(input);
      const parsed = JSON.parse(formatted);
      expect(parsed).toEqual(input);
    });

    it('应该保持带空格字符串的往返一致性', () => {
      const input = ['value with spaces', 'another one'];
      const formatted = formatRedisLuaArrayAsJson(input);
      const parsed = JSON.parse(formatted);
      expect(parsed).toEqual(input);
    });

    it('应该保持 JSON 对象字符串的往返一致性', () => {
      const input = ['{"name": "Alice", "age": 30}'];
      const formatted = formatRedisLuaArrayAsJson(input);
      const parsed = JSON.parse(formatted);
      expect(parsed[0]).toBe(input[0]);
    });

    it('应该保持混合类型的往返一致性', () => {
      const input = ['SET', 'user:1', '{"name": "Bob"}', '"field with spaces"'];
      const formatted = formatRedisLuaArrayAsJson(input);
      const parsed = JSON.parse(formatted);
      expect(parsed).toEqual(input);
    });
  });

  describe('实际 Redis 命令场景', () => {
    it('应该格式化 SET 命令的参数', () => {
      const result = formatRedisLuaArrayAsJson(['mykey', 'myvalue']);
      expect(result).toBe('["mykey","myvalue"]');
    });

    it('应该格式化 HSET 命令带 JSON 值', () => {
      const params = ['user:1000', 'profile', '{"name": "John", "age": 30}'];
      const result = formatRedisLuaArrayAsJson(params);
      const parsed = JSON.parse(result);
      expect(parsed).toEqual(params);
    });

    it('应该格式化 LPUSH 命令带数组', () => {
      const params = ['mylist', '["item1", "item2", "item3"]'];
      const result = formatRedisLuaArrayAsJson(params);
      const parsed = JSON.parse(result);
      expect(parsed).toEqual(params);
    });

    it('应该格式化带特殊字符的键和值', () => {
      const params = ['key:with:colons', 'value with "quotes" and spaces'];
      const result = formatRedisLuaArrayAsJson(params);
      const parsed = JSON.parse(result);
      expect(parsed).toEqual(params);
    });
  });

  describe('Redis Lua 特定场景', () => {
    it('应该格式化 KEYS 数组', () => {
      const keys = ['user:1', 'user:2', 'user:3'];
      const result = formatRedisLuaArrayAsJson(keys);
      expect(JSON.parse(result)).toEqual(keys);
    });

    it('应该格式化 ARGV 数组带 JSON 数据', () => {
      const argv = ['{"action": "update"}', '{"data": [1,2,3]}'];
      const result = formatRedisLuaArrayAsJson(argv);
      const parsed = JSON.parse(result);
      expect(parsed).toEqual(argv);
    });

    it('应该格式化空的 KEYS 数组', () => {
      const result = formatRedisLuaArrayAsJson([]);
      expect(result).toBe('[]');
    });

    it('应该格式化包含 null 的 ARGV（作为字符串）', () => {
      const result = formatRedisLuaArrayAsJson(['null', 'value']);
      expect(result).toBe('["null","value"]');
    });
  });
});
