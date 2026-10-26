import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const PRODUCTS_FILE = fs.existsSync(path.join(DATA_DIR, 'products.json'))
  ? path.join(DATA_DIR, 'products.json')
  : (fs.existsSync(path.resolve(__dirname, '../data/products.json'))
      ? path.resolve(__dirname, '../data/products.json')
      : path.join(DATA_DIR, 'products.json'));
const STORAGE_FILE = path.join(DATA_DIR, 'storage.json');

class Database {
  constructor() {
    this.products = new Map();
    this.leads = new Map();
    this.enquiries = new Map();
    this.calls = new Map();
    this.conversations = new Map();
    this.orders = new Map();
    this.followups = new Map();
    this.customers = new Map();
    this.orderEnquiries = new Map();
    this.verifiedFacts = new Map();
    this.initialized = false;
    this.mongoClient = null;
    this.mongoDb = null;
    this.mongoConnected = false;
    this.mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/trendvibe';
    this.mongoDbName = process.env.MONGODB_DB_NAME || 'trendvibe';
    this._persistingMongo = false;
    this._pendingMongoPersist = false;
  }

  getMongoStatus() {
    return {
      configured: Boolean(this.mongoUri),
      connected: this.mongoConnected,
      database: this.mongoDb ? this.mongoDb.databaseName : null,
      fallback: !this.mongoConnected
    };
  }

  async getDbStatus() {
    if (!this.mongoConnected || !this.mongoDb) {
      return {
        success: true,
        database: 'json-fallback',
        connected: false,
        configured: Boolean(this.mongoUri),
        collections: {
          products: this.products.size,
          orders: this.orders.size,
          leads: this.leads.size,
          customers: this.customers.size,
          calls: this.calls.size,
          enquiries: this.enquiries.size,
          orderEnquiries: this.orderEnquiries.size,
          verifiedFacts: this.verifiedFacts.size
        }
      };
    }

    try {
      const collections = ['products', 'orders', 'leads', 'customers', 'calls', 'enquiries', 'conversations', 'orderEnquiries', 'verifiedFacts'];
      const counts = {};
      for (const name of collections) {
        counts[name] = await this.mongoDb.collection(name).countDocuments();
      }
      return {
        success: true,
        database: 'mongodb',
        connected: true,
        databaseName: this.mongoDb.databaseName,
        collections: counts,
        memoryCounts: {
          products: this.products.size,
          orders: this.orders.size,
          leads: this.leads.size,
          customers: this.customers.size,
          verifiedFacts: this.verifiedFacts.size
        }
      };
    } catch (err) {
      return {
        success: false,
        database: 'mongodb',
        connected: false,
        error: err.message
      };
    }
  }

  async initializeMongo() {
    const uri = this.mongoUri || process.env.MONGODB_URI;
    if (!uri) {
      console.log('[DB] MongoDB not configured. Using JSON persistence only.');
      return;
    }

    try {
      this.mongoClient = new MongoClient(uri, {
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 10
      });
      await this.mongoClient.connect();
      this.mongoDb = this.mongoClient.db(this.mongoDbName || process.env.MONGODB_DB_NAME || 'trendvibe');
      this.mongoConnected = true;
      console.log(`[DB] Connected to MongoDB database: ${this.mongoDb.databaseName}`);

      const collections = ['products', 'leads', 'enquiries', 'calls', 'conversations', 'orders', 'followups', 'customers', 'orderEnquiries', 'verifiedFacts'];
      const existing = await this.mongoDb.listCollections({ name: { $in: collections } }).toArray();
      const names = new Set(existing.map(c => c.name));
      for (const name of collections) {
        if (!names.has(name)) {
          await this.mongoDb.createCollection(name);
        }
      }

      // Ensure indexes on collections
      try {
        await this.mongoDb.collection('products').createIndex({ id: 1 }, { unique: true });
        await this.mongoDb.collection('products').createIndex({ category: 1 });
        await this.mongoDb.collection('orders').createIndex({ id: 1 }, { unique: true });
        await this.mongoDb.collection('orders').createIndex({ leadId: 1 });
        await this.mongoDb.collection('orders').createIndex({ orderStatus: 1 });
        await this.mongoDb.collection('leads').createIndex({ id: 1 }, { unique: true });
        await this.mongoDb.collection('leads').createIndex({ phone: 1 });
        await this.mongoDb.collection('customers').createIndex({ id: 1 }, { unique: true });
        await this.mongoDb.collection('customers').createIndex({ mobile: 1 });
        await this.mongoDb.collection('verifiedFacts').createIndex({ id: 1 }, { unique: true });
        await this.mongoDb.collection('verifiedFacts').createIndex({ productId: 1, attributeKey: 1 });
      } catch (idxErr) {
        // Indexes might already exist
      }
    } catch (err) {
      console.warn('[DB] MongoDB connection failed; falling back to JSON storage:', err.message);
      this.mongoClient = null;
      this.mongoDb = null;
      this.mongoConnected = false;
    }
  }

  async persistToMongo() {
    if (!this.mongoConnected || !this.mongoDb) return;
    if (this._persistingMongo) {
      this._pendingMongoPersist = true;
      return;
    }
    this._persistingMongo = true;

    try {
      do {
        this._pendingMongoPersist = false;
        const state = {
          products: Array.from(this.products.values()),
          leads: Array.from(this.leads.values()),
          enquiries: Array.from(this.enquiries.values()),
          calls: Array.from(this.calls.values()),
          conversations: Array.from(this.conversations.values()),
          orders: Array.from(this.orders.values()),
          followups: Array.from(this.followups.values()),
          customers: Array.from(this.customers.values()),
          orderEnquiries: Array.from(this.orderEnquiries.values()),
          verifiedFacts: Array.from(this.verifiedFacts.values()),
          updatedAt: new Date().toISOString()
        };

        const collections = [
          ['products', state.products],
          ['leads', state.leads],
          ['enquiries', state.enquiries],
          ['calls', state.calls],
          ['conversations', state.conversations],
          ['orders', state.orders],
          ['followups', state.followups],
          ['customers', state.customers],
          ['orderEnquiries', state.orderEnquiries],
          ['verifiedFacts', state.verifiedFacts]
        ];

        for (const [name, docs] of collections) {
          const collection = this.mongoDb.collection(name);
          if (docs.length === 0) {
            await collection.deleteMany({});
          } else {
            const validIds = docs.map(d => d.id).filter(Boolean);
            if (validIds.length > 0) {
              await collection.deleteMany({ id: { $nin: validIds } });
            }
            const ops = docs.map(d => {
              const copy = { ...d };
              delete copy._id;
              return {
                updateOne: {
                  filter: { id: d.id },
                  update: { $set: copy },
                  upsert: true
                }
              };
            });
            if (ops.length > 0) {
              await collection.bulkWrite(ops, { ordered: false });
            }
          }
        }

        await this.mongoDb.collection('metadata').updateOne(
          { key: 'app_state' },
          { $set: { value: state, updatedAt: new Date().toISOString() } },
          { upsert: true }
        );
      } while (this._pendingMongoPersist);
    } catch (err) {
      console.warn('[DB] MongoDB sync failed during persistToMongo:', err.message);
    } finally {
      this._persistingMongo = false;
    }
  }

