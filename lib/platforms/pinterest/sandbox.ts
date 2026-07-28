import { z } from 'zod';

export const PINTEREST_SANDBOX_API_URL = 'https://api-sandbox.pinterest.com/v5';
const PINTEREST_SANDBOX_TIMEOUT_MS = 15_000;

const sandboxConfigSchema = z.object({
  accessToken: z.string().trim().min(1),
  boardId: z.string().trim().min(1),
});

const imageUrlSchema = z
  .string()
  .url()
  .refine(value => new URL(value).protocol === 'https:', 'Pinterest media URL must use HTTPS');

const createPinResponseSchema = z.object({
  id: z.string().min(1),
  link: z.string().optional(),
});

const getPinResponseSchema = z.object({
  id: z.string().min(1),
});

export interface PinterestSandboxConfig {
  accessToken: string;
  boardId: string;
}

export interface PinterestSandboxPinInput {
  title: string;
  description: string;
  imageUrl: string;
  link?: string;
}

export interface PinterestSandboxPin {
  id: string;
  link?: string;
}

export class PinterestSandboxApiError extends Error {
  readonly response: { status: number; data?: { message?: string } };

  constructor(status: number, message?: string) {
    super(
      message
        ? `Pinterest Sandbox API error: ${status} - ${message}`
        : `Pinterest Sandbox API error: ${status}`
    );
    this.name = 'PinterestSandboxApiError';
    this.response = { status, data: message ? { message } : undefined };
  }
}

function configuredValue(name: 'PINTEREST_SANDBOX_ACCESS_TOKEN' | 'PINTEREST_SANDBOX_BOARD_ID') {
  return (process.env[name] ?? process.env[`CUSTOMCONNSTR_${name}`])?.trim();
}

export function getPinterestSandboxConfig(): PinterestSandboxConfig {
  return sandboxConfigSchema.parse({
    accessToken: configuredValue('PINTEREST_SANDBOX_ACCESS_TOKEN'),
    boardId: configuredValue('PINTEREST_SANDBOX_BOARD_ID'),
  });
}

export function isPinterestSandboxConfigured(): boolean {
  return sandboxConfigSchema.safeParse({
    accessToken: configuredValue('PINTEREST_SANDBOX_ACCESS_TOKEN'),
    boardId: configuredValue('PINTEREST_SANDBOX_BOARD_ID'),
  }).success;
}

async function providerMessage(response: Response): Promise<string | undefined> {
  const payload = (await response
    .clone()
    .json()
    .catch(() => null)) as { message?: unknown } | null;
  return typeof payload?.message === 'string' ? payload.message : response.statusText || undefined;
}

export class PinterestSandboxClient {
  constructor(
    private readonly config: PinterestSandboxConfig = getPinterestSandboxConfig(),
    private readonly request: typeof fetch = fetch
  ) {}

  async createPin(input: PinterestSandboxPinInput): Promise<PinterestSandboxPin> {
    const imageUrl = imageUrlSchema.parse(input.imageUrl);
    const response = await this.call('/pins', {
      method: 'POST',
      body: JSON.stringify({
        board_id: this.config.boardId,
        title: input.title.slice(0, 100),
        description: input.description.slice(0, 800),
        link: input.link,
        media_source: {
          source_type: 'image_url',
          url: imageUrl,
        },
      }),
    });

    return createPinResponseSchema.parse(await response.json());
  }

  async getPin(pinId: string): Promise<PinterestSandboxPin> {
    const response = await this.call(`/pins/${encodeURIComponent(pinId)}`, { method: 'GET' });
    return getPinResponseSchema.parse(await response.json());
  }

  async deletePin(pinId: string): Promise<void> {
    await this.call(`/pins/${encodeURIComponent(pinId)}`, { method: 'DELETE' });
  }

  private async call(path: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PINTEREST_SANDBOX_TIMEOUT_MS);
    try {
      const response = await this.request(`${PINTEREST_SANDBOX_API_URL}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new PinterestSandboxApiError(response.status, await providerMessage(response));
      }
      return response;
    } finally {
      clearTimeout(timeout);
    }
  }
}
