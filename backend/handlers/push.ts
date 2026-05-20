import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { PushSubscription as WebPushSubscription } from 'web-push';
import { randomUUID } from 'crypto';
import webpush from 'web-push';
import { z } from 'zod';
import { requireAuth, type AuthedRequest } from '../lib/auth-middleware';
import { ensureAppSettingTable } from '../lib/app-setting-table';
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

const SendAllBodySchema = z.object({
  payload: z.record(z.unknown()),
  scheduledFor: z.string().datetime().optional(),
});

const ScheduledPushJobSchema = z.object({
  id: z.string().trim().min(1),
  payload: z.record(z.unknown()),
  scheduledFor: z.string().datetime(),
});
const ScheduledPushJobsSchema = z.array(ScheduledPushJobSchema);
const SCHEDULED_PUSH_JOBS_KEY = 'scheduled_push_broadcast_jobs';

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

  const targetUserIds = Array.from(new Set(userIds.map((userId) => userId.trim()).filter(Boolean)));
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

async function sendPushToAllSubscribers(payload: PushPayload): Promise<void> {
  const subscriptions = await prisma.pushSubscription.findMany({
    select: { userId: true },
    distinct: ['userId'],
  });
  const uniqueUserIds = subscriptions.map((subscription) => subscription.userId);
  await sendPushToUsers(uniqueUserIds, payload);
}

async function readScheduledJobs(): Promise<z.infer<typeof ScheduledPushJobsSchema>> {
  await ensureAppSettingTable();
  const raw = await prisma.appSetting.findUnique({
    where: { key: SCHEDULED_PUSH_JOBS_KEY },
    select: { value: true },
  });
  if (!raw?.value) return [];

  try {
    const parsed = JSON.parse(raw.value) as unknown;
    const parsedJobs = ScheduledPushJobsSchema.safeParse(parsed);
    if (!parsedJobs.success) {
      console.error('Invalid scheduled push jobs schema, returning empty list', parsedJobs.error);
      return [];
    }
    return parsedJobs.data;
  } catch (err) {
    console.error('Invalid scheduled push jobs JSON, returning empty scheduled jobs list', err);
    return [];
  }
}

async function writeScheduledJobs(jobs: z.infer<typeof ScheduledPushJobsSchema>): Promise<void> {
  await ensureAppSettingTable();
  if (jobs.length === 0) {
    await prisma.appSetting.deleteMany({ where: { key: SCHEDULED_PUSH_JOBS_KEY } });
    return;
  }

  await prisma.appSetting.upsert({
    where: { key: SCHEDULED_PUSH_JOBS_KEY },
    create: { key: SCHEDULED_PUSH_JOBS_KEY, value: JSON.stringify(jobs) },
    update: { value: JSON.stringify(jobs) },
  });
}

async function flushDueScheduledBroadcasts(): Promise<void> {
  const jobs = await readScheduledJobs();
  if (jobs.length === 0) return;

  const nowTs = Date.now();
  const dueJobs: z.infer<typeof ScheduledPushJobsSchema> = [];
  const pendingJobs: z.infer<typeof ScheduledPushJobsSchema> = [];
  for (const job of jobs) {
    if (Date.parse(job.scheduledFor) <= nowTs) dueJobs.push(job);
    else pendingJobs.push(job);
  }
  if (dueJobs.length === 0) return;

  await writeScheduledJobs(pendingJobs);

  for (const job of dueJobs) {
    try {
      await sendPushToAllSubscribers(job.payload);
    } catch (err) {
      console.error('Scheduled push broadcast failed', { id: job.id, scheduledFor: job.scheduledFor, err });
    }
  }
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

async function handleSendAll(req: AuthedRequest, res: VercelResponse): Promise<void> {
  if (req.user.dbUser.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const parsedBody = SendAllBodySchema.safeParse(req.body ?? {});
  if (!parsedBody.success) {
    res.status(400).json({ error: 'Invalid payload' });
    return;
  }

  const body = parsedBody.data;
  const scheduledAt = body.scheduledFor ? Date.parse(body.scheduledFor) : null;

  if (body.scheduledFor && Number.isNaN(scheduledAt)) {
    res.status(400).json({ error: 'Invalid scheduledFor' });
    return;
  }

  if (scheduledAt !== null && scheduledAt > Date.now()) {
    const job = {
      id: randomUUID(),
      payload: body.payload,
      scheduledFor: new Date(scheduledAt).toISOString(),
    };
    const jobs = await readScheduledJobs();
    jobs.push(job);
    await writeScheduledJobs(jobs);
    res.status(200).json({ ok: true, scheduled: true, id: job.id, scheduledFor: job.scheduledFor });
    return;
  }

  await sendPushToAllSubscribers(body.payload);
  res.status(200).json({ ok: true, scheduled: false });
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (setCors(req, res)) return;

  await flushDueScheduledBroadcasts().catch((err) => {
    console.error('Failed to flush scheduled push broadcasts', err);
  });

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

    if (pathname.endsWith('/push/send-all')) {
      await handleSendAll(authedReq, authedRes);
      return;
    }

    authedRes.status(404).json({ error: 'Not found' });
  });
}
