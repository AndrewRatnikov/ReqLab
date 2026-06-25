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

export interface ResponseResult {
  status: number
  statusText: string
  body: string
  contentType: string
  latencyMs: number
}

export type ClientError =
  | { kind: 'network'; message: string }
  | { kind: 'cors'; message: string }
  | { kind: 'timeout'; message: string }
  | { kind: 'invalid-url'; message: string }
  | { kind: 'invalid-json'; message: string }
