export type ToolDefinition = {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  description: string;
  tags: string[];
  placeholder: string;
  sampleOutputTitle: string;
  sampleOutput: string;
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
        placeholder: '{\n  "service": "auth-api",\n  "status": "ok"\n}',
        sampleOutputTitle: "Formatted output",
        sampleOutput: '{\n  "service": "auth-api",\n  "status": "ok"\n}',
      },
      {
        id: "yaml-json",
        name: "YAML ⇄ JSON",
        description: "在 YAML 和 JSON 结构之间快速转换。",
        tags: ["yaml", "json", "convert"],
        placeholder: "service: auth-api\nenv: local",
        sampleOutputTitle: "Conversion result",
        sampleOutput: '{\n  "service": "auth-api",\n  "env": "local"\n}',
      },
      {
        id: "base64",
        name: "Base64 编解码",
        description: "编码请求体，或解码 token / payload 内容。",
        tags: ["base64", "encode", "decode"],
        placeholder: "hello backend",
        sampleOutputTitle: "Decoded / encoded preview",
        sampleOutput: "aGVsbG8gYmFja2VuZA==",
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
        sampleOutputTitle: "Resolved date",
        sampleOutput: "2024-07-03 09:46:40 UTC",
      },
      {
        id: "timezone",
        name: "时区换算",
        description: "对比多地区时间，方便排障和上线协作。",
        tags: ["timezone", "utc", "offset"],
        placeholder: "2026-07-01 15:00 Asia/Shanghai",
        sampleOutputTitle: "Timezone conversion",
        sampleOutput: "UTC: 2026-07-01 07:00\nAmerica/Los_Angeles: 2026-07-01 00:00",
      },
      {
        id: "cron-preview",
        name: "Cron 预览",
        description: "预览 cron 表达式未来几次执行时间。",
        tags: ["cron", "schedule", "jobs"],
        placeholder: "0 */15 * * * *",
        sampleOutputTitle: "Upcoming runs",
        sampleOutput: "15:30:00\n15:45:00\n16:00:00",
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
        sampleOutputTitle: "Encoded result",
        sampleOutput: "redirect_uri%3Dhttps%3A%2F%2Fexample.com%2Fcallback%3Ffoo%3Dbar%20baz",
      },
      {
        id: "jwt-inspector",
        name: "JWT 查看",
        description: "拆分并查看 JWT 的 header 和 payload。",
        tags: ["jwt", "token", "auth"],
        placeholder: "******",
        sampleOutputTitle: "Header / payload",
        sampleOutput: '{\n  "alg": "HS256",\n  "typ": "JWT"\n}',
      },
      {
        id: "unicode",
        name: "Unicode 转换",
        description: "在转义序列和可读文本之间转换。",
        tags: ["unicode", "escape", "string"],
        placeholder: "\\u4f60\\u597d",
        sampleOutputTitle: "Decoded text",
        sampleOutput: "你好",
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
        sampleOutputTitle: "Parsed params",
        sampleOutput: '{\n  "page": "1",\n  "filter": ["active", "pending"]\n}',
      },
      {
        id: "header-editor",
        name: "Header 格式化",
        description: "整理请求头，便于生成 curl 或 fetch 片段。",
        tags: ["headers", "http", "curl"],
        placeholder: "Authorization: ******",
        sampleOutputTitle: "Header object",
        sampleOutput: '{\n  "Authorization": "******"\n}',
      },
      {
        id: "curl-helper",
        name: "Curl 辅助",
        description: "把请求备注整理成更适合执行的 curl 命令。",
        tags: ["curl", "request", "http"],
        placeholder: "POST /api/login with JSON body",
        sampleOutputTitle: "Generated command",
        sampleOutput: 'curl -X POST http://localhost:8080/api/login \\\n  -H "Content-Type: application/json"',
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
export const featuredToolIds = ["json-formatter", "timestamp", "url-encode", "jwt-inspector"];
export const recentToolIds = ["json-formatter", "timestamp", "curl-helper"];
export const defaultFavoriteToolIds = ["json-formatter", "url-encode"];
export const workspaceTips = [
  "把格式化、压缩、复制、交换输入输出统一放在工具操作条里。",
  "输入区默认实时转换，复杂工具支持切换为手动执行。",
  "错误信息固定放在右侧状态面板顶部，避免遮挡输入内容。",
];

export function getTool(toolId: string): ToolDefinition | undefined {
  return tools.find((tool) => tool.id === toolId);
}
