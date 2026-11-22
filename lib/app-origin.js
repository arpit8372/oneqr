export function getAppOrigin() {
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  const configuredOrigin = process.env.APP_ORIGIN || (vercelHost ? `https://${vercelHost}` : null);
  if (!configuredOrigin) throw new Error('APP_ORIGIN must be configured before generating QR codes.');
  const parsed = new URL(configuredOrigin);
  if (!['http:', 'https:'].includes(parsed.protocol)
    || parsed.username
    || parsed.password
    || parsed.pathname !== '/'
    || parsed.search
    || parsed.hash) {
    throw new Error('APP_ORIGIN must be an absolute HTTP(S) origin without a path.');
  }
  if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
    throw new Error('APP_ORIGIN must use HTTPS in production.');
  }
  return parsed.origin;
}
