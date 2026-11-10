const fs = require('fs');

const files = [
  ["Georgian-Restaurant", "https://dreamland.ge/menu/Georgian-Restaurant", "georgian.html"],
  ["Sky-Lounge", "https://dreamland.ge/menu/Sky-Lounge", "skylounge.html"],
  ["Beach-Bar", "https://dreamland.ge/menu/Beach-Bar", "beachbar.html"],
];

function unescapeHtml(str) {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function extractProp(content, propName) {
  const regex = new RegExp(`^\\s*${propName}:\\s*(.+?),\\s*$`, 'm');
  const match = content.match(regex);
  if (!match) return null;
  const raw = unescapeHtml(match[1]);
  return JSON.parse(raw);
}

function enrichCategory(cat) {
  if (cat.image) {
    cat.image_url = `https://dreamland.ge/img/restaurants/menu/${cat.image}`;
  }
  if (Array.isArray(cat.items)) {
    for (const item of cat.items) {
      if (item.image) {
        item.image_url = `https://dreamland.ge/img/restaurants/menu/${item.image}`;
      }
    }
  }
  if (Array.isArray(cat.children)) {
    for (const child of cat.children) {
      enrichCategory(child);
    }
  }
}

const allData = {};

for (const [slug, url, filename] of files) {
  const text = fs.readFileSync(filename, 'utf8');
  const restaurant = extractProp(text, 'restaurant');
  const menu = extractProp(text, 'menu');
  const deals = extractProp(text, 'deals');
  const chefs = extractProp(text, 'chefs');
  const popupBanners = extractProp(text, 'popupBanners');

  if (Array.isArray(menu)) {
    for (const cat of menu) {
      enrichCategory(cat);
    }
  }

  if (restaurant) {
    if (restaurant.logo) {
      restaurant.logo_url = `https://dreamland.ge/img/restaurants/logos/${restaurant.logo}`;
    }
    if (restaurant.hero_image) {
      restaurant.hero_image_url = `https://dreamland.ge/img/restaurants/hero/${restaurant.hero_image}`;
    }
    if (restaurant.bg_image) {
      restaurant.bg_image_url = `https://dreamland.ge/img/restaurants/bg/${restaurant.bg_image}`;
    }
    if (restaurant.photo) {
      restaurant.photo_url = `https://dreamland.ge/imgs/restaurants/${restaurant.photo}`;
    }
  }

  const entry = {
    url,
    slug,
    restaurant,
    menu,
    deals,
    chefs,
    popupBanners,
  };

  allData[slug] = entry;

  const outSingle = `${slug.toLowerCase().replace(/-/g, '_')}.json`;
  fs.writeFileSync(outSingle, JSON.stringify(entry, null, 2), 'utf8');

  let totalSubcats = 0;
  let totalItems = 0;
  for (const c of (menu || [])) {
    totalItems += (c.items || []).length;
    for (const sub of (c.children || [])) {
      totalSubcats++;
      totalItems += (sub.items || []).length;
    }
  }
  console.log(`${slug}: ${(menu || []).length} main categories, ${totalSubcats} subcategories, ${totalItems} items, deals=${(deals || []).length}, chefs=${(chefs || []).length}`);
}

fs.writeFileSync('dreamland_menus.json', JSON.stringify(allData, null, 2), 'utf8');
console.log('Saved combined data to dreamland_menus.json');
