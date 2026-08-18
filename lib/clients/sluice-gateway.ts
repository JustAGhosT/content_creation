/**
 * Sluice AI Gateway Client
 *
 * OpenAI-compatible gateway that routes AI requests through Sluice
 * for centralized cost tracking, model abstraction, and failover.
 *
 * Sluice exposes /v1/responses and /v1/embeddings endpoints.
 * When enabled via feature flags, all AI service calls are routed
 * through the gateway instead of directly to individual providers.
 *
 * @see https://github.com/celladore/sluice
 */

import featureFlags from '@/lib/featureFlags';

export interface SluiceRequestOptions {
  /** Target model/deployment (e.g., 'gpt-4', 'text-embedding-ada-002') */
  model?: string;
  /** Request timeout in milliseconds */
  timeoutMs?: number;
  /** Operation name for cost attribution */
  operation?: string;
}

export interface SluiceResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  /** Cost attribution metadata from gateway */
  costMetadata?: {
    model: string;
    tokensUsed?: number;
    estimatedCost?: number;
  };
}

/**
 * Get Sluice gateway configuration from environment and feature flags
 */
function getGatewayConfig(): { url: string; apiKey: string } | null {
  const gatewayFlag = featureFlags.aiGateway;
  if (!gatewayFlag || typeof gatewayFlag !== 'object' || !gatewayFlag.enabled) {
    return null;
  }

  const url = process.env.SLUICE_GATEWAY_URL || '';
  const apiKey = process.env.SLUICE_API_KEY || '';

  if (!url) {
    console.warn('Sluice gateway enabled but SLUICE_GATEWAY_URL not set');
    return null;
  }

  return { url, apiKey };
}

/**
 * Check if the Sluice gateway is available and enabled
 */
export function isGatewayEnabled(): boolean {
  return getGatewayConfig() !== null;
}

/**
 * Check if direct provider calls should be used as fallback
 */
export function shouldFallbackToDirectCalls(): boolean {
  const gatewayFlag = featureFlags.aiGateway;
  if (!gatewayFlag || typeof gatewayFlag !== 'object') return true;
  return gatewayFlag.fallbackToDirectCalls !== false;
}

/**
 * Route a chat/completion request through the Sluice gateway
 */
export async function gatewayPost<T = unknown>(
  path: string,
  body: Record<string, unknown>,
  options: SluiceRequestOptions = {}
): Promise<SluiceResponse<T>> {
  const config = getGatewayConfig();
  if (!config) {
    return {
      success: false,
      error: 'Sluice gateway not configured',
      statusCode: 503,
    };
  }

  const { timeoutMs = 30000, operation = 'unknown' } = options;
  const url = `${config.url}${path}`;

  // Validate URL before fetching
  try {
    new URL(url);
  } catch {
    return { success: false, error: 'Invalid gateway URL', statusCode: 502 };
  }

  const controller = new globalThis.AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Sluice-Operation': operation,
    };

    if (config.apiKey.trim()) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return {
        success: false,
        error: `Gateway request failed: ${response.statusText}${errorText ? ` — ${errorText.slice(0, 200)}` : ''}`,
        statusCode: response.status,
        costMetadata: tryParseCostHeader(response),
      };
    }

    const data = (await response.json()) as T;

    return {
      success: true,
      data,
      statusCode: response.status,
      costMetadata: tryParseCostHeader(response),
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: `Gateway request timed out after ${timeoutMs}ms`,
        statusCode: 408,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gateway request failed',
      statusCode: 502,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Route a text completion/parsing request through the gateway
 */
export async function gatewayCompletion(
  messages: Array<{ role: string; content: string }>,
  options: SluiceRequestOptions = {}
): Promise<SluiceResponse> {
  return gatewayPost(
    '/v1/responses',
    {
      model: options.model || 'gpt-4',
      messages,
    },
    options
  );
}

/**
 * Route an embedding request through the gateway
 */
export async function gatewayEmbedding(
  input: string,
  options: SluiceRequestOptions = {}
): Promise<SluiceResponse<{ data: Array<{ embedding: number[] }> }>> {
  return gatewayPost(
    '/v1/embeddings',
    {
      model: options.model || 'text-embedding-ada-002',
      input,
    },
    options
  );
}

/**
 * Try to extract cost metadata from gateway response headers
 */
function tryParseCostHeader(response: Response): SluiceResponse['costMetadata'] {
  try {
    const model = response.headers.get('x-sluice-model') || '';
    const tokens = response.headers.get('x-sluice-tokens');
    const cost = response.headers.get('x-sluice-cost');

    if (!model) return undefined;

    return {
      model,
      tokensUsed: tokens ? parseInt(tokens, 10) : undefined,
      estimatedCost: cost ? parseFloat(cost) : undefined,
    };
  } catch {
    return undefined;
  }
}
