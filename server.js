require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { Restaurant, Category, MenuItem } = require('./models');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas (dreamland_oasis)'))
  .catch((err) => console.error('MongoDB connection error:', err));

/**
 * Helper to localize a category or item if ?lang=ge|en|ru is passed
 */
function localizeItem(item, lang) {
  if (!lang || !['ge', 'en', 'ru'].includes(lang)) return item;
  const obj = item.toObject ? item.toObject() : { ...item };
  obj.name = obj[`name_${lang}`] || obj.name;
  obj.description = obj[`description_${lang}`] || obj.description;
  if (obj[`categoryName_${lang}`]) {
    obj.categoryName = obj[`categoryName_${lang}`];
  }
  return obj;
}

// 1. Health / Root Info
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Dreamland Oasis Menu API is running',
    endpoints: [
      'GET /api/restaurants',
      'GET /api/restaurants/:slug',
      'GET /api/restaurants/:slug/menu',
      'GET /api/categories?restaurant=Georgian-Restaurant',
      'GET /api/categories/:categoryId/items',
      'GET /api/items?restaurant=Sky-Lounge&search=pizza&minPrice=10&maxPrice=50&lang=ge',
      'GET /api/items/:itemId',
      'POST /api/items',
      'PUT /api/items/:itemId',
      'DELETE /api/items/:itemId'
    ]
  });
});

