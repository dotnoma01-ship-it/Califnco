import 'dotenv/config';
import path from 'node:path';
import express, { type Request } from 'express';
import {
  createFirebaseAdminServices,
  createRazorpayHttpHandlers,
  loadDefaultProjectIdentifiers,
  type RazorpayRuntimeSecrets,
} from './src/server/razorpayCore.ts';

function readRuntimeSecrets(): RazorpayRuntimeSecrets {
  const { projectId, firestoreDatabaseId } = loadDefaultProjectIdentifiers();
  const activeGcpProject = (process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || '').trim();

  return {
    razorpayKeyId: (process.env.RAZORPAY_KEY_ID || '').trim(),
    razorpayKeySecret: (process.env.RAZORPAY_KEY_SECRET || '').trim(),
    razorpayWebhookSecret: (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim(),
    firebaseProjectId: projectId,
    firestoreDatabaseId,
    firebaseServiceAccountJson: (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim() || undefined,
    // Only use ambient Application Default Credentials when running inside the target Firebase project itself
    allowAmbientAdminCredentials: Boolean(activeGcpProject && activeGcpProject === projectId),
  };
}

export async function createServer() {
  const app = express();
  app.disable('x-powered-by');

  // Allow cross-origin calls from Vercel / mobile web preview while blocking credential reflection wildcards
  app.use('/api', (req, res, next) => {
    const origin = req.headers.origin;
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Authorization, Content-Type, X-Razorpay-Signature, X-Razorpay-Event-Id'
    );
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  let cachedServicesKey = '';
  let cachedServices: ReturnType<typeof createFirebaseAdminServices> | null = null;

  function resolveAdminServices() {
    const secrets = readRuntimeSecrets();
    const fingerprint = `${secrets.firebaseProjectId}|${secrets.firestoreDatabaseId}|${Boolean(
      secrets.firebaseServiceAccountJson
    )}|${Boolean(secrets.allowAmbientAdminCredentials)}`;
    if (!cachedServices || cachedServicesKey !== fingerprint) {
      cachedServices = createFirebaseAdminServices(secrets);
      cachedServicesKey = fingerprint;
    }
    return cachedServices;
  }

  const handlers = createRazorpayHttpHandlers({
    getSecrets: readRuntimeSecrets,
    verifyBearerToken: (token) => resolveAdminServices().verifyBearerToken(token),
    getStore: () => resolveAdminServices().store,
  });

  // CRITICAL: Webhook route MUST parse raw Buffer BEFORE express.json() so HMAC-SHA256 matches exact bytes
  app.post(
    '/api/payments/razorpay/webhook',
    express.raw({ type: '*/*', limit: '256kb' }),
    (req: Request & { rawBody?: Buffer }, res) => {
      if (Buffer.isBuffer(req.body)) {
        req.rawBody = req.body;
      }
      return handlers.handleWebhook(req, res);
    }
  );

  // Standard JSON API routes
  const jsonParser = express.json({ limit: '64kb' });
  app.get('/api/payments/razorpay/config-status', handlers.configStatus);
  app.post('/api/payments/razorpay/create-order', jsonParser, (req, res) =>
    handlers.createOrder(req, res)
  );
  app.post('/api/payments/razorpay/verify-payment', jsonParser, (req, res) =>
    handlers.verifyPayment(req, res)
  );

  // Unknown /api routes return structured JSON 404 instead of SPA HTML
  app.use('/api', (_req, res) => {
    res.status(404).json({
      error: 'not_found',
      message: 'API route not found.',
    });
  });

  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

const isMainModule =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(process.cwd(), 'server.ts');

if (isMainModule) {
  const port = Number(process.env.PORT || 3000);
  createServer()
    .then((app) => {
      app.listen(port, '0.0.0.0', () => {
        console.log(`Califnco full-stack server listening on http://0.0.0.0:${port}`);
      });
    })
    .catch((err) => {
      console.error('Failed to start Califnco server:', err);
      process.exit(1);
    });
}
