import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://devsisters.uz';
  const lastModified = new Date('2026-11-25');

  return [
    {
      url: baseUrl,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/login`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/verify/DS-2026-0001`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];
}
