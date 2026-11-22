const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '3mb' },
  },
  images: {
    remotePatterns: [{
      protocol: 'https',
      hostname: '*.supabase.co',
      pathname: '/storage/v1/object/public/business-profile-images/**',
    }],
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