  async initialize() {
    if (this.initialized) return;

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    await this.initializeMongo();

    // 1. Load Products from products.json
    if (fs.existsSync(PRODUCTS_FILE)) {
      try {
        const rawProducts = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf-8'));
        rawProducts.forEach(p => {
          if (p.stockCount === undefined && p.stock && typeof p.stock.overall === 'number') {
            p.stockCount = p.stock.overall;
          }
          if (!p.stock) {
            p.stock = { overall: typeof p.stockCount === 'number' ? p.stockCount : null, variants: {} };
          } else if (typeof p.stock.overall !== 'number' && typeof p.stockCount === 'number') {
            p.stock.overall = p.stockCount;
          }
          if (!p.stock.variants) {
            p.stock.variants = {};
          }
          if (!p.image && p.imageUrl) {
            p.image = p.imageUrl;
          }
          if (!p.imageUrl && p.image) {
            p.imageUrl = p.image;
          }
          if (!p.instagramVideoPostUrl) {
            p.instagramVideoPostUrl = `https://www.instagram.com/reel/post_${p.id}/`;
          }
          this.products.set(p.id, p);
        });
        console.log(`[DB] Loaded ${this.products.size} products from products.json`);
      } catch (err) {
        console.error('[DB] Failed to load products.json:', err.message);
      }
    }

    // 2. Load Persisted Storage if available
    if (fs.existsSync(STORAGE_FILE)) {
      try {
        const state = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf-8'));
        if (state.leads) state.leads.forEach(l => this.leads.set(l.id, l));
        if (state.enquiries) state.enquiries.forEach(e => this.enquiries.set(e.id, e));
        if (state.calls) state.calls.forEach(c => this.calls.set(c.id, c));
        if (state.conversations) state.conversations.forEach(cv => this.conversations.set(cv.id, cv));
        if (state.orders) {
          const couriers = ['BlueDart Express', 'Delhivery Air', 'DTDC Priority'];
          state.orders.forEach(o => {
            if (!o.courier) o.courier = couriers[Math.floor(Math.random() * couriers.length)];
            if (!o.trackingNumber) {
              const pfx = o.courier.startsWith('Blue') ? 'BD' : (o.courier.startsWith('Delhi') ? 'DELH' : 'DTDC');
              o.trackingNumber = `${pfx}-${Math.floor(100000 + Math.random() * 900000)}-IN`;
            }
            if (!o.estimatedDelivery) o.estimatedDelivery = '2-3 Business Days';
            if (!o.timeline || !Array.isArray(o.timeline) || o.timeline.length === 0) {
              o.timeline = [
                {
                  status: 'Confirmed',
                  timestamp: o.createdAt || new Date().toISOString(),
                  location: 'TrendVibe Central Fulfillment Center, Bengaluru',
                  note: 'Order registered in warehouse queue'
                }
              ];
              if (o.orderStatus && o.orderStatus !== 'Confirmed') {
                o.timeline.push({
                  status: o.orderStatus,
                  timestamp: o.updatedAt || new Date().toISOString(),
                  location: o.orderStatus === 'Delivered' ? 'Delivered to Customer Doorstep' : 'In Transit via Logistics Hub',
                  note: `Package reached ${o.orderStatus}`
                });
              }
            }
            this.orders.set(o.id, o);
          });
        }
        if (state.followups) state.followups.forEach(f => this.followups.set(f.id, f));
        if (state.customers) state.customers.forEach(c => this.customers.set(c.id, c));
        if (state.orderEnquiries) state.orderEnquiries.forEach(e => this.orderEnquiries.set(e.id, e));
        if (state.verifiedFacts) state.verifiedFacts.forEach(vf => this.verifiedFacts.set(vf.id, vf));
        console.log(`[DB] Restored state from storage.json (${this.leads.size} leads, ${this.calls.size} calls, ${this.customers.size} customers, ${this.orders.size} orders, ${this.verifiedFacts.size} verified facts)`);
      } catch (err) {
        console.warn('[DB] Could not parse storage.json, starting with clean runtime state:', err.message);
      }
    }

    // 3. If MongoDB is connected, synchronize MongoDB collections
    if (this.mongoConnected && this.mongoDb) {
      try {
        const prodCount = await this.mongoDb.collection('products').countDocuments();
        if (prodCount > 0 && this.products.size === 0) {
          const mongoProds = await this.mongoDb.collection('products').find({}).toArray();
          mongoProds.forEach(p => {
            delete p._id;
            this.products.set(p.id, p);
          });
          console.log(`[DB] Restored ${this.products.size} products from MongoDB`);
        } else if (this.products.size > 0) {
          const prodList = Array.from(this.products.values()).map(p => {
            const copy = { ...p };
            delete copy._id;
            return copy;
          });
          const bulkOps = prodList.map(p => ({
            updateOne: {
              filter: { id: p.id },
              update: { $set: p },
              upsert: true
            }
          }));
          if (bulkOps.length > 0) {
            await this.mongoDb.collection('products').bulkWrite(bulkOps);
            console.log(`[DB] Synchronized ${bulkOps.length} products into MongoDB collection`);
          }
        }

        const orderCount = await this.mongoDb.collection('orders').countDocuments();
        if (orderCount > 0 && this.orders.size === 0) {
          const mongoOrders = await this.mongoDb.collection('orders').find({}).toArray();
          mongoOrders.forEach(o => {
            delete o._id;
            this.orders.set(o.id, o);
          });
          console.log(`[DB] Restored ${this.orders.size} orders from MongoDB`);
        } else if (this.orders.size > 0 && orderCount === 0) {
          const orderList = Array.from(this.orders.values()).map(o => {
            const copy = { ...o };
            delete copy._id;
            return copy;
          });
          await this.mongoDb.collection('orders').insertMany(orderList);
          console.log(`[DB] Seeded ${orderList.length} orders into MongoDB collection`);
        }

        const leadCount = await this.mongoDb.collection('leads').countDocuments();
        if (leadCount > 0 && this.leads.size === 0) {
          const mongoLeads = await this.mongoDb.collection('leads').find({}).toArray();
          mongoLeads.forEach(l => {
            delete l._id;
            this.leads.set(l.id, l);
          });
          console.log(`[DB] Restored ${this.leads.size} leads from MongoDB`);
        } else if (this.leads.size > 0 && leadCount === 0) {
          const leadList = Array.from(this.leads.values()).map(l => {
            const copy = { ...l };
            delete copy._id;
            return copy;
          });
          await this.mongoDb.collection('leads').insertMany(leadList);
          console.log(`[DB] Seeded ${leadList.length} leads into MongoDB collection`);
        }

        const custCount = await this.mongoDb.collection('customers').countDocuments();
        if (custCount > 0 && this.customers.size === 0) {
          const mongoCusts = await this.mongoDb.collection('customers').find({}).toArray();
          mongoCusts.forEach(c => {
            delete c._id;
            this.customers.set(c.id, c);
          });
          console.log(`[DB] Restored ${this.customers.size} customers from MongoDB`);
        } else if (this.customers.size > 0 && custCount === 0) {
          const custList = Array.from(this.customers.values()).map(c => {
            const copy = { ...c };
            delete copy._id;
            return copy;
          });
          await this.mongoDb.collection('customers').insertMany(custList);
          console.log(`[DB] Seeded ${custList.length} customers into MongoDB collection`);
        }

        const factCount = await this.mongoDb.collection('verifiedFacts').countDocuments();
        if (factCount > 0 && this.verifiedFacts.size === 0) {
          const mongoFacts = await this.mongoDb.collection('verifiedFacts').find({}).toArray();
          mongoFacts.forEach(vf => {
            delete vf._id;
            this.verifiedFacts.set(vf.id, vf);
          });
          console.log(`[DB] Restored ${this.verifiedFacts.size} verified facts from MongoDB`);
        }

        // Full backup to metadata and collections
        await this.persistToMongo();
      } catch (syncErr) {
        console.warn('[DB] MongoDB initial sync error:', syncErr.message);
      }
    }

    this.initialized = true;
  }

  persist() {
    try {
      const state = {
        leads: Array.from(this.leads.values()),
        enquiries: Array.from(this.enquiries.values()),
        calls: Array.from(this.calls.values()),
        conversations: Array.from(this.conversations.values()),
        orders: Array.from(this.orders.values()),
        followups: Array.from(this.followups.values()),
        customers: Array.from(this.customers.values()),
        orderEnquiries: Array.from(this.orderEnquiries.values()),
        verifiedFacts: Array.from(this.verifiedFacts.values()),
        updatedAt: new Date().toISOString()
      };
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(state, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB] Error persisting to storage.json:', err.message);
    }

    if (this.mongoConnected) {
      this.persistToMongo().catch(err => {
        console.warn('[DB] MongoDB sync failed during persist:', err.message);
      });
    }
  }

