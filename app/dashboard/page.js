import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getDashboardContext } from '../../lib/dashboard';
import { PhoenixAvatarIcon } from '../components/icons';

export default async function Dashboard({ searchParams }) {
  const { client, business, error } = await getDashboardContext();
  const { error: notice } = await searchParams;

  if (error) {
    return (
      <section className="panel notice error-notice" role="alert">
        Dashboard data could not be loaded. Confirm your database connection and refresh.
      </section>
    );
  }

  if (!business) redirect('/dashboard/page?setup=1');

  const { data: page, error: pageError } = await client
    .from('customer_pages')
    .select('id,slug,status')
    .eq('business_id', business.id)
    .maybeSingle();

  if (pageError) {
    return (
      <section className="panel notice error-notice" role="alert">
        Dashboard features need the customer-page migration. Please apply the migration in Supabase, then refresh.
      </section>
    );
  }

  const isPublished = page?.status === 'published';
  const nextAction = {
    href: '/dashboard/page',
    label: isPublished ? 'Edit landing page' : 'Set up your landing page',
  };

  const isCorruptedEmoji =
    !business.business_branding?.profile_emoji ||
    business.business_branding.profile_emoji.includes('dY') ||
    business.business_branding.profile_emoji.includes('?');

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Your workspace</p>
          <h1>Overview</h1>
          <p className="page-description">A clear view of your customer page and QR code.</p>
        </div>
        <div className="actions">
          {isPublished && (
            <Link
              className="button-link secondary-link"
              href={`/p/${page.slug}`}
              target="_blank"
            >
              View Live Page ↗
            </Link>
          )}
          <Link className="button-link" href={nextAction.href}>
            {nextAction.label}
          </Link>
        </div>
      </div>

      {notice === 'business' && (
        <p className="notice error-notice" role="alert">
          Could not save your business. Check the details and try again.
        </p>
      )}
      {notice === 'load' && (
        <p className="notice error-notice" role="alert">
          Could not load your business details. Refresh to retry.
        </p>
      )}

      <div className="overview-grid">
        <section className="panel overview-profile-card">
          <div className="overview-profile">
            <div className="v-avatar-ring overview-avatar">
              {isCorruptedEmoji ? (
                <PhoenixAvatarIcon size={48} className="v-avatar-svg" />
              ) : (
                <span style={{ fontSize: '1.6rem' }}>{business.business_branding.profile_emoji}</span>
              )}
            </div>
            <div className="overview-profile-copy">
              <p className="eyebrow">{business.category || 'Business'}</p>
              <h2>{business.name}</h2>
              <span className={`status-pill status-${isPublished ? 'published' : 'draft'}`}>
                {isPublished ? '● Published' : '○ Draft'}
              </span>
            </div>
          </div>
        </section>

        <section className="panel overview-live-card">
          <div>
            <p className="eyebrow">{isPublished ? 'Live Status' : 'Quick Start'}</p>
            <h2>
              {isPublished ? 'Your QR page is live & ready' : 'Publish your customer page'}
            </h2>
            <p>
              {isPublished
                ? 'Customers who scan your code can find your business and contact links.'
                : 'Configure your WhatsApp, reviews, and links to generate your dynamic QR code.'}
            </p>
          </div>
        </section>
      </div>

      {isPublished && (
        <section className="panel overview-url-panel">
          <div className="overview-url-copy">
            <div>
              <h3>Customer Profile URL</h3>
              <p>
                Share this link or print your QR code to let customers visit your business page.
              </p>
            </div>
          </div>
          <div className="actions overview-url-actions">
            <Link className="button-link" href={`/p/${page.slug}`} target="_blank">
              Open customer page
            </Link>
            <Link className="button-link secondary-link" href="/dashboard/qr">
              Print QR Code
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
