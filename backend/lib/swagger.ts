import { OpenAPIV3 } from 'openapi-types'

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173'
const BASE_URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.API_BASE_URL ?? 'https://wishlist.vercel.app'

export const openApiSpec: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: {
    title: 'Wishlist API',
    version: '1.0.0',
    description: 'API for the Wishlist application',
  },
  servers: [
    { url: BASE_URL, description: 'Production' },
    { url: 'http://localhost:3000', description: 'Local (dev)' },
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
