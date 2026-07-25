import { z } from 'zod';
import { decryptSecret, encryptSecret } from './crypto';

const flowPayloadSchema = z.object({
  state: z.string().min(32).max(500),
  verifier: z.string().min(43).max(128),
  userId: z.string().min(1),
  expiresAt: z.number().int().positive(),
});

export type XOAuthFlowPayload = z.infer<typeof flowPayloadSchema>;

export function sealXOAuthFlow(payload: XOAuthFlowPayload): string {
  return encryptSecret(JSON.stringify(flowPayloadSchema.parse(payload)), 'x-oauth-flow');
}

export function openXOAuthFlow(value: string): XOAuthFlowPayload | null {
  try {
    const payload = flowPayloadSchema.parse(JSON.parse(decryptSecret(value, 'x-oauth-flow')));
    return payload.expiresAt > Date.now() ? payload : null;
  } catch {
    return null;
  }
}
