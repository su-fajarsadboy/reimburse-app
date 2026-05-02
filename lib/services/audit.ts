import { getAdminClient } from '@/lib/db/client';

export async function logRequest(params: {
  apiKeyId: string | null;
  endpoint: string;
  method: string;
  statusCode: number;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  const sb = getAdminClient();
  // Fire-and-forget; do not block request on audit write failure
  await sb.from('audit_logs').insert({
    api_key_id: params.apiKeyId,
    endpoint: params.endpoint,
    method: params.method,
    status_code: params.statusCode,
    ip: params.ip ?? null,
    user_agent: params.userAgent ?? null,
  });
}

export function extractRequestMeta(req: Request): { ip: string | null; userAgent: string | null } {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    null;
  const ua = req.headers.get('user-agent') ?? null;
  return { ip, userAgent: ua };
}
