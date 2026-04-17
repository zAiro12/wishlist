import { OpenAPIV3 } from 'openapi-types'

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173'
const BASE_URL = process.env.API_URL ?? 'http://localhost:3000'

export const openApiSpec: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: { title: 'Wishlist API', version: '1.0.0' },
  servers: [{ url: BASE_URL }, { url: FRONTEND_URL }],
  components: {
    securitySchemes: { cookieAuth: { type: 'apiKey', in: 'cookie', name: 'auth_token' } },
    schemas: {
      User: { type: 'object', properties: { id: { type: 'string' }, email: { type: 'string' } } },
      WishlistItem: { type: 'object', properties: { id: { type: 'string' }, title: { type: 'string' } } },
      BirthdateRequest: { type: 'object', properties: { birthdate: { type: 'string' } }, required: ['birthdate'] },
      BirthdateResponse: { type: 'object', properties: { birthdate: { type: 'string' } } },
      ErrorResponse: { type: 'object', properties: { error: { type: 'string' } } },
    },
  },
  paths: {
    '/api/users/me/birthdate': {
      patch: {
        summary: "Update current user's birthdate",
        security: [{ cookieAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/BirthdateRequest' } } } },
        responses: { '200': { description: 'Updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/BirthdateResponse' } } } }, '400': { description: 'Bad Request' } },
      },
    },
    '/api/wishlist': {
      get: { summary: 'List wishlist items', responses: { '200': { description: 'OK' } } },
      post: { summary: 'Create wishlist item', responses: { '201': { description: 'Created' } } },
    },
    '/api/wishlist/{itemId}': {
      parameters: [{ name: 'itemId', in: 'path', required: true, schema: { type: 'string' } }],
      patch: { summary: 'Update item', responses: { '200': { description: 'OK' } } },
      delete: { summary: 'Delete item', responses: { '200': { description: 'Deleted' } } },
    },
  },
}

export function getOpenApiSpec() {
  return openApiSpec
}

export function getSwaggerHtml(specUrl = '/api/openapi.json') {
  const css = 'https://unpkg.com/swagger-ui-dist/swagger-ui.css'
  const bundle = 'https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js'
  const preset = 'https://unpkg.com/swagger-ui-dist/swagger-ui-standalone-preset.js'
  return `<!doctype html>` +
    `<html><head><meta charset="utf-8"/><link rel="stylesheet" href="${css}"/></head><body>` +
    `<div id="swagger-ui"></div><script src="${bundle}"></script><script src="${preset}"></script>` +
    `<script>window.onload=function(){SwaggerUIBundle({url:'${specUrl}',dom_id:'#swagger-ui',presets:[SwaggerUIBundle.presets.apis,SwaggerUIStandalonePreset]})}</script>` +
    `</body></html>`
}
