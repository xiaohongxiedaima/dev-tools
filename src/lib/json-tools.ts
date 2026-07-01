export type JsonTransformMode = "format" | "minify";
export type JsonTransformAction = JsonTransformMode | "sort";
export type JsonTransformOptions = {
  mode?: JsonTransformMode;
  sortKeys?: boolean;
};

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

function normalizeJsonTransformOptions(actionOrOptions: JsonTransformAction | JsonTransformOptions): Required<JsonTransformOptions> {
  if (typeof actionOrOptions === "string") {
    if (actionOrOptions === "sort") {
      return { mode: "format", sortKeys: true };
    }

    return { mode: actionOrOptions, sortKeys: false };
  }

  return {
    mode: actionOrOptions.mode ?? "format",
    sortKeys: actionOrOptions.sortKeys ?? false,
  };
}

export function applyJsonTransform(input: string, actionOrOptions: JsonTransformAction | JsonTransformOptions): string {
  const parsed = JSON.parse(input);
  const { mode, sortKeys } = normalizeJsonTransformOptions(actionOrOptions);
  const transformed = sortKeys ? sortJsonValue(parsed) : parsed;

  if (mode === "minify") {
    return JSON.stringify(transformed);
  }

  return JSON.stringify(transformed, null, 2);
}
