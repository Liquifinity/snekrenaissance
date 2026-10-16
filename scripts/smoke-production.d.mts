export interface ProductionSmokeOptions {
  workerUrl?: string;
  pagesUrl?: string;
  fetchImpl?: typeof fetch;
}

export interface ProductionSmokeResult {
  workerUrl: string;
  pagesUrl: string;
  ranked: true;
}

export function smokeProduction(options?: ProductionSmokeOptions): Promise<ProductionSmokeResult>;
