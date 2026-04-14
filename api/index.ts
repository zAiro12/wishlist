import type { VercelRequest, VercelResponse } from '@vercel/node'

// Defensive check: log any missing required environment variables (names only)
const REQUIRED_ENV = [
	'DATABASE_URL', 
	'JWT_SECRET',
	'GOOGLE_CLIENT_ID',
	'GOOGLE_CLIENT_SECRET',
	'GITHUB_CLIENT_ID',
	'GITHUB_CLIENT_SECRET',
	'MICROSOFT_CLIENT_ID',
	'MICROSOFT_CLIENT_SECRET',
	'ALLOWED_ORIGINS', 
	'FRONTEND_URL',
	'NODE_ENV',
]
const missingEnv = REQUIRED_ENV.filter((k) => !process.env[k])
if (missingEnv.length) {
	// don't print values
	// use warn so it appears in function logs
	console.warn('Missing ENV VARS:', missingEnv.join(','))
}
import loginHandler from '../backend/handlers/auth/login'
import logoutHandler from '../backend/handlers/auth/logout'
import callbackHandler from '../backend/handlers/auth/callback'
import meHandler from '../backend/handlers/users/me'
import groupsHandler from '../backend/handlers/groups/index'
import groupHandler from '../backend/handlers/groups/[groupId]'
import membersHandler from '../backend/handlers/groups/[groupId]/members'
import nextCelebratedHandler from '../backend/handlers/groups/[groupId]/next-celebrated'
import transferHandler from '../backend/handlers/groups/[groupId]/transfer'
import wishlistsInGroupHandler from '../backend/handlers/groups/[groupId]/wishlists'
import wishlistHandler from '../backend/handlers/wishlist/index'
import wishlistItemHandler from '../backend/handlers/wishlist/[itemId]'
import wishlistStatusHandler from '../backend/handlers/wishlist-status/[itemId]'
import adminUsersHandler from '../backend/handlers/admin/users'
import adminGroupsHandler from '../backend/handlers/admin/groups'
import adminAuditHandler from '../backend/handlers/admin/audit'
import adminWishlistsHandler from '../backend/handlers/admin/wishlists'
import { getOpenApiSpec, getSwaggerHtml } from '../backend/lib/swagger'
import swaggerUi from 'swagger-ui-express'

type Handler = (req: VercelRequest, res: VercelResponse) => void | Promise<void>

function logRequest(req: VercelRequest) {
	try {
		const method = req.method || 'GET'
		const rawUrl = req.url || ''
		console.info(`[api] ${method} ${rawUrl}`)
	} catch (e) {
		// best-effort logging, never throw
	}
}

function match(url: string, pattern: string): Record<string,string> | null {
	const urlParts = url.split('/').filter(Boolean)
	const patParts = pattern.split('/').filter(Boolean)
	if (urlParts.length !== patParts.length) return null
	const params: Record<string,string> = {}
	for (let i = 0; i < patParts.length; i++) {
		if (patParts[i].startsWith(':')) {
			params[patParts[i].slice(1)] = urlParts[i]
		} else if (patParts[i] !== urlParts[i]) {
			return null
		}
	}
	return params
}

const routes: { pattern: string; handler: Handler }[] = [
	{ pattern: '/api/auth/login',                        handler: loginHandler },
	{ pattern: '/api/auth/logout',                       handler: logoutHandler },
	{ pattern: '/api/auth/callback',                     handler: callbackHandler },

	{ pattern: '/api/users/me',                          handler: meHandler },

	{ pattern: '/api/groups',                            handler: groupsHandler },
	{ pattern: '/api/groups/:groupId',                   handler: groupHandler },
	{ pattern: '/api/groups/:groupId/members',           handler: membersHandler },
	{ pattern: '/api/groups/:groupId/next-celebrated',   handler: nextCelebratedHandler },
	{ pattern: '/api/groups/:groupId/transfer',          handler: transferHandler },
	{ pattern: '/api/groups/:groupId/wishlists',         handler: wishlistsInGroupHandler },

	{ pattern: '/api/wishlist',                          handler: wishlistHandler },
	{ pattern: '/api/wishlist/:itemId',                  handler: wishlistItemHandler },
	{ pattern: '/api/wishlist-status/:itemId',           handler: wishlistStatusHandler },

	{ pattern: '/api/admin/users',                       handler: adminUsersHandler },
	{ pattern: '/api/admin/groups',                      handler: adminGroupsHandler },
	{ pattern: '/api/admin/audit',                       handler: adminAuditHandler },
	{ pattern: '/api/admin/wishlists',                   handler: adminWishlistsHandler }
]

export default async function handler(req: VercelRequest, res: VercelResponse) {
	logRequest(req)

	function setCorsHeaders() {
		// Keep values minimal and non-sensitive
		res.setHeader('Access-Control-Allow-Origin', '*')
		res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
	}

	// Always set CORS headers for every response
	setCorsHeaders()

	// Handle preflight OPTIONS requests centrally
	if ((req.method || 'GET').toUpperCase() === 'OPTIONS') {
		// respond with no content; headers already set
		res.status(204).send('')
		return
	}
	try {
		console.log('api/index.ts HIT')
		// Expose OpenAPI JSON and Swagger UI (renamed to /api-docs)
		const rawUrl = req.url || ''
		const path = rawUrl.split('?')[0] || '/'
		if (path === '/api/openapi.json' || path.startsWith('/api/openapi.json')) {
			const spec = getOpenApiSpec()
			res.setHeader('Content-Type', 'application/json')
			res.status(200).send(JSON.stringify(spec))
			return
		}
				if (path === '/api-docs' || path.startsWith('/api-docs')) {
					// Serve Swagger UI HTML that loads assets from CDN (unpkg)
					const spec = getOpenApiSpec()
					const html = getSwaggerHtml('/api/openapi.json')
					res.status(200).send(html)
					return
				}

				// API root welcome page (also handle /api and /api/)
				if ((path === '/' || path === '/api' || path === '/api/') && req.method === 'GET') {
						const now = new Date().toISOString()
						const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Wishlist API</title></head>
<body style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:40px;">
	<h1>Wishlist API</h1>
	<p><strong>Status:</strong> online</p>
	<p><strong>Server time:</strong> ${now}</p>
	<h2>Endpoints</h2>
	<ul>
		<li><a href="/api-docs">/api-docs</a></li>
		<li><a href="/api/openapi.json">/api/openapi.json</a></li>
	</ul>
</body>
</html>`
						res.setHeader('Content-Type', 'text/html; charset=utf-8')
						res.status(200).send(html)
						return
				}

		const url = path
		for (const r of routes) {
			const params = match(url, r.pattern)
			if (params) {
				;(req as any).params = params
				try {
					await r.handler(req, res)
				} catch (err) {
					console.error('Handler error for', r.pattern, { message: (err as Error)?.message })
					if (!res.headersSent) {
						res.status(500).json({ error: 'Internal server error' })
					}
				}
				return
			}
		}
		if (!res.headersSent) {
			res.status(404).json({ error: 'Not found' })
		}
	} catch (err) {
		console.error('Top-level handler error', { message: (err as Error)?.message })
		if (!res.headersSent) {
			res.status(500).json({ error: 'Internal server error' })
		}
	}
}
