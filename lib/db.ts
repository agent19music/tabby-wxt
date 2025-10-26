const DB_NAME = 'tabby_shopping';
const DB_VERSION = 1;
const PRODUCTS_STORE = 'products';
const VISITS_STORE = 'product_visits';

class TabbyDB {
  private db: IDBDatabase | null = null;

  async init() {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Products store - canonical product data
        if (!db.objectStoreNames.contains(PRODUCTS_STORE)) {
          const productStore = db.createObjectStore(PRODUCTS_STORE, { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          productStore.createIndex('title', 'title', { unique: false });
          productStore.createIndex('normalizedTitle', 'normalizedTitle', { unique: false });
          productStore.createIndex('category', 'category', { unique: false });
          productStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        // Visits store - every time user views a product on different site
        if (!db.objectStoreNames.contains(VISITS_STORE)) {
          const visitStore = db.createObjectStore(VISITS_STORE, { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          visitStore.createIndex('productId', 'productId', { unique: false });
          visitStore.createIndex('url', 'url', { unique: false });
          visitStore.createIndex('site', 'site', { unique: false });
          visitStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async addProduct(product: any) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([PRODUCTS_STORE], 'readwrite');
      const store = tx.objectStore(PRODUCTS_STORE);
      const request = store.add(product);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async addVisit(visit: any) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([VISITS_STORE], 'readwrite');
      const store = tx.objectStore(VISITS_STORE);
      const request = store.add(visit);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllProducts() {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([PRODUCTS_STORE], 'readonly');
      const store = tx.objectStore(PRODUCTS_STORE);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getProductVisits(productId: number) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([VISITS_STORE], 'readonly');
      const store = tx.objectStore(VISITS_STORE);
      const index = store.index('productId');
      const request = index.getAll(productId);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async getDB(): Promise<IDBDatabase> {
    if (!this.db) await this.init();
    return this.db!;
  }
}

export const db = new TabbyDB();