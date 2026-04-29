// D2C Product Catalog Module
// Fetches from /api/d2c endpoints

export function createD2cModule() {
  return {
    // Products list
    d2cProducts: [],
    d2cCategories: [],
    d2cMethods: [],
    d2cLoading: false,
    d2cError: null,
    
    // Filters
    d2cFilterCategory: '',
    d2cFilterMethod: '',
    d2cFilterSearch: '',
    d2cShowLiveOnly: false, // Disabled - most products have is_live=false
    
    // Detail view
    d2cSelectedProduct: null,
    d2cProductLoading: false,
    d2cDetailOpen: false,
    
    // Categories/Methods tabs
    d2cActiveTab: 'products', // products | categories | methods

    // Sheet meta (populated from /api/d2c/products response)
    d2cMeta: null,

    async loadD2cProducts() {
      this.d2cLoading = true;
      this.d2cError = null;
      console.log('[d2c] Loading products, state:', { products: this.d2cProducts?.length });

      try {
        const params = new URLSearchParams();
        if (this.d2cFilterCategory) params.set('category', this.d2cFilterCategory);
        if (this.d2cFilterMethod) params.set('method', this.d2cFilterMethod);
        if (this.d2cFilterSearch) params.set('search', this.d2cFilterSearch);
        // is_live filter disabled - only 1 product has is_live=true
        // if (this.d2cShowLiveOnly) params.set('is_live', 'true');

        const res = await fetch('/api/d2c/products?' + params.toString());
        const data = await res.json();

        console.log('[d2c] Products loaded:', data.total);
        this.d2cProducts = data.products || [];
        if (data.meta) this.d2cMeta = data.meta;
      } catch (e) {
        this.d2cError = e.message;
        console.error('[d2c] Load error:', e);
      } finally {
        this.d2cLoading = false;
      }
    },
    
    async loadD2cCategories() {
      try {
        const res = await fetch('/api/d2c/categories');
        const data = await res.json();
        this.d2cCategories = data.categories || [];
      } catch (e) {
        console.error('D2C categories error:', e);
      }
    },
    
    async loadD2cMethods() {
      try {
        const res = await fetch('/api/d2c/methods');
        const data = await res.json();
        this.d2cMethods = data.methods || [];
      } catch (e) {
        console.error('D2C methods error:', e);
      }
    },
    
    async loadD2cProduct(slug) {
      this.d2cProductLoading = true;
      this.d2cDetailOpen = true;
      
      try {
        const res = await fetch('/api/d2c/products/' + slug);
        if (!res.ok) throw new Error('Product not found');
        
        this.d2cSelectedProduct = await res.json();
      } catch (e) {
        console.error('D2C product detail error:', e);
        this.d2cSelectedProduct = null;
      } finally {
        this.d2cProductLoading = false;
      }
    },
    
    closeD2cDetail() {
      this.d2cDetailOpen = false;
      this.d2cSelectedProduct = null;
    },
    
    formatPrice(inr) {
      if (!inr) return '';
      return '₹' + Number(inr).toLocaleString('en-IN');
    },
    
    async initD2c() {
      await Promise.all([
        this.loadD2cProducts(),
        this.loadD2cCategories(),
        this.loadD2cMethods(),
      ]);
    },
  };
}