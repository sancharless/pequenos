import fs from 'fs';
import path from 'path';
import { supabase } from './supabase';
import { hashPassword } from './auth';

const DB_PATH = path.join(process.cwd(), 'database.json');

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'Bebê' | 'Menino' | 'Menina' | 'Acessórios';
  sizes: string[]; // e.g. ['P', 'M', 'G', '2', '4']
  images: string[]; // array of image URLs or base64
  stock: number;
  featured: boolean;
  createdAt: string;
}

export interface EcommerceOrder {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  items: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    size: string;
    image: string;
  }[];
  totalAmount: number;
  paymentStatus: 'pending' | 'approved' | 'rejected' | 'cancelled';
  paymentId?: string;
  qrCode?: string;
  qrCodeBase64?: string;
  createdAt: string;
}

export interface EcommerceSettings {
  whatsappNumber: string;
  instagramUrl: string;
  mercadoPagoToken: string;
  shippingFee: number;
  shippingFeeLocal: number;
  shippingFeeOthers: number;
  shippingFreeThreshold: number;
  storeState: string;
}

export interface AdminUser {
  email: string;
  name: string;
  passwordHash: string;
  role: 'admin';
}

interface DatabaseSchema {
  adminUser: AdminUser;
  products: Product[];
  orders: EcommerceOrder[];
  settings: EcommerceSettings;
}

const INITIAL_DB: DatabaseSchema = {
  adminUser: {
    email: 'admin@pequenosestilosos.com.br',
    name: 'Admin Pequenos Estilosos',
    passwordHash: '', // Will be generated on first run
    role: 'admin',
  },
  products: [
    {
      id: 'prod-1',
      name: 'Vestido Floral Primavera Sol',
      description: 'Lindo vestido infantil com estampa floral, confeccionado em algodão 100% hipoalergênico. Ideal para dias ensolarados e passeios em família. Confortável e fresquinho.',
      price: 89.90,
      category: 'Menina',
      sizes: ['P', 'M', 'G', '1', '2', '4'],
      images: ['/images/vestido-floral.png'],
      stock: 12,
      featured: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'prod-2',
      name: 'Conjunto Moletom Dinossauro Aventura',
      description: 'Conjunto infantil super quentinho e confortável de moletom com estampa de dinossauro. Inclui blusa com capuz e calça com punho. Perfeito para brincar nos dias mais frios.',
      price: 119.90,
      category: 'Menino',
      sizes: ['2', '4', '6', '8', '10'],
      images: ['/images/moletom-dinossauro.png'],
      stock: 8,
      featured: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'prod-3',
      name: 'Jardineira Jeans Estilosa Unissex',
      description: 'Clássica jardineira jeans com lavagem moderna e alças reguláveis. Tecido com elastano que garante a liberdade de movimento para os pequenos. Combina com qualquer camiseta!',
      price: 95.00,
      category: 'Bebê',
      sizes: ['M', 'G', 'GG', '1', '2', '3'],
      images: ['/images/jardineira-jeans.png'],
      stock: 15,
      featured: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'prod-4',
      name: 'Body Algodão Ursinho Abraço',
      description: 'Body de manga curta feito em malha de algodão macio com estampa fofa de ursinho. Possui gola americana que facilita a troca de roupas no bebê e botões de pressão entre as pernas.',
      price: 45.00,
      category: 'Bebê',
      sizes: ['RN', 'P', 'M', 'G'],
      images: ['/images/body-ursinho.png'],
      stock: 25,
      featured: false,
      createdAt: new Date().toISOString()
    }
  ],
  orders: [],
  settings: {
    whatsappNumber: '5581999999999',
    instagramUrl: 'https://instagram.com/pequenosestilosos',
    mercadoPagoToken: '',
    shippingFee: 15.00,
    shippingFeeLocal: 10.00,
    shippingFeeOthers: 25.00,
    shippingFreeThreshold: 199.00,
    storeState: 'PE'
  }
};

