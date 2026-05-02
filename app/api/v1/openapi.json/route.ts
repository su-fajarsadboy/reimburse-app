// app/api/v1/openapi.json/route.ts
import { NextResponse } from 'next/server';
import { buildOpenApiSpec } from '@/lib/validation/openapi';

export async function GET() {
  return NextResponse.json(buildOpenApiSpec());
}
