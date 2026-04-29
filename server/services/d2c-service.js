// D2C Product Catalog Service
// Reads from Google Sheet: D2C - PDP final database
// Or falls back to local Excel for development

const XLSX = require('xlsx');
const path = require('path');
const { google } = require('googleapis');
const config = require('../config');

const SHEET_ID = '1Bs7lV2U3_zHmvZ2j7SWeuEXLh-KaXyKJ';
const EXCEL_FALLBACK = '/Users/dan/Library/CloudStorage/GoogleDrive-danish@yourdesignstore.in/My Drive/market/YDS - tech-team/references/pdp-templates/_archive/v7-final/products/D2C - PDP final database.xlsx';

let sheetsClient = null;
let cache = {};
const CACHE_TTL = 5 * 60 * 1000;
let cacheTime = 0;

function getSheetsClient() {
  if (sheetsClient) return sheetsClient;
  if (!config.GOOGLE_SERVICE_ACCOUNT_KEY) return null;
  
  const key = config.GOOGLE_SERVICE_ACCOUNT_KEY;
  let creds;
  
  // If starts with '/', it's a file path; otherwise parse as JSON
  if (key.startsWith('/')) {
    const fs = require('fs');
    creds = JSON.parse(fs.readFileSync(key, 'utf-8'));
  } else {
    creds = JSON.parse(key);
  }
  
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

function getCached(key) {
  if (Date.now() - cacheTime > CACHE_TTL) {
    cache = {};
    cacheTime = Date.now();
  }
  return cache[key];
}

function setCache(key, data) {
  cache[key] = data;
  cacheTime = Date.now();
}

async function fetchSheet(sheetName) {
  const cached = getCached(sheetName);
  if (cached) return cached;

  const client = getSheetsClient();
  if (!client) {
    // Fallback to Excel
    const wb = XLSX.readFile(EXCEL_FALLBACK);
    const sheet = wb.Sheets[sheetName];
    if (!sheet) return [];
    const data = XLSX.utils.sheet_to_json(sheet);
    setCache(sheetName, data);
    return data;
  }

  try {
    const res = await client.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: sheetName
    });
    const rows = res.data.values || [];
    if (rows.length < 2) return [];
    
    const headers = rows[0];
    const data = rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i] || ''; });
      return obj;
    });
    setCache(sheetName, data);
    return data;
  } catch (e) {
    console.error('[d2c] Sheet fetch error:', e.message);
    // Fallback to Excel on error
    const wb = XLSX.readFile(EXCEL_FALLBACK);
    const sheet = wb.Sheets[sheetName];
    if (!sheet) return [];
    const data = XLSX.utils.sheet_to_json(sheet);
    setCache(sheetName, data);
    return data;
  }
}

/**
 * Get all products
 * @param {object} filters - Optional filters: category, method, is_live, search
 */
async function getProducts(filters = {}) {
  const products = await fetchSheet('Products');
  
  let result = products.filter(p => p.product_id);
  
  if (filters.category) {
    result = result.filter(p => 
      (p.category_raw || '').toLowerCase().includes(filters.category.toLowerCase())
    );
  }
  
  if (filters.is_live === true) {
    result = result.filter(p => p.is_live === true || p.is_live === 'TRUE' || p.is_live === '1');
  }
  
  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(p => 
      (p.product_name || '').toLowerCase().includes(q) ||
      (p.product_slug || '').toLowerCase().includes(q)
    );
  }
  
  return result.map(p => ({
    id: p.product_id,
    name: p.product_name,
    slug: p.product_slug,
    category: p.category_raw,
    silhouette: p.silhouette,
    manufacturer: p.manufacturer,
    gsm: p.gsm,
    weight: p.weight,
    price_inr: p.price_inr,
    description: p.description_raw,
    image_url: p.image_url,
    print_areas: p.print_areas,
    embroidery_areas: p.embroidable_area_note,
    is_live: p.is_live === true || p.is_live === 'TRUE',
    whitelabel_available: p.whitelabel_available,
    rush_available: p.rush_available,
    product_type: p.product_type,
  }));
}

/**
 * Get single product by slug or id
 */
