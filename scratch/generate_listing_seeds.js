require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const themedPortfolios = [
  // Portfolio 1: Scandinavian Minimalist
  [
    "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=1000&q=80",
    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1000&q=80",
    "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1000&q=80",
    "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1000&q=80",
    "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=1000&q=80"
  ],
  // Portfolio 2: Industrial Loft
  [
    "https://images.unsplash.com/photo-1502672260266-1c1e5240980c?w=1000&q=80",
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1000&q=80",
    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1000&q=80",
    "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=1000&q=80",
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1000&q=80"
  ],
  // Portfolio 3: Mid-Century Modern
  [
    "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=1000&q=80",
    "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1000&q=80",
    "https://images.unsplash.com/photo-1592595896551-12b371d546d5?w=1000&q=80",
    "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1000&q=80",
    "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1000&q=80"
  ],
  // Portfolio 4: Bohemian Oasis
  [
    "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=1000&q=80",
    "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=1000&q=80",
    "https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=1000&q=80",
    "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1000&q=80",
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1000&q=80"
  ],
  // Portfolio 5: Modern Sleek
  [
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1000&q=80",
    "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=1000&q=80",
    "https://images.unsplash.com/photo-1502005229762-fc1b2b812ca5?w=1000&q=80",
    "https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=1000&q=80",
    "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=1000&q=80"
  ]
];

async function generate() {
  const { data: profiles, error } = await supabase.from('profiles').select('id, name').limit(5);
  if (error) {
    console.error("Error:", error);
    return;
  }

  let sql = `DELETE FROM public.listings;\n\n`;
  sql += `INSERT INTO public.listings (user_id, title, description, price, address, images, utilities_included, status) VALUES\n`;

  profiles.forEach((p, i) => {
    const portfolio = themedPortfolios[i];
    const title = `Stunning ${['Scandinavian Loft', 'Industrial Studio', 'Mid-Century Home', 'Boho Oasis Apartment', 'Sleek Modern Flat'][i]} hosted by ${p.name.replace(/'/g, "''")}`;
    const description = `Welcome to this gorgeous cohabitation space! Features high-end designs, amazing natural ventilation, super cozy bedding, a fully equipped communal kitchen, and elegant bathrooms. Located in a super safe, highly walkable neighborhood near local bistros and transit. Looking for clean, friendly, and respectful roommates. Utilities and high-speed fiber internet included!`;
    const price = 600 + (i * 120);
    const address = `${['742 Evergreen Terrace', 'Industrial Ave 10', 'Sunset Blvd 302', 'Greenhouse District 44', 'Downtown Tech Hub'][i]}`;
    const utilities = i % 2 === 0;
    
    // Format postgres array e.g. ARRAY['url1', 'url2']
    const arrayStr = `ARRAY[` + portfolio.map(url => `'${url}'`).join(', ') + `]`;

    sql += `  ('${p.id}', '${title}', '${description.replace(/'/g, "''")}', ${price}, '${address.replace(/'/g, "''")}', ${arrayStr}, ${utilities}, 'available')`;
    if (i === profiles.length - 1) {
      sql += `;\n`;
    } else {
      sql += `,\n`;
    }
  });

  console.log(sql);
}

generate();
