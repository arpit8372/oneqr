import Link from 'next/link';
import { getDashboardContext } from '../../../lib/dashboard';
import { getAppOrigin } from '../../../lib/app-origin';
import { createQrCode, updateQrCodeStatus } from '../../actions';

export default async function QrManager({ searchParams }) {
  const { client, business, error } = await getDashboardContext();
  const { error: notice, notice: success } = await searchParams;
  if (error) return <p className="notice error-notice" role="alert">Could not load QR manager data.</p>;
  if (!business) {
    return (
      <section className="panel">
        <h1>QR Codes</h1>
        <p>Please create or set up a business from the <Link href="/dashboard">Overview</Link> first.</p>
      </section>
    );
  }

  const { data: page, error: pageError } = await client
    .from('customer_pages')
    .select('id,slug,status,published_content')
    .eq('business_id', business.id)
    .maybeSingle();
  if (pageError) return <p className="notice error-notice" role="alert">Apply the customer-page migration to manage QR codes.</p>;

  const { data: codes, error: codesError } = await client
    .from('dynamic_qr_codes')
    .select('id,code,name,status,created_at')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false });
  if (codesError) return <p className="notice error-notice" role="alert">Could not load QR codes. Refresh to retry.</p>;

  const published = page?.status === 'published' && page.published_content;
  const appOrigin = getAppOrigin();

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Print, Share & Standees</p>
          <h1>Dynamic QR Codes</h1>
        </div>
        {published && (
          <Link className="button-link secondary-link" href={`/p/${page.slug}`} target="_blank">
            View Live Page ↗
          </Link>
        )}
      </div>

      {notice === 'created' && <p className="notice" role="status">Dynamic QR code generated successfully.</p>}
      {notice === 'updated' && <p className="notice" role="status">QR code status updated.</p>}
      {notice === 'invalid' && <p className="notice error-notice" role="alert">Enter a name up to 80 characters.</p>}
      {notice === 'create' && <p className="notice error-notice" role="alert">Could not create the QR code. Try again.</p>}
      {notice === 'update' && <p className="notice error-notice" role="alert">Could not update this QR code. Try again.</p>}
      {notice === 'page-required' && <p className="notice error-notice" role="alert">Publish your customer page before creating a QR code.</p>}

      {!published && (
        <section className="notice">
          Publish your customer page before creating QR codes. <Link href="/dashboard/page">Open landing page editor</Link>.
          {page?.status === 'paused' && ' The existing page is paused; republish it to reactivate your QR destinations.'}
        </section>
      )}

      {published && (
        <section className="panel qr-create" style={{ maxWidth: '640px', marginBottom: '28px' }}>
          <h2>Create New Standee / Table QR</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.92rem' }}>
            Give this QR a location name (e.g., Front Desk, Table 4, Counter Standee). Even if you edit your business page later, the printed QR code remains the same!
          </p>
          <form action={createQrCode}>
            <label>
              QR Code Location / Name
              <input name="name" maxLength={80} placeholder="e.g. Front Counter Standee" required />
            </label>
            <button type="submit" style={{ justifySelf: 'start' }}>
              Create Dynamic QR
            </button>
          </form>
        </section>
      )}

      {codes?.length > 0 && (
        <section className="qr-grid" aria-label="Saved QR codes">
          {codes.map((qr) => {
            const destination = `${appOrigin}/q/${qr.code}`;
            const isActive = qr.status === 'active';

            return (
              <article className="panel qr-card" key={qr.id}>
                <div className="section-heading" style={{ marginBottom: '12px' }}>
                  <div>
                    <h2 style={{ fontSize: '1.2rem', margin: '0 0 4px' }}>{qr.name}</h2>
                    <span className={`status-pill status-${qr.status}`}>
                      {isActive ? '● Active' : '○ Paused'}
                    </span>
                  </div>
                  <form action={updateQrCodeStatus} style={{ margin: 0 }}>
                    <input type="hidden" name="id" value={qr.id} />
                    <input type="hidden" name="status" value={isActive ? 'paused' : 'active'} />
                    <button type="submit" className="secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                      {isActive ? 'Pause' : 'Activate'}
                    </button>
                  </form>
                </div>

                <div style={{ background: '#ffffff', borderRadius: '16px', padding: '16px', margin: '14px 0', textAlign: 'center' }}>
                  <img
                    className="qr-preview"
                    src={`/api/qr/${qr.code}?format=png`}
                    alt={`QR code for ${qr.name}`}
                    width="220"
                    height="220"
                    style={{ margin: '0 auto', boxShadow: 'none' }}
                  />
                  <p style={{ color: '#0f172a', fontWeight: '700', margin: '8px 0 0', fontSize: '0.92rem' }}>
                    {business.name}
                  </p>
                  <p style={{ color: '#64748b', fontSize: '0.78rem', margin: '2px 0 0' }}>
                    Scan with any phone camera
                  </p>
                </div>

                <p className="qr-url">
                  <a href={destination} target="_blank" rel="noopener noreferrer">
                    {destination} ↗
                  </a>
                </p>

                {page?.status !== 'published' && (
                  <p className="notice error-notice" style={{ fontSize: '0.82rem' }}>
                    Customer page is not published. Scanning will show unavailable.
                  </p>
                )}

                <div className="actions" style={{ marginTop: 'auto', paddingTop: '10px' }}>
                  <a className="button-link" href={`/api/qr/${qr.code}?format=png&download=1`}>
                    Download PNG
                  </a>
                  <a className="button-link secondary-link" href={`/api/qr/${qr.code}?format=svg&download=1`}>
                    Download SVG
                  </a>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {!codes?.length && published && (
        <p className="subtle">No QR codes created yet. Use the form above to generate your first QR standee.</p>
      )}
    </>
  );
}