// 2. Get all restaurants (without heavy nested menuTree by default unless ?includeMenu=true)
app.get('/api/restaurants', async (req, res) => {
  try {
    const includeMenu = req.query.includeMenu === 'true';
    const projection = includeMenu ? {} : { menuTree: 0 };
    const restaurants = await Restaurant.find({}, projection).sort({ explore_sort_order: 1 });
    res.json({ count: restaurants.length, data: restaurants });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Get single restaurant by slug or restaurantId (includes full menuTree)
app.get('/api/restaurants/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const query = isNaN(identifier)
      ? { slug: { $regex: new RegExp(`^${identifier}$`, 'i') } }
      : { restaurantId: Number(identifier) };

    const restaurant = await Restaurant.findOne(query);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    res.json({ data: restaurant });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Get full nested menu tree for a specific restaurant dynamically built from Category & MenuItem collections
app.get('/api/restaurants/:identifier/menu', async (req, res) => {
  try {
    const { identifier } = req.params;
    const { lang } = req.query;
    const query = isNaN(identifier)
      ? { slug: { $regex: new RegExp(`^${identifier}$`, 'i') } }
      : { restaurantId: Number(identifier) };

    const restaurant = await Restaurant.findOne(query, { menuTree: 0 });
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const categories = await Category.find({ restaurantId: restaurant.restaurantId }).sort({ sort_order: 1 }).lean();
    const items = await MenuItem.find({ restaurantId: restaurant.restaurantId }).sort({ sort_order: 1 }).lean();

    // Group items by categoryId
    const itemsByCat = {};
    for (const item of items) {
      const localized = localizeItem(item, lang);
      if (!itemsByCat[item.categoryId]) itemsByCat[item.categoryId] = [];
      itemsByCat[item.categoryId].push(localized);
    }

    // Build category tree
    const catMap = {};
    const rootCategories = [];

    for (const cat of categories) {
      if (lang && ['ge', 'en', 'ru'].includes(lang)) {
        cat.name = cat[`name_${lang}`] || cat.name;
      }
      cat.items = itemsByCat[cat.categoryId] || [];
      cat.children = [];
      catMap[cat.categoryId] = cat;
    }

    for (const cat of categories) {
      if (cat.parentId && catMap[cat.parentId]) {
        catMap[cat.parentId].children.push(cat);
      } else {
        rootCategories.push(cat);
      }
    }

    res.json({
      restaurant: {
        restaurantId: restaurant.restaurantId,
        slug: restaurant.slug,
        title_ge: restaurant.title_ge,
        title_en: restaurant.title_en,
        title_ru: restaurant.title_ru
      },
      menu: rootCategories
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Get categories (filter by ?restaurant=slug or ?parentId=...)
app.get('/api/categories', async (req, res) => {
  try {
    const { restaurant, parentId, mainOnly } = req.query;
    const filter = {};
    if (restaurant) {
      if (isNaN(restaurant)) {
        filter.restaurantSlug = { $regex: new RegExp(`^${restaurant}$`, 'i') };
      } else {
        filter.restaurantId = Number(restaurant);
      }
    }
    if (mainOnly === 'true') {
      filter.parentId = null;
    } else if (parentId !== undefined) {
      filter.parentId = parentId === 'null' ? null : Number(parentId);
    }

    const categories = await Category.find(filter).sort({ sort_order: 1 });
    res.json({ count: categories.length, data: categories });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Get items inside a specific category (including its subcategories)
app.get('/api/categories/:categoryId/items', async (req, res) => {
  try {
    const categoryId = Number(req.params.categoryId);
    const { lang } = req.query;

    const items = await MenuItem.find({
      $or: [{ categoryId }, { parentCategoryId: categoryId }]
    }).sort({ sort_order: 1 });

    const data = items.map(i => localizeItem(i, lang));
    res.json({ count: data.length, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Search and filter menu items across all or specific restaurants
app.get('/api/items', async (req, res) => {
  try {
    const { restaurant, categoryId, search, minPrice, maxPrice, lang, limit = 200, page = 1 } = req.query;
    const filter = {};

    if (restaurant) {
      if (isNaN(restaurant)) {
        filter.restaurantSlug = { $regex: new RegExp(`^${restaurant}$`, 'i') };
      } else {
        filter.restaurantId = Number(restaurant);
      }
    }

    if (categoryId) {
      const cid = Number(categoryId);
      filter.$or = [{ categoryId: cid }, { parentCategoryId: cid }];
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = Number(minPrice);
      if (maxPrice !== undefined) filter.price.$lte = Number(maxPrice);
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      const searchOr = [
        { name_ge: regex },
        { name_en: regex },
        { name_ru: regex },
        { description_ge: regex },
        { description_en: regex },
        { description_ru: regex }
      ];
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchOr }];
        delete filter.$or;
      } else {
        filter.$or = searchOr;
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      MenuItem.find(filter).sort({ sort_order: 1, itemId: 1 }).skip(skip).limit(Number(limit)),
      MenuItem.countDocuments(filter)
    ]);

    const data = items.map(i => localizeItem(i, lang));
    res.json({
      total,
      page: Number(page),
      limit: Number(limit),
      count: data.length,
      data
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Get single menu item by itemId
app.get('/api/items/:itemId', async (req, res) => {
  try {
    const item = await MenuItem.findOne({ itemId: Number(req.params.itemId) });
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    res.json({ data: localizeItem(item, req.query.lang) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Create a new menu item (POST /api/items)
app.post('/api/items', async (req, res) => {
  try {
    const body = req.body;
    if (!body.itemId) {
      const lastItem = await MenuItem.findOne().sort({ itemId: -1 });
      body.itemId = lastItem ? lastItem.itemId + 1 : 100000;
    }
    if (body.price !== undefined && !body.priceFormatted) {
      body.priceFormatted = Number(body.price).toFixed(2);
    }
    const newItem = await MenuItem.create(body);
    res.status(201).json({ message: 'Menu item created', data: newItem });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 10. Update an existing menu item (PUT /api/items/:itemId)
app.put('/api/items/:itemId', async (req, res) => {
  try {
    const updates = req.body;
    if (updates.price !== undefined && !updates.priceFormatted) {
      updates.priceFormatted = Number(updates.price).toFixed(2);
    }
    const updated = await MenuItem.findOneAndUpdate(
      { itemId: Number(req.params.itemId) },
      updates,
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    res.json({ message: 'Menu item updated', data: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 11. Delete a menu item (DELETE /api/items/:itemId)
app.delete('/api/items/:itemId', async (req, res) => {
  try {
    const deleted = await MenuItem.findOneAndDelete({ itemId: Number(req.params.itemId) });
    if (!deleted) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    res.json({ message: 'Menu item deleted', data: deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

module.exports = app;
