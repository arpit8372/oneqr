import { redirect } from 'next/navigation';
import { isConfigured, supabase } from './supabase';

export async function requireDashboardUser() {
  if (!isConfigured()) redirect('/?notice=setup');
  const client = await supabase();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) redirect('/');
  return client;
}

export async function getDashboardContext() {
  const client = await requireDashboardUser();
  const { data, error } = await client
    .from('businesses')
    .select('id,name,category,review_url,phone,email,website_url,location_text,location_url,business_branding(primary_color,profile_emoji,logo_url)')
    .order('created_at')
    .limit(1);
  return { client, business: data?.[0] ?? null, error };
}
