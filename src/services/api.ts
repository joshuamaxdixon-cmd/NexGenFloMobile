import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

const DEFAULT_API_ORIGIN =
  Platform.select({
    android: 'http://10.0.2.2:5000',
    default: 'http://127.0.0.1:5000',
    ios: 'http://127.0.0.1:5000',
    web: 'http://127.0.0.1:5000',
  }) ?? 'http://127.0.0.1:5000';

const ENV_NEXGEN_API_BASE_URL = normalizeConfiguredBaseUrl(
  process.env.EXPO_PUBLIC_NEXGEN_API_BASE_URL,
);
const ENV_LEGACY_API_BASE_URL = normalizeConfiguredBaseUrl(
  process.env.EXPO_PUBLIC_API_BASE_URL,
);
const EXPO_LINKING_FALLBACK_ORIGIN = inferExpoLinkingFallbackOrigin();

export type ApiConfigSource =
  | 'default'
  | 'expo_linking'
  | 'EXPO_PUBLIC_API_BASE_URL'
  | 'EXPO_PUBLIC_NEXGEN_API_BASE_URL'
  | 'runtime_override';

export type ApiDebugInfo = {
  configSource: ApiConfigSource;
  defaultOrigin: string;
  envApiBaseUrl: string | null;
  expoLinkingOrigin: string | null;
  healthUrl: string;
  legacyEnvApiBaseUrl: string | null;
  resolvedApiBaseUrl: string;
  resolvedBaseUrl: string;
  usesLocalhostFallback: boolean;
};

export type ApiDebugExchange = {
  durationMs: number | null;
  errorMessage: string | null;
  method: string;
  requestBody: string | null;
  requestHeaders: Record<string, string>;
  responseBody: string | null;
  responseHeaders: Record<string, string> | null;
  responseStatus: number | null;
  timeoutMs: number;
  url: string;
};

export type ApiFieldErrors = Record<string, string[]>;

export type ApiHealthResult = {
  database: string | null;
  healthUrl: string;
  requestId: string | null;
  service: string | null;
  status: string;
  version: string | null;
};

type ResolvedApiConfig = {
  configSource: ApiConfigSource;
  healthUrl: string;
  resolvedApiBaseUrl: string;
  resolvedBaseUrl: string;
  usesLocalhostFallback: boolean;
};

type ApiRequestOptions = {
  baseUrl?: string;
  body?: BodyInit | FormData | Record<string, unknown> | null;
  headers?: HeadersInit;
  method?: 'DELETE' | 'GET' | 'POST' | 'PUT';
  timeoutMs?: number;
};

export class ApiError extends Error {
  details: unknown;
  isTimeout: boolean;
  requestBody: string | null;
  requestHeaders: Record<string, string>;
  requestMethod: string;
  requestUrl: string;
  responseBody: unknown;
  responseHeaders: Record<string, string> | null;
  responseText: string | null;
  status: number | null;

  constructor({
    details,
    isTimeout = false,
    message,
    requestBody,
    requestHeaders,
    requestMethod,
    requestUrl,
    responseBody,
    responseHeaders,
    responseText,
    status,
  }: {
    details?: unknown;
    isTimeout?: boolean;
    message: string;
    requestBody?: string | null;
    requestHeaders?: Record<string, string>;
    requestMethod: string;
    requestUrl: string;
    responseBody?: unknown;
    responseHeaders?: Record<string, string> | null;
    responseText?: string | null;
    status: number | null;
  }) {
    super(message);
    this.name = 'ApiError';
    this.details = details;
    this.isTimeout = isTimeout;
    this.requestBody = requestBody ?? null;
    this.requestHeaders = requestHeaders ?? {};
    this.requestMethod = requestMethod;
    this.requestUrl = requestUrl;
    this.responseBody = responseBody ?? null;
    this.responseHeaders = responseHeaders ?? null;
    this.responseText = responseText ?? null;
    this.status = status;
  }
}

let runtimeApiConfig = resolveInitialApiConfig();
let lastApiExchange: ApiDebugExchange | null = null;

function trimTrailingSlashes(value: string) {
  return value.replace(/\/+$/, '');
}

