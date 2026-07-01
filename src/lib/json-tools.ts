export type JsonTransformAction = "format" | "minify" | "sort";

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue);
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort((left, right) => left.localeCompare(right))
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = sortJsonValue((value as Record<string, unknown>)[key]);
        return result;
      }, {});
  }

  return value;
}

export function applyJsonTransform(input: string, action: JsonTransformAction): string {
  const parsed = JSON.parse(input);

  if (action === "minify") {
    return JSON.stringify(parsed);
  }

  if (action === "sort") {
    return JSON.stringify(sortJsonValue(parsed), null, 2);
  }

  return JSON.stringify(parsed, null, 2);
}
