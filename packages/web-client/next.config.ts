import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/documents/[id]': ['../../docs/*.md'],
  },
};

export default nextConfig;
