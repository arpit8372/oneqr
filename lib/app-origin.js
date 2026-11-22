export function getAppOrigin() {
  const configuredOrigin = process.env.APP_ORIGIN;
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
