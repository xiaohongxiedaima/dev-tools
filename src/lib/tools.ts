export type ToolEditorLanguage = "json" | "lua" | "text";

export type ToolDefinition = {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  description: string;
  tags: string[];
  placeholder: string;
  sampleOutput: string;
  inputLanguage?: ToolEditorLanguage;
  outputLanguage?: ToolEditorLanguage;
};

export type ToolCategory = {
  id: string;
  name: string;
  tools: Omit<ToolDefinition, "categoryId" | "categoryName">[];
};

export const toolCategories: ToolCategory[] = [
  {
    id: "data",
    name: "数据处理",
    tools: [
      {
        id: "json-formatter",
        name: "JSON 格式化",
        description: "格式化、压缩和校验 JSON 内容。",
        tags: ["json", "pretty", "validate"],
        placeholder: "{}",
        sampleOutput: "{}",
        inputLanguage: "json",
        outputLanguage: "json",
      },
      {
        id: "base64",
        name: "Base64 编解码",
        description: "编码请求体，或解码 token / payload 内容。",
        tags: ["base64", "encode", "decode"],
        placeholder: "aGVsbG8gYmFja2VuZA==",
        sampleOutput: "hello backend",
        inputLanguage: "text",
        outputLanguage: "text",
      },
    ],
  },
  {
    id: "time",
    name: "时间工具",
    tools: [
      {
        id: "timestamp",
        name: "时间戳转换",
        description: "在 Unix 时间戳和可读日期之间互转。",
        tags: ["timestamp", "date", "epoch"],
        placeholder: "1720000000",
        sampleOutput: "2024-07-03 09:46:40 UTC",
        inputLanguage: "text",
        outputLanguage: "text",
      },
    ],
  },
  {
    id: "encoding",
    name: "编码转换",
    tools: [
      {
        id: "url-encode",
        name: "URL 编解码",
        description: "快速编码查询串，或解码回调地址。",
        tags: ["url", "encode", "decode"],
        placeholder: "redirect_uri=https://example.com/callback?foo=bar baz",
        sampleOutput: "redirect_uri%3Dhttps%3A%2F%2Fexample.com%2Fcallback%3Ffoo%3Dbar%20baz",
        inputLanguage: "text",
        outputLanguage: "text",
      },
    ],
  },
  {
    id: "database",
    name: "数据库辅助",
    tools: [
      {
        id: "redis-lua-debug-console",
        name: "Redis Lua 调试台",
        description: "本地运行 Lua 并代理 redis.call / redis.pcall 到 Redis。",
        tags: ["redis", "lua", "debug"],
        placeholder:
          "local value = redis.call(\"GET\", KEYS[1])\nif not value then\n  redis.call(\"SET\", KEYS[1], ARGV[1])\nend\nreturn redis.call(\"GET\", KEYS[1])",
        sampleOutput:
          '{\n  "success": true,\n  "mode": "proxy",\n  "error": null,\n  "result": "demo-value",\n  "traceCount": 3,\n  "logCount": 0\n}',
        inputLanguage: "lua",
        outputLanguage: "json",
      },
    ],
  },
  {
    id: "network",
    name: "网络辅助",
    tools: [
      {
        id: "query-parser",
        name: "Query 解析",
        description: "查看 URL 参数和重复 query key 的结构。",
        tags: ["query", "params", "url"],
        placeholder: "page=1&filter=active&filter=pending",
        sampleOutput: '{\n  "page": "1",\n  "filter": ["active", "pending"]\n}',
        inputLanguage: "text",
        outputLanguage: "json",
      },
      {
        id: "header-editor",
        name: "Header 格式化",
        description: "整理请求头，便于生成 curl 或 fetch 片段。",
        tags: ["headers", "http", "curl"],
        placeholder: "Authorization: ******",
        sampleOutput: '{\n  "Authorization": "******"\n}',
        inputLanguage: "text",
        outputLanguage: "json",
      },
      {
        id: "curl-helper",
        name: "Curl 辅助",
        description: "把请求备注整理成更适合执行的 curl 命令。",
        tags: ["curl", "request", "http"],
        placeholder: "POST /api/login with JSON body",
        sampleOutput: 'curl -X POST http://localhost:8080/api/login \\\n  -H "Content-Type: application/json"',
        inputLanguage: "text",
        outputLanguage: "text",
      },
    ],
  },
];

export const tools: ToolDefinition[] = toolCategories.flatMap((category) =>
  category.tools.map((tool) => ({
    ...tool,
    categoryId: category.id,
    categoryName: category.name,
  })),
);

export const defaultToolId = "json-formatter";
export const featuredToolIds = ["json-formatter", "redis-lua-debug-console", "timestamp", "url-encode"];
export const recentToolIds = ["json-formatter", "redis-lua-debug-console", "curl-helper"];
export const defaultFavoriteToolIds = ["json-formatter", "url-encode"];
export const workspaceTips = [
  "把格式化、压缩、复制等操作统一放在工具操作条里。",
  "左侧编辑内容默认实时转换，复杂工具支持切换为手动执行。",
  "右侧历史中心专门放手动保存和自动输入历史，避免挤占主工作区。",
  "Redis Lua 调试台优先用本地代理模式观察每次 redis.call，再按需切到真实 EVAL 校验。",
];

export function getTool(toolId: string): ToolDefinition | undefined {
  return tools.find((tool) => tool.id === toolId);
}
