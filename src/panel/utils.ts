import type { Entry, Header } from "./types";

const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

export function safeTruncate(text: string, maxBytes: number): string {
  const bytes = textEncoder.encode(text);
  if (bytes.length <= maxBytes) {
    return text;
  }
  const sliced = bytes.slice(0, maxBytes);
  const truncated = textDecoder.decode(sliced);
  return `${truncated}\n… (kısaltıldı)`;
}

export function prettyJson(text: string): { text: string; isValid: boolean } {
  try {
    const parsed = JSON.parse(text);
    return { text: JSON.stringify(parsed, null, 2), isValid: true };
  } catch {
    return { text, isValid: false };
  }
}

export function toCurl(entry: Entry): string {
  const parts: string[] = ["curl", "-X", entry.method];
  for (const header of entry.requestHeaders || []) {
    const name = header.name.replace(/\s+/g, " ");
    const value = header.value.replace(/\s+/g, " ");
    parts.push("-H", `'${name}: ${value}'`);
  }
  if (entry.requestBody) {
    parts.push("--data", `'${entry.requestBody.replace(/'/g, "'\\''")}'`);
  }
  parts.push(`'${entry.url}'`);
  return parts.join(" ");
}

export function headersToMap(headers: Header[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const header of headers) {
    map[header.name.toLowerCase()] = header.value;
  }
  return map;
}

export function isTextResponse(mimeType?: string, encoding?: string): boolean {
  if (!mimeType) {
    return false;
  }
  if (encoding === "base64") {
    return false;
  }
  const lower = mimeType.toLowerCase();
  return (
    lower.startsWith("text/") ||
    lower.includes("application/json") ||
    lower.includes("application/xml") ||
    lower.includes("application/javascript") ||
    lower.includes("application/xhtml+xml")
  );
}

export function calcDurationMs(request: chrome.devtools.network.Request): number | undefined {
  if (request.time && request.response?.receivedTime) {
    return Math.max(0, (request.response.receivedTime - request.time) * 1000);
  }
  if (request.timings) {
    const timings = request.timings;
    const values = [
      timings.blocked,
      timings.dns,
      timings.connect,
      timings.send,
      timings.wait,
      timings.receive,
      timings.ssl
    ].filter((value) => typeof value === "number" && value >= 0) as number[];
    if (values.length > 0) {
      return values.reduce((sum, value) => sum + value, 0);
    }
  }
  return undefined;
}

export function normalizeHeaders(headers?: Header[]): Header[] {
  if (!headers) {
    return [];
  }
  return headers.map((header) => ({
    name: header.name || "",
    value: header.value || ""
  }));
}