async function getProduct(identifier) {
  const products = await fetchSheet('Products');
  const product = products.find(p => 
    p.product_slug === identifier || p.product_id === identifier || p.product_id === Number(identifier)
  );
  
  if (!product) return null;
  
  // Get methods for this product
  const map = await fetchSheet('Product_Method_Map');
  const methodIds = map
    .filter(m => m.product_id === product.product_id && m.enabled !== false)
    .map(m => ({ method_id: m.method_id, method_name: m.method_name, allowed_placements: m.allowed_placements }));
  
  // Get variants
  const variants = await fetchSheet('Product_Variants');
  const productVariants = variants.filter(v => v.product_slug === product.product_slug);
  
  // Get copy
  const copy = await fetchSheet('Product_Copy');
  const productCopy = copy.find(c => c.product_id === product.product_id);
  
  return {
    id: product.product_id,
    name: product.product_name,
    slug: product.product_slug,
    category: product.category_raw,
    silhouette: product.silhouette,
    manufacturer: product.manufacturer,
    gsm: product.gsm,
    weight: product.weight,
    price_inr: product.price_inr,
    description: product.description_raw,
    image_url: product.image_url,
    print_areas: product.print_areas,
    embroidery_areas: product.embroidable_area_note,
    is_live: product.is_live,
    whitelabel_available: product.whitelabel_available,
    rush_available: product.rush_available,
    methods: methodIds,
    variants: productVariants.map(v => ({
      label: v.variant_label,
      gsm: v.gsm,
      price_inr: v.price_inr,
      colors_available: v.colors_available,
      sizes_available: v.sizes_available,
      is_default: v.is_default,
    })),
    copy: productCopy ? {
      h1: productCopy.h1,
      seo_description: productCopy.seo_description,
      fabric_headline: productCopy.fabric_composition,
      intro_body: productCopy.intro_body,
      when_to_choose_it: productCopy.when_to_choose_it,
      faqs: [
        { q: productCopy.faq_1_q, a: productCopy.faq_1_a },
        { q: productCopy.faq_2_q, a: productCopy.faq_2_a },
        { q: productCopy.faq_3_q, a: productCopy.faq_3_a },
      ].filter(f => f.q),
    } : null,
  };
}

/**
 * Get all categories
 */
async function getCategories() {
  const categories = await fetchSheet('Categories');
  
  return categories
    .filter(c => c.category_id)
    .map(c => ({
      id: c.category_id,
      name: c.category_name,
      product_count: c.product_count,
      silhouettes_present: c.silhouettes_present,
      template: c.template,
      has_embroidery: c.has_embroidery,
      thread_colors: c.thread_colors,
      default_fit: c.default_fit,
      default_origin: c.default_origin,
    }));
}

/**
 * Get all print methods
 */
async function getMethods() {
  const methods = await fetchSheet('Methods');
  
  return methods
    .filter(m => m.method_id)
    .map(m => ({
      id: m.method_id,
      name: m.method_name,
      method_slug: m.method_slug,
      moq: m.moq,
      best_for: m.best_for,
      accepted_file_formats: m.accepted_file_formats,
      colour_mode: m.colour_mode,
      resolution: m.resolution,
      max_colours_threads: m.max_colours_threads,
      max_print_area: m.max_print_area,
      background_required: m.background_required,
      is_active: m.is_active,
      icon_url: m.icon_url,
      badge_text: m.badge_text,
      badge_type: m.badge_type,
      durability: m.durability,
      durability_pct: m.durability_pct,
    }));
}

/**
 * Get method by slug
 */
async function getMethod(slug) {
  const methods = await fetchSheet('Methods');
  const method = methods.find(m => m.method_slug === slug);
  
  if (!method) return null;
  
  // Get products for this method
  const map = await fetchSheet('Product_Method_Map');
  const productIds = map
    .filter(m => m.method_id === method.method_id && m.enabled !== false)
    .map(m => m.product_id);
  
  // Get color options
  const colors = await fetchSheet('Method_Colours');
  const methodColors = colors.filter(c => c.method_slug === slug && c.is_active !== false);
  
  return {
    id: method.method_id,
    name: method.method_name,
    slug: method.method_slug,
    moq: method.moq,
    best_for: method.best_for,
    accepted_file_formats: method.accepted_file_formats,
    colour_mode: method.colour_mode,
    resolution: method.resolution,
    max_colours_threads: method.max_colours_threads,
    max_print_area: method.max_print_area,
    background_required: method.background_required,
    is_active: method.is_active,
    icon_url: method.icon_url,
    badge_text: method.badge_text,
    badge_type: method.badge_type,
    durability: method.durability,
    durability_pct: method.durability_pct,
    product_count: productIds.length,
    colors: methodColors.map(c => ({
      slug: c.variant_slug,
      name: c.variant_name,
      hex: c.hex,
      thread_code: c.thread_code,
    })),
  };
}

/**
 * Get product variants
 */
async function getVariants(productSlug) {
  const variants = await fetchSheet('Product_Variants');
  const filtered = variants.filter(v => v.product_slug === productSlug);
  
  return filtered.map(v => ({
    label: v.variant_label,
    gsm: v.gsm,
    price_inr: v.price_inr,
    weight: v.weight,
    colors_available: v.colors_available,
    sizes_available: v.sizes_available,
    is_default: v.is_default,
  }));
}

/**
 * Get products by method
 */
async function getProductsByMethod(methodSlug) {
  const map = await fetchSheet('Product_Method_Map');
  const products = await fetchSheet('Products');
  
  const productIds = map
    .filter(m => m.method_name && m.method_name.toLowerCase().includes(methodSlug.toLowerCase()) && m.enabled !== false)
    .map(m => m.product_id);
  
  return products
    .filter(p => productIds.includes(p.product_id))
    .map(p => ({
      id: p.product_id,
      name: p.product_name,
      slug: p.product_slug,
      category: p.category_raw,
      price_inr: p.price_inr,
      image_url: p.image_url,
    }));
}

/**
 * Search products
 */
async function searchProducts(query) {
  return getProducts({ search: query });
}

module.exports = {
  getProducts,
  getProduct,
  getCategories,
  getMethods,
  getMethod,
  getVariants,
  getProductsByMethod,
  searchProducts,
};