function normalizeConfiguredBaseUrl(value: string | undefined) {
  const trimmedValue = String(value ?? '').trim();

  if (!trimmedValue) {
    return null;
  }

  if (isAbsoluteUrl(trimmedValue)) {
    return trimTrailingSlashes(trimmedValue);
  }

  return trimTrailingSlashes(`http://${trimmedValue.replace(/^\/+/, '')}`);
}

function inferExpoLinkingFallbackOrigin() {
  try {
    const linkingUrl = Linking.createURL('/');
    const normalizedUrl = linkingUrl
      .replace(/^exp:\/\//i, 'http://')
      .replace(/^exps:\/\//i, 'https://');
    const parsedUrl = new URL(normalizedUrl);
    const hostname = parsedUrl.hostname;

    if (!hostname || hostname === '127.0.0.1' || hostname === 'localhost') {
      return null;
    }

    return `http://${hostname}:5000`;
  } catch {
    return null;
  }
}

function resolveInitialApiConfig() {
  if (ENV_NEXGEN_API_BASE_URL) {
    return resolveApiConfigFromBaseUrl(
      ENV_NEXGEN_API_BASE_URL,
      'EXPO_PUBLIC_NEXGEN_API_BASE_URL',
    );
  }

  if (ENV_LEGACY_API_BASE_URL) {
    return resolveApiConfigFromBaseUrl(
      ENV_LEGACY_API_BASE_URL,
      'EXPO_PUBLIC_API_BASE_URL',
    );
  }

  if (EXPO_LINKING_FALLBACK_ORIGIN) {
    return resolveApiConfigFromBaseUrl(
      EXPO_LINKING_FALLBACK_ORIGIN,
      'expo_linking',
    );
  }

  return resolveApiConfigFromBaseUrl(DEFAULT_API_ORIGIN, 'default');
}

function resolveApiConfigFromBaseUrl(
  rawBaseUrl: string | undefined,
  configSource: ApiConfigSource,
): ResolvedApiConfig {
  const normalizedBaseUrl =
    normalizeConfiguredBaseUrl(rawBaseUrl) ?? DEFAULT_API_ORIGIN;

  try {
    const parsedUrl = new URL(normalizedBaseUrl);
    const trimmedPath = trimTrailingSlashes(parsedUrl.pathname);
    const normalizedPath = trimmedPath === '/' ? '' : trimmedPath;
    const hasApiSuffix = normalizedPath.toLowerCase().endsWith('/api');
    const basePath = hasApiSuffix
      ? normalizedPath.slice(0, -4) || ''
      : normalizedPath;
    const originPrefix = `${parsedUrl.protocol}//${parsedUrl.host}`;
    const resolvedBaseUrl = trimTrailingSlashes(`${originPrefix}${basePath}`);
    const resolvedApiBaseUrl = `${resolvedBaseUrl}/api`;

    return {
      configSource,
      healthUrl: `${resolvedApiBaseUrl}/health`,
      resolvedApiBaseUrl,
      resolvedBaseUrl,
      usesLocalhostFallback:
        parsedUrl.hostname === '127.0.0.1' || parsedUrl.hostname === 'localhost',
    };
  } catch {
    const fallbackBaseUrl = trimTrailingSlashes(DEFAULT_API_ORIGIN);

    return {
      configSource: 'default',
      healthUrl: `${fallbackBaseUrl}/api/health`,
      resolvedApiBaseUrl: `${fallbackBaseUrl}/api`,
      resolvedBaseUrl: fallbackBaseUrl,
      usesLocalhostFallback: true,
    };
  }
}

function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function joinUrl(baseUrl: string, path: string) {
  return `${trimTrailingSlashes(baseUrl)}${path.startsWith('/') ? path : `/${path}`}`;
}

function getNormalizedPath(path: string) {
  const trimmedPath = path.trim();

  if (!trimmedPath) {
    return '/api';
  }

  if (trimmedPath.startsWith('/api')) {
    return trimmedPath;
  }

  if (trimmedPath.startsWith('/')) {
    return `/api${trimmedPath}`;
  }

  return `/api/${trimmedPath}`;
}

function readRecord(value: unknown) {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (typeof payload === 'string' && payload.trim().length > 0) {
    return payload;
  }

  const record = readRecord(payload);

  if (!record) {
    return fallback;
  }

  const candidates = [
    record.message,
    record.error,
    record.detail,
    record.title,
  ];

  const firstMessage = candidates.find(
    (candidate) => typeof candidate === 'string' && candidate.trim().length > 0,
  );

  return typeof firstMessage === 'string' ? firstMessage : fallback;
}

function parseResponseBody(text: string, contentType: string) {
  if (!text.trim().length) {
    return null;
  }

  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }

  return text;
}

function sanitizeJsonValue(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => sanitizeJsonValue(entry))
      .filter((entry) => entry !== undefined);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce<
      Record<string, unknown>
    >((accumulator, [key, entryValue]) => {
      const sanitizedEntry = sanitizeJsonValue(entryValue);

      if (sanitizedEntry !== undefined) {
        accumulator[key] = sanitizedEntry;
      }

      return accumulator;
    }, {});
  }

  return value;
}

