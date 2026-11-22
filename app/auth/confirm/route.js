import { NextResponse } from 'next/server';
import { isConfigured, supabase } from '../../../lib/supabase';

export async function GET(request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token_hash');
  if (token && isConfigured()) {
    const client = await supabase();
    const { error } = await client.auth.verifyOtp({ token_hash: token, type: 'email' });
    if (!error) return NextResponse.redirect(new URL('/dashboard', url), {
      headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' },
    });
  }
  return NextResponse.redirect(new URL('/?notice=confirm-error', url), {
    headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' },
  });
}
