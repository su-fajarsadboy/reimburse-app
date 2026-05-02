import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { z } from './zod-init';
import { TransactionInput } from './transaction';

export function buildOpenApiSpec() {
  const registry = new OpenAPIRegistry();

  registry.register('TransactionInput', TransactionInput.openapi('TransactionInput'));

  registry.registerPath({
    method: 'post',
    path: '/api/v1/transactions',
    description: 'Submit transaksi baru ke trip yang terkait dengan API key.',
    summary: 'Create transaction',
    security: [{ bearer: [] }],
    request: {
      headers: z.object({
        'idempotency-key': z.string().uuid().openapi({ description: 'UUID v4 wajib untuk POST' }),
      }),
      body: { content: { 'application/json': { schema: TransactionInput } } },
    },
    responses: {
      201: {
        description: 'Created',
        content: { 'application/json': { schema: z.object({ success: z.literal(true), data: z.object({ id: z.string() }) }) } },
      },
      400: { description: 'Idempotency-Key missing or invalid' },
      401: { description: 'Invalid auth' },
      403: { description: 'Trip closed' },
      409: { description: 'Idempotency reuse with different body' },
      422: { description: 'Validation error' },
      429: { description: 'Rate limited' },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/v1/participants',
    description: 'List peserta trip',
    security: [{ bearer: [] }],
    responses: {
      200: { description: 'OK', content: { 'application/json': { schema: z.object({ success: z.literal(true), data: z.array(z.object({ id: z.string(), name: z.string() })) }) } } },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/v1/categories',
    description: 'List kategori valid',
    security: [{ bearer: [] }],
    responses: { 200: { description: 'OK' } },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/v1/trips/me',
    description: 'Info trip yang terkait API key',
    security: [{ bearer: [] }],
    responses: { 200: { description: 'OK' } },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/v1/receipts',
    description: 'Upload foto struk (multipart)',
    security: [{ bearer: [] }],
    request: { body: { content: { 'multipart/form-data': { schema: z.object({ file: z.string().openapi({ format: 'binary' }) }) } } } },
    responses: { 201: { description: 'Uploaded' } },
  });

  const generator = new OpenApiGeneratorV31(registry.definitions);
  const spec = generator.generateDocument({
    openapi: '3.1.0',
    info: { title: 'Camping Expense Tracker API', version: '1.0.0', description: 'API untuk integrasi agentic AI (mis. OpenCLAW).' },
    servers: [{ url: process.env.NEXTAUTH_URL ?? 'http://localhost:3000' }],
  });

  // Add bearer scheme
  (spec as { components?: { securitySchemes?: Record<string, unknown> } }).components ??= {};
  (spec as { components: { securitySchemes?: Record<string, unknown> } }).components.securitySchemes = {
    bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'ctx_live_*' },
  };

  return spec;
}
