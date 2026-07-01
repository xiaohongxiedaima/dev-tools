export type Base64TransformMode = "decode" | "encode";

function bytesToBinary(value: Uint8Array): string {
  let result = "";

  for (const byte of value) {
    result += String.fromCharCode(byte);
  }

  return result;
}

function binaryToBytes(value: string): Uint8Array {
  const result = new Uint8Array(value.length);

  for (let index = 0; index < value.length; index += 1) {
    result[index] = value.charCodeAt(index);
  }

  return result;
}

export function applyBase64Transform(input: string, mode: Base64TransformMode): string {
  if (mode === "encode") {
    return btoa(bytesToBinary(new TextEncoder().encode(input)));
  }

  return new TextDecoder().decode(binaryToBytes(atob(input)));
}
