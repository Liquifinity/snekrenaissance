export type D1Result<T = unknown> = {
  results?: T[];
  success: boolean;
  meta?: unknown;
};

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(columnName?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run<T = unknown>(): Promise<D1Result<T>>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<Array<D1Result<T>>>;
  exec(query: string): Promise<{ count: number; duration: number }>;
}

export interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export type WorkerEnv = {
  DB: D1Database;
  START_LIMITER: RateLimitBinding;
  RESULT_LIMITER: RateLimitBinding;
  READ_LIMITER: RateLimitBinding;
};
