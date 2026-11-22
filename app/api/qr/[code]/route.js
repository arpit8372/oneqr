import QRCode from 'qrcode';
import { isConfigured, supabase } from '../../../../lib/supabase';
import { getAppOrigin } from '../../../../lib/app-origin';

export async function GET(request, { params }) {
  if (!isConfigured()) return new Response('Supabase is not configured.', { status: 503 });
  const { code } = await params;
  const client = await supabase();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) return new Response('Sign in required.', { status: 401 });

  const { data: qr, error } = await client.from('dynamic_qr_codes')
    .select('code')
    .eq('code', code)
    .maybeSingle();
  if (error) return new Response('Could not load this QR code.', { status: 500 });
  if (!qr) return new Response('QR code not found.', { status: 404 });

  const url = new URL(request.url);
  const format = url.searchParams.get('format') ?? 'png';
  if (!['png', 'svg'].includes(format)) return new Response('Unsupported QR format.', { status: 400 });
  const target = `${getAppOrigin()}/q/${qr.code}`;
  const headers = new Headers({
    'Cache-Control': 'private, no-store',
    'Content-Type': format === 'svg' ? 'image/svg+xml; charset=utf-8' : 'image/png',
  });
  if (url.searchParams.get('download') === '1') {
    headers.set('Content-Disposition', `attachment; filename="oneqr-${qr.code}.${format}"`);
  }
  const image = format === 'svg'
    ? await QRCode.toString(target, { type: 'svg', width: 640, margin: 2 })
    : await QRCode.toBuffer(target, { type: 'png', width: 640, margin: 2 });
  return new Response(image, { headers });
}
