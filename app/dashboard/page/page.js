import Link from 'next/link';
import Image from 'next/image';
import { getDashboardContext } from '../../../lib/dashboard';
import { pauseCustomerPage, publishCustomerProfileAndQr, saveCustomerProfile } from '../../actions';
import {
  GoogleIcon,
  WhatsAppIcon,
  InstagramIcon,
  LinkedInIcon,
  WebsiteIcon,
  PhoneIcon,
  EmailIcon,
  WifiIcon,
  MenuIcon,
  YouTubeIcon,
  FacebookIcon,
  XTwitterIcon,
} from '../../components/icons';

const businessCategoryOptions = [
  'Hospital & Healthcare',
  'Clinic & Doctor',
  'Restaurant & Bar',
  'Café & Bakery',
  'Salon, Spa & Beauty',
  'Retail & Store',
  'Gym & Fitness',
  'IT, Tech & Agency',
  'Real Estate & Builders',
  'Professional Services',
  'Hotel & Hospitality',
  'Education & Coaching',
  'Automobile & Garage',
  'Local service',
  'Other',
];

const profileEmojis = ['🏪', '🍽️', '☕', '✂️', '💇', '🛍️', '🥐', '🌿', '🐾', '🏋️', '📸', '✨'];
const emojiDisplayLabels = ['🏪 Store', '🍽️ Dining', '☕ Café', '✂️ Salon', '💇 Beauty', '🛍️ Retail', '🥐 Bakery', '🌿 Eco', '🐾 Pets', '🏋️ Fitness', '📸 Creative', '✨ Service'];

const platformConfigs = [
  {
    key: 'whatsapp',
    title: 'WhatsApp Chat (Hero Button)',
    defaultLabel: 'Chat on WhatsApp',
    icon: <WhatsAppIcon size={22} />,
    type: 'whatsapp',
    help: 'Just enter a 10-digit number. When customers click, it opens WhatsApp with a prefilled message!',
  },
  {
    key: 'google_review',
    title: 'Google Reviews',
    defaultLabel: 'Review us on Google',
    icon: <GoogleIcon size={20} />,
    type: 'google_review',
    help: 'Adds a prominent action card that opens your Google review link.',
  },
  {
    key: 'instagram',
    title: 'Instagram',
    defaultLabel: 'Instagram',
    icon: <InstagramIcon size={20} />,
    type: 'instagram',
    help: 'Enter @username or full Instagram profile URL.',
  },
  {
    key: 'website',
    title: 'Official Website',
    defaultLabel: 'Visit our website',
    icon: <WebsiteIcon size={19} />,
    type: 'url',
    placeholder: 'https://yourwebsite.com',
  },
  {
    key: 'linkedin',
    title: 'LinkedIn Company / Profile',
    defaultLabel: 'LinkedIn',
    icon: <LinkedInIcon size={20} />,
    type: 'url',
    placeholder: 'https://linkedin.com/in/... or company page',
  },
  {
    key: 'youtube',
    title: 'YouTube Channel',
    defaultLabel: 'YouTube',
    icon: <YouTubeIcon size={20} />,
    type: 'url',
    placeholder: 'https://youtube.com/@channel',
  },
  {
    key: 'facebook',
    title: 'Facebook Page',
    defaultLabel: 'Facebook',
    icon: <FacebookIcon size={20} />,
    type: 'url',
    placeholder: 'https://facebook.com/yourpage',
  },
  {
    key: 'twitter',
    title: 'X (Twitter)',
    defaultLabel: 'X (Twitter)',
    icon: <XTwitterIcon size={18} />,
    type: 'url',
    placeholder: 'https://x.com/yourhandle',
  },
  {
    key: 'menu',
    title: 'Menu / Price List / Catalog',
    defaultLabel: 'View our menu',
    icon: <MenuIcon size={19} />,
    type: 'url',
    placeholder: 'https://yourwebsite.com/menu or PDF link',
  },
  {
    key: 'custom',
    title: 'Custom Link (e.g. Appointment, Booking, Portfolio)',
    defaultLabel: 'Book Appointment',
    icon: <WebsiteIcon size={18} />,
    type: 'url',
    placeholder: 'https://...',
  },
];

