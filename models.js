const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  restaurantId: { type: Number, required: true, unique: true, index: true },
  slug: { type: String, required: true, unique: true, index: true },
  url: { type: String },
  title_ge: { type: String },
  title_en: { type: String },
  title_ru: { type: String },
  title: { type: String },
  short_description_ge: { type: String },
  short_description_en: { type: String },
  short_description_ru: { type: String },
  short_description: { type: String },
  description_ge: { type: String },
  description_en: { type: String },
  description_ru: { type: String },
  text_ge: { type: String },
  text_en: { type: String },
  text_ru: { type: String },
  photo: { type: String },
  photo_url: { type: String },
  logo: { type: String },
  logo_url: { type: String },
  hero_image: { type: String },
  hero_image_url: { type: String },
  bg_image: { type: String },
  bg_image_url: { type: String },
  primary_color: { type: String },
  secondary_color: { type: String },
  bg_color: { type: String },
  text_color: { type: String },
  soft_color: { type: String },
  muted_color: { type: String },
  card_color: { type: String },
  phone: { type: String },
  facebook_url: { type: String },
  instagram_url: { type: String },
  tiktok_url: { type: String },
  messenger_url: { type: String },
  explore_sort_order: { type: Number, default: 0 },
  is_menu_active: { type: Boolean, default: true },
  popupBanners: { type: Array, default: [] },
  deals: { type: Array, default: [] },
  chefs: { type: Array, default: [] },
  menuTree: { type: Array, default: [] } // Full nested menu structure
}, { timestamps: true });

const categorySchema = new mongoose.Schema({
  categoryId: { type: Number, required: true, unique: true, index: true },
  restaurantId: { type: Number, required: true, index: true },
  restaurantSlug: { type: String, required: true, index: true },
  parentId: { type: Number, default: null, index: true },
  name_ge: { type: String },
  name_en: { type: String },
  name_ru: { type: String },
  name: { type: String },
  image: { type: String },
  image_url: { type: String },
  sort_order: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

const menuItemSchema = new mongoose.Schema({
  itemId: { type: Number, required: true, unique: true, index: true },
  categoryId: { type: Number, required: true, index: true },
  parentCategoryId: { type: Number, default: null, index: true },
  restaurantId: { type: Number, required: true, index: true },
  restaurantSlug: { type: String, required: true, index: true },
  categoryName_ge: { type: String },
  categoryName_en: { type: String },
  categoryName_ru: { type: String },
  name_ge: { type: String, index: true },
  name_en: { type: String, index: true },
  name_ru: { type: String, index: true },
  name: { type: String },
  description_ge: { type: String },
  description_en: { type: String },
  description_ru: { type: String },
  description: { type: String },
  price: { type: Number, required: true, index: true },
  priceFormatted: { type: String },
  weight_volume: { type: String, default: null },
  image: { type: String, default: null },
  image_url: { type: String, default: null },
  sort_order: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

const Restaurant = mongoose.model('Restaurant', restaurantSchema);
const Category = mongoose.model('Category', categorySchema);
const MenuItem = mongoose.model('MenuItem', menuItemSchema);

module.exports = { Restaurant, Category, MenuItem };
