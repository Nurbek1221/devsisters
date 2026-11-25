import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/verify/'],
        disallow: ['/admin', '/teacher', '/student', '/api/'],
      },
    ],
    sitemap: 'https://devsisters.uz/sitemap.xml',
    host: 'https://devsisters.uz',
  };
}
