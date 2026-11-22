import React from 'react';

export function GoogleIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}

export function WhatsAppIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path fill="#25D366" d="M12.04 2C6.54 2 2.07 6.47 2.07 11.97c0 1.95.56 3.86 1.63 5.51L2 22l4.67-1.64c1.58.98 3.4 1.5 5.37 1.5 5.5 0 9.97-4.47 9.97-9.97S17.54 2 12.04 2z" />
      <path fill="#FFFFFF" fillRule="evenodd" clipRule="evenodd" d="M8.5 6.8c-.2-.45-.42-.46-.61-.47-.16-.01-.35-.01-.54-.01-.19 0-.5.07-.76.35-.26.29-1 1-1 2.43 0 1.44 1.03 2.82 1.18 3.02.15.2 2.02 3.19 4.95 4.39 2.43 1 2.92.8 3.45.75.53-.05 1.7-.7 1.94-1.37.24-.67.24-1.25.17-1.37-.07-.12-.26-.2-.55-.34-.29-.15-1.7-.85-1.96-.95-.26-.1-.45-.15-.64.15-.19.29-.74.95-.91 1.14-.17.2-.34.22-.63.07-.29-.15-1.23-.46-2.34-1.47-.87-.78-1.45-1.75-1.62-2.04-.17-.3-.02-.45.13-.6.13-.13.29-.34.43-.51.15-.17.19-.29.29-.49.1-.2.05-.37-.02-.52-.08-.14-.62-1.55-.87-2.14z" />
    </svg>
  );
}

export function InstagramIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="insta-grad" cx="20%" cy="105%" r="130%">
          <stop offset="0%" stopColor="#fdf497" />
          <stop offset="5%" stopColor="#fdf497" />
          <stop offset="45%" stopColor="#fd5949" />
          <stop offset="60%" stopColor="#d6249f" />
          <stop offset="90%" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#insta-grad)" />
      <path stroke="#FFFFFF" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" d="M16 4H8C5.79 4 4 5.79 4 8v8c0 2.21 1.79 4 4 4h8c2.21 0 4-1.79 4-4V8c0-2.21-1.79-4-4-4z" />
      <circle cx="12" cy="12" r="3.6" stroke="#FFFFFF" strokeWidth="1.8" fill="none" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="#FFFFFF" />
    </svg>
  );
}

export function LinkedInIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect width="24" height="24" rx="5" fill="#0A66C2" />
      <path fill="#FFFFFF" d="M6.94 8.75H4.25V18h2.69V8.75zM5.59 5.25c-.86 0-1.56.7-1.56 1.56s.7 1.56 1.56 1.56 1.56-.7 1.56-1.56-.7-1.56-1.56-1.56zM18.75 18h-2.68v-4.5c0-1.12-.42-1.88-1.42-1.88-.77 0-1.22.52-1.42 1.02-.07.18-.09.43-.09.68V18h-2.69s.04-8.47 0-9.25h2.69v1.36c.36-.55 1-1.34 2.43-1.34 1.77 0 3.1 1.16 3.1 3.65V18z" />
    </svg>
  );
}

export function WebsiteIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

export function LocationIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function PhoneIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
    </svg>
  );
}

export function EmailIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

export function WifiIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" strokeWidth="3" />
    </svg>
  );
}

export function MenuIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
      <line x1="6" y1="1" x2="6" y2="4" />
      <line x1="10" y1="1" x2="10" y2="4" />
      <line x1="14" y1="1" x2="14" y2="4" />
    </svg>
  );
}

export function YouTubeIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect width="24" height="24" rx="5" fill="#FF0000" />
      <polygon points="10 8 16 12 10 16 10 8" fill="#FFFFFF" />
    </svg>
  );
}

export function FacebookIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect width="24" height="24" rx="5" fill="#1877F2" />
      <path fill="#FFFFFF" d="M14.5 12.5h2l.5-3h-2.5V8c0-.8.3-1.5 1.5-1.5h1V4.1c-.5-.1-1.5-.1-2.5-.1-2.6 0-4 1.6-4 4.5v2H8v3h2.5v7h4v-7z" />
    </svg>
  );
}

export function XTwitterIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect width="24" height="24" rx="5" fill="#000000" />
      <path fill="#FFFFFF" d="M17.5 4h2.5l-5.5 6.3L21 20h-5l-3.9-5.1L7.5 20H5l5.9-6.7L4.5 4h5.2l3.5 4.7L17.5 4zm-.9 14.5h1.4L8.5 5.4H7z" />
    </svg>
  );
}

export function StarIcon({ size = 16, className = '', filled = true }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "#FBBC05" : "none"} stroke="#FBBC05" strokeWidth="1.5" className={className} aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

export function ShareIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 16V4m0 0 4 4m-4-4L8 8" />
      <path d="M5 12v7h14v-7" />
    </svg>
  );
}

export function ArrowRightIcon({ size = 18, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export function CopyIcon({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function CheckIcon({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function QrBrandIcon({ size = 28, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="url(#brand-qr-grad)" />
      <rect x="6" y="6" width="8" height="8" rx="2" stroke="#FFFFFF" strokeWidth="2" fill="none" />
      <rect x="9" y="9" width="2" height="2" fill="#FFFFFF" />
      <rect x="18" y="6" width="8" height="8" rx="2" stroke="#FFFFFF" strokeWidth="2" fill="none" />
      <rect x="21" y="9" width="2" height="2" fill="#FFFFFF" />
      <rect x="6" y="18" width="8" height="8" rx="2" stroke="#FFFFFF" strokeWidth="2" fill="none" />
      <rect x="9" y="21" width="2" height="2" fill="#FFFFFF" />
      <path d="M18 19h4v4h-4zM22 23h4v3h-4zM18 24h3v2h-3z" fill="#FFFFFF" />
      <defs>
        <linearGradient id="brand-qr-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563eb" />
          <stop offset="1" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function PhoenixAvatarIcon({ size = 52, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="phoenix-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1e3a8a" />
          <stop offset="70%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#020617" />
        </radialGradient>
        <linearGradient id="phoenix-glow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#phoenix-bg)" stroke="url(#phoenix-glow)" strokeWidth="2.5" />
      {/* Stylized Phoenix / Bird soaring */}
      <path d="M32 14c2 3.5 6 7 11 8.5-4 1.5-7.5 2-10 4.5 5 1 9.5 3 13 6.5-6 .5-10.5 1-13.5 4.5 4 .5 7 1.5 9.5 4-7 1.5-11 4-13.5 8.5-1-4-2-7-5-9 3-2 6-4.5 6-7.5s-2-5-4.5-6.5c3-1.5 5.5-4 6.5-9z" fill="url(#phoenix-glow)" />
      <path d="M32 14c-2 3.5-6 7-11 8.5 4 1.5 7.5 2 10 4.5-5 1-9.5 3-13 6.5 6 .5 10.5 1 13.5 4.5-4 .5-7 1.5-9.5 4 7 1.5 11 4 13.5 8.5 1-4 2-7 5-9-3-2-6-4.5-6-7.5s2-5 4.5-6.5c-3-1.5-5.5-4-6.5-9z" fill="url(#phoenix-glow)" opacity="0.85" />
      <circle cx="32" cy="18" r="2.2" fill="#ffffff" />
    </svg>
  );
}