// JSON Database Helper functions
function getLocalDb(): DatabaseSchema {
  if (!fs.existsSync(DB_PATH)) {
    try {
      // Initialize with default and hash password
      const db = { ...INITIAL_DB };
      db.adminUser.passwordHash = hashPassword('admin123');
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
      return db;
    } catch (err) {
      console.warn('Failed to write initial DB fallback file:', err);
      return INITIAL_DB;
    }
  }
  try {
    const content = fs.readFileSync(DB_PATH, 'utf-8');
    const db = JSON.parse(content);
    let updated = false;

    // Ensure admin password is set
    if (!db.adminUser || !db.adminUser.passwordHash) {
      db.adminUser = INITIAL_DB.adminUser;
      db.adminUser.passwordHash = hashPassword('admin123');
      updated = true;
    }
    
    // Ensure e-commerce products are loaded
    if (!db.products || !Array.isArray(db.products) || db.products.length === 0) {
      db.products = INITIAL_DB.products;
      updated = true;
    }

    // Ensure e-commerce settings are loaded
    if (!db.settings || !db.settings.whatsappNumber) {
      db.settings = INITIAL_DB.settings;
      updated = true;
    }

    // Ensure orders are initialized
    if (!db.orders || !Array.isArray(db.orders)) {
      db.orders = [];
      updated = true;
    }

    if (updated) {
      saveLocalDb(db);
    }
    return db;
  } catch (error) {
    return INITIAL_DB;
  }
}

function saveLocalDb(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to write local database file:', err);
  }
}

