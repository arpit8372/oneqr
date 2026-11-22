'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import {
  GoogleIcon,
  WhatsAppIcon,
  InstagramIcon,
  LinkedInIcon,
  WebsiteIcon,
  LocationIcon,
  PhoneIcon,
  EmailIcon,
  WifiIcon,
  MenuIcon,
  YouTubeIcon,
  FacebookIcon,
  XTwitterIcon,
  StarIcon,
  ShareIcon,
  ArrowRightIcon,
  CopyIcon,
  CheckIcon,
  PhoenixAvatarIcon,
} from './icons';

function getPhoneHref(phone) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

function escapeWifiValue(value) {
  return value.replace(/[\\;,:"]/g, '\\$&');
}

function resolvePlatform(link) {
  const kind = (link.kind || '').toLowerCase();
  const label = (link.label || '').toLowerCase();
  const url = (link.url || '').toLowerCase();

  if (kind === 'whatsapp' || url.includes('wa.me') || url.includes('whatsapp.com')) {
    return 'whatsapp';
  }
  if (
    kind === 'google_review' ||
    label.includes('review') ||
    label.includes('google') ||
    url.includes('search.google.com') ||
    url.includes('g.page')
  ) {
    return 'google_review';
  }
  if (
    kind === 'instagram' ||
    url.includes('instagram.com') ||
    label.includes('instagram') ||
    label.includes('insta')
  ) {
    return 'instagram';
  }
  if (label.includes('linkedin') || url.includes('linkedin.com')) {
    return 'linkedin';
  }
  if (label.includes('youtube') || url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube';
  }
  if (label.includes('facebook') || url.includes('facebook.com') || url.includes('fb.com')) {
    return 'facebook';
  }
  if (
    label.includes('twitter') ||
    label.includes(' x ') ||
    label === 'x' ||
    url.includes('twitter.com') ||
    url.includes('x.com')
  ) {
    return 'twitter';
  }
  if (
    kind === 'menu' ||
    label.includes('menu') ||
    label.includes('food') ||
    label.includes('catalog') ||
    label.includes('price')
  ) {
    return 'menu';
  }
  if (
    label.includes('direction') ||
    label.includes('map') ||
    url.includes('maps.google') ||
    url.includes('goo.gl/maps')
  ) {
    return 'directions';
  }
  if (label.includes('call') || label.includes('phone') || url.startsWith('tel:')) {
    return 'call';
  }
  if (label.includes('email') || label.includes('mail') || url.startsWith('mailto:')) {
    return 'email';
  }
  if (kind === 'website' || url.includes('http')) {
    return 'website';
  }
  return 'custom';
}

function renderPlatformIcon(platform) {
  switch (platform) {
    case 'google_review':
      return (
        <span className="platform-icon-circle icon-circle-google">
          <GoogleIcon size={20} />
        </span>
      );
    case 'whatsapp':
      return (
        <span className="platform-icon-circle icon-circle-whatsapp">
          <WhatsAppIcon size={22} />
        </span>
      );
    case 'instagram':
      return (
        <span className="platform-icon-circle icon-circle-instagram">
          <InstagramIcon size={22} />
        </span>
      );
    case 'linkedin':
      return (
        <span className="platform-icon-circle icon-circle-linkedin">
          <LinkedInIcon size={20} />
        </span>
      );
    case 'website':
      return (
        <span className="platform-icon-circle icon-circle-website">
          <WebsiteIcon size={19} />
        </span>
      );
    case 'directions':
      return (
        <span className="platform-icon-circle icon-circle-directions">
          <LocationIcon size={19} />
        </span>
      );
    case 'call':
      return (
        <span className="platform-icon-circle icon-circle-call">
          <PhoneIcon size={18} />
        </span>
      );
    case 'email':
      return (
        <span className="platform-icon-circle icon-circle-email">
          <EmailIcon size={18} />
        </span>
      );
    case 'menu':
      return (
        <span className="platform-icon-circle icon-circle-menu">
          <MenuIcon size={19} />
        </span>
      );
    case 'youtube':
      return (
        <span className="platform-icon-circle icon-circle-youtube">
          <YouTubeIcon size={20} />
        </span>
      );
    case 'facebook':
      return (
        <span className="platform-icon-circle icon-circle-facebook">
          <FacebookIcon size={20} />
        </span>
      );
    case 'twitter':
      return (
        <span className="platform-icon-circle icon-circle-twitter">
          <XTwitterIcon size={18} />
        </span>
      );
    default:
      return (
        <span className="platform-icon-circle icon-circle-custom">
          <WebsiteIcon size={18} />
        </span>
      );
  }
}

export default function CustomerLanding({
  businessName = 'Vistara Digital',
  businessCategory = 'Digital Growth Agency',
  profileEmoji,
  profileImageUrl,
  primaryColor = '#1e3a68',
  headline,
  description,
  phone,
  email,
  websiteUrl,
  locationText,
  locationUrl,
  offerText,
  wifiSsid,
  wifiPassword,
  links = [],
  publicSlug,
  qrCode,
  preview = false,
}) {
  const [toastMessage, setToastMessage] = useState(null);
  const [copiedWifi, setCopiedWifi] = useState(false);
  const [showWifiQr, setShowWifiQr] = useState(false);
  const [wifiQrDataUrl, setWifiQrDataUrl] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    if (!showWifiQr || !wifiSsid) return undefined;

    let cancelled = false;
    const wifiPayload = wifiPassword
      ? `WIFI:T:WPA;S:${escapeWifiValue(wifiSsid)};P:${escapeWifiValue(wifiPassword)};;`
      : `WIFI:T:nopass;S:${escapeWifiValue(wifiSsid)};;`;

    QRCode.toDataURL(wifiPayload, {
      width: 220,
      margin: 2,
      color: { dark: '#111827', light: '#ffffff' },
    }).then((dataUrl) => {
      if (!cancelled) setWifiQrDataUrl(dataUrl);
    }).catch((error) => {
      console.error('Guest Wi-Fi QR generation failed:', error);
      if (!cancelled) showToast('Could not create the Wi-Fi QR code. You can still copy the password.');
    });

    return () => {
      cancelled = true;
    };
  }, [showWifiQr, wifiSsid, wifiPassword]);

  const trackLinkClick = (linkKey) => {
    if (preview || !publicSlug || !qrCode || !linkKey) return;
    fetch('/api/analytics/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: publicSlug, qrCode, linkKey }),
      keepalive: true,
    }).then((response) => {
      if (!response.ok) console.error('QR action analytics failed:', response.status);
    }).catch((error) => console.error('QR action analytics failed:', error));
  };

  const handleShare = async () => {
    const shareData = {
      title: businessName || headline || 'OneQR Business',
      text: description || headline || 'Visit our business profile on OneQR',
      url: typeof window !== 'undefined' ? window.location.href : '',
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if (err.name !== 'AbortError') {
          copyPageUrl();
        }
      }
    } else {
      copyPageUrl();
    }
  };

  const copyPageUrl = async () => {
    if (typeof window === 'undefined' || !navigator.clipboard) {
      showToast('Unable to copy the page link.');
      return;
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Link copied to clipboard!');
    } catch {
      showToast('Unable to copy the page link.');
    }
  };

  const handleCopyWifi = async () => {
    if (wifiPassword && typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(wifiPassword);
      } catch (error) {
        console.error('Guest Wi-Fi password copy failed:', error);
        showToast('Could not copy the password. Please copy it manually.');
        return;
      }
      setCopiedWifi(true);
      showToast('Wi-Fi password copied!');
      setTimeout(() => setCopiedWifi(false), 2500);
    } else {
      showToast('Password copying is not available in this browser.');
    }
  };

  // Filter valid links
  const visibleLinks = (links || []).filter(
    (link) => link.url && (preview || link.is_visible !== false)
  );

  // Review takes the primary position; WhatsApp moves to the review link's grid position.
  const whatsAppLink = visibleLinks.find(
    (l) => l.kind === 'whatsapp' || resolvePlatform(l) === 'whatsapp'
  );
  const reviewLink = visibleLinks.find(
    (l) => l.kind === 'google_review' || resolvePlatform(l) === 'google_review'
  );
  const primaryLink = reviewLink || whatsAppLink;
  const gridActionCards = [];

  visibleLinks.forEach((link) => {
    const platform = resolvePlatform(link);
    if (link === primaryLink) {
      if (reviewLink && whatsAppLink) {
        gridActionCards.push({
          id: whatsAppLink.id || `${whatsAppLink.kind}-${whatsAppLink.label}`,
          analyticsKey: whatsAppLink.id,
          label: whatsAppLink.label,
          url: whatsAppLink.url,
          platform: 'whatsapp',
        });
      }
      return;
    }
    if (platform === 'whatsapp') return;
    gridActionCards.push({
      id: link.id || `${link.kind}-${link.label}`,
      analyticsKey: link.id,
      label: link.label,
      url: link.url,
      platform,
    });
  });

  // Check if contact details should be added to the grid if not already present as buttons
  const hasWebsiteCard = gridActionCards.some((c) => c.platform === 'website');
  if (websiteUrl && !hasWebsiteCard && (!whatsAppLink || whatsAppLink.url !== websiteUrl)) {
    gridActionCards.push({
      id: 'business-website',
      analyticsKey: 'business-website',
      label: 'Website',
      url: websiteUrl,
      platform: 'website',
    });
  }

  const hasDirectionsCard = gridActionCards.some((c) => c.platform === 'directions');
  if (locationUrl && !hasDirectionsCard) {
    gridActionCards.push({
      id: 'business-directions',
      analyticsKey: 'business-directions',
      label: 'Get directions',
      url: locationUrl,
      platform: 'directions',
    });
  }

  const hasCallCard = gridActionCards.some((c) => c.platform === 'call');
  if (phone && !hasCallCard) {
    gridActionCards.push({
      id: 'business-phone',
      analyticsKey: 'business-phone',
      label: 'Call us',
      url: getPhoneHref(phone),
      platform: 'call',
    });
  }

  const hasEmailCard = gridActionCards.some((c) => c.platform === 'email');
  if (email && !hasEmailCard) {
    gridActionCards.push({
      id: 'business-email',
      analyticsKey: 'business-email',
      label: 'Email us',
      url: `mailto:${email}`,
      platform: 'email',
    });
  }

  const displayName = businessName || headline || 'Business';
  const displayTagline = description || (headline && headline !== businessName ? headline : '');

  // Check if emoji is corrupted encoding (e.g. contains dY or question marks)
  const isCorruptedEmoji =
    !profileEmoji ||
    profileEmoji.includes('dY') ||
    profileEmoji.includes('?') ||
    profileEmoji.length > 6;

  return (
    <main className="v-customer-page" style={{ '--v-brand': primaryColor || '#1e3a68' }}>
      {toastMessage && (
        <div className="v-toast" role="status">
          <CheckIcon size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {preview && (
        <div className="v-preview-badge">
          <span>Draft preview &bull; Only you can see this</span>
        </div>
      )}

      <div className="v-container">
        {/* Top Header Row: Rating Badge & Share Button */}
        <header className="v-top-bar">
          <button
            type="button"
            className="v-back-btn"
            onClick={() => window.history.back()}
            aria-label="Go back"
          >
            <span aria-hidden="true">&larr;</span>
            <span>Back</span>
          </button>
          {reviewLink ? (
            <Link
              href={reviewLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="v-rating-pill"
              title="Review us on Google"
              onClick={() => trackLinkClick(reviewLink.id)}
            >
              <StarIcon size={16} className="v-star-icon" />
              <div className="v-rating-text">
                <span className="v-rating-score">5.0 &bull; 48</span>
                <span className="v-rating-sub">on Google</span>
              </div>
            </Link>
          ) : (
            <div style={{ flex: 1 }} />
          )}

          <button
            type="button"
            className="v-share-btn"
            onClick={handleShare}
            aria-label="Share this business"
            title="Share page"
          >
            <ShareIcon size={20} />
          </button>
        </header>

        {/* Business Identity */}
        <section className="v-hero-section">
          <div className="v-avatar-wrapper">
            <div className="v-avatar-ring">
              {profileImageUrl ? (
                <Image
                  className="v-avatar-image"
                  src={profileImageUrl}
                  alt={`${businessName} profile`}
                  width={68}
                  height={68}
                  sizes="68px"
                  fetchPriority="high"
                />
              ) : isCorruptedEmoji ? (
                <PhoenixAvatarIcon size={64} className="v-avatar-svg" />
              ) : (
                <span className="v-avatar-emoji">{profileEmoji}</span>
              )}
            </div>
          </div>

          <h1 className="v-business-name">{displayName}</h1>

          {displayTagline && <p className="v-tagline">{displayTagline}</p>}

          {locationText && (
            <div className="v-location-badge">
              {locationUrl ? (
                <Link
                  href={locationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="v-location-link"
                >
                  <LocationIcon size={15} className="v-pin-icon" />
                  <span>{locationText}</span>
                </Link>
              ) : (
                <span className="v-location-static">
                  <LocationIcon size={15} className="v-pin-icon" />
                  <span>{locationText}</span>
                </span>
              )}
            </div>
          )}
        </section>

        {/* Special Offer Card (Only if configured) */}
        {offerText && (
          <aside className="v-offer-card">
            <p className="v-offer-content">{offerText}</p>
          </aside>
        )}

        {/* Prioritize Google Reviews, with WhatsApp as the primary fallback. */}
        {primaryLink && (
          <div className="v-primary-cta-container">
            <Link
              href={primaryLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="v-primary-cta-card"
              onClick={() => trackLinkClick(primaryLink.id)}
            >
              <div className="v-cta-icon-box">
                {reviewLink ? <GoogleIcon size={26} /> : <WhatsAppIcon size={26} />}
              </div>
              <div className="v-cta-text-box">
                <span className="v-cta-title">
                  {primaryLink.label || (reviewLink ? 'Review us' : 'Chat on WhatsApp')}
                </span>
                <span className="v-cta-subtitle">
                  {reviewLink ? 'Opens Google Reviews' : 'Opens WhatsApp'}
                </span>
              </div>
              <div className="v-cta-arrow">
                <ArrowRightIcon size={20} />
              </div>
            </Link>
          </div>
        )}

        {/* Secondary Action Grid (2 columns matching reference image) */}
        {gridActionCards.length > 0 && (
          <section className="v-actions-section">
            <h2 className="v-section-title">MORE WAYS TO REACH US</h2>
            <div className="v-actions-grid">
              {gridActionCards.map((card) => (
                <Link
                  key={card.id}
                  href={card.url}
                  target={card.url.startsWith('tel:') ? '_self' : '_blank'}
                  rel={card.url.startsWith('tel:') ? undefined : 'noopener noreferrer'}
                  className="v-action-tile"
                  onClick={() => trackLinkClick(card.analyticsKey)}
                >
                  <div className="v-tile-icon-wrap">
                    {renderPlatformIcon(card.platform)}
                  </div>
                  <span className="v-tile-label">{card.label}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Guest Wi-Fi Card (Only if configured) */}
        {wifiSsid && (
          <section className="v-wifi-card">
            <div className="v-wifi-header">
              <span className="v-wifi-icon-badge">
                <WifiIcon size={20} />
              </span>
              <div className="v-wifi-info">
                <h3>Guest Wi-Fi</h3>
                <p>
                  Network: <strong>{wifiSsid}</strong>
                </p>
              </div>
            </div>
            {wifiPassword && (
              <div className="v-wifi-password-row">
                <div className="v-pass-wrap">
                  <span className="v-pass-label">Password:</span>
                  <code className="v-pass-code">{wifiPassword}</code>
                </div>
                <button
                  type="button"
                  onClick={handleCopyWifi}
                  className="v-wifi-copy-btn"
                  title="Copy Wi-Fi password"
                >
                  {copiedWifi ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                  <span>{copiedWifi ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            )}
            <button
              type="button"
              className="v-wifi-qr-toggle"
              onClick={() => {
                setWifiQrDataUrl(null);
                setShowWifiQr((visible) => !visible);
              }}
              aria-expanded={showWifiQr}
            >
              {showWifiQr ? 'Hide Wi-Fi QR' : 'Show Wi-Fi QR'}
            </button>
            {showWifiQr && (
              <div className="v-wifi-qr">
                {wifiQrDataUrl ? (
                  <img src={wifiQrDataUrl} alt={`Wi-Fi connection QR code for ${wifiSsid}`} width="220" height="220" />
                ) : (
                  <span role="status">Creating Wi-Fi QR…</span>
                )}
                <p>Scan with another device's camera, then confirm joining the network.</p>
              </div>
            )}
          </section>
        )}

        {/* Footer */}
        <footer className="v-footer">
          <Link href="/" className="v-powered-link">
            <span>Powered by</span>
            <strong>OneQR</strong>
          </Link>
        </footer>
      </div>
    </main>
  );
}