function headersToRecord(headers?: HeadersInit) {
  if (!headers) {
    return {} as Record<string, string>;
  }

  if (Array.isArray(headers)) {
    return headers.reduce<Record<string, string>>((accumulator, [key, value]) => {
      accumulator[key] = value;
      return accumulator;
    }, {});
  }

  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    const result: Record<string, string> = {};

    headers.forEach((value, key) => {
      result[key] = value;
    });

    return result;
  }

  return Object.entries(headers).reduce<Record<string, string>>(
    (accumulator, [key, value]) => {
      if (Array.isArray(value)) {
        accumulator[key] = value.join(', ');
      } else if (typeof value === 'string') {
        accumulator[key] = value;
      }

      return accumulator;
    },
    {},
  );
}

function responseHeadersToRecord(headers: Headers) {
  const result: Record<string, string> = {};

  headers.forEach((value, key) => {
    result[key] = value;
  });

  return result;
}

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

function serializeFormDataForDebug(formData: FormData) {
  const reactNativeFormData = formData as FormData & {
    _parts?: [string, unknown][];
  };

  if (Array.isArray(reactNativeFormData._parts)) {
    return JSON.stringify(
      reactNativeFormData._parts.map(([key, value]) => {
        if (value && typeof value === 'object') {
          const fileRecord = value as Record<string, unknown>;

          return {
            key,
            value: {
              name: readString(fileRecord.name),
              type: readString(fileRecord.type),
              uri: readString(fileRecord.uri),
            },
          };
        }

        return { key, value };
      }),
      null,
      2,
    );
  }

  return '[FormData payload]';
}

function setLastApiExchange(exchange: ApiDebugExchange) {
  lastApiExchange = exchange;
}

function logApiDebug(
  phase: 'error' | 'request' | 'response',
  exchange: ApiDebugExchange,
) {
  if (!__DEV__) {
    return;
  }

  const logger = phase === 'error' ? console.warn : console.info;

  logger(`[NexGen Flo API] ${phase.toUpperCase()}`, exchange);
}

function buildNetworkFailureMessage(method: string, requestUrl: string, fallback: string) {
  if (__DEV__) {
    return `${fallback} (${method} ${requestUrl})`;
  }

  return fallback;
}

function normalizeHealthResponse(
  raw: unknown,
  healthUrl = getApiHealthUrl(),
): ApiHealthResult {
  const record = readRecord(raw) ?? {};

  return {
    database: readString(record.database),
    healthUrl,
    requestId:
      readString(record.request_id) ?? readString(record.requestId) ?? null,
    service: readString(record.service),
    status: readString(record.status) ?? 'unknown',
    version: readString(record.version),
  };
}

export function getApiFieldErrors(error: unknown): ApiFieldErrors | null {
  if (!(error instanceof ApiError)) {
    return null;
  }

  const detailsRecord = readRecord(error.details);
  const errorsRecord = readRecord(detailsRecord?.errors);

  if (!errorsRecord) {
    return null;
  }

  const fieldErrors = Object.entries(errorsRecord).reduce<ApiFieldErrors>(
    (accumulator, [field, value]) => {
      if (!Array.isArray(value)) {
        return accumulator;
      }

      const messages = value.filter(
        (entry): entry is string =>
          typeof entry === 'string' && entry.trim().length > 0,
      );

      if (messages.length > 0) {
        accumulator[field] = messages;
      }

      return accumulator;
    },
    {},
  );

  return Object.keys(fieldErrors).length > 0 ? fieldErrors : null;
}

