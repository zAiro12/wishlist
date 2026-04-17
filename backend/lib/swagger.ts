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
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string' },
          emailVerified: { type: 'boolean' },
          givenName: { type: 'string', nullable: true },
          familyName: { type: 'string', nullable: true },
          birthdate: { type: 'string', nullable: true, description: 'YYYY-MM-DD' },
          birthdateConfirmed: { type: 'boolean' },
          role: { type: 'string' },
          status: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Group: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          ownerId: { type: 'string' },
          memberCount: { type: 'integer' },
          deletedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      GroupMember: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          groupId: { type: 'string' },
          userId: { type: 'string' },
          joinedAt: { type: 'string', format: 'date-time' },
          removedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      WishlistItem: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          url: { type: 'string', nullable: true },
          price: { type: 'number', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          ownerId: { type: 'string' },
        },
      },
      BirthdateRequest: {
        type: 'object',
        properties: { birthdate: { type: 'string', description: 'YYYY-MM-DD' } },
        required: ['birthdate'],
      },
      BirthdateResponse: {
        type: 'object',
        properties: { birthdate: { type: 'string' } },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          issues: { type: 'array', items: { type: 'object' }, nullable: true },
        },
      },
    },
  },
  paths: {
    '/api/users/me/birthdate': {
      patch: {
        summary: "Update current user's birthdate",
        security: [{ cookieAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { birthdate: { type: 'string', description: 'YYYY-MM-DD' } }, required: ['birthdate'] } } } },
        responses: { '200': { description: 'Updated birthdate', content: { 'application/json': { schema: { type: 'object', properties: { birthdate: { type: 'string' } } } } } }, '400': { description: 'Validation failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }, '401': { description: 'Unauthorized' } },
      },
    },
    '/api/users/me': {
      get: {
        summary: 'Get current user profile',
        security: [{ cookieAuth: [] }],
        responses: { '200': { description: 'User profile', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } }, '401': { description: 'Unauthorized' } },
      },
      patch: {
        summary: 'Update current user profile (name, family name, birthdate)',
        security: [{ cookieAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { givenName: { type: 'string' }, familyName: { type: 'string' }, birthdate: { type: 'string', description: 'YYYY-MM-DD' } } } } } },
        responses: { '200': { description: 'Updated user', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } }, '400': { description: 'Validation failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }, '401': { description: 'Unauthorized' } },
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
      get: { summary: 'List groups', security: [{ cookieAuth: [] }], responses: { '200': { description: 'Array of groups', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Group' } } } } } } },
      post: { summary: 'Create group', security: [{ cookieAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' } }, required: ['name'] } } } }, responses: { '201': { description: 'Group created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Group' } } } }, '400': { description: 'Validation failed' } } },
    },
    '/api/wishlist': {
      get: { summary: 'List wishlist items', responses: { '200': { description: 'Array of items' } } },
      post: { summary: 'Create wishlist item', responses: { '201': { description: 'Item created' } } },
    },
    '/api/groups/{groupId}': {
      parameters: [{ name: 'groupId', in: 'path', required: true, schema: { type: 'string' } }],
      get: { summary: 'Get group detail', security: [{ cookieAuth: [] }], responses: { '200': { description: 'Group detail', content: { 'application/json': { schema: { $ref: '#/components/schemas/Group' } } } }, '404': { description: 'Group not found' } } },
      patch: { summary: 'Update group', security: [{ cookieAuth: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' } } } } } }, responses: { '200': { description: 'Updated group' } } },
      delete: { summary: 'Delete group', security: [{ cookieAuth: [] }], responses: { '200': { description: 'Group deleted' } } },
    },
    '/api/groups/{groupId}/join': {
      parameters: [{ name: 'groupId', in: 'path', required: true, schema: { type: 'string' } }],
      post: { summary: 'Join group (create membership)', security: [{ cookieAuth: [] }], responses: { '201': { description: 'Membership created' }, '200': { description: 'Membership reactivated' }, '401': { description: 'Unauthorized' } } },
    },
    '/api/groups/{groupId}/invite-preview': {
      parameters: [{ name: 'groupId', in: 'path', required: true, schema: { type: 'string' } }],
      get: { summary: 'Get invite preview for group', responses: { '200': { description: 'Invite preview' } } },
    },
    '/api/groups/{groupId}/members': {
      parameters: [{ name: 'groupId', in: 'path', required: true, schema: { type: 'string' } }],
      get: { summary: 'List group members', security: [{ cookieAuth: [] }], responses: { '200': { description: 'Array of members', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/GroupMember' } } } } } } },
      post: { summary: 'Join group (members endpoint)', security: [{ cookieAuth: [] }], responses: { '201': { description: 'Joined' } } },
      delete: { summary: 'Leave group', security: [{ cookieAuth: [] }], responses: { '200': { description: 'Left group' } } },
    },
    '/api/groups/{groupId}/members?userId={userId}': {
      parameters: [{ name: 'groupId', in: 'path', required: true, schema: { type: 'string' } }, { name: 'userId', in: 'query', required: true, schema: { type: 'string' } }],
      delete: { summary: 'Remove member from group (owner only)', security: [{ cookieAuth: [] }], responses: { '200': { description: 'Member removed' } } },
    },
    '/api/groups/{groupId}/transfer': {
      parameters: [{ name: 'groupId', in: 'path', required: true, schema: { type: 'string' } }],
      post: { summary: 'Transfer group ownership', security: [{ cookieAuth: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { newOwnerId: { type: 'string' } }, required: ['newOwnerId'] } } } }, responses: { '200': { description: 'Ownership transferred' } } },
    },
    '/api/groups/{groupId}/wishlists': {
      parameters: [{ name: 'groupId', in: 'path', required: true, schema: { type: 'string' } }],
      get: { summary: 'Get wishlists for group', security: [{ cookieAuth: [] }], responses: { '200': { description: 'Array of wishlist items' } } },
    },
    '/api/groups/{groupId}/next-celebrated': {
      parameters: [{ name: 'groupId', in: 'path', required: true, schema: { type: 'string' } }],
      get: { summary: 'Get next celebrated users for a group', security: [{ cookieAuth: [] }], responses: { '200': { description: 'Next celebrated payload' } } },
    },
    '/api/wishlist': {
      get: { summary: 'List wishlist items', responses: { '200': { description: 'Array of items', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/WishlistItem' } } } } } } },
      post: { summary: 'Create wishlist item', security: [{ cookieAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/WishlistItem' } } } }, responses: { '201': { description: 'Item created', content: { 'application/json': { schema: { $ref: '#/components/schemas/WishlistItem' } } } }, '400': { description: 'Validation failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } } },
    },
    '/api/wishlist/{itemId}': {
      parameters: [{ name: 'itemId', in: 'path', required: true, schema: { type: 'string' } }],
      patch: { summary: 'Update item', security: [{ cookieAuth: [] }], requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/WishlistItem' } } } }, responses: { '200': { description: 'Updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/WishlistItem' } } } }, '400': { description: 'Validation failed' } } },
      delete: { summary: 'Delete item', security: [{ cookieAuth: [] }], responses: { '200': { description: 'Deleted' } } },
    },
    '/api/wishlist-status/{itemId}': {
      parameters: [{ name: 'itemId', in: 'path', required: true, schema: { type: 'string' } }],
      put: { summary: 'Set item status', security: [{ cookieAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' } }, required: ['status'] } } } }, responses: { '200': { description: 'Status set' } } },
      delete: { summary: 'Clear status', security: [{ cookieAuth: [] }], responses: { '200': { description: 'Status cleared' } } },
    },
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
