import { isConfigured, supabase } from '../../../../lib/supabase';

const SLUG_PATTERN = /^[a-z0-9-]{1,100}$/i;
const QR_CODE_PATTERN = /^[0-9a-f]{32}$/i;
const LINK_KEY_PATTERN = /^(?:[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}|business-(?:website|directions|phone|email))$/i;

export async function POST(request) {
  if (!isConfigured()) return new Response('Analytics is not configured.', { status: 503 });
  if (Number(request.headers.get('content-length') || 0) > 2048) {
    return new Response('Request is too large.', { status: 413 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return new Response('Invalid JSON.', { status: 400 });
  }

  const { slug, qrCode, linkKey } = payload ?? {};
  if (
    typeof slug !== 'string' || !SLUG_PATTERN.test(slug) ||
    typeof qrCode !== 'string' || !QR_CODE_PATTERN.test(qrCode) ||
    typeof linkKey !== 'string' || !LINK_KEY_PATTERN.test(linkKey)
  ) {
    return new Response('Invalid analytics event.', { status: 400 });
  }

  const client = await supabase();
  const { error } = await client.rpc('track_public_qr_action', {
    p_slug: slug,
    p_qr_code: qrCode,
    p_link_key: linkKey,
  });
  if (error) {
    console.error('Public QR action tracking failed:', error);
    return new Response('Could not record this action.', { status: 500 });
  }

  return new Response(null, { status: 204 });
}