export function getApiBaseUrl() {
  return runtimeApiConfig.resolvedApiBaseUrl;
}

export function getApiOrigin() {
  return runtimeApiConfig.resolvedBaseUrl;
}

export function getApiHealthUrl() {
  return runtimeApiConfig.healthUrl;
}

export function getApiDebugInfo(): ApiDebugInfo {
  return {
    configSource: runtimeApiConfig.configSource,
    defaultOrigin: DEFAULT_API_ORIGIN,
    envApiBaseUrl: ENV_NEXGEN_API_BASE_URL,
    expoLinkingOrigin: EXPO_LINKING_FALLBACK_ORIGIN,
    healthUrl: runtimeApiConfig.healthUrl,
    legacyEnvApiBaseUrl: ENV_LEGACY_API_BASE_URL,
    resolvedApiBaseUrl: runtimeApiConfig.resolvedApiBaseUrl,
    resolvedBaseUrl: runtimeApiConfig.resolvedBaseUrl,
    usesLocalhostFallback: runtimeApiConfig.usesLocalhostFallback,
  };
}

export function getLastApiExchange() {
  return lastApiExchange;
}

export function clearLastApiExchange() {
  lastApiExchange = null;
}

export function setApiBaseUrl(nextBaseUrl: string) {
  runtimeApiConfig = resolveApiConfigFromBaseUrl(
    nextBaseUrl,
    'runtime_override',
  );

  if (__DEV__) {
    console.info('[NexGen Flo API] Runtime override applied', getApiDebugInfo());
  }
}

export function buildApiUrl(path: string, baseUrl = getApiBaseUrl()) {
  const trimmedPath = path.trim();

  if (isAbsoluteUrl(trimmedPath)) {
    return trimmedPath;
  }

  const resolvedConfig = resolveApiConfigFromBaseUrl(baseUrl, 'runtime_override');
  const normalizedPath = getNormalizedPath(trimmedPath);

  if (normalizedPath.startsWith('/api')) {
    return joinUrl(resolvedConfig.resolvedBaseUrl, normalizedPath);
  }

  return joinUrl(resolvedConfig.resolvedApiBaseUrl, normalizedPath);
}