  saveProductsFile() {
    try {
      const list = Array.from(this.products.values());
      fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(list, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('[DB] Failed to save products.json:', err.message);
      return false;
    }
  }

  async addProduct(productData) {
    const rawCategory = (productData.category || 'general').trim();
    const catCode = rawCategory.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) || 'GEN';
    const id = productData.id || `PROD-${catCode}-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const price = Math.max(0, Number(productData.price) || 0);
    const salePrice = (productData.salePrice !== undefined && productData.salePrice !== null && !isNaN(Number(productData.salePrice)))
      ? Math.max(0, Number(productData.salePrice))
      : price;
    const discountPercent = price > 0 && salePrice < price
      ? Math.round(((price - salePrice) / price) * 100)
      : (Number(productData.discountPercent) || 0);

    const stockCount = Math.max(0, Number(productData.stockCount !== undefined ? productData.stockCount : (productData.stock?.overall ?? 15)));
    const inStock = productData.inStock !== undefined ? Boolean(productData.inStock) : stockCount > 0;

    let colours = [];
    if (Array.isArray(productData.colours)) {
      colours = productData.colours.filter(Boolean);
    } else if (typeof productData.colours === 'string' && productData.colours.trim()) {
      colours = productData.colours.split(',').map(s => s.trim()).filter(Boolean);
    }

    let sizes = [];
    if (Array.isArray(productData.sizes)) {
      sizes = productData.sizes.filter(Boolean);
    } else if (typeof productData.sizes === 'string' && productData.sizes.trim()) {
      sizes = productData.sizes.split(',').map(s => s.trim()).filter(Boolean);
    }

    const imageUrl = productData.imageUrl || productData.image || productData.photoUrl || '/images/products/default.jpg';
    const now = new Date().toISOString();

    const product = {
      id,
      name: (productData.name || 'New Product').trim(),
      category: rawCategory.toLowerCase(),
      brand: (productData.brand || 'TrendVibe Studio').trim(),
      description: (productData.description || '').trim(),
      price,
      salePrice,
      discountPercent,
      currency: 'INR',
      currencySymbol: '₹',
      colours: colours.length > 0 ? colours : ['Standard'],
      sizes: sizes.length > 0 ? sizes : ['Standard'],
      stockCount,
      stock: {
        overall: stockCount,
        variants: productData.stock?.variants || {}
      },
      inStock,
      deliveryInfo: productData.deliveryInfo || 'Express delivery in 2-4 business days across India.',
      deliveryDays: productData.deliveryDays || '2-4 days',
      deliveryCharges: productData.deliveryCharges !== undefined ? Number(productData.deliveryCharges) : 49,
      freeDeliveryAbove: productData.freeDeliveryAbove !== undefined ? Number(productData.freeDeliveryAbove) : 999,
      returnPolicy: productData.returnPolicy || '7-day hassle-free doorstep return policy with original tags.',
      exchangePolicy: productData.exchangePolicy || 'Free instant size and colour exchange within 7 days.',
      paymentMethods: [
        'Cash on Delivery (COD)',
        'UPI (Google Pay / PhonePe / Paytm)',
        'Credit & Debit Cards',
        'Net Banking'
      ],
      codAvailable: productData.codAvailable !== undefined ? Boolean(productData.codAvailable) : true,
      warranty: productData.warranty || '100% quality guarantee against manufacturing defects upon arrival.',
      specs: productData.specs || {
        origin: 'Made in India',
        condition: 'Brand New'
      },
      imageUrl,
      image: imageUrl,
      videoUrl: productData.videoUrl || null,
      instagramVideoPostUrl: productData.instagramVideoPostUrl || `https://www.instagram.com/reel/post_${id}/`,
      instagramPostId: productData.instagramPostId || `ig_post_${id.toLowerCase()}`,
      createdAt: now,
      updatedAt: now
    };

    // 1. In-memory map
    this.products.set(product.id, product);

    // 2. Local JSON files
    this.saveProductsFile();
    this.persist();

    // 3. MongoDB collection persistence
    if (this.mongoConnected && this.mongoDb) {
      try {
        const mongoDoc = { ...product };
        delete mongoDoc._id;
        await this.mongoDb.collection('products').updateOne(
          { id: product.id },
          { $set: mongoDoc },
          { upsert: true }
        );
      } catch (err) {
        console.warn(`[DB] Warning inserting product ${product.id} into MongoDB:`, err.message);
      }
    }

