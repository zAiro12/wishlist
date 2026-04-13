import cors from 'cors';

const ALLOWED = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const IS_PROD = process.env.NODE_ENV === 'production';

if (IS_PROD && ALLOWED.length === 0) {
  throw new Error('ALLOWED_ORIGINS must be configured in production');
}

export function corsMiddleware() {
  const options: any = {
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return cb(null, true); // allow non-browser requests like CURL
      if (ALLOWED.length === 0) return cb(null, true);
      if (ALLOWED.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
  };

  return cors(options);
}

export default corsMiddleware;
