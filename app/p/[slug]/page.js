import { notFound } from 'next/navigation';
import CustomerLanding from '../../components/customer-landing';
import { isConfigured, supabase } from '../../../lib/supabase';

export default async function PublicCustomerPage({ params, searchParams }) {
  if (!isConfigured()) throw new Error('Supabase is not configured for public customer pages.');
  const [{ slug }, { qr }] = await Promise.all([params, searchParams]);
  const client = await supabase();
  const { data: page, error } = await client.rpc('get_public_customer_page', { p_slug: slug });
  if (error) throw new Error('Could not load the published customer page.');
  if (!page) notFound();

  return <CustomerLanding
    businessName={page.businessName}
    businessCategory={page.businessCategory}
    profileEmoji={page.profileEmoji}
    profileImageUrl={page.profileImageUrl}
    primaryColor={page.primaryColor}
    headline={page.headline}
    description={page.description}
    phone={page.phone}
    email={page.email}
    websiteUrl={page.websiteUrl}
    locationText={page.locationText}
    locationUrl={page.locationUrl}
    offerText={page.offerText}
    wifiSsid={page.wifiSsid}
    wifiPassword={page.wifiPassword}
    links={page.links}
    publicSlug={slug}
    qrCode={typeof qr === 'string' ? qr : undefined}
  />;
}
