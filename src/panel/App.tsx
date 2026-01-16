import React, { useEffect, useMemo, useReducer, useRef } from "react";
import type { Entry, Header } from "./types";
import {
  calcDurationMs,
  headersToMap,
  isTextResponse,
  normalizeHeaders,
  prettyJson,
  safeTruncate,
  toCurl
} from "./utils";

const MAX_ITEMS = 200;
const MAX_BODY_BYTES = 200 * 1024;
const STORAGE_KEY = "apiMonitorLogs";

type FilterState = {
  text: string;
  onlyErrors: boolean;
  onlyXhr: boolean;
  onlyApi: boolean;
};

type State = {
  items: Entry[];
  filter: FilterState;
  selectedId?: string;
  activeTab: "request" | "response" | "headers" | "timing";
};

type Action =
  | { type: "setItems"; items: Entry[] }
  | { type: "addItem"; item: Entry }
  | { type: "setFilter"; filter: Partial<FilterState> }
  | { type: "setSelected"; id?: string }
  | { type: "setTab"; tab: State["activeTab"] }
  | { type: "clear" };

const initialState: State = {
  items: [],
  filter: {
    text: "",
    onlyErrors: false,
    onlyXhr: false,
    onlyApi: false
  },
  selectedId: undefined,
  activeTab: "request"
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "setItems":
      return { ...state, items: action.items };
    case "addItem": {
      const next = [action.item, ...state.items].slice(0, MAX_ITEMS);
      return { ...state, items: next };
    }
    case "setFilter":
      return { ...state, filter: { ...state.filter, ...action.filter } };
    case "setSelected":
      return { ...state, selectedId: action.id };
    case "setTab":
      return { ...state, activeTab: action.tab };
    case "clear":
      return { ...state, items: [], selectedId: undefined };
    default:
      return state;
  }
}

function formatTime(timeMs: number): string {
  const date = new Date(timeMs);
  return date.toLocaleTimeString([], { hour12: false });
}

function formatDuration(durationMs?: number): string {
  if (durationMs === undefined) {
    return "-";
  }
  return `${Math.round(durationMs)}`;
}

function formatHeaders(headers: Header[]): string {
  if (headers.length === 0) {
    return "(yok)";
  }
  return headers
    .map((header) => `${header.name}: ${header.value}`)
    .join("\n");
}

async function readResponseBody(request: chrome.devtools.network.Request): Promise<{
  body?: string;
  mimeType?: string;
  unreadable?: boolean;
}> {
  const responseHeaders = normalizeHeaders(request.response?.headers as Header[] | undefined);
  const headerMap = headersToMap(responseHeaders);
  const mimeType = request.response?.content?.mimeType || headerMap["content-type"];

  const { content, encoding } = await new Promise<{
    content?: string;
    encoding?: string;
  }>((resolve) => {
    try {
      request.getContent((responseContent, responseEncoding) => {
        resolve({
          content: responseContent ?? undefined,
          encoding: responseEncoding
        });
      });
    } catch {
      resolve({});
    }
  });

  if (!content || !isTextResponse(mimeType, encoding)) {
    const unreadable = Boolean(content) || (mimeType ? !isTextResponse(mimeType, encoding) : false);
    return { mimeType, unreadable };
  }

  return {
    mimeType,
    body: safeTruncate(content, MAX_BODY_BYTES),
    unreadable: false
  };
}