export async function apiRequest<T>(
  path: string,
  {
    baseUrl,
    body,
    headers,
    method = 'GET',
    timeoutMs = 15000,
  }: ApiRequestOptions = {},
): Promise<T> {
  const requestUrl = buildApiUrl(
    path,
    baseUrl ?? runtimeApiConfig.resolvedBaseUrl,
  );
  const requestHeaders = headersToRecord(headers);

  if (!requestHeaders.Accept && !requestHeaders.accept) {
    requestHeaders.Accept = 'application/json';
  }

  let requestBody: BodyInit | null | undefined;
  let requestBodyForDebug: string | null = null;

  if (isFormData(body)) {
    delete requestHeaders['Content-Type'];
    delete requestHeaders['content-type'];
    requestBody = body;
    requestBodyForDebug = serializeFormDataForDebug(body);
  } else if (body !== null && typeof body === 'object') {
    const sanitizedBody = sanitizeJsonValue(body);
    requestHeaders['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(sanitizedBody);
    requestBodyForDebug =
      typeof requestBody === 'string' ? requestBody : JSON.stringify(sanitizedBody);
  } else if (typeof body === 'string') {
    requestBody = body;
    requestBodyForDebug = body;
  } else if (body) {
    requestBody = body;
    requestBodyForDebug = String(body);
  }

  const exchangeBase: ApiDebugExchange = {
    durationMs: null,
    errorMessage: null,
    method,
    requestBody: requestBodyForDebug,
    requestHeaders,
    responseBody: null,
    responseHeaders: null,
    responseStatus: null,
    timeoutMs,
    url: requestUrl,
  };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  setLastApiExchange(exchangeBase);
  logApiDebug('request', exchangeBase);

  try {
    const response = await fetch(requestUrl, {
      body:
        method === 'GET' || method === 'DELETE'
          ? undefined
          : (requestBody ?? undefined),
      headers: requestHeaders,
      method,
      signal: controller.signal,
    });
    const responseText = await response.text();
    const responseHeaders = responseHeadersToRecord(response.headers);
    const parsedResponseBody = parseResponseBody(
      responseText,
      response.headers.get('content-type') ?? '',
    );
    const completedExchange: ApiDebugExchange = {
      ...exchangeBase,
      durationMs: Date.now() - startedAt,
      responseBody: responseText || null,
      responseHeaders,
      responseStatus: response.status,
    };

    setLastApiExchange(completedExchange);
    logApiDebug('response', completedExchange);

    if (!response.ok) {
      throw new ApiError({
        details: parsedResponseBody,
        message: getErrorMessage(
          parsedResponseBody,
          responseText.trim().length > 0
            ? responseText
            : `Request failed with status ${response.status}.`,
        ),
        requestBody: requestBodyForDebug,
        requestHeaders,
        requestMethod: method,
        requestUrl,
        responseBody: parsedResponseBody,
        responseHeaders,
        responseText,
        status: response.status,
      });
    }

    return parsedResponseBody as T;
  } catch (error) {
    if (error instanceof ApiError) {
      const failedExchange: ApiDebugExchange = {
        ...exchangeBase,
        durationMs: Date.now() - startedAt,
        errorMessage: error.message,
        responseBody:
          typeof error.responseText === 'string' && error.responseText.length > 0
            ? error.responseText
            : null,
        responseHeaders: error.responseHeaders,
        responseStatus: error.status,
      };

      setLastApiExchange(failedExchange);
      logApiDebug('error', failedExchange);
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      const message = buildNetworkFailureMessage(
        method,
        requestUrl,
        `Request timed out after ${timeoutMs}ms`,
      );
      const apiError = new ApiError({
        details: {
          requestUrl,
          timeoutMs,
        },
        isTimeout: true,
        message,
        requestBody: requestBodyForDebug,
        requestHeaders,
        requestMethod: method,
        requestUrl,
        responseBody: null,
        responseHeaders: null,
        responseText: null,
        status: null,
      });

      const timeoutExchange: ApiDebugExchange = {
        ...exchangeBase,
        durationMs: Date.now() - startedAt,
        errorMessage: message,
      };

      setLastApiExchange(timeoutExchange);
      logApiDebug('error', timeoutExchange);
      throw apiError;
    }

    const fallbackMessage =
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : 'The request could not be completed.';
    const message = buildNetworkFailureMessage(method, requestUrl, fallbackMessage);
    const apiError = new ApiError({
      details:
        error instanceof Error
          ? {
              message: error.message,
              name: error.name,
            }
          : error,
      message,
      requestBody: requestBodyForDebug,
      requestHeaders,
      requestMethod: method,
      requestUrl,
      responseBody: null,
      responseHeaders: null,
      responseText: null,
      status: null,
    });
    const failedExchange: ApiDebugExchange = {
      ...exchangeBase,
      durationMs: Date.now() - startedAt,
      errorMessage: message,
    };

    setLastApiExchange(failedExchange);
    logApiDebug('error', failedExchange);
    throw apiError;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  delete<T>(path: string, options?: Omit<ApiRequestOptions, 'body' | 'method'>) {
    return apiRequest<T>(path, {
      ...options,
      method: 'DELETE',
    });
  },
  get<T>(path: string, options?: Omit<ApiRequestOptions, 'body' | 'method'>) {
    return apiRequest<T>(path, {
      ...options,
      method: 'GET',
    });
  },
  post<T>(
    path: string,
    body?: ApiRequestOptions['body'],
    options?: Omit<ApiRequestOptions, 'body' | 'method'>,
  ) {
    return apiRequest<T>(path, {
      ...options,
      body,
      method: 'POST',
    });
  },
  put<T>(
    path: string,
    body?: ApiRequestOptions['body'],
    options?: Omit<ApiRequestOptions, 'body' | 'method'>,
  ) {
    return apiRequest<T>(path, {
      ...options,
      body,
      method: 'PUT',
    });
  },
};

export async function checkApiHealth() {
  if (__DEV__) {
    console.info('[NexGen Flo API] Health check config', getApiDebugInfo());
  }

  const response = await api.get<unknown>('/api/health', {
    timeoutMs: 12000,
  });

  return normalizeHealthResponse(response, getApiHealthUrl());
}

if (__DEV__) {
  console.info('[NexGen Flo API] Resolved runtime config', getApiDebugInfo());
}
