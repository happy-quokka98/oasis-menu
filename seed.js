require('dotenv').config();
const fs = require('fs');
const mongoose = require('mongoose');
const { Restaurant, Category, MenuItem } = require('./models');

async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB successfully!');

    const rawData = fs.readFileSync('dreamland_menus.json', 'utf8');
    const data = JSON.parse(rawData);

    // Clear existing records to prevent duplicates on re-runs
    await Restaurant.deleteMany({});
    await Category.deleteMany({});
    await MenuItem.deleteMany({});
    console.log('Cleared existing collections.');

    let restaurantCount = 0;
    let categoryCount = 0;
    let itemCount = 0;

    for (const [slugKey, entry] of Object.entries(data)) {
      const rest = entry.restaurant;
      const restaurantId = Number(rest.id);
      const restaurantSlug = entry.slug || rest.slug || slugKey;

      const restaurantDoc = new Restaurant({
        restaurantId,
        slug: restaurantSlug,
        url: entry.url,
        title_ge: rest.title_ge,
        title_en: rest.title_en,
        title_ru: rest.title_ru,
        title: rest.title,
        short_description_ge: rest.short_description_ge,
        short_description_en: rest.short_description_en,
        short_description_ru: rest.short_description_ru,
        short_description: rest.short_description,
        description_ge: rest.description_ge,
        description_en: rest.description_en,
        description_ru: rest.description_ru,
        text_ge: rest.text_ge,
        text_en: rest.text_en,
        text_ru: rest.text_ru,
        photo: rest.photo,
        photo_url: rest.photo_url,
        logo: rest.logo,
        logo_url: rest.logo_url,
        hero_image: rest.hero_image,
        hero_image_url: rest.hero_image_url,
        bg_image: rest.bg_image,
        bg_image_url: rest.bg_image_url,
        primary_color: rest.primary_color,
        secondary_color: rest.secondary_color,
        bg_color: rest.bg_color,
        text_color: rest.text_color,
        soft_color: rest.soft_color,
        muted_color: rest.muted_color,
        card_color: rest.card_color,
        phone: rest.phone,
        facebook_url: rest.facebook_url,
        instagram_url: rest.instagram_url,
        tiktok_url: rest.tiktok_url,
        messenger_url: rest.messenger_url,
        explore_sort_order: Number(rest.explore_sort_order || 0),
        is_menu_active: Boolean(rest.is_menu_active),
        popupBanners: entry.popupBanners || [],
        deals: entry.deals || [],
        chefs: entry.chefs || [],
        menuTree: entry.menu || []
      });

      await restaurantDoc.save();
      restaurantCount++;

      async function processCategory(cat, parentId = null) {
        const categoryId = Number(cat.id);
        await Category.findOneAndUpdate(
          { categoryId },
          {
            categoryId,
            restaurantId,
            restaurantSlug,
            parentId: parentId ? Number(parentId) : (cat.parent_id ? Number(cat.parent_id) : null),
            name_ge: cat.name_ge,
            name_en: cat.name_en,
            name_ru: cat.name_ru,
            name: cat.name,
            image: cat.image,
            image_url: cat.image_url || null,
            sort_order: Number(cat.sort_order || 0),
            is_active: Boolean(cat.is_active)
          },
          { upsert: true, new: true }
        );
        categoryCount++;

        if (Array.isArray(cat.items)) {
          for (const item of cat.items) {
            const itemId = Number(item.id);
            const numericPrice = parseFloat(item.price) || 0;
            await MenuItem.findOneAndUpdate(
              { itemId },
              {
                itemId,
                categoryId,
                parentCategoryId: parentId ? Number(parentId) : null,
                restaurantId,
                restaurantSlug,
                categoryName_ge: cat.name_ge,
                categoryName_en: cat.name_en,
                categoryName_ru: cat.name_ru,
                name_ge: item.name_ge,
                name_en: item.name_en,
                name_ru: item.name_ru,
                name: item.name,
                description_ge: item.description_ge,
                description_en: item.description_en,
                description_ru: item.description_ru,
                description: item.description,
                price: numericPrice,
                priceFormatted: item.price,
                weight_volume: item.weight_volume,
                image: item.image,
                image_url: item.image_url || null,
                sort_order: Number(item.sort_order || 0),
                is_active: item.is_active === '1' || item.is_active === true
              },
              { upsert: true, new: true }
            );
            itemCount++;
          }
        }

        if (Array.isArray(cat.children)) {
          for (const subCat of cat.children) {
            await processCategory(subCat, categoryId);
          }
        }
      }

      for (const mainCat of (entry.menu || [])) {
        await processCategory(mainCat, null);
      }

      console.log(`Uploaded ${restaurantSlug} successfully.`);
    }

    console.log(`\nSeeding completed!`);
    console.log(`- Restaurants uploaded: ${restaurantCount}`);
    console.log(`- Categories uploaded: ${categoryCount}`);
    console.log(`- Menu Items uploaded: ${itemCount}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error seeding database:', err);
    process.exit(1);
  }
}

seedDatabase();
