export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export interface HeaderEntry {
  key: string
  value: string
}

export interface RequestConfig {
  method: HttpMethod
  url: string
  headers: HeaderEntry[]
  body: string
}

export interface ResponseHeaderEntry {
  name: string
  value: string
}

export interface ResponseResult {
  status: number
  statusText: string
  body: string
  contentType: string
  latencyMs: number
  /** Raw headers readable from the Response actually used. */
  headers: ResponseHeaderEntry[]
  /** True iff the CORS-retry proxy response was used. */
  viaProxy: boolean
}

export type ClientError =
  | { kind: 'network'; message: string }
  | { kind: 'cors'; message: string }
  | { kind: 'timeout'; message: string }
  | { kind: 'invalid-url'; message: string }
  | { kind: 'invalid-json'; message: string }
