import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { ApiError, ok, err } from '@/lib/errors';

export function withErrorBoundary<T>(handler: () => Promise<NextResponse<T>>) {
  return async (): Promise<NextResponse> => {
    try {
      return await handler();
    } catch (e) {
      if (e instanceof ApiError) {
        return NextResponse.json(err(e.code, e.message, e.fields), { status: e.statusCode });
      }
      if (e instanceof ZodError) {
        const fields: Record<string, string> = {};
        e.errors.forEach(err => {
          const path = err.path.join('.');
          fields[path] = err.message;
        });
        return NextResponse.json(err('VALIDATION_ERROR', 'Input tidak valid', fields), { status: 422 });
      }
      console.error('[api] Unhandled error:', e);
      return NextResponse.json(err('INTERNAL_ERROR', 'Terjadi kesalahan internal'), { status: 500 });
    }
  };
}

export { ok, err };
