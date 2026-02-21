import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseURL = "https://yourflipdomain.com"; // Change to your actual domain

  // Fetch all items from your database
  const { data: items } = await supabase
    .from('items')
    .select('id, updated_at');

  const productEntries = items?.map((item) => ({
    url: `${baseURL}/charts/${item.id}`,
    lastModified: new Date(item.updated_at),
    changeFrequency: 'hourly' as const,
    priority: 0.8,
  })) || [];

  return [
    {
      url: baseURL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseURL}/charts`,
      lastModified: new Date(),
      changeFrequency: 'always',
      priority: 0.9,
    },
    ...productEntries,
  ];
}
