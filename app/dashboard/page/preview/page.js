import Link from 'next/link';
import { redirect } from 'next/navigation';
import CustomerLanding from '../../../components/customer-landing';
import { getDashboardContext } from '../../../../lib/dashboard';

export default async function DraftPreview() {
  const { client, business, error } = await getDashboardContext();
  if (error || !business) redirect('/dashboard');
  const { data: page, error: pageError } = await client
    .from('customer_pages')
    .select('id,headline,description,offer_text,wifi_ssid,wifi_password')
    .eq('business_id', business.id)
    .maybeSingle();
  if (pageError || !page) redirect('/dashboard/page');
  const { data: links, error: linksError } = await client
    .from('customer_page_links')
    .select('id,kind,label,url,is_visible')
    .eq('page_id', page.id)
    .order('sort_order');
  if (linksError) redirect('/dashboard/page?error=load');

  return (
    <div style={{ background: '#0b1324', minHeight: '100svh' }}>
      <div className="preview-toolbar" style={{ padding: '16px 0' }}>
        <Link className="button-link secondary-link" href="/dashboard/page" style={{ padding: '6px 14px', fontSize: '0.86rem' }}>
          ← Back to editor
        </Link>
        <span style={{ color: '#94a3b8', fontSize: '0.86rem', fontWeight: '600' }}>
          Live Mobile Preview (Draft)
        </span>
      </div>
      <CustomerLanding
        businessName={business.name}
        businessCategory={business.category}
        profileEmoji={business.business_branding?.profile_emoji}
        profileImageUrl={business.business_branding?.logo_url}
        primaryColor={business.business_branding?.primary_color ?? '#1e3a68'}
        headline={page.headline}
        description={page.description}
        phone={business.phone}
        email={business.email}
        websiteUrl={business.website_url}
        locationText={business.location_text}
        locationUrl={business.location_url}
        offerText={page.offer_text}
        wifiSsid={page.wifi_ssid}
        wifiPassword={page.wifi_password}
        links={(links ?? []).map((link) => ({
          ...link,
          url: link.kind === 'google_review' ? business.review_url : link.url,
        }))}
        preview
      />
    </div>
  );
}