    return product;
  }

  async updateProduct(id, updates = {}) {
    const product = this.getProductById(id);
    if (!product) return null;

    if (updates.name) product.name = updates.name.trim();
    if (updates.category) product.category = updates.category.trim().toLowerCase();
    if (updates.brand) product.brand = updates.brand.trim();
    if (updates.description !== undefined) product.description = updates.description.trim();

    if (updates.price !== undefined && !isNaN(Number(updates.price))) {
      product.price = Math.max(0, Number(updates.price));
    }
    if (updates.salePrice !== undefined && !isNaN(Number(updates.salePrice))) {
      product.salePrice = Math.max(0, Number(updates.salePrice));
    }
    if (product.price > 0 && product.salePrice < product.price) {
      product.discountPercent = Math.round(((product.price - product.salePrice) / product.price) * 100);
    }

    if (updates.stockCount !== undefined && !isNaN(Number(updates.stockCount))) {
      product.stockCount = Math.max(0, Number(updates.stockCount));
      if (!product.stock) product.stock = {};
      product.stock.overall = product.stockCount;
      product.inStock = product.stockCount > 0;
    }
    if (updates.inStock !== undefined) {
      product.inStock = Boolean(updates.inStock);
    }

    if (updates.imageUrl || updates.image) {
      product.imageUrl = updates.imageUrl || updates.image;
      product.image = product.imageUrl;
    }

    if (updates.colours) {
      product.colours = Array.isArray(updates.colours) ? updates.colours : updates.colours.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (updates.sizes) {
      product.sizes = Array.isArray(updates.sizes) ? updates.sizes : updates.sizes.split(',').map(s => s.trim()).filter(Boolean);
    }

    if (updates.instagramVideoPostUrl !== undefined) {
      product.instagramVideoPostUrl = updates.instagramVideoPostUrl ? updates.instagramVideoPostUrl.trim() : product.instagramVideoPostUrl;
    }
    if (updates.instagramPostUrl !== undefined) {
      product.instagramPostUrl = updates.instagramPostUrl ? updates.instagramPostUrl.trim() : product.instagramPostUrl;
    }
    if (updates.instagramPostId !== undefined) {
      product.instagramPostId = updates.instagramPostId ? updates.instagramPostId.trim() : product.instagramPostId;
    }

    product.updatedAt = new Date().toISOString();
    this.products.set(product.id, product);

    this.saveProductsFile();
    this.persist();

    if (this.mongoConnected && this.mongoDb) {
      try {
        const mongoDoc = { ...product };
        delete mongoDoc._id;
        await this.mongoDb.collection('products').updateOne(
          { id: product.id },
          { $set: mongoDoc },
          { upsert: true }
        );
      } catch (err) {
        console.warn(`[DB] Warning updating product in MongoDB:`, err.message);
      }
    }

    return product;
  }

  async deleteProduct(id) {
    const product = this.getProductById(id);
    if (!product) return false;

    this.products.delete(id);
    this.saveProductsFile();
    this.persist();

    if (this.mongoConnected && this.mongoDb) {
      try {
        await this.mongoDb.collection('products').deleteOne({ id });
      } catch (err) {
        console.warn(`[DB] Warning deleting product from MongoDB:`, err.message);
      }
    }

    return true;
  }

  getCategories() {
    const catMap = new Map();
    for (const p of this.products.values()) {
      const cat = (p.category || 'general').toLowerCase();
      const current = catMap.get(cat) || { name: cat, count: 0, displayName: p.category || 'General' };
      current.count += 1;
      catMap.set(cat, current);
    }
    return Array.from(catMap.values());
  }

  async verifyDbConnection() {
    const startTime = Date.now();
    const result = {
      timestamp: new Date().toISOString(),
      configured: Boolean(this.mongoUri),
      databaseType: this.mongoConnected ? 'MongoDB (DBMS)' : 'JSON File Store (Fallback)',
      mongoConnected: this.mongoConnected,
      databaseName: this.mongoDb ? this.mongoDb.databaseName : (this.mongoDbName || 'trendvibe'),
      uri: this.mongoUri ? this.mongoUri.replace(/:([^@]+)@/, ':***@') : null,
      tests: {},
      collections: {},
      memoryCounts: {
        products: this.products.size,
        orders: this.orders.size,
        leads: this.leads.size,
        customers: this.customers.size
      },
      healthy: false
    };

    if (!this.mongoConnected || !this.mongoDb) {
      result.tests.connection = { status: 'FAILED_OR_DISCONNECTED', message: 'MongoDB not currently connected.' };
      result.healthy = false;
      result.durationMs = Date.now() - startTime;
      return result;
    }

    try {
      // Test 1: Ping Command
      const pingStart = Date.now();
      await this.mongoDb.command({ ping: 1 });
      result.tests.ping = {
        status: 'PASSED',
        latencyMs: Date.now() - pingStart,
        message: 'MongoDB responded to ping command successfully.'
      };

      // Test 2: Read Collection Document Counts
      const colList = ['products', 'orders', 'leads', 'customers', 'calls', 'enquiries', 'conversations', 'orderEnquiries'];
      for (const col of colList) {
        result.collections[col] = await this.mongoDb.collection(col).countDocuments();
      }
      result.tests.readCounts = {
        status: 'PASSED',
        totalCollections: colList.length,
        message: `Successfully read counts across ${colList.length} collections.`
      };

      // Test 3: Write, Read, and Delete Transaction Test (CRUD Verification)
      const testCol = this.mongoDb.collection('dbms_verification_audit');
      const testDocId = `TEST-VERIFY-${Date.now()}`;
      await testCol.insertOne({
        id: testDocId,
        test: 'DBMS Verification Test',
        createdAt: new Date()
      });

      const readBack = await testCol.findOne({ id: testDocId });
      if (!readBack) throw new Error('Verification test document could not be read back');

      await testCol.deleteOne({ id: testDocId });
      result.tests.crudOperation = {
        status: 'PASSED',
        message: 'Write, Read, and Delete operations verified against MongoDB.'
      };

      result.healthy = true;
    } catch (err) {
      result.healthy = false;
      result.tests.error = {
        status: 'FAILED',
        error: err.message
      };
    }

    result.durationMs = Date.now() - startTime;
    return result;
  }

  // --- PRODUCTS ---
  getAllProducts() {
    return Array.from(this.products.values());
  }

  async getProductByIdAsync(id) {
    if (!id) return null;
    if (this.mongoConnected && this.mongoDb) {
      try {
        const doc = await this.mongoDb.collection('products').findOne({
          $or: [
            { id: id },
            { alternateId: id },
            { alternateIds: id },
            { sku: id },
            { instagramPostId: id },
            { instagramVideoPostUrl: id },
            { instagramPostUrl: id },
            { name: { $regex: new RegExp(`^${id}$`, 'i') } }
          ]
        });
        if (doc) {
          delete doc._id;
          this.products.set(doc.id, doc);
          return doc;
        }
      } catch (err) {
        console.warn(`[DB] Error fetching product ${id} from MongoDB:`, err.message);
      }
    }
    return this.getProductById(id);
  }

  getProductById(id) {
    if (!id) return null;
    if (this.products.has(id)) return this.products.get(id);

    // Check alternate IDs, SKU, or Instagram post ID / URLs
    for (const p of this.products.values()) {
      if (p.alternateId === id || p.sku === id || p.SKU === id || (Array.isArray(p.alternateIds) && p.alternateIds.includes(id)) ||
          (p.instagramPostId && (p.instagramPostId === id || (typeof id === 'string' && id.includes(p.instagramPostId)))) ||
          (p.instagramVideoPostUrl && (p.instagramVideoPostUrl === id || (typeof id === 'string' && id.includes(p.instagramVideoPostUrl)))) ||
          (p.instagramPostUrl && (p.instagramPostUrl === id || (typeof id === 'string' && id.includes(p.instagramPostUrl))))) {
        return p;
      }
    }

    // Check standalone Food Dataset (e.g. FOOD-010 Greek Yogurt)
    try {
      const foodDatasetPath = fs.existsSync(path.join(DATA_DIR, 'food_products_dataset.json'))
        ? path.join(DATA_DIR, 'food_products_dataset.json')
        : path.resolve(__dirname, '../data/food_products_dataset.json');
      if (fs.existsSync(foodDatasetPath)) {
        const dataset = JSON.parse(fs.readFileSync(foodDatasetPath, 'utf-8'));
        const food = dataset.foods.find(f => f["Product ID"] === id || f.SKU === id || (f["Food Name"] && f["Food Name"].toLowerCase() === id.toLowerCase()));
        if (food) {
          return {
            id: food["Product ID"],
            name: food["Food Name"],
            foodName: food["Food Name"],
            category: food["Category"],
            subcategory: food["Subcategory"],
            foodType: food["Food Type"],
            description: food["Description"],
            mainIngredients: food["Main Ingredients"],
            completeIngredients: [food["Complete Ingredient List"]],
            ingredientQuantity: JSON.stringify(food["Ingredient Quantities"]),
            preparationMethod: food["Preparation Method"],
            cookingMethod: food["Cooking Method"],
            preparationTime: food["Preparation Time"],
            cookingTime: food["Cooking Time"],
            oilType: food["Oil Type"],
            oilQuantity: food["Oil Quantity"],
            saltUsage: `${food["Salt Quantity"]}`,
            sugarUsage: `${food["Sugar Quantity"]}`,
            preservatives: food["Preservatives/Additives"],
            freshlyPrepared: food["Freshly Prepared"],
            shelfLife: food["Shelf Life"],
            storageInstructions: food["Storage Instructions"],
            servingSize: food["Serving Size"],
            netQuantity: food["Net Quantity"],
            calories: parseInt(food["Calories"].replace(/\D/g, '')) || 80,
            protein: food["Protein"],
            carbohydrates: food["Carbohydrates"],
            fat: food["Fat"],
            dietaryFibre: food["Dietary Fibre"],
            sodium: food["Sodium"],
            calcium: food["Calcium"],
            iron: food["Iron"],
            allergens: food["Allergens"],
            vegNonVeg: food["Vegetarian Status"] === "Yes" ? "Vegetarian" : "Non-Vegetarian",
            veganStatus: food["Vegan Status"] === "Yes" ? "100% Vegan" : "Non-Vegan",
            fssaiNumber: food["FSSAI Registration/Licence"],
            foodSafetyHygiene: food["Food Safety Information"],
            foodTestingInfo: food["Food Testing Information"],
            manufacturer: food["Manufacturer"],
            brand: food["Brand Name"],
            packagingType: food["Packaging Type"],
            packagingMaterial: food["Packaging Material"],
            mrp: 50,
            salePrice: 45,
            price: 45,
            discountPercent: 10,
            inStock: true,
            stockCount: 20,
            deliveryAvailability: food["Delivery Availability"],
            deliveryDays: "Same-day delivery",
            deliveryCharges: 40,
            customerQAKnowledge: food["Customer Q&A Knowledge"]
          };
        }
      }
    } catch (_) {}

    // Check standalone Medicines Dataset (e.g. MED-PARA-001 or MOCK-MED-PARA-500-10)
    try {
      const medDatasetPath = fs.existsSync(path.join(DATA_DIR, 'medicines_products_dataset.json'))
        ? path.join(DATA_DIR, 'medicines_products_dataset.json')
        : path.resolve(__dirname, '../data/medicines_products_dataset.json');
      if (fs.existsSync(medDatasetPath)) {
        const dataset = JSON.parse(fs.readFileSync(medDatasetPath, 'utf-8'));
        const med = (dataset.products || []).find(m => 
          m.id === id ||
          m.product_id === id || 
          m.sku === id || 
          (m.product_name && m.product_name.toLowerCase() === id.toLowerCase()) ||
          (m.alternateId && m.alternateId === id)
        );
        if (med) {
          return {
            id: med.id || med.product_id,
            productId: med.id || med.product_id,
            alternateId: med.alternateId,
            sku: med.sku,
            name: med.product_name,
            productName: med.product_name,
            brand: med.brand,
            category: med.category || 'Medicines & Healthcare Products',
            subcategory: med.subcategory,
            productType: med.product_type,
            dosageForm: med.dosage_form,
            formulation: med.dosage_form || med.formulation,
            strength: (Array.isArray(med.active_ingredients) && med.active_ingredients[0]?.strength) || med.strength || '',
            activeIngredients: med.active_ingredients,
            prescriptionStatus: med.prescription_status,
            otcOrPrescription: typeof med.prescription_status === 'string' ? med.prescription_status : med.prescription_status?.otc_or_prescription,
            requiresPrescription: typeof med.prescription_status === 'string' ? med.prescription_status.toLowerCase().includes('prescription required') : Boolean(med.prescription_status?.requires_prescription),
            purpose: med.purpose,
            commonUses: med.common_uses,
            howToUse: med.how_to_use,
            foodRequirement: med.food_requirement,
            contraindications: med.contraindications,
            precautions: med.precautions,
            safetyAndContraindications: med.contraindications,
            sideEffects: med.side_effects,
            warnings: med.warnings,
            warningsAndPrecautions: med.warnings,
            drugInteractions: med.drug_interactions,
            allergyInfo: med.allergy_info,
            pregnancy: med.pregnancy,
            pregnancyWarnings: med.pregnancy,
            breastfeeding: med.breastfeeding,
            breastfeedingWarnings: med.breastfeeding,
            childrenAdvice: med.children,
            elderlyAdvice: med.elderly,
            packSize: med.pack_size,
            packaging: med.pack_size,
            storageInstructions: 'Store below 25°C in a cool, dry place away from direct sunlight.',
            storageAndShelfLife: 'Store below 25°C in a cool, dry place away from direct sunlight.',
            manufacturer: med.manufacturer,
            mfgLicenceNumber: 'DL-2024-MOCK-MFR',
            batchNumber: med.batch_number,
            expiryDate: med.expiry_date,
            manufacturingDate: med.manufacturing_date,
            source: med.source,
            mrp: med.mrp_inr || 30,
            price: med.selling_price_inr || med.mrp_inr || 25,
            salePrice: med.selling_price_inr || med.mrp_inr || 25,
            discountPercent: med.discount_percent || 0,
            inStock: (med.stock_quantity || 0) > 0,
            stockCount: med.stock_quantity || 50,
            deliveryDays: med.delivery || 'Same-day delivery available',
            returnPolicy: med.return_policy || 'Non-returnable except eligible damaged or wrong product cases.',
            isMedicalProduct: true
          };
        }
      }
    } catch (_) {}

    return null;
  }

  findProductByQuery(query) {
    if (!query) return null;
    const q = query.toLowerCase().trim();

    // Check direct ID match
    if (this.products.has(query)) return this.products.get(query);

    // Check standalone dataset ID matches
    const standaloneMatch = this.getProductById(query);
    if (standaloneMatch) return standaloneMatch;

    // Check Greek Yogurt match
    if (q.includes('greek yogurt') || q === 'yogurt' || q === 'gy-001' || q === 'food-010') {
      const gy = this.getProductById('FOOD-010');
      if (gy) return gy;
    }

    // Search by name, brand, category, keywords
    for (const p of this.products.values()) {
      if (p.name.toLowerCase().includes(q) ||
          (p.alternateId && p.alternateId.toLowerCase() === q) ||
          (p.sku && p.sku.toLowerCase() === q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.instagramPostId && (p.instagramPostId.toLowerCase() === q || q.includes(p.instagramPostId.toLowerCase()))) ||
          (p.instagramVideoPostUrl && (p.instagramVideoPostUrl.toLowerCase().includes(q) || q.includes(p.instagramVideoPostUrl.toLowerCase()))) ||
          (p.instagramPostUrl && (p.instagramPostUrl.toLowerCase().includes(q) || q.includes(p.instagramPostUrl.toLowerCase())))) {
        return p;
      }
    }

    // Fuzzy token match
    const tokens = q.split(/\s+/).filter(t => t.length > 2);
    let bestMatch = null;
    let highestScore = 0;

    for (const p of this.products.values()) {
      let score = 0;
      const haystack = `${p.name} ${p.brand} ${p.category} ${p.description}`.toLowerCase();
      tokens.forEach(t => {
        if (haystack.includes(t)) score++;
      });
      if (score > highestScore) {
        highestScore = score;
        bestMatch = p;
      }
    }

    return highestScore > 0 ? bestMatch : null;
  }

  searchProducts(query, category) {
    let results = Array.from(this.products.values());
    if (category && category !== 'all') {
      results = results.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }
    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      const tokens = q.split(/\s+/).filter(t => t.length > 1);
      results = results.filter(p => {
        const haystack = `${p.name} ${p.brand} ${p.category} ${p.description} ${(p.colours || []).join(' ')} ${(p.sizes || []).join(' ')}`.toLowerCase();
        return tokens.every(token => haystack.includes(token));
      });
    }
    return results;
  }

  searchProductsByPriceRange(minPrice = 0, maxPrice = Infinity, category = null) {
    let results = Array.from(this.products.values());
    if (category && category !== 'all') {
      results = results.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }
    const min = (minPrice !== null && minPrice !== undefined && minPrice !== '' && !isNaN(Number(minPrice)))
      ? Math.max(0, Number(minPrice))
      : 0;
    const max = (maxPrice !== null && maxPrice !== undefined && maxPrice !== '' && !isNaN(Number(maxPrice)))
      ? Number(maxPrice)
      : Infinity;

    return results
      .filter(p => {
        const price = p.salePrice || p.price;
        return price >= min && price <= max;
      })
      .sort((a, b) => (a.salePrice || a.price) - (b.salePrice || b.price));
  }

  updateProductStock(productId, { stockCount, inStock, delta } = {}) {
    const product = this.getProductById(productId);
    if (!product) return null;

    if (delta !== undefined && delta !== null && !isNaN(Number(delta))) {
      const current = typeof product.stockCount === 'number' 
        ? product.stockCount 
        : (product.stock && typeof product.stock.overall === 'number' ? product.stock.overall : 0);
      product.stockCount = Math.max(0, current + Number(delta));
    } else if (stockCount !== undefined && stockCount !== null && !isNaN(Number(stockCount))) {
      product.stockCount = Math.max(0, Number(stockCount));
    }

    if (inStock !== undefined) {
      product.inStock = Boolean(inStock);
    } else {
      product.inStock = (product.stockCount || 0) > 0;
    }

    if (!product.stock) product.stock = {};
    product.stock.overall = product.stockCount;

    this.persist();
    return product;
  }

  updateProductPrice(productId, { price, salePrice } = {}) {
    const product = this.getProductById(productId);
    if (!product) return null;

    if (price !== undefined && !isNaN(Number(price))) {
      product.price = Math.max(0, Number(price));
    }
    if (salePrice !== undefined && !isNaN(Number(salePrice))) {
      product.salePrice = Math.max(0, Number(salePrice));
    }
    if (product.price > 0 && product.salePrice >= 0) {
      product.discountPercent = Math.max(0, Math.round(((product.price - product.salePrice) / product.price) * 100));
    }

    this.persist();
    return product;
  }

  // --- LEADS ---
  createLead({
    customerName,
    phone,
    email = '',
    socialMediaSource = 'instagram',
    campaign = 'reels_organic',
    productId,
    productName,
    initialEnquiry = '',
    leadStatus = 'New Lead',
    leadScore = 'Warm',
    scoreNumerical = 50
  }) {
    const id = `LEAD-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const lead = {
      id,
      createdAt: now,
      customerName: customerName.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : '',
      socialMediaSource,
      campaign,
      productId: productId || null,
      productName: productName || 'Unknown Product',
      initialEnquiry: initialEnquiry.trim(),
      leadStatus,
      leadScore,
      scoreNumerical
    };

    this.leads.set(id, lead);

    // Also register an enquiry record
    if (initialEnquiry) {
      this.createEnquiry({
        leadId: id,
        productId,
        enquiryText: initialEnquiry,
        enquiryChannel: 'web_form'
      });
    }

    this.persist();
    return lead;
  }

  findDuplicateLead(phone, productId, withinHours = 24) {
    const cutoff = new Date(Date.now() - withinHours * 3600 * 1000);
    const cleanedPhone = phone.replace(/\D/g, '');

    for (const lead of this.leads.values()) {
      const existingPhone = lead.phone.replace(/\D/g, '');
      if (existingPhone === cleanedPhone && lead.productId === productId) {
        const leadDate = new Date(lead.createdAt);
        if (leadDate >= cutoff) {
          return lead;
        }
      }
    }
    return null;
  }

  getLeadById(id) {
    return this.leads.get(id) || null;
  }

  getLeadByPhone(phone) {
    const clean = phone.replace(/\D/g, '');
    for (const lead of this.leads.values()) {
      if (lead.phone.replace(/\D/g, '') === clean) return lead;
    }
    return null;
  }

  updateLead(id, updates) {
    const lead = this.leads.get(id);
    if (!lead) return null;
    const updated = { ...lead, ...updates, updatedAt: new Date().toISOString() };
    this.leads.set(id, updated);
    this.persist();
    return updated;
  }

  getAllLeads() {
    return Array.from(this.leads.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // --- ENQUIRIES ---
  createEnquiry({ leadId, productId, enquiryText, enquiryChannel = 'web_form', enquiryType = 'general' }) {
    const id = `ENQ-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const enquiry = {
      id,
      leadId,
      productId,
      enquiryText,
      enquiryChannel,
      enquiryType,
      createdAt: new Date().toISOString()
    };
    this.enquiries.set(id, enquiry);
    this.persist();
    return enquiry;
  }

  getAllEnquiries() {
    return Array.from(this.enquiries.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // --- CALLS ---
  createCall({ leadId, conversationId = null, callSid = null, callStatus = 'queued' }) {
    const id = `CALL-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const call = {
      id,
      leadId,
      conversationId,
      callSid,
      callStart: new Date().toISOString(),
      callEnd: null,
      durationSeconds: 0,
      callStatus,
      recordingUrl: null,
      createdAt: new Date().toISOString()
    };
    this.calls.set(id, call);
    this.persist();
    return call;
  }

  updateCall(id, updates) {
    const call = this.calls.get(id);
    if (!call) return null;
    const updated = { ...call, ...updates };
    this.calls.set(id, updated);
    this.persist();
    return updated;
  }

  getCallByConversationId(conversationId) {
    for (const c of this.calls.values()) {
      if (c.conversationId === conversationId) return c;
    }
    return null;
  }

  getAllCalls() {
    return Array.from(this.calls.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // --- CONVERSATIONS ---
  createConversation({
    leadId,
    conversationId,
    fullTranscript,
    summary,
    customerIntent,
    purchaseIntent,
    sentiment,
    extractedRequirements = {},
    unresolvedQuestions = [],
    humanHandoff = false,
    humanHandoffReason = '',
    geminiAnalysisRaw = null
  }) {
    const id = `CONV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const record = {
      id,
      leadId,
      conversationId,
      fullTranscript,
      summary,
      customerIntent,
      purchaseIntent,
      sentiment,
      extractedRequirements,
      unresolvedQuestions,
      humanHandoff,
      humanHandoffReason,
      geminiAnalysisRaw,
      createdAt: new Date().toISOString()
    };
    this.conversations.set(id, record);

    // If human handoff is required, automatically create a follow-up task
    if (humanHandoff) {
      this.createFollowup({
        leadId,
        priority: 'URGENT',
        reason: humanHandoffReason || 'Customer requested human assistance during AI voice call.',
        notes: `Unresolved questions: ${JSON.stringify(unresolvedQuestions)}`
      });
    }

    this.persist();
    return record;
  }

  getAllConversations() {
    return Array.from(this.conversations.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // --- ORDERS ---
  createOrder({
    id: customId = null,
    leadId,
    customerId = null,
    customerName = '',
    customerMobile = '',
    customerEmail = '',
    productId,
    productName,
    quantity = 1,
    size = '',
    colour = '',
    totalAmount,
    paymentMethod = 'Cash on Delivery (COD)',
    isCod = true,
    shippingAddress = '',
    shippingDetails = null,
    orderStatus = 'Confirmed',
    deductStock = true
  }) {
    const id = customId || `ORD-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const couriers = ['BlueDart Express', 'Delhivery Air', 'DTDC Priority'];
    const selectedCourier = couriers[Math.floor(Math.random() * couriers.length)];
    const prefix = selectedCourier.startsWith('Blue') ? 'BD' : (selectedCourier.startsWith('Delhi') ? 'DELH' : 'DTDC');
    const trackingNumber = `${prefix}-${Math.floor(100000 + Math.random() * 900000)}-IN`;
    const now = new Date().toISOString();

    const order = {
      id,
      leadId,
      customerId,
      customerName,
      customerMobile,
      customerEmail,
      productId,
      productName,
      quantity,
      size,
      colour,
      totalAmount,
      paymentMethod,
      isCod,
      shippingAddress,
      shippingDetails,
      orderStatus,
      courier: selectedCourier,
      trackingNumber,
      estimatedDelivery: '2-3 Business Days',
      timeline: [
        {
          status: 'Confirmed',
          timestamp: now,
          location: 'TrendVibe Central Fulfillment Center, Bengaluru',
          note: 'Order confirmed and verified via Zyro AI Sales Engine'
        }
      ],
      createdAt: now
    };
    this.orders.set(id, order);

    // Automatically deduct warehouse inventory for ordered quantity
    if (deductStock && productId) {
      this.updateProductStock(productId, { delta: -quantity });
    }

    // Update lead status to Converted
    if (leadId) {
      this.updateLead(leadId, {
        leadStatus: 'Converted',
        leadScore: 'Hot',
        scoreNumerical: 100
      });
    }

    // If customer details provided, sync with customer record
    if (customerMobile || customerEmail || customerId) {
      this.createOrUpdateCustomer({
        fullName: customerName,
        mobile: customerMobile,
        email: customerEmail,
        orderId: id,
        ...(shippingDetails || {})
      });
    }

    this.persist();
    return order;
  }

  // --- CUSTOMERS & FLIPKART/MEESHO STYLE ADDRESS ---
  createOrUpdateCustomer({
    fullName = '',
    mobile = '',
    email = '',
    pincode = '',
    houseNo = '',
    area = '',
    landmark = '',
    city = '',
    state = '',
    addressType = 'Home',
    orderId = null
  }) {
    const cleanPhone = (mobile || '').toString().replace(/\D/g, '').slice(-10);
    const cleanEmail = (email || '').trim().toLowerCase();

    // Look for existing customer by mobile or email
    let customer = null;
    if (cleanPhone) {
      customer = Array.from(this.customers.values()).find(c => c.mobile === cleanPhone);
    }
    if (!customer && cleanEmail) {
      customer = Array.from(this.customers.values()).find(c => c.email === cleanEmail);
    }

    const now = new Date().toISOString();
    const id = customer ? customer.id : `CUST-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const address = {
      fullName: fullName || (customer && customer.fullName) || 'Valued Customer',
      mobile: cleanPhone || (customer && customer.mobile) || '',
      email: cleanEmail || (customer && customer.email) || '',
      pincode: pincode || (customer && customer.address && customer.address.pincode) || '',
      houseNo: houseNo || (customer && customer.address && customer.address.houseNo) || '',
      area: area || (customer && customer.address && customer.address.area) || '',
      landmark: landmark || (customer && customer.address && customer.address.landmark) || '',
      city: city || (customer && customer.address && customer.address.city) || 'Bengaluru',
      state: state || (customer && customer.address && customer.address.state) || 'Karnataka',
      addressType: addressType || (customer && customer.address && customer.address.addressType) || 'Home'
    };

    const ordersList = customer ? [...customer.orders] : [];
    if (orderId && !ordersList.includes(orderId)) {
      ordersList.push(orderId);
    }

    const customerRecord = {
      id,
      fullName: address.fullName,
      mobile: cleanPhone,
      email: cleanEmail,
      address,
      orders: ordersList,
      updatedAt: now,
      createdAt: customer ? customer.createdAt : now
    };

    this.customers.set(id, customerRecord);

    // If orderId was provided, update the order with full customer details
    if (orderId) {
      const order = this.orders.get(orderId);
      if (order) {
        order.customerId = id;
        order.customerName = address.fullName;
        order.customerMobile = cleanPhone;
        order.customerEmail = cleanEmail;
        order.shippingAddress = `${address.houseNo}, ${address.area}${address.landmark ? ', Near ' + address.landmark : ''}, ${address.city}, ${address.state} - ${address.pincode} (${address.addressType})`;
        order.shippingDetails = address;
        order.updatedAt = now;
      }
    }

    this.persist();
    return customerRecord;
  }

  getCustomerByMobile(phone) {
    if (!phone) return null;
    const clean = phone.toString().replace(/\D/g, '').slice(-10);
    return Array.from(this.customers.values()).find(c => c.mobile === clean) || null;
  }

  getCustomerByEmail(email) {
    if (!email) return null;
    const clean = email.trim().toLowerCase();
    return Array.from(this.customers.values()).find(c => c.email === clean) || null;
  }

  getCustomerById(id) {
    if (!id) return null;
    return this.customers.get(id) || null;
  }

  getAllCustomers() {
    return Array.from(this.customers.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // --- ORDER ENQUIRIES (Customer enquiries about specific orders) ---
  createOrderEnquiry({
    orderId,
    customerName = '',
    mobile = '',
    email = '',
    enquiryType = 'General Order Enquiry',
    message = ''
  }) {
    const id = `ENQ-ORD-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();
    const order = this.getOrderById(orderId);

    const enquiry = {
      id,
      orderId,
      productName: order ? order.productName : 'Store Order',
      customerName: customerName || (order ? order.customerName : 'Customer'),
      mobile: mobile || (order ? order.customerMobile : ''),
      email: email || (order ? order.customerEmail : ''),
      enquiryType,
      message,
      status: 'Open / Pending Seller Review',
      createdAt: now
    };

    this.orderEnquiries.set(id, enquiry);

    // Append to order timeline
    if (order) {
      if (!order.timeline) order.timeline = [];
      order.timeline.push({
        status: order.orderStatus,
        timestamp: now,
        location: 'Customer Helpdesk Hub',
        note: `Customer Enquiry: [${enquiryType}] ${message.slice(0, 100)}`
      });
    }

    this.persist();
    return enquiry;
  }

  getOrderEnquiries(orderId) {
    return Array.from(this.orderEnquiries.values())
      .filter(e => !orderId || e.orderId === orderId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  getAllOrderEnquiries() {
    return Array.from(this.orderEnquiries.values())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  getOrderById(id) {
    if (!id) return null;
    return this.orders.get(id) || null;
  }

  getAllOrders() {
    return Array.from(this.orders.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  updateOrderStatus(orderId, orderStatus, note = '') {
    const order = this.orders.get(orderId);
    if (!order) return null;
    order.orderStatus = orderStatus;
    order.updatedAt = new Date().toISOString();

    if (!order.trackingNumber) {
      const couriers = ['BlueDart Express', 'Delhivery Air', 'DTDC Priority'];
      order.courier = order.courier || couriers[0];
      order.trackingNumber = `BD-${Math.floor(100000 + Math.random() * 900000)}-IN`;
    }

    if (!order.timeline || !Array.isArray(order.timeline)) {
      order.timeline = [
        {
          status: 'Confirmed',
          timestamp: order.createdAt || new Date().toISOString(),
          location: 'TrendVibe Central Fulfillment Center, Bengaluru',
          note: 'Order confirmed'
        }
      ];
    }

    const locations = {
      'Confirmed': 'TrendVibe Central Fulfillment Center, Bengaluru',
      'Processing': 'Warehouse Sorting Hub, Bengaluru',
      'Packed': 'Packaging & Barcode Facility, Bengaluru',
      'Dispatched': 'Logistics Outbound Hub, Bengaluru',
      'In Transit': 'In Transit via Express Air Hub, Mumbai',
      'Out for Delivery': 'Destination Hub - Local Delivery Facility',
      'Delivered': 'Delivered to Customer Doorstep',
      'Cancelled': 'Order Cancelled'
    };

    order.timeline.push({
      status: orderStatus,
      timestamp: new Date().toISOString(),
      location: locations[orderStatus] || 'Logistics Hub',
      note: note || `Order status updated to ${orderStatus}`
    });

    this.persist();
    return order;
  }

  getStoreLocation() {
    return {
      storeName: 'TrendVibe Flagship Store & Central Fulfillment Center',
      tagline: 'Physical Experience Studio, Click & Collect & Express Dispatch Hub',
      address: '#42, 100 Feet Road, HAL 2nd Stage, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560038',
      country: 'India',
      fullAddress: '#42, 100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038, India',
      coordinates: {
        lat: 12.9716,
        lng: 77.6412
      },
      landmarks: [
        'Opposite Metro Pillar 184',
        'Near 12th Main Junction, Indiranagar',
        '450m from Indiranagar Metro Station (Purple Line)'
      ],
      timings: {
        mondayToSaturday: '10:00 AM – 9:30 PM IST',
        sunday: '11:00 AM – 8:00 PM IST',
        status: 'Open Now • Walk-ins & Instant Pickups Welcome'
      },
      phone: '+91 80 4968 2000',
      whatsapp: '+91 98765 43210',
      email: 'bengaluru.store@trendvibe.in',
      mapsUrl: 'https://maps.google.com/?q=12.9716,77.6412'
    };
  }

  // --- SELLER ANALYTICS & INVENTORY METRICS ---
  getSellerMetrics() {
    const leads = this.getAllLeads();
    const calls = this.getAllCalls();
    const conversations = this.getAllConversations();
    const orders = this.getAllOrders();
    const products = this.getAllProducts();

    // 1. Total User Queries & Daily Volume
    const totalQueries = leads.length;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const queriesToday = leads.filter(l => (l.createdAt || '').slice(0, 10) === todayStr).length;

    // 2. Query Category Breakdown
    const queryCategories = {
      stock: 0,
      pricing: 0,
      sizing: 0,
      delivery: 0,
      payment_cod: 0,
      specs: 0,
      general: 0
    };

    leads.forEach(l => {
      const q = (l.initialEnquiry || '').toLowerCase();
      if (/stock|available|left|sold out|have/i.test(q)) queryCategories.stock++;
      else if (/price|cost|how much|discount|offer|deal|cheap/i.test(q)) queryCategories.pricing++;
      else if (/size|fit|colour|color|dimension|measurement/i.test(q)) queryCategories.sizing++;
      else if (/delivery|shipping|reach|arrive|dispatch|days/i.test(q)) queryCategories.delivery++;
      else if (/cod|cash on delivery|pay|card|upi/i.test(q)) queryCategories.payment_cod++;
      else if (/spec|processor|ram|battery|camera|material|fabric|gsm/i.test(q)) queryCategories.specs++;
      else queryCategories.general++;
    });

    // 3. Orders Placed & Revenue in INR
    const totalOrdersPlaced = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
    const codOrders = orders.filter(o => (o.paymentMethod || '').toLowerCase().includes('cod')).length;
    const prepaidOrders = totalOrdersPlaced - codOrders;

    // 4. Conversion Rate (Queries -> Orders)
    const conversionRate = totalQueries > 0 ? ((totalOrdersPlaced / totalQueries) * 100).toFixed(1) : '0.0';

    // 5. Store Inventory Health
    let healthyStockCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalStockUnits = 0;

    const inventoryItems = products.map(p => {
      const stock = typeof p.stockCount === 'number' ? p.stockCount : (p.stock && typeof p.stock.overall === 'number' ? p.stock.overall : 0);
      totalStockUnits += stock;
      let status = 'HEALTHY';
      if (!p.inStock || stock === 0) {
        status = 'OUT_OF_STOCK';
        outOfStockCount++;
      } else if (stock < 5) {
        status = 'LOW_STOCK';
        lowStockCount++;
      } else {
        healthyStockCount++;
      }

      return {
        id: p.id,
        name: p.name,
        category: p.category,
        brand: p.brand,
        price: p.price,
        salePrice: p.salePrice,
        formattedPrice: '₹' + Math.round(p.salePrice).toLocaleString('en-IN'),
        formattedOriginalPrice: '₹' + Math.round(p.price).toLocaleString('en-IN'),
        discountPercent: p.discountPercent || 0,
        stockCount: stock,
        inStock: p.inStock,
        status,
        colours: p.colours || [],
        sizes: p.sizes || [],
        imageUrl: p.imageUrl,
        videoUrl: p.videoUrl,
        instagramVideoPostUrl: p.instagramVideoPostUrl
      };
    });

    // 6. Source Attribution
    const sourceBreakdown = {
      reels_organic: leads.filter(l => l.campaign === 'reels_organic' || l.campaign === 'reels_product_video').length,
      instagram_bio: leads.filter(l => l.campaign === 'instagram_bio').length,
      direct: leads.filter(l => l.socialMediaSource === 'direct' || !l.socialMediaSource).length
    };

    return {
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalQueries,
        queriesToday,
        totalOrdersPlaced,
        totalRevenue,
        formattedRevenue: '₹' + Math.round(totalRevenue).toLocaleString('en-IN'),
        conversionRate: `${conversionRate}%`,
        totalStockUnits,
        healthyStockCount,
        lowStockCount,
        outOfStockCount,
        codOrders,
        prepaidOrders
      },
      queryCategories,
      sourceBreakdown,
      recentQueries: leads.slice(0, 50).map(l => ({
        id: l.id,
        customerName: l.customerName,
        phone: l.phone,
        email: l.email || '',
        productName: l.productName,
        productId: l.productId,
        initialEnquiry: l.initialEnquiry,
        leadScore: l.leadScore,
        scoreNumerical: l.scoreNumerical,
        leadStatus: l.leadStatus,
        createdAt: l.createdAt,
        socialMediaSource: l.socialMediaSource,
        campaign: l.campaign
      })),
      recentOrders: orders.slice(0, 30).map(o => ({
        id: o.id,
        leadId: o.leadId,
        productId: o.productId,
        productName: o.productName,
        quantity: o.quantity,
        size: o.size,
        colour: o.colour,
        totalAmount: o.totalAmount,
        formattedAmount: '₹' + Math.round(o.totalAmount).toLocaleString('en-IN'),
        paymentMethod: o.paymentMethod,
        isCod: o.isCod,
        orderStatus: o.orderStatus,
        courier: o.courier || 'BlueDart Express',
        trackingNumber: o.trackingNumber || `BD-${Math.floor(100000 + Math.random() * 900000)}-IN`,
        estimatedDelivery: o.estimatedDelivery || '2-3 Business Days',
        timeline: o.timeline || [],
        createdAt: o.createdAt,
        updatedAt: o.updatedAt
      })),
      inventory: inventoryItems
    };
  }

  // --- FOLLOW-UPS ---
  createFollowup({ leadId, priority = 'MEDIUM', reason, assignedTo = 'Sales Representative', notes = '' }) {
    const id = `FOL-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const followup = {
      id,
      leadId,
      priority,
      reason,
      assignedTo,
      status: 'PENDING',
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.followups.set(id, followup);
    this.persist();
    return followup;
  }

  getAllFollowups() {
    return Array.from(this.followups.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // --- GOOGLE SHEETS COMPATIBLE EXPORT ---
  getGoogleSheetsData() {
    return {
      customerLeads: this.getAllLeads().map(l => [
        l.id,
        l.createdAt,
        l.customerName,
        l.phone,
        l.email,
        l.socialMediaSource,
        l.campaign,
        l.productId || 'N/A',
        l.productName,
        l.initialEnquiry,
        l.leadStatus,
        l.leadScore
      ]),
      products: this.getAllProducts().map(p => [
        p.id,
        p.name,
        p.category,
        p.brand,
        p.price,
        p.discountPercent,
        p.salePrice,
        (p.colours || []).join(', '),
        (p.sizes || []).join(', '),
        (p.stock && typeof p.stock.overall === 'number') ? p.stock.overall : (p.stockCount || 0),
        p.deliveryInfo,
        p.returnPolicy,
        p.exchangePolicy,
        p.codAvailable ? 'YES' : 'NO',
        p.warranty
      ]),
      enquiries: this.getAllEnquiries().map(e => [
        e.id,
        e.leadId,
        e.productId,
        e.enquiryChannel,
        e.enquiryText,
        e.createdAt
      ]),
      calls: this.getAllCalls().map(c => [
        c.id,
        c.leadId,
        c.conversationId || 'N/A',
        c.callSid || 'N/A',
        c.callStart,
        c.callEnd || 'In Progress',
        c.durationSeconds,
        c.callStatus
      ]),
      conversations: this.getAllConversations().map(cv => [
        cv.leadId,
        cv.conversationId || 'N/A',
        cv.summary,
        cv.customerIntent,
        cv.purchaseIntent,
        cv.sentiment,
        JSON.stringify(cv.extractedRequirements),
        JSON.stringify(cv.unresolvedQuestions),
        cv.humanHandoff ? 'YES' : 'NO',
        cv.humanHandoffReason || 'N/A'
      ]),
      salesOrders: this.getAllOrders().map(o => [
        o.id,
        o.leadId,
        o.productId,
        o.productName,
        o.quantity,
        o.size || 'N/A',
        o.colour || 'N/A',
        o.totalAmount,
        o.paymentMethod,
        o.orderStatus,
        o.createdAt
      ]),
      followups: this.getAllFollowups().map(f => [
        f.id,
        f.leadId,
        f.priority,
        f.reason,
        f.assignedTo,
        f.status,
        f.notes,
        f.createdAt
      ])
    };
  }

  // --- REUSABLE VERIFIED PRODUCT FACTS (RULES 7 & 8) ---
  _buildVerifiedFactKey(productId, attributeKey, { variant = null, packSize = null, formulation = null } = {}) {
    const cleanAttr = String(attributeKey || 'general').toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
    const cleanVar = variant ? String(variant).toLowerCase().trim().replace(/[^a-z0-9]/g, '') : 'default';
    const cleanPack = packSize ? String(packSize).toLowerCase().trim().replace(/[^a-z0-9]/g, '') : 'default';
    const cleanForm = formulation ? String(formulation).toLowerCase().trim().replace(/[^a-z0-9]/g, '') : 'default';
    return `FACT-${productId}-${cleanAttr}-${cleanVar}-${cleanPack}-${cleanForm}`;
  }

  saveVerifiedFact({
    productId,
    productName = '',
    variant = null,
    packSize = null,
    formulation = null,
    attributeKey,
    question = '',
    factValue,
    sourceUrl,
    sourceTitle = '',
    sourceType = 'manufacturer_official',
    verificationDate = null,
    ttlHours = 168,
    evidenceStatus = 'VERIFIED',
    groundingQueries = [],
    conflictingSources = [],
    notes = ''
  }) {
    if (!productId || !attributeKey) {
      throw new Error('productId and attributeKey are required to store a verified product fact.');
    }

    const id = this._buildVerifiedFactKey(productId, attributeKey, { variant, packSize, formulation });
    const existing = this.verifiedFacts.get(id);
    const verifiedAtIso = verificationDate ? new Date(verificationDate).toISOString() : new Date().toISOString();
    const verifiedAtMs = new Date(verifiedAtIso).getTime();
    const effectiveTtlHours = typeof ttlHours === 'number' && ttlHours > 0 ? ttlHours : 168;
    const expiresAtIso = new Date(verifiedAtMs + effectiveTtlHours * 3600 * 1000).toISOString();

    const record = {
      id,
      productId,
      productName: productName || (this.getProductById(productId)?.name || ''),
      variant: variant || null,
      packSize: packSize || null,
      formulation: formulation || null,
      attributeKey: String(attributeKey).toLowerCase().trim(),
      question: question || '',
      factValue,
      sourceUrl: sourceUrl || null,
      sourceTitle: sourceTitle || '',
      sourceType,
      verificationDate: verifiedAtIso,
      expiresAt: expiresAtIso,
      ttlHours: effectiveTtlHours,
      evidenceStatus,
      groundingQueries: Array.isArray(groundingQueries) ? groundingQueries : [],
      conflictingSources: Array.isArray(conflictingSources) ? conflictingSources : [],
      recheckCount: existing ? (existing.recheckCount || 0) + 1 : 0,
      notes,
      createdAt: existing ? existing.createdAt : verifiedAtIso,
      updatedAt: new Date().toISOString()
    };

    this.verifiedFacts.set(id, record);
    this.persist();
    return record;
  }

  /**
   * Retrieves a stored verified product fact and checks whether it is stale or needs rechecking (Rule 8).
   */
  getVerifiedFact(productId, attributeKey, {
    variant = null,
    packSize = null,
    formulation = null,
    maxAgeHours = 168,
    forceRecheck = false,
    referenceTimeMs = null
  } = {}) {
    if (!productId || !attributeKey) return null;

    const exactId = this._buildVerifiedFactKey(productId, attributeKey, { variant, packSize, formulation });
    let fact = this.verifiedFacts.get(exactId);

    // Fallback to default or matching productId+attributeKey if exact variant key not found
    if (!fact) {
      const cleanAttr = String(attributeKey).toLowerCase().trim();
      for (const candidate of this.verifiedFacts.values()) {
        if (candidate.productId === productId && candidate.attributeKey === cleanAttr) {
          const variantMismatch = variant && candidate.variant && !candidate.variant.toLowerCase().includes(String(variant).toLowerCase());
          const packMismatch = packSize && candidate.packSize && !candidate.packSize.toLowerCase().includes(String(packSize).toLowerCase());
          const formMismatch = formulation && candidate.formulation && !candidate.formulation.toLowerCase().includes(String(formulation).toLowerCase());
          if (!variantMismatch && !packMismatch && !formMismatch) {
            fact = candidate;
            break;
          }
        }
      }
    }

    if (!fact) return null;

    const nowMs = referenceTimeMs || Date.now();
    const verifiedMs = new Date(fact.verificationDate).getTime();
    const expiresMs = fact.expiresAt ? new Date(fact.expiresAt).getTime() : (verifiedMs + (fact.ttlHours || 168) * 3600 * 1000);
    const ageHours = (nowMs - verifiedMs) / (1000 * 3600);

    let isStale = false;
    let stalenessReason = null;

    if (forceRecheck) {
      isStale = true;
      stalenessReason = 'FORCE_RECHECK_REQUESTED';
    } else if (nowMs > expiresMs) {
      isStale = true;
      stalenessReason = 'EXPIRED_TTL';
    } else if (typeof maxAgeHours === 'number' && ageHours > maxAgeHours) {
      isStale = true;
      stalenessReason = 'EXCEEDED_MAX_AGE';
    } else if (fact.evidenceStatus !== 'VERIFIED') {
      isStale = true;
      stalenessReason = `NON_FINAL_STATUS_${fact.evidenceStatus}`;
    }

    return {
      ...fact,
      ageHours: Number(ageHours.toFixed(2)),
      isStale,
      stalenessReason
    };
  }

  getVerifiedFactsByProduct(productId) {
    if (!productId) return [];
    return Array.from(this.verifiedFacts.values())
      .filter(f => f.productId === productId)
      .sort((a, b) => new Date(b.verificationDate) - new Date(a.verificationDate));
  }

  getAllVerifiedFacts() {
    return Array.from(this.verifiedFacts.values())
      .sort((a, b) => new Date(b.verificationDate) - new Date(a.verificationDate));
  }

  invalidateVerifiedFact(productId, attributeKey, options = {}) {
    const cleanAttr = String(attributeKey || '').toLowerCase().trim();
    let deletedAny = false;
    const exactId = this._buildVerifiedFactKey(productId, attributeKey, options);
    if (this.verifiedFacts.delete(exactId)) deletedAny = true;

    if (!options.variant && !options.packSize && !options.formulation) {
      for (const [k, v] of this.verifiedFacts.entries()) {
        if (v.productId === productId && v.attributeKey === cleanAttr) {
          this.verifiedFacts.delete(k);
          deletedAny = true;
        }
      }
    }
    if (deletedAny) this.persist();
    return deletedAny;
  }
}

export const db = new Database();
await db.initialize();

