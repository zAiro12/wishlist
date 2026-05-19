import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { PushSubscription as WebPushSubscription } from 'web-push';
import webpush from 'web-push';
import { z } from 'zod';
import { requireAuth, type AuthedRequest } from '../lib/auth-middleware';
import { setCors } from '../lib/cors';
import { prisma } from '../lib/prisma';

type PushPayload = Record<string, unknown>;

const SubscribeBodySchema = z.object({
  userId: z.string().optional(),
  subscription: z.object({
    endpoint: z.string().trim().min(1),
    keys: z.object({
      p256dh: z.string().trim().min(1),
      auth: z.string().trim().min(1),
    }),
  }),
});

const UnsubscribeBodySchema = z
  .object({
    userId: z.string().optional(),
    endpoint: z.string().trim().min(1).optional(),
    subscription: z
      .object({
        endpoint: z.string().trim().min(1).optional(),
      })
      .optional(),
  })
  .refine((body) => Boolean(body.endpoint || body.subscription?.endpoint), {
    message: 'Endpoint required',
  });

const SendBodySchema = z.object({
  userId: z.string().trim().min(1),
  payload: z.record(z.unknown()).optional(),
});

let vapidConfigured = false;
let vapidMissingWarned = false;

function parsePathname(url: string | undefined): string {
  try {
    return new URL(url ?? '/', 'http://localhost').pathname;
  } catch {
    return '/';
  }
}

function ensureVapidConfigured(): void {
  if (vapidConfigured) return;

  const mailto = process.env.VAPID_MAILTO;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!mailto || !publicKey || !privateKey) {
    throw new Error('Missing VAPID configuration');
  }

  webpush.setVapidDetails(mailto, publicKey, privateKey);
  vapidConfigured = true;
}

function toWebPushSubscription(endpoint: string, p256dh: string, auth: string): WebPushSubscription {
  return {
    endpoint,
    keys: {
      p256dh,
      auth,
    },
  };
}

function isExpiredSubscriptionError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const maybeStatusCode = (err as { statusCode?: unknown }).statusCode;
  return maybeStatusCode === 404 || maybeStatusCode === 410;
}

export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_MAILTO) {
    if (!vapidMissingWarned) {
      console.warn('Push notifications disabled: missing VAPID configuration');
      vapidMissingWarned = true;
    }
    return;
  }

  const targetUserIds = Array.from(new Set(userIds.map((userId) => userId.trim()).filter((userId) => userId.length > 0)));
  if (targetUserIds.length === 0) return;

  ensureVapidConfigured();

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: targetUserIds } },
  });

  const expiredEndpoints = (
    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            toWebPushSubscription(subscription.endpoint, subscription.p256dh, subscription.auth),
            JSON.stringify(payload)
          );
          return null;
        } catch (err) {
          if (isExpiredSubscriptionError(err)) {
            return subscription.endpoint;
          }
          console.error('Push send failed', err);
          return null;
        }
      })
    )
  ).filter((endpoint): endpoint is string => endpoint !== null);

  if (expiredEndpoints.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: { in: expiredEndpoints } },
    });
  }
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  await sendPushToUsers([userId], payload);
}

async function handleSubscribe(req: AuthedRequest, res: VercelResponse): Promise<void> {
  const parsedBody = SubscribeBodySchema.safeParse(req.body ?? {});
  if (!parsedBody.success) {
    res.status(400).json({ error: 'Invalid subscription payload' });
    return;
  }

  const body = parsedBody.data;
  const userId = req.user.userId;

  if (body.userId && body.userId !== userId) {
    res.status(403).json({ error: 'Cannot subscribe for another user' });
    return;
  }

  const endpoint = body.subscription.endpoint;
  const p256dh = body.subscription.keys.p256dh;
  const auth = body.subscription.keys.auth;

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId, p256dh, auth },
    create: { userId, endpoint, p256dh, auth },
  });

  res.status(200).json({ ok: true });
}

async function handleUnsubscribe(req: AuthedRequest, res: VercelResponse): Promise<void> {
  const parsedBody = UnsubscribeBodySchema.safeParse(req.body ?? {});
  if (!parsedBody.success) {
    res.status(400).json({ error: 'Endpoint required' });
    return;
  }

  const body = parsedBody.data;
  const userId = req.user.userId;

  if (body.userId && body.userId !== userId) {
    res.status(403).json({ error: 'Cannot unsubscribe for another user' });
    return;
  }

  const endpoint = body.endpoint ?? body.subscription?.endpoint;
  if (!endpoint) {
    res.status(400).json({ error: 'Endpoint required' });
    return;
  }

  await prisma.pushSubscription.deleteMany({
    where: { userId, endpoint },
  });

  res.status(200).json({ ok: true });
}

async function handleSend(req: AuthedRequest, res: VercelResponse): Promise<void> {
  if (req.user.dbUser.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const parsedBody = SendBodySchema.safeParse(req.body ?? {});
  if (!parsedBody.success) {
    res.status(400).json({ error: 'userId required' });
    return;
  }

  const body = parsedBody.data;

  await sendPushToUser(body.userId, body.payload ?? {});
  res.status(200).json({ ok: true });
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (setCors(req, res)) return;

  const pathname = parsePathname(req.url);

  if (req.method === 'GET' && pathname.endsWith('/push/vapid-public-key')) {
    res.status(200).json({ publicKey: process.env.VAPID_PUBLIC_KEY ?? '' });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  await requireAuth(req, res, async (authedReq: AuthedRequest, authedRes: VercelResponse) => {
    if (pathname.endsWith('/push/subscribe')) {
      await handleSubscribe(authedReq, authedRes);
      return;
    }

    if (pathname.endsWith('/push/unsubscribe')) {
      await handleUnsubscribe(authedReq, authedRes);
      return;
    }

    if (pathname.endsWith('/push/send')) {
      await handleSend(authedReq, authedRes);
      return;
    }

    authedRes.status(404).json({ error: 'Not found' });
  });
}
