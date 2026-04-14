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

type Handler = (req: VercelRequest, res: VercelResponse) => void | Promise<void>

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
    console.log('api/index.ts HIT')
	const url = (req.url || '').split('?')[0] || '/'
	for (const r of routes) {
		const params = match(url, r.pattern)
		if (params) {
			// attach params to req for handlers that expect them
			;(req as any).params = params
			try {
				await r.handler(req, res)
			} catch (err) {
				console.error('Handler error for', r.pattern, err)
				res.status(500).json({ error: 'Internal server error' })
			}
			return
		}
	}
	res.status(404).json({ error: 'Not found' })
}
