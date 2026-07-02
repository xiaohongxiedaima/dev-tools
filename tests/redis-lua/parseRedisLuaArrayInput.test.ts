import { describe, it, expect } from 'vitest';
import { parseRedisLuaArrayInput } from '../src/lib/redis-lua';

describe('parseRedisLuaArrayInput', () => {
  describe('基础字符串解析', () => {
    it('应该正确解析单个不带引号的字符串', () => {
      const result = parseRedisLuaArrayInput('hello');
      expect(result).toEqual(['hello']);
    });

    it('应该正确解析多个不带引号的字符串', () => {
      const result = parseRedisLuaArrayInput('key1 key2 key3');
      expect(result).toEqual(['key1', 'key2', 'key3']);
    });

    it('应该处理空字符串', () => {
      const result = parseRedisLuaArrayInput('');
      expect(result).toEqual([]);
    });

    it('应该处理只有空格的字符串', () => {
      const result = parseRedisLuaArrayInput('   ');
      expect(result).toEqual([]);
    });
  });

  describe('双引号字符串解析', () => {
    it('应该正确解析带双引号的简单字符串', () => {
      const result = parseRedisLuaArrayInput('"hello world"');
      expect(result).toEqual(['hello world']);
    });

    it('应该正确解析混合的引号和不带引号的字符串', () => {
      const result = parseRedisLuaArrayInput('key1 "value with spaces" key2');
      expect(result).toEqual(['key1', 'value with spaces', 'key2']);
    });

    it('应该处理空双引号字符串', () => {
      const result = parseRedisLuaArrayInput('""');
      expect(result).toEqual(['']);
    });

    it('应该解析多个带引号的字符串', () => {
      const result = parseRedisLuaArrayInput('"first value" "second value"');
      expect(result).toEqual(['first value', 'second value']);
    });
  });

  describe('JSON 对象解析', () => {
    it('应该将完整 JSON 对象作为单个参数', () => {
      const result = parseRedisLuaArrayInput('{"hello": "world"}');
      expect(result).toEqual(['{"hello": "world"}']);
    });

    it('应该解析包含空格的复杂 JSON 对象', () => {
      const result = parseRedisLuaArrayInput('{"key": "value with spaces"}');
      expect(result).toEqual(['{"key": "value with spaces"}']);
    });

    it('应该解析嵌套的 JSON 对象', () => {
      const result = parseRedisLuaArrayInput('{"outer": {"inner": "value"}}');
      expect(result).toEqual(['{"outer": {"inner": "value"}}']);
    });

    it('应该解析多个 JSON 对象和字符串的混合', () => {
      const result = parseRedisLuaArrayInput('{"user": "alice"} {"age": 25}');
      expect(result).toEqual(['{"user": "alice"}', '{"age": 25}']);
    });
  });

  describe('JSON 数组解析', () => {
    it('应该将 JSON 数组作为单个参数', () => {
      const result = parseRedisLuaArrayInput('[1, 2, 3]');
      expect(result).toEqual(['[1, 2, 3]']);
    });

    it('应该解析包含字符串的 JSON 数组', () => {
      const result = parseRedisLuaArrayInput('["apple", "banana", "cherry"]');
      expect(result).toEqual(['["apple", "banana", "cherry"]']);
    });

    it('应该解析带空格的 JSON 数组', () => {
      const result = parseRedisLuaArrayInput('["one two", "three four"]');
      expect(result).toEqual(['["one two", "three four"]']);
    });
  });

  describe('混合输入场景', () => {
    it('应该正确处理用户示例中的 JSON 对象', () => {
      const input = '{"hello": "world", "name": "Alice", "age": 30}';
      const result = parseRedisLuaArrayInput(input);
      expect(result).toEqual([input]);
      // 验证可以正确解析回 JSON
      expect(() => JSON.parse(result[0])).not.toThrow();
    });

    it('应该处理命令和 JSON 参数的组合', () => {
      const result = parseRedisLuaArrayInput('SET user:1 {"name": "Bob", "email": "bob@example.com"}');
      expect(result).toEqual(['SET', 'user:1', '{"name": "Bob", "email": "bob@example.com"}']);
    });

    it('应该处理多个不同类型的参数', () => {
      const result = parseRedisLuaArrayInput('HMSET user profile {"data": [1,2,3]} "field with space"');
      expect(result).toEqual([
        'HMSET',
        'user',
        'profile',
        '{"data": [1,2,3]}',
        'field with space'
      ]);
    });
  });

  describe('边界情况和错误处理', () => {
    it('应该处理未闭合的引号（作为普通文本）', () => {
      const result = parseRedisLuaArrayInput('"unclosed quote');
      expect(result).toEqual(['"unclosed', 'quote']);
    });

    it('应该处理不完整的 JSON 对象（作为普通文本）', () => {
      const result = parseRedisLuaArrayInput('{"incomplete": "json"');
      // 应该按空格分割
      expect(result.length).toBeGreaterThan(0);
    });

    it('应该处理 JSON 中的转义字符', () => {
      const result = parseRedisLuaArrayInput('{"key": "value with \\"quotes\\""}');
      expect(result).toEqual(['{"key": "value with \\"quotes\\""}']);
    });

    it('应该处理数字类型的 JSON 值', () => {
      const result = parseRedisLuaArrayInput('{"count": 42, "price": 19.99}');
      expect(result).toEqual(['{"count": 42, "price": 19.99}']);
    });

    it('应该处理布尔值和 null 的 JSON 值', () => {
      const result = parseRedisLuaArrayInput('{"active": true, "deleted": false, "extra": null}');
      expect(result).toEqual(['{"active": true, "deleted": false, "extra": null}']);
    });
  });

  describe('实际 Redis 命令场景', () => {
    it('应该解析简单的 SET 命令', () => {
      const result = parseRedisLuaArrayInput('SET mykey myvalue');
      expect(result).toEqual(['SET', 'mykey', 'myvalue']);
    });

    it('应该解析带 JSON 值的 HSET 命令', () => {
      const json = '{"name": "John", "age": 30, "city": "New York"}';
      const result = parseRedisLuaArrayInput(`HSET user:1000 profile ${json}`);
      expect(result).toEqual(['HSET', 'user:1000', 'profile', json]);
    });

    it('应该解析 LPUSH 命令带数组', () => {
      const array = '["item1", "item2", "item3"]';
      const result = parseRedisLuaArrayInput(`LPUSH mylist ${array}`);
      expect(result).toEqual(['LPUSH', 'mylist', array]);
    });

    it('应该解析带特殊字符的键和 JSON 值', () => {
      const result = parseRedisLuaArrayInput('SET "key with:spaces" {"value": "also has spaces"}');
      expect(result).toEqual([
        'SET',
        'key with:spaces',
        '{"value": "also has spaces"}'
      ]);
    });
  });
});
