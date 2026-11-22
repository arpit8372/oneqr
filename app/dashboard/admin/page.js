import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireDashboardUser } from '../../../lib/dashboard';
import { adminSetVendorSubscription, adminUpdateVendor } from '../../actions';

function displayDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

function subscriptionLabel(vendor, now) {
  if (vendor.subscriptionStatus === 'unassigned') return 'Unassigned';
  if (vendor.subscriptionStatus === 'paused') return 'Paused';
  return Date.parse(vendor.expiresAt) > now ? 'Active' : 'Expired';
}

export default async function SuperadminPage({ searchParams }) {
  const client = await requireDashboardUser();
  const { data: isSuperAdmin, error: adminCheckError } = await client.rpc('is_super_admin');
  if (adminCheckError) {
    console.error('Superadmin access check failed:', adminCheckError);
    return <p className="notice error-notice" role="alert">Could not verify admin access. Refresh or contact support.</p>;
  }
  if (!isSuperAdmin) redirect('/dashboard');

  const { data: vendors, error: vendorsError } = await client.rpc('admin_list_vendors');
  if (vendorsError) console.error('admin_list_vendors error:', vendorsError);
  const { notice, error, detail, vendor: selectedVendorId } = await searchParams;
  const rows = Array.isArray(vendors) ? vendors : [];
  const selectedVendor = rows.find((vendor) => vendor.tenantId === selectedVendorId);
  const now = Date.now();
  const vendor = selectedVendor;
  const currentPlanStatus = vendor ? subscriptionLabel(vendor, now) : '';
  const ownerEmail = vendor?.ownerEmail || 'Owner email unavailable';
  const detailsFormId = vendor ? `vendor-details-${vendor.tenantId}` : '';

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Platform controls</p>
          <h1>Superadmin</h1>
        </div>
        <span className="status-pill status-active">{rows.length} vendors</span>
      </div>

      {notice === 'saved' && <p className="notice" role="status">Vendor details updated.</p>}
      {notice === 'subscription' && <p className="notice" role="status">Subscription plan updated.</p>}
      {error && (
        <p className="notice error-notice" role="alert">
          {detail || (error === 'subscription'
            ? 'Could not update this subscription. Check the plan name and month duration.'
            : error === 'save'
              ? 'Could not save vendor details. Check the entered values.'
              : 'Could not verify superadmin access.')}
        </p>
      )}
      {vendorsError && <p className="notice error-notice" role="alert">Vendor records could not be loaded.</p>}

      {rows.length === 0 && !vendorsError && (
        <section className="panel">
          <h2>No vendors found</h2>
          <p>New business workspaces will appear here after signup.</p>
        </section>
      )}

      {selectedVendorId && !selectedVendor && (
        <p className="notice error-notice" role="alert">That vendor could not be found.</p>
      )}

      {!selectedVendor && rows.length > 0 && (
        <div className="admin-vendor-directory">
          {rows.map((vendor) => {
            const name = vendor.businessName || vendor.tenantName;
            return (
              <article className="panel admin-vendor-row" key={vendor.tenantId}>
                <h2>{name}</h2>
                <Link
                  className="button-link"
                  href={`/dashboard/admin?vendor=${encodeURIComponent(vendor.tenantId)}`}
                  aria-label={`View details for ${name}`}
                >
                  Details
                </Link>
              </article>
            );
          })}
        </div>
      )}

      {selectedVendor && (
        <>
          <Link className="button-link secondary-link admin-back-link" href="/dashboard/admin">
            Back to vendors
          </Link>
          <p className="notice">
            Active plans run until their expiry date. Paused, unassigned, or expired vendors&apos; public pages and QR destinations are disabled.
          </p>
          <div className="admin-vendor-list">
            <article className="panel admin-vendor-card">
              <header className="admin-vendor-header">
                <div>
                  <p className="eyebrow">{vendor.category || 'Business'} · {ownerEmail}</p>
                  <h2>{vendor.businessName || vendor.tenantName}</h2>
                  <p className="admin-vendor-meta">
                    Workspace: {vendor.tenantName} · Joined {displayDate(vendor.createdAt)}
                  </p>
                </div>
                <span className={`status-pill status-${currentPlanStatus.toLowerCase()}`}>
                  {currentPlanStatus}
                </span>
              </header>

              <div className="admin-vendor-grid">
                {vendor.businessId ? (
                  <section>
                    <h3>Vendor and business details</h3>
                    <form id={detailsFormId} action={adminUpdateVendor} className="admin-form">
                      <input type="hidden" name="tenant_id" value={vendor.tenantId} />
                      <input type="hidden" name="business_id" value={vendor.businessId} />
                      <label>
                        Workspace name
                        <input name="tenant_name" defaultValue={vendor.tenantName || ''} maxLength={100} required />
                      </label>
                      <label>
                        Owner name
                        <input name="owner_name" defaultValue={vendor.ownerName || ''} maxLength={100} />
                      </label>
                      <label>
                        Owner phone
                        <input name="owner_phone" defaultValue={vendor.ownerPhone || ''} maxLength={30} />
                      </label>
                      <label>
                        Business name
                        <input name="business_name" defaultValue={vendor.businessName || ''} maxLength={100} required />
                      </label>
                      <label>
                        Category
                        <input name="category" defaultValue={vendor.category || ''} maxLength={80} required />
                      </label>
                      <label>
                        Business phone
                        <input name="phone" defaultValue={vendor.phone || ''} maxLength={30} />
                      </label>
                      <label>
                        Business email
                        <input name="email" type="email" defaultValue={vendor.email || ''} maxLength={254} />
                      </label>
                      <label>
                        Website URL
                        <input name="website_url" type="url" defaultValue={vendor.websiteUrl || ''} maxLength={2048} />
                      </label>
                      <label>
                        Google review URL
                        <input name="review_url" type="url" defaultValue={vendor.reviewUrl || ''} maxLength={2048} />
                      </label>
                      <label>
                        Location
                        <input name="location_text" defaultValue={vendor.locationText || ''} maxLength={120} />
                      </label>
                      <label>
                        Map URL
                        <input name="location_url" type="url" defaultValue={vendor.locationUrl || ''} maxLength={2048} />
                      </label>
                      <label>
                        Profile emblem
                        <select name="profile_emoji" defaultValue={vendor.profileEmoji || '🏪'}>
                          {['🏪', '🍽️', '☕', '✂️', '💇', '🛍️', '🥐', '🌿', '🐾', '🏋️', '📸', '✨'].map((emoji) => (
                            <option key={emoji} value={emoji}>{emoji}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Brand color
                        <input name="primary_color" type="color" defaultValue={vendor.primaryColor || '#245b49'} />
                      </label>
                      <label>
                        Page headline
                        <input name="headline" defaultValue={vendor.headline || 'Welcome'} maxLength={100} required />
                      </label>
                      <label>
                        Page description
                        <textarea name="description" defaultValue={vendor.description || ''} maxLength={600} rows={3} />
                      </label>
                      <label>
                        Offer
                        <input name="offer_text" defaultValue={vendor.offerText || ''} maxLength={180} />
                      </label>
                      <label>
                        Guest Wi-Fi name
                        <input name="wifi_ssid" defaultValue={vendor.wifiSsid || ''} maxLength={32} />
                      </label>
                      <label>
                        Guest Wi-Fi password
                        <input name="wifi_password" type="password" autoComplete="new-password" defaultValue={vendor.wifiPassword || ''} maxLength={64} />
                      </label>
                      {vendor.profileImageUrl && (
                        <p className="admin-image-link">
                          Current profile photo: <a href={vendor.profileImageUrl} target="_blank" rel="noopener noreferrer">Open image ↗</a>
                        </p>
                      )}
                      <fieldset className="admin-links-fieldset">
                        <legend>Customer action links</legend>
                        {vendor.links?.length ? vendor.links.map((link, index) => (
                          <div className="admin-link-row" key={`${link.kind}-${index}`}>
                            <input type="hidden" name="link_id" value={link.id} />
                            <label>
                              {link.kind} label
                              <input name="link_label" defaultValue={link.label} maxLength={60} required />
                            </label>
                            <label>
                              {link.kind} URL
                              <input name="link_url" type="url" defaultValue={link.url || ''} maxLength={2048} />
                            </label>
                            <label>
                              Visibility
                              <select name="link_visible" defaultValue={link.visible ? 'true' : 'false'}>
                                <option value="true">Visible</option>
                                <option value="false">Hidden</option>
                              </select>
                            </label>
                          </div>
                        )) : <p className="admin-vendor-meta">No customer links configured.</p>}
                      </fieldset>
                      <button type="submit">Save vendor details</button>
                    </form>
                  </section>
                ) : (
                  <section>
                    <h3>Vendor details</h3>
                    <p>This workspace has no business profile yet.</p>
                  </section>
                )}

                <section>
                  <h3>Subscription</h3>
                  <p className="admin-vendor-meta">
                    {vendor.planName || 'No plan assigned'} · {vendor.planMonths || 0} months
                    <br />
                    Starts {displayDate(vendor.startsAt)} · Expires {displayDate(vendor.expiresAt)}
                  </p>
                  <form action={adminSetVendorSubscription} className="admin-form">
                    <input type="hidden" name="tenant_id" value={vendor.tenantId} />
                    <label>
                      Plan name
                      <input name="plan_name" defaultValue={vendor.planName || 'Monthly'} maxLength={60} required />
                    </label>
                    <label>
                      Duration (months)
                      <input name="months" type="number" min="1" max="120" defaultValue={vendor.planMonths || 1} required />
                    </label>
                    <label>
                      Plan status
                      <select name="status" defaultValue={vendor.subscriptionStatus === 'paused' ? 'paused' : 'active'}>
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                      </select>
                    </label>
                    <button type="submit">
                      {vendor.subscriptionStatus === 'paused' || vendor.subscriptionStatus === 'unassigned'
                        ? 'Save plan'
                        : 'Update plan'}
                    </button>
                  </form>

                  <h3 className="admin-section-heading">Vendor QR codes</h3>
                  {vendor.qrCodes?.length ? (
                    <ul className="admin-detail-list">
                      {vendor.qrCodes.map((qr) => (
                        <li key={qr.code}>
                          <span>{qr.name} · {qr.status}</span>
                          <code>{qr.code}</code>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="admin-vendor-meta">No QR codes created.</p>}
                </section>
              </div>
            </article>
          </div>
        </>
      )}
    </>
  );
}
