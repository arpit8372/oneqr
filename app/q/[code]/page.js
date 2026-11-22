import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isConfigured, supabase } from '../../../lib/supabase';

export default async function DynamicQrRedirect({ params }) {
  if (!isConfigured()) throw new Error('Supabase is not configured for dynamic QR codes.');
  const { code } = await params;
  const client = await supabase();
  const { data: slug, error } = await client.rpc('track_public_qr_scan', { p_code: code });
  if (error) throw new Error('Could not resolve this QR code.');
  if (slug) redirect(`/p/${slug}?qr=${encodeURIComponent(code)}`);

  return <main className="unavailable-page">
    <section className="panel">
      <p className="wordmark">OneQR</p>
      <h1>This QR code is unavailable</h1>
      <p>The page may be paused, unpublished, or have an inactive subscription. Please contact the business for help.</p>
      <Link href="/">Go to OneQR</Link>
    </section>
  </main>;
}