function getResourceType(request: chrome.devtools.network.Request): string {
  const anyRequest = request as unknown as { _resourceType?: string; type?: string };
  return (anyRequest.type || anyRequest._resourceType || "").toString();
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const initializedRef = useRef(false);

  useEffect(() => {
    chrome.storage.session.get([STORAGE_KEY], (result) => {
      const items = (result[STORAGE_KEY] as Entry[] | undefined) || [];
      dispatch({ type: "setItems", items });
      initializedRef.current = true;
    });
  }, []);

  useEffect(() => {
    if (!initializedRef.current) {
      return;
    }
    chrome.storage.session.set({ [STORAGE_KEY]: state.items });
  }, [state.items]);

  useEffect(() => {
    const handler = async (request: chrome.devtools.network.Request) => {
      const requestHeaders = normalizeHeaders(request.request?.headers as Header[] | undefined);
      const responseHeaders = normalizeHeaders(request.response?.headers as Header[] | undefined);
      const requestBody = request.request?.postData?.text
        ? safeTruncate(request.request.postData.text, MAX_BODY_BYTES)
        : undefined;

      const response = await readResponseBody(request);

      const entry: Entry = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        timeMs: request.time ? Math.round(request.time * 1000) : Date.now(),
        method: request.request?.method || "",
        url: request.request?.url || "",
        status: request.response?.status || 0,
        statusText: request.response?.statusText,
        requestHeaders,
        responseHeaders,
        requestBody,
        responseBody: response.body,
        responseMimeType: response.mimeType,
        responseUnreadable: response.unreadable,
        durationMs: calcDurationMs(request),
        resourceType: getResourceType(request),
        timings: request.timings
      };

      dispatch({ type: "addItem", item: entry });
    };

    chrome.devtools.network.onRequestFinished.addListener(handler);
    return () => {
      chrome.devtools.network.onRequestFinished.removeListener(handler);
    };
  }, []);

  const filteredItems = useMemo(() => {
    const text = state.filter.text.trim().toLowerCase();
    return state.items.filter((item) => {
      if (state.filter.onlyErrors && item.status < 400) {
        return false;
      }
      if (state.filter.onlyApi && !item.url.toLowerCase().includes("/api")) {
        return false;
      }
      if (state.filter.onlyXhr) {
        const type = (item.resourceType || "").toLowerCase();
        if (!type.includes("xhr") && !type.includes("fetch")) {
          return false;
        }
      }
      if (!text) {
        return true;
      }
      const haystack = `${item.method} ${item.url} ${item.status}`.toLowerCase();
      return haystack.includes(text);
    });
  }, [state.items, state.filter]);

  const selectedItem = state.items.find((item) => item.id === state.selectedId);
  const requestJson = selectedItem?.requestBody ? prettyJson(selectedItem.requestBody) : null;
  const responseJson = selectedItem?.responseBody ? prettyJson(selectedItem.responseBody) : null;

  const handleCopyCurl = async () => {
    if (!selectedItem) {
      return;
    }
    await navigator.clipboard.writeText(toCurl(selectedItem));
  };

  const handleCopyResponse = async () => {
    if (!selectedItem?.responseBody) {
      return;
    }
    await navigator.clipboard.writeText(prettyJson(selectedItem.responseBody).text);
  };

  const handleExport = () => {
    const payload = JSON.stringify(state.items, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `api-monitor-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app">
      <div className="main">
        <div className="toolbar">
          <div className="title">API İzleyici</div>
          <input
            type="text"
            placeholder="Ara (URL, endpoint, içerik)..."
            value={state.filter.text}
            onChange={(event) =>
              dispatch({
                type: "setFilter",
                filter: { text: event.target.value }
              })
            }
          />
          <label>
            <input
              type="checkbox"
              checked={state.filter.onlyErrors}
              onChange={(event) =>
                dispatch({
                  type: "setFilter",
                  filter: { onlyErrors: event.target.checked }
                })
              }
            />
            Sadece Hatalar (&gt;= 400)
          </label>
          <label>
            <input
              type="checkbox"
              checked={state.filter.onlyXhr}
              onChange={(event) =>
                dispatch({
                  type: "setFilter",
                  filter: { onlyXhr: event.target.checked }
                })
              }
            />
            Sadece XHR/Fetch
          </label>
          <label>
            <input
              type="checkbox"
              checked={state.filter.onlyApi}
              onChange={(event) =>
                dispatch({
                  type: "setFilter",
                  filter: { onlyApi: event.target.checked }
                })
              }
            />
            Sadece /api
          </label>
          <button className="primary" onClick={handleExport}>
            Dışa Aktar (JSON)
          </button>
          <button onClick={() => dispatch({ type: "clear" })}>Temizle</button>
        </div>
        <div className="table-wrap">
          {filteredItems.length === 0 ? (
            <div className="empty">
              Henüz kayıt yok. DevTools açıkken yapılan istekler burada listelenir.
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Zaman</th>
                  <th>Metot</th>
                  <th>Durum</th>
                  <th>URL</th>
                  <th>Süre (ms)</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => dispatch({ type: "setSelected", id: item.id })}
                  >
                    <td>{formatTime(item.timeMs)}</td>
                    <td>{item.method}</td>
                    <td>
                      <span
                        className={`badge ${item.status >= 400 ? "error" : "success"}`}
                      >
                        {item.status || "-"}
                      </span>
                    </td>
                    <td>{item.url}</td>
                    <td>{formatDuration(item.durationMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <div className="drawer">
        {selectedItem ? (
          <>
            <div className="drawer-header">
              <h2>
                {selectedItem.method} {selectedItem.status || ""}
              </h2>
              <div className="meta">{selectedItem.url}</div>
            </div>
            <div className="tabs">
              <button
                className={state.activeTab === "request" ? "active" : ""}
                onClick={() => dispatch({ type: "setTab", tab: "request" })}
              >
                İstek
              </button>
              <button
                className={state.activeTab === "response" ? "active" : ""}
                onClick={() => dispatch({ type: "setTab", tab: "response" })}
              >
                Yanıt
              </button>
              <button
                className={state.activeTab === "headers" ? "active" : ""}
                onClick={() => dispatch({ type: "setTab", tab: "headers" })}
              >
                Başlıklar
              </button>
              <button
                className={state.activeTab === "timing" ? "active" : ""}
                onClick={() => dispatch({ type: "setTab", tab: "timing" })}
              >
                Zamanlama
              </button>
            </div>
            <div className="drawer-content">
              {state.activeTab === "request" && (
                <div>
                  {requestJson ? requestJson.text : "İstek gövdesi yok."}
                  {requestJson && !requestJson.isValid && <div>Geçerli JSON değil.</div>}
                </div>
              )}
              {state.activeTab === "response" && (
                <div>
                  {selectedItem.responseUnreadable
                    ? "İçerik okunamadı (binary/çok büyük olabilir)."
                    : responseJson
                      ? responseJson.text
                      : "Yanıt gövdesi yok."}
                  {responseJson && !responseJson.isValid && <div>Geçerli JSON değil.</div>}
                </div>
              )}
              {state.activeTab === "headers" && (
                <div>
                  {`İstek başlıkları:\n${formatHeaders(
                    selectedItem.requestHeaders
                  )}\n\nYanıt başlıkları:\n${formatHeaders(selectedItem.responseHeaders)}`}
                </div>
              )}
              {state.activeTab === "timing" && (
                <div>
                  {`Süre: ${formatDuration(selectedItem.durationMs)} ms\n\nZamanlama:\n${JSON.stringify(
                    selectedItem.timings || {},
                    null,
                    2
                  )}`}
                </div>
              )}
            </div>
            <div className="actions">
              <button onClick={handleCopyCurl}>cURL olarak kopyala</button>
              <button onClick={handleCopyResponse}>Yanıt JSON'unu kopyala</button>
            </div>
          </>
        ) : (
          <div className="empty">Detay için bir kayıt seçin.</div>
        )}
      </div>
    </div>
  );
}