export const dbHelper = {
  // Admin Authentication
  getAdminUser: async (email: string): Promise<AdminUser | null> => {
    // Check local DB
    const db = getLocalDb();
    if (db.adminUser.email.toLowerCase() === email.toLowerCase()) {
      return db.adminUser;
    }
    return null;
  },

  updateAdminPassword: async (email: string, passwordHash: string): Promise<boolean> => {
    const db = getLocalDb();
    if (db.adminUser.email.toLowerCase() === email.toLowerCase()) {
      db.adminUser.passwordHash = passwordHash;
      saveLocalDb(db);
      return true;
    }
    return false;
  },

  // E-commerce Settings
  getSettings: async (): Promise<EcommerceSettings> => {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('ecommerce_settings')
          .select('*');
        if (error) throw error;
        
        if (data && data.length > 0) {
          const settingsObj: any = {};
          data.forEach((row: any) => {
            settingsObj[row.key] = row.value;
          });
          return {
            whatsappNumber: settingsObj.whatsappNumber || '5581999999999',
            instagramUrl: settingsObj.instagramUrl || 'https://instagram.com/pequenosestilosos',
            mercadoPagoToken: settingsObj.mercadoPagoToken || '',
            shippingFee: parseFloat(settingsObj.shippingFee || '15.00'),
            shippingFeeLocal: parseFloat(settingsObj.shippingFeeLocal || '10.00'),
            shippingFeeOthers: parseFloat(settingsObj.shippingFeeOthers || '25.00'),
            shippingFreeThreshold: parseFloat(settingsObj.shippingFreeThreshold || '199.00'),
            storeState: settingsObj.storeState || 'PE'
          };
        }
      } catch (err) {
        console.error('Supabase settings query failed, using local DB:', err);
      }
    }

    const db = getLocalDb();
    return db.settings || INITIAL_DB.settings;
  },

  updateSettings: async (settings: Partial<EcommerceSettings>): Promise<EcommerceSettings> => {
    const current = await dbHelper.getSettings();
    const updated = { ...current, ...settings };

    if (supabase) {
      try {
        for (const [key, value] of Object.entries(updated)) {
          const { error } = await supabase
            .from('ecommerce_settings')
            .upsert({ key, value: String(value) });
          if (error) throw error;
        }
      } catch (err) {
        console.error('Supabase settings update failed, saving local DB:', err);
      }
    }

    const db = getLocalDb();
    db.settings = updated;
    saveLocalDb(db);
    return updated;
  },

  // Products
  getProducts: async (category?: string): Promise<Product[]> => {
    if (supabase) {
      try {
        let query = supabase.from('products').select('*');
        if (category) {
          query = query.eq('category', category);
        }
        const { data, error } = await query;
        if (error) throw error;
        
        if (data) {
          return data.map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price: parseFloat(p.price),
            category: p.category,
            sizes: p.sizes || [],
            images: p.images || [],
            stock: p.stock,
            featured: p.featured,
            createdAt: p.created_at
          }));
        }
      } catch (err) {
        console.error('Supabase products fetch failed, using local DB:', err);
      }
    }

    const db = getLocalDb();
    const prods = db.products || [];
    if (category) {
      return prods.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }
    return prods;
  },

  getProductById: async (id: string): Promise<Product | null> => {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        
        if (data) {
          return {
            id: data.id,
            name: data.name,
            description: data.description,
            price: parseFloat(data.price),
            category: data.category,
            sizes: data.sizes || [],
            images: data.images || [],
            stock: data.stock,
            featured: data.featured,
            createdAt: data.created_at
          };
        }
      } catch (err) {
        console.error('Supabase product fetch failed, using local DB:', err);
      }
    }

    const db = getLocalDb();
    return db.products?.find(p => p.id === id) || null;
  },

  createProduct: async (product: Omit<Product, 'id' | 'createdAt'>): Promise<Product> => {
    const newId = 'prod-' + Math.random().toString(36).substring(2, 9);
    const newProduct: Product = {
      ...product,
      id: newId,
      createdAt: new Date().toISOString()
    };

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('products')
          .insert({
            name: product.name,
            description: product.description,
            price: product.price,
            category: product.category,
            sizes: product.sizes,
            images: product.images,
            stock: product.stock,
            featured: product.featured
          })
          .select()
          .single();
        if (error) throw error;
        if (data) {
          return {
            id: data.id,
            name: data.name,
            description: data.description,
            price: parseFloat(data.price),
            category: data.category,
            sizes: data.sizes || [],
            images: data.images || [],
            stock: data.stock,
            featured: data.featured,
            createdAt: data.created_at
          };
        }
      } catch (err) {
        console.error('Supabase product creation failed, saving to local DB:', err);
      }
    }

    const db = getLocalDb();
    db.products = db.products || [];
    db.products.push(newProduct);
    saveLocalDb(db);
    return newProduct;
  },

  updateProduct: async (id: string, product: Partial<Product>): Promise<Product | null> => {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('products')
          .update({
            name: product.name,
            description: product.description,
            price: product.price,
            category: product.category,
            sizes: product.sizes,
            images: product.images,
            stock: product.stock,
            featured: product.featured
          })
          .eq('id', id)
          .select()
          .maybeSingle();
        if (error) throw error;
      } catch (err) {
        console.error('Supabase product update failed, saving local DB:', err);
      }
    }

    const db = getLocalDb();
    const idx = db.products?.findIndex(p => p.id === id);
    if (idx !== -1 && idx !== undefined) {
      const updated = { ...db.products[idx], ...product };
      db.products[idx] = updated;
      saveLocalDb(db);
      return updated;
    }
    return null;
  },

  deleteProduct: async (id: string): Promise<boolean> => {
    if (supabase) {
      try {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error('Supabase product deletion failed, deleting from local DB:', err);
      }
    }

    const db = getLocalDb();
    const initialLen = db.products?.length || 0;
    db.products = db.products?.filter(p => p.id !== id) || [];
    saveLocalDb(db);
    return db.products.length < initialLen;
  },

  // Orders
  getOrders: async (): Promise<EcommerceOrder[]> => {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('ecommerce_orders')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (data) {
          return data.map((o: any) => ({
            id: o.id,
            customerName: o.customer_name,
            customerEmail: o.customer_email,
            customerPhone: o.customer_phone,
            customerAddress: typeof o.customer_address === 'string' ? JSON.parse(o.customer_address) : o.customer_address,
            items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items,
            totalAmount: parseFloat(o.total_amount),
            paymentStatus: o.payment_status,
            paymentId: o.payment_id,
            qrCode: o.qr_code,
            qrCodeBase64: o.qr_code_base64,
            createdAt: o.created_at
          }));
        }
      } catch (err) {
        console.error('Supabase orders fetch failed, using local DB:', err);
      }
    }

    const db = getLocalDb();
    return db.orders || [];
  },

  getOrderById: async (id: string): Promise<EcommerceOrder | null> => {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('ecommerce_orders')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          return {
            id: data.id,
            customerName: data.customer_name,
            customerEmail: data.customer_email,
            customerPhone: data.customer_phone,
            customerAddress: typeof data.customer_address === 'string' ? JSON.parse(data.customer_address) : data.customer_address,
            items: typeof data.items === 'string' ? JSON.parse(data.items) : data.items,
            totalAmount: parseFloat(data.total_amount),
            paymentStatus: data.payment_status,
            paymentId: data.payment_id,
            qrCode: data.qr_code,
            qrCodeBase64: data.qr_code_base64,
            createdAt: data.created_at
          };
        }
      } catch (err) {
        console.error('Supabase order fetch failed, using local DB:', err);
      }
    }

    const db = getLocalDb();
    return db.orders?.find(o => o.id === id) || null;
  },

  createOrder: async (order: Omit<EcommerceOrder, 'createdAt'>): Promise<EcommerceOrder> => {
    const newOrder: EcommerceOrder = {
      ...order,
      createdAt: new Date().toISOString()
    };

    if (supabase) {
      try {
        const { error } = await supabase
          .from('ecommerce_orders')
          .insert({
            id: order.id,
            customer_name: order.customerName,
            customer_email: order.customerEmail,
            customer_phone: order.customerPhone,
            customer_address: order.customerAddress,
            items: order.items,
            total_amount: order.totalAmount,
            payment_status: order.paymentStatus,
            payment_id: order.paymentId,
            qr_code: order.qrCode,
            qr_code_base64: order.qrCodeBase64
          });
        if (error) throw error;
      } catch (err) {
        console.error('Supabase order creation failed, saving to local DB:', err);
      }
    }

    const db = getLocalDb();
    db.orders = db.orders || [];
    db.orders.push(newOrder);
    saveLocalDb(db);
    return newOrder;
  },

  updateOrderStatus: async (
    id: string, 
    paymentStatus: EcommerceOrder['paymentStatus'], 
    paymentId?: string, 
    qrCode?: string, 
    qrCodeBase64?: string
  ): Promise<EcommerceOrder | null> => {
    if (supabase) {
      try {
        const updateData: any = { payment_status: paymentStatus };
        if (paymentId) updateData.payment_id = paymentId;
        if (qrCode) updateData.qr_code = qrCode;
        if (qrCodeBase64) updateData.qr_code_base64 = qrCodeBase64;

        const { error } = await supabase
          .from('ecommerce_orders')
          .update(updateData)
          .eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error('Supabase order status update failed, saving local DB:', err);
      }
    }

    const db = getLocalDb();
    const idx = db.orders?.findIndex(o => o.id === id);
    if (idx !== -1 && idx !== undefined) {
      const updated = { 
        ...db.orders[idx], 
        paymentStatus,
        ...(paymentId ? { paymentId } : {}),
        ...(qrCode ? { qrCode } : {}),
        ...(qrCodeBase64 ? { qrCodeBase64 } : {})
      };
      db.orders[idx] = updated;
      saveLocalDb(db);
      return updated;
    }
    return null;
  }
};
