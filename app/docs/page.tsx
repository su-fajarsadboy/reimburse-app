// app/docs/page.tsx
export default function DocsPage() {
  return (
    <html lang="id">
      <head>
        <title>API Reference · Reimburse</title>
        <meta charSet="utf-8" />
      </head>
      <body>
        <script id="api-reference" data-url="/api/v1/openapi.json" />
        <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference" async />
      </body>
    </html>
  );
}
