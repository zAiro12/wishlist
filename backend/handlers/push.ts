import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { PushSubscription as WebPushSubscription } from 'web-push';
import webpush from 'web-push';
import { requireAuth, type AuthedRequest } from '../lib/auth-middleware';
import { setCors } from '../lib/cors';
import { prisma } from '../lib/prisma';

type PushPayload = Record<string, unknown>;

type SubscribeBody = {
  userId?: string;
  subscription?: {
    endpoint?: string;
    keys?: {
      p256dh?: string;
      auth?: string;
    };
  };
};

type UnsubscribeBody = {
  userId?: string;
  endpoint?: string;
  subscription?: {
    endpoint?: string;
  };
};

type SendBody = {
  userId?: string;
  payload?: PushPayload;
};

let vapidConfigured = false;

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

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_MAILTO) {
    return;
  }

  ensureVapidConfigured();

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        toWebPushSubscription(subscription.endpoint, subscription.p256dh, subscription.auth),
        JSON.stringify(payload)
      );
    } catch (err) {
      if (isExpiredSubscriptionError(err)) {
        await prisma.pushSubscription.deleteMany({
          where: { endpoint: subscription.endpoint },
        });
      } else {
        console.error('Push send failed', err);
      }
    }
  }
}

async function handleSubscribe(req: AuthedRequest, res: VercelResponse): Promise<void> {
  const body = (req.body ?? {}) as SubscribeBody;
  const userId = req.user.userId;

  if (body.userId && body.userId !== userId) {
    res.status(403).json({ error: 'Cannot subscribe for another user' });
    return;
  }

  const endpoint = body.subscription?.endpoint;
  const p256dh = body.subscription?.keys?.p256dh;
  const auth = body.subscription?.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    res.status(400).json({ error: 'Invalid subscription payload' });
    return;
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId, p256dh, auth },
    create: { userId, endpoint, p256dh, auth },
  });

  res.status(200).json({ ok: true });
}

async function handleUnsubscribe(req: AuthedRequest, res: VercelResponse): Promise<void> {
  const body = (req.body ?? {}) as UnsubscribeBody;
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
  const body = (req.body ?? {}) as SendBody;
  const userId = body.userId;
  if (!userId) {
    res.status(400).json({ error: 'userId required' });
    return;
  }

  if (req.user.dbUser.role !== 'ADMIN' && userId !== req.user.userId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  await sendPushToUser(userId, body.payload ?? {});
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

