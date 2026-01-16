export type Header = {
  name: string;
  value: string;
};

export type Entry = {
  id: string;
  timeMs: number;
  method: string;
  url: string;
  status: number;
  statusText?: string;
  requestHeaders: Header[];
  responseHeaders: Header[];
  requestBody?: string;
  responseBody?: string;
  responseMimeType?: string;
  responseUnreadable?: boolean;
  durationMs?: number;
  resourceType?: string;
  timings?: chrome.devtools.network.Request["timings"];
};
