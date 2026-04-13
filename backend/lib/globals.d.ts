declare module 'cors' {
  import type { RequestHandler } from 'express';
  const cors: any;
  export default cors;
}

declare module 'express-rate-limit' {
  const rl: any;
  export default rl;
}
