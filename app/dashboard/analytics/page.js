import { getDashboardContext } from '../../../lib/dashboard';

const ACTION_NAMES = {
  call: 'Phone calls',
  custom: 'Custom links',
  directions: 'Directions',
  email: 'Emails',
  google_review: 'Google reviews',
  instagram: 'Instagram',
  menu: 'Menus',
  website: 'Websites',
  whatsapp: 'WhatsApp',
};

function ActionCounts({ actions = [] }) {
  if (!actions.length) return <p className="subtle">No action clicks yet.</p>;

  return (
    <ul className="analytics-action-list">
      {actions.map((action) => (
        <li key={`${action.kind}-${action.label}`}>
          <span>
            {action.label || ACTION_NAMES[action.kind] || action.kind}
            {action.label && ACTION_NAMES[action.kind] ? ` · ${ACTION_NAMES[action.kind]}` : ''}
          </span>
          <strong>{action.clicks}</strong>
        </li>
      ))}
    </ul>
  );
}

export default async function AnalyticsPage() {
  const { client, business, error: contextError } = await getDashboardContext();
  if (contextError) {
    return <p className="notice error-notice" role="alert">Could not load analytics. Refresh to retry.</p>;
  }
  if (!business) {
    return <p className="notice">Set up a business profile to view its QR analytics.</p>;
  }

  const { data, error } = await client.rpc('get_business_qr_analytics', {
    p_business_id: business.id,
  });
  if (error) {
    console.error('get_business_qr_analytics error:', error);
    return <p className="notice error-notice" role="alert">Could not load analytics. Refresh to retry.</p>;
  }

  const report = data || {};
  const qrCodes = Array.isArray(report.qrCodes) ? report.qrCodes : [];
  const actions = Array.isArray(report.actions) ? report.actions : [];

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Performance</p>
          <h1>QR Analytics</h1>
        </div>
      </div>

      <p className="subtle analytics-privacy-note">
        Counts are total scans and clicks, not unique visitors. No visitor names, phone numbers, or IP addresses are collected.
      </p>

      <div className="analytics-summary">
        <section className="panel analytics-stat">
          <span className="eyebrow">QR scans</span>
          <strong>{report.totalScans ?? 0}</strong>
        </section>
        <section className="panel analytics-stat">
          <span className="eyebrow">Action clicks</span>
          <strong>{report.totalClicks ?? 0}</strong>
        </section>
      </div>

      <section className="panel analytics-section">
        <h2>Action clicks</h2>
        <ActionCounts actions={actions} />
      </section>

      <section className="analytics-section">
        <h2>Performance by QR code</h2>
        {qrCodes.length ? (
          <div className="analytics-qr-list">
            {qrCodes.map((qr) => (
              <article className="panel analytics-qr-card" key={qr.id}>
                <div className="analytics-qr-heading">
                  <h3>{qr.name}</h3>
                  <span>{qr.scans} scans · {qr.clicks} clicks</span>
                </div>
                <ActionCounts actions={qr.actions} />
              </article>
            ))}
          </div>
        ) : (
          <p className="subtle">Create a QR code to start seeing its performance here.</p>
        )}
      </section>
    </>
  );
}
