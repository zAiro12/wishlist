import type { VercelRequest, VercelResponse } from '@vercel/node'
import loginHandler from './auth/login'
import logoutHandler from './auth/logout'
import callbackHandler from './auth/callback'
import meHandler from './users/me'
import groupsHandler from './groups/index'
import groupHandler from './groups/[groupId]'
import membersHandler from './groups/[groupId]/members'
import nextCelebratedHandler from './groups/[groupId]/next-celebrated'
import transferHandler from './groups/[groupId]/transfer'
import wishlistsInGroupHandler from './groups/[groupId]/wishlists'
import wishlistHandler from './wishlist/index'
import wishlistItemHandler from './wishlist/[itemId]'
import wishlistStatusHandler from './wishlist-status/[itemId]'
import adminUsersHandler from './admin/users'
import adminGroupsHandler from './admin/groups'
import adminAuditHandler from './admin/audit'
import adminWishlistsHandler from './admin/wishlists'

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
