import { OpenAPIV3 } from 'openapi-types'

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173'
const BASE_URL = process.env.API_URL ?? 'http://localhost:3000'

export const openApiSpec: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: {
    title: 'Wishlist API',
    version: '1.0.0',
    description: 'API for the Wishlist application',
  },
  servers: [
    { url: 'https://wishlist-ten-sigma.vercel.app', description: 'Production' },
    { url: 'http://localhost:3000', description: 'Local development' }
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'auth_token',
        description: 'JWT stored in HttpOnly cookie `auth_token`',
      },
    },
    schemas: {},
  },
  paths: {
    '/api/auth/me': {
      get: {
        summary: 'Get current user profile',
        security: [{ cookieAuth: [] }],
        responses: { '200': { description: 'User profile' }, '401': { description: 'Unauthorized' } },
      },
    },
    '/api/auth/login': {
      post: {
        summary: 'Initiate OAuth login (redirects to provider)',
        parameters: [
          { name: 'provider', in: 'query', schema: { type: 'string' }, required: true },
        ],
        responses: { '302': { description: 'Redirect to provider' } },
      },
    },
    '/api/auth/logout': {
      post: { summary: 'Logout (clear cookie)', responses: { '200': { description: 'Logged out' } } },
    },
    '/api/auth/callback': {
      get: {
        summary: 'OAuth callback',
        parameters: [
          { name: 'provider', in: 'query', schema: { type: 'string' } },
          { name: 'code', in: 'query', schema: { type: 'string' } },
          { name: 'state', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '302': { description: 'Redirect to frontend' } },
      },
    },
    '/api/groups': {
      get: { summary: 'List groups', responses: { '200': { description: 'Array of groups' } } },
      post: { summary: 'Create group', responses: { '201': { description: 'Group created' } } },
    },
    '/api/wishlist': {
      get: { summary: 'List wishlist items', responses: { '200': { description: 'Array of items' } } },
      post: { summary: 'Create wishlist item', responses: { '201': { description: 'Item created' } } },
    },
    '/api/wishlist/{itemId}': {
      parameters: [{ name: 'itemId', in: 'path', required: true, schema: { type: 'string' } }],
      patch: { summary: 'Update item', responses: { '200': { description: 'Updated' } } },
      delete: { summary: 'Delete item', responses: { '200': { description: 'Deleted' } } },
    },
    '/api/wishlist-status/{itemId}': {
      parameters: [{ name: 'itemId', in: 'path', required: true, schema: { type: 'string' } }],
      put: { summary: 'Set item status', responses: { '200': { description: 'Status set' } } },
      delete: { summary: 'Clear status', responses: { '200': { description: 'Status cleared' } } },
    },
  },
}

export function getOpenApiSpec() {
  return openApiSpec
}

export function getSwaggerHtml(specUrl = '/api/openapi.json') {
  // Use CDN-hosted assets to avoid serving local static files on Vercel
  const css = 'https://unpkg.com/swagger-ui-dist/swagger-ui.css'
  const bundle = 'https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js'
  const preset = 'https://unpkg.com/swagger-ui-dist/swagger-ui-standalone-preset.js'

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Wishlist API — Swagger UI</title>
    <link rel="stylesheet" href="${css}" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="${bundle}"></script>
    <script src="${preset}"></script>
    <script>
      window.onload = function() {
        const ui = SwaggerUIBundle({
          url: '${specUrl}',
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
          layout: 'BaseLayout'
        });
        window.ui = ui;
      };
    </script>
  </body>
</html>`
}