const errorMessages = {
  invalid: 'Check your business details, links, offer, and Wi-Fi fields.',
  profile: 'Check your contact and location details, then try saving again.',
  image: 'Choose a JPEG, PNG, or WebP photo under 2 MB.',
  save: 'Could not save your page. Refresh and try again.',
  link: 'Check the enabled buttons and links. WhatsApp and Instagram need valid entries.',
  'review-url': 'Add a valid Google Review link before turning that button on.',
  publish: 'Could not publish your page. Check the details and try again.',
  qr: 'Your page was published, but its QR code could not be loaded or created. Try Publish again.',
};

function parseWhatsAppDetails(url) {
  let phone = '';
  let message = 'Hi! I got your QR code.';
  if (!url) return { phone, message };
  try {
    const u = new URL(url);
    phone = u.pathname.replace(/^\//, '');
    if (phone.startsWith('91') && phone.length === 12) {
      phone = phone.slice(2);
    }
    if (u.searchParams.get('text')) {
      message = u.searchParams.get('text');
    }
  } catch {
    phone = url;
  }
  return { phone, message };
}

function parseInstagramHandle(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    return u.pathname.replace(/^\//, '').replace(/\/$/, '') || url;
  } catch {
    return url.replace(/^@/, '');
  }
}

function matchExistingLink(links, platformKey) {
  if (!links || !links.length) return null;
  if (platformKey === 'whatsapp') return links.find(l => l.kind === 'whatsapp');
  if (platformKey === 'google_review') return links.find(l => l.kind === 'google_review');
  if (platformKey === 'instagram') return links.find(l => l.kind === 'instagram');
  if (platformKey === 'website') return links.find(l => l.kind === 'website');
  if (platformKey === 'menu') return links.find(l => l.kind === 'menu');
  if (platformKey === 'linkedin') return links.find(l => l.kind === 'custom' && (l.label || '').toLowerCase().includes('linkedin'));
  if (platformKey === 'youtube') return links.find(l => l.kind === 'custom' && (l.label || '').toLowerCase().includes('youtube'));
  if (platformKey === 'facebook') return links.find(l => l.kind === 'custom' && (l.label || '').toLowerCase().includes('facebook'));
  if (platformKey === 'twitter') return links.find(l => l.kind === 'custom' && ((l.label || '').toLowerCase().includes('twitter') || (l.label || '').toLowerCase() === 'x'));
  if (platformKey === 'custom') return links.find(l => l.kind === 'custom' && !['linkedin', 'youtube', 'facebook', 'twitter'].some(k => (l.label || '').toLowerCase().includes(k)));
  return null;
}

export default async function LandingPageEditor({ searchParams }) {
  const { client, business, error } = await getDashboardContext();
  const { error: errorCode, notice: success, setup, detail } = await searchParams;
  const notice = errorCode || success;
  if (error) return <p className="notice error-notice" role="alert">Could not load business data.</p>;

  let page = null;
  let links = [];
  if (business) {
    const pageResult = await client
      .from('customer_pages')
      .select('id,slug,headline,description,offer_text,wifi_ssid,wifi_password,status')
      .eq('business_id', business.id)
      .maybeSingle();
    if (pageResult.error) return <p className="notice error-notice" role="alert">Apply the customer-page migration to edit this page.</p>;
    page = pageResult.data;

    if (page) {
      const linkResult = await client
        .from('customer_page_links')
        .select('id,kind,label,url,sort_order,is_visible')
        .eq('page_id', page.id)
        .order('sort_order')
        .order('created_at');
      if (linkResult.error) return <p className="notice error-notice" role="alert">Could not load page buttons. Refresh to retry.</p>;
      links = linkResult.data ?? [];
    }
  }

  const businessTypeIsPreset = businessCategoryOptions.includes(business?.category);
  const profileEmoji = business?.business_branding?.profile_emoji ?? profileEmojis[0];
  const isPublished = page?.status === 'published';

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">QR Profile & Bio-Link Builder</p>
          <h1>{business ? `Customize QR for ${business.name}` : 'Create your customer page'}</h1>
        </div>
        <div className="actions">
          {page && (
            <Link className="button-link secondary-link" href="/dashboard/page/preview" target="_blank">
              Preview Page ↗
            </Link>
          )}
          {isPublished && (
            <Link className="button-link secondary-link" href={`/p/${page.slug}`} target="_blank">
              View Live Page ↗
            </Link>
          )}
          <span className={`status-pill status-${isPublished ? 'published' : 'draft'}`}>
            {isPublished ? '● Live' : '○ Draft'}
          </span>
        </div>
      </div>

      {notice && (
        <p className={errorMessages[notice] ? 'notice error-notice' : 'notice'} role={errorMessages[notice] ? 'alert' : 'status'}>
          {detail || errorMessages[notice] ||
            ({
              saved: 'Changes saved! Remember to click "Publish Page" to make updates live.',
              published: 'Your customer page is live and dynamic QR code is active!',
            })[notice] ||
            'Action completed.'}
        </p>
      )}

      {setup && (
        <p className="notice">
          Welcome! Customize this QR page for your client/business. Choose only the platforms they need — everything is optional!
        </p>
      )}

      <form action={saveCustomerProfile} className="profile-builder">
        <input type="hidden" name="headline" value={business?.name ?? 'My Business'} />
        {/* Step 1: Business Identity */}
        <section className="panel builder-section">
          <div className="section-heading">
            <div>
              <span className="step-number">1</span>
              <h2>Client / Business Identity</h2>
              <p>Works for any Clinic, Hospital, Restaurant, Salon, Store, IT Agency or Local Service.</p>
            </div>
          </div>

          <label>
            Business / Client name *
            <input
              name="business_name"
              defaultValue={business?.name ?? 'Vistara Digital'}
              maxLength={100}
              placeholder="e.g. City Dental Clinic, Apex Hospital, Maya Bakery"
              required
            />
          </label>

          <label>
            Business category *
            <select
              name="business_type"
              defaultValue={businessTypeIsPreset ? business.category : 'Other'}
              required
            >
              {businessCategoryOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label>
            Custom category (if &quot;Other&quot; selected)
            <input
              name="custom_business_type"
              defaultValue={!businessTypeIsPreset && business?.category !== 'Other' ? business?.category ?? '' : ''}
              placeholder="e.g. Physiotherapy Clinic, Pet Grooming, Architecture Studio"
              maxLength={80}
            />
          </label>

          <fieldset className="emoji-picker">
            <legend>Brand avatar emblem</legend>
            <div className="emoji-options">
              {profileEmojis.map((emoji, idx) => (
                <label className="emoji-option" key={idx} title={emojiDisplayLabels[idx] || 'Icon'}>
                  <input
                    type="radio"
                    name="profile_emoji"
                    value={emoji}
                    defaultChecked={emoji === profileEmoji}
                  />
                  <span>{emojiDisplayLabels[idx]?.split(' ')[0] || '⭐'}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="profile-photo-field">
            Profile photo (optional)
            {business?.business_branding?.logo_url && (
              <Image
                className="profile-photo-preview"
                src={business.business_branding.logo_url}
                alt={`${business.name} profile`}
                width={72}
                height={72}
              />
            )}
            <input
              type="file"
              name="profile_image"
              accept="image/jpeg,image/png,image/webp"
            />
            <span className="field-help">JPG, PNG, or WebP; maximum 2 MB. This photo appears on your public QR page.</span>
          </label>
        </section>

        {/* Step 2: Tagline / Bio Description */}
        <section className="panel builder-section">
          <div className="section-heading">
            <div>
              <span className="step-number">2</span>
              <h2>Tagline & Description (Optional)</h2>
              <p>Short subtitle shown below the business name (e.g. specialized treatments, timings, specialties).</p>
            </div>
          </div>
          <label>
            Tagline / Bio
            <textarea
              name="description"
              defaultValue={page?.description ?? 'Premium Web Development & Digital Growth Agency.'}
              maxLength={600}
              rows={3}
              placeholder="e.g. 24x7 Emergency Care, Advanced Orthodontics & Dental Implants."
            />
          </label>
        </section>

        {/* Step 3: Contact, Location, Offer & Wi-Fi */}
        <section className="panel builder-section">
          <div className="section-heading">
            <div>
              <span className="step-number">3</span>
              <h2>Contact, Location, Offer & Wi-Fi (Optional)</h2>
              <p style={{ color: '#38bdf8', fontWeight: '600' }}>
                All fields below are 100% optional. Only filled fields will appear on the customer page!
              </p>
            </div>
          </div>

          <div className="contact-fields">
            <label>
              Call Us (Phone number)
              <input
                type="tel"
                name="phone"
                defaultValue={business?.phone ?? ''}
                maxLength={30}
                placeholder="+91 98765 43210 (Creates a 'Call us' button)"
              />
            </label>

            <label>
              Email address
              <input
                type="email"
                name="email"
                defaultValue={business?.email ?? ''}
                maxLength={254}
                placeholder="contact@business.com (Creates an 'Email us' button)"
              />
            </label>

            <label>
              Main Website URL
              <input
                type="text"
                inputMode="url"
                name="website_url"
                defaultValue={business?.website_url ?? ''}
                placeholder="https://yourwebsite.com"
              />
            </label>

            <label>
              Location / City name
              <input
                name="location_text"
                defaultValue={business?.location_text ?? ''}
                maxLength={120}
                placeholder="e.g. Civil Lines, Kanpur or Indiranagar, Bengaluru"
              />
            </label>

            <label style={{ gridColumn: '1 / -1' }}>
              Google Maps Directions Link
              <input
                type="text"
                inputMode="url"
                name="location_url"
                defaultValue={business?.location_url ?? ''}
                placeholder="https://maps.google.com/?q=... (Creates a 'Get directions' button)"
              />
            </label>

            <label style={{ gridColumn: '1 / -1' }}>
              Special offer / Highlight card
              <textarea
                name="offer_text"
                defaultValue={page?.offer_text ?? 'Flat 10% off on first visit'}
                maxLength={180}
                rows={2}
                placeholder="e.g. Flat 10% off on first visit, or Free Dental Checkup on Weekdays"
              />
            </label>
          </div>

          <details className="wifi-settings" open={Boolean(page?.wifi_ssid)}>
            <summary>Add Guest Wi-Fi details (Optional)</summary>
            <p className="field-help">
              Wi-Fi network details will be visible to customers who scan this QR.
            </p>
            <div className="contact-fields">
              <label>
                Network name (SSID)
                <input
                  name="wifi_ssid"
                  defaultValue={page?.wifi_ssid ?? ''}
                  maxLength={32}
                  placeholder="Guest_WiFi"
                  autoComplete="off"
                />
              </label>
              <label>
                Wi-Fi password
                <input
                  name="wifi_password"
                  type="text"
                  defaultValue={page?.wifi_password ?? ''}
                  maxLength={64}
                  placeholder="Leave empty for open Wi-Fi"
                  autoComplete="off"
                />
              </label>
            </div>
          </details>
        </section>

        {/* Step 4: Social Media & Action Buttons */}
        <section className="panel builder-section">
          <div className="section-heading">
            <div>
              <span className="step-number">4</span>
              <h2>Social Media & Action Platforms</h2>
              <p>
                Toggle ON only what your customer needs (e.g. only WhatsApp + Google Review + Instagram). Everything else stays hidden!
              </p>
            </div>
          </div>

          <div className="button-options">
            {platformConfigs.map((cfg) => {
              const existing = matchExistingLink(links, cfg.key);
              const isEnabled = existing ? existing.is_visible : false;
              const { phone: waPhone, message: waMsg } = cfg.key === 'whatsapp' ? parseWhatsAppDetails(existing?.url) : { phone: '', message: 'Hi! I got your QR code.' };
              const instaHandle = cfg.key === 'instagram' ? parseInstagramHandle(existing?.url) : '';

              return (
                <details className="button-option" key={cfg.key} open={isEnabled || undefined}>
                  <summary>
                    <span className="button-option-icon">{cfg.icon}</span>
                    <span className="button-option-title">{cfg.title}</span>
                    <span className="button-option-hint">
                      {isEnabled ? 'Enabled ✓' : '+ Add'}
                    </span>
                  </summary>

                  <div className="button-fields">
                    <label className="checkbox-label" style={{ fontWeight: '700', color: '#38bdf8' }}>
                      <input
                        type="checkbox"
                        name={`enable_${cfg.key}`}
                        defaultChecked={isEnabled}
                      />
                      Enable {cfg.title} on this QR page
                    </label>

                    <label>
                      Button Label
                      <input
                        name={`label_${cfg.key}`}
                        defaultValue={existing?.label || cfg.defaultLabel}
                        maxLength={60}
                      />
                    </label>

                    {cfg.type === 'whatsapp' && (
                      <>
                        <label>
                          WhatsApp Mobile Number *
                          <input
                            type="tel"
                            name="wa_phone"
                            defaultValue={waPhone}
                            placeholder="Enter 10-digit number (e.g. 9876543210)"
                          />
                          <span className="field-help">Country code (+91) will be formatted automatically!</span>
                        </label>
                        <label>
                          Pre-filled Message
                          <input
                            type="text"
                            name="wa_message"
                            defaultValue={waMsg}
                            placeholder="Hi! I got your QR code."
                          />
                          <span className="field-help">Pre-filled message when the customer clicks the WhatsApp button.</span>
                        </label>
                      </>
                    )}

                    {cfg.type === 'google_review' && (
                      <label>
                        Google Review URL *
                        <input
                          type="text"
                          inputMode="url"
                          name="review_url"
                          defaultValue={business?.review_url ?? ''}
                          placeholder="https://g.page/r/.../review or Google Maps review link"
                        />
                        <span className="field-help">Customers click this to immediately leave a 5-star Google review!</span>
                      </label>
                    )}

                    {cfg.type === 'instagram' && (
                      <label>
                        Instagram Username or URL
                        <input
                          name="insta_handle"
                          defaultValue={instaHandle}
                          placeholder="e.g. @yourbusiness or yourhandle"
                        />
                      </label>
                    )}

                    {cfg.type === 'url' && (
                      <label>
                        Destination URL
                        <input
                          type="text"
                          name={`url_${cfg.key}`}
                          defaultValue={existing?.url ?? ''}
                          placeholder={cfg.placeholder}
                        />
                      </label>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        </section>

        {/* Save Bar */}
        <div className="actions" style={{ marginTop: '14px' }}>
          <button
            type="submit"
            formAction={isPublished ? publishCustomerProfileAndQr : saveCustomerProfile}
            style={{ minWidth: '180px' }}
          >
            {isPublished ? 'Save & Publish Updates' : 'Save Draft'}
          </button>
        </div>

        <section className="panel" style={{ marginTop: '28px', maxWidth: '860px', borderColor: 'rgba(56, 189, 248, 0.35)' }}>
          <div className="section-heading">
            <div>
              <h2>{isPublished ? 'Customer Page is Live' : 'Publish Customer Page & QR'}</h2>
              <p>
                {isPublished
                  ? 'Your customized customer page is live and dynamic QR code is actively routing customers to it.'
                  : 'Click Publish to generate and activate the dynamic QR code for this customer.'}
              </p>
            </div>
            <div className="actions">
              <button type="submit" formAction={publishCustomerProfileAndQr} style={{ background: '#16a34a', borderColor: '#16a34a', padding: '12px 24px', fontSize: '1rem' }}>
                {isPublished ? '✓ Republish Updates' : '🚀 Publish Page & QR'}
              </button>
              {isPublished && (
                <button type="submit" formAction={pauseCustomerPage} className="secondary">
                  Pause Page
                </button>
              )}
            </div>
          </div>
        </section>
      </form>
    </>
  );
}
