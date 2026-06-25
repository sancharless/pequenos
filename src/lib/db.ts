import fs from 'fs';
import path from 'path';
import { supabase } from './supabase';
import { supplierClient } from './supplier';

const DB_PATH = path.join(process.cwd(), 'database.json');

export interface UserStats {
  id?: string;
  name: string;
  email: string;
  balance: number;
  totalOrders: number;
  totalSpent: number;
  status: string;
  passwordHash?: string;
  role?: string;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  ratePer1000: number;
  min: number;
  max: number;
  description: string;
}

export interface Order {
  id: string;
  serviceId: string;
  serviceName: string;
  link: string;
  quantity: number;
  charge: number;
  status: 'Pendente' | 'Processando' | 'Concluido' | 'Cancelado' | 'Parcial';
  createdAt: string;
  userEmail?: string;
}

export interface Payment {
  id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  qrCodeBase64: string;
  qrCode: string;
  createdAt: string;
  userEmail?: string;
}

export interface Coupon {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minDeposit: number;
  maxUses?: number | null;
  usedCount: number;
  isActive: boolean;
  createdAt?: string;
}

export interface CouponUse {
  id?: string;
  couponCode: string;
  userEmail: string;
  usedAt?: string;
}

export interface PaymentCoupon {
  paymentId: string;
  couponCode: string;
  bonusAmount: number;
}

interface DatabaseSchema {
  user: UserStats;
  services: Service[];
  orders: Order[];
  payments: Payment[];
  usersList?: UserStats[];
  coupons?: Coupon[];
  couponUses?: CouponUse[];
  paymentCoupons?: PaymentCoupon[];
}

const DEFAULT_SERVICES: Service[] = [
  {
    id: '1895',
    name: 'Instagram Seguidores Mundial 🌏 [SR] - R$ 6,90 por 1000',
    category: 'SERVIÇOS EM PROMOÇÃO ☀️',
    ratePer1000: 6.90,
    min: 10,
    max: 10000,
    description: 'Instagram Seguidores de alta qualidade, entrega rápida e garantia de reposição de 30 dias.'
  },
  {
    id: '2001',
    name: 'Instagram Curtidas Brasileiras 🇧🇷 [Rápido] - R$ 4,50 por 1000',
    category: 'SERVIÇOS EM PROMOÇÃO ☀️',
    ratePer1000: 4.50,
    min: 20,
    max: 5000,
    description: 'Curtidas brasileiras em posts do Instagram. Início imediato.'
  }
];

const INITIAL_DB: DatabaseSchema = {
  user: {
    name: 'Admin',
    email: 'admin@goobox.com',
    balance: 0.03095,
    totalOrders: 1475,
    totalSpent: 412.50,
    status: 'Elite',
    role: 'admin'
  },
  usersList: [],
  services: DEFAULT_SERVICES,
  orders: [],
  payments: [],
  coupons: [
    {
      code: 'BOASVINDAS10',
      type: 'percentage',
      value: 10.00,
      minDeposit: 30.00,
      maxUses: 100,
      usedCount: 0,
      isActive: true
    },
    {
      code: 'GRATIS5',
      type: 'fixed',
      value: 5.00,
      minDeposit: 0.00,
      maxUses: 200,
      usedCount: 0,
      isActive: true
    }
  ],
  couponUses: [],
  paymentCoupons: []
};

// JSON Local Fallback Helpers
function getLocalDb(): DatabaseSchema {
  if (!fs.existsSync(DB_PATH)) {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(INITIAL_DB, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Failed to write initial DB fallback file (likely read-only environment):', err);
    }
    return INITIAL_DB;
  }
  try {
    const content = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return INITIAL_DB;
  }
}

function saveLocalDb(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to write local database file (likely read-only environment):', err);
  }
}

export const dbHelper = {
  // Authentication & Users
  getUserByEmail: async (email: string): Promise<UserStats | null> => {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        return {
          id: data.id,
          name: data.name,
          email: data.email,
          balance: parseFloat(data.balance),
          totalOrders: data.total_orders,
          totalSpent: parseFloat(data.total_spent),
          status: data.status,
          passwordHash: data.password_hash,
          role: data.role
        };
      } catch (err) {
        console.error('Supabase error, falling back to local JSON db:', err);
      }
    }

    // Local Fallback
    const db = getLocalDb();
    if (db.user.email === email) return { ...db.user, role: db.user.role || 'admin' };
    const users = db.usersList || [];
    const found = users.find(u => u.email === email);
    return found ? { ...found, role: found.role || 'user' } : null;
  },

  updateUserPassword: async (email: string, passwordHash: string): Promise<boolean> => {
    if (supabase) {
      try {
        const { error } = await supabase
          .from('users')
          .update({ password_hash: passwordHash })
          .eq('email', email);
        if (error) throw error;
      } catch (err) {
        console.error('Supabase password update failed:', err);
      }
    }
    
    const db = getLocalDb();
    if (db.user.email.toLowerCase() === email.toLowerCase()) {
      db.user.passwordHash = passwordHash;
      saveLocalDb(db);
      return true;
    }
    if (db.usersList) {
      const idx = db.usersList.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
      if (idx !== -1) {
        db.usersList[idx].passwordHash = passwordHash;
        saveLocalDb(db);
        return true;
      }
    }
    return false;
  },


  createUser: async (user: Omit<UserStats, 'totalOrders' | 'totalSpent' | 'status'>): Promise<UserStats> => {
    const startingBalance = 0.00; // Users start with 0.00 balance
    const role = user.email.toLowerCase() === 'admin@goobox.com' ? 'admin' : 'user';
    
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .insert({
            name: user.name,
            email: user.email,
            password_hash: user.passwordHash || '',
            balance: startingBalance,
            total_orders: 0,
            total_spent: 0.00,
            status: 'Iniciante',
            role: role
          })
          .select()
          .single();

        if (error) throw error;

        return {
          id: data.id,
          name: data.name,
          email: data.email,
          balance: parseFloat(data.balance),
          totalOrders: data.total_orders,
          totalSpent: parseFloat(data.total_spent),
          status: data.status,
          role: data.role
        };
      } catch (err) {
        console.error('Supabase error, creating user in local JSON db:', err);
      }
    }

    // Local Fallback
    const db = getLocalDb();
    const newUser: UserStats = {
      name: user.name,
      email: user.email,
      balance: startingBalance,
      totalOrders: 0,
      totalSpent: 0.00,
      status: 'Iniciante',
      passwordHash: user.passwordHash,
      role: role
    };
    if (!db.usersList) db.usersList = [];
    db.usersList.push(newUser);
    saveLocalDb(db);
    return newUser;
  },

  deleteUser: async (email: string): Promise<boolean> => {
    if (email.toLowerCase() === 'admin@goobox.com') return false;
    
    if (supabase) {
      try {
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('email', email);

        if (error) throw error;
      } catch (err) {
        console.error('Supabase user deletion failed:', err);
      }
    }

    const db = getLocalDb();
    if (db.usersList) {
      db.usersList = db.usersList.filter(u => u.email.toLowerCase() !== email.toLowerCase());
      saveLocalDb(db);
    }
    return true;
  },

  adminCreateUser: async (user: Omit<UserStats, 'totalOrders' | 'totalSpent' | 'status'> & { passwordHash: string; balance: number; role: string }): Promise<UserStats> => {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .insert({
            name: user.name,
            email: user.email,
            password_hash: user.passwordHash || '',
            balance: user.balance,
            total_orders: 0,
            total_spent: 0.00,
            status: 'Iniciante',
            role: user.role
          })
          .select()
          .single();

        if (error) throw error;

        return {
          id: data.id,
          name: data.name,
          email: data.email,
          balance: parseFloat(data.balance),
          totalOrders: data.total_orders,
          totalSpent: parseFloat(data.total_spent),
          status: data.status,
          role: data.role
        };
      } catch (err) {
        console.error('Supabase adminCreateUser failed, fallback to local DB:', err);
      }
    }

    const db = getLocalDb();
    const newUser: UserStats = {
      name: user.name,
      email: user.email,
      balance: user.balance,
      totalOrders: 0,
      totalSpent: 0.00,
      status: 'Iniciante',
      passwordHash: user.passwordHash,
      role: user.role
    };

    if (!db.usersList) db.usersList = [];
    db.usersList.push(newUser);
    saveLocalDb(db);
    return newUser;
  },

  getUser: async (email?: string): Promise<UserStats> => {
    const targetEmail = email || 'admin@goobox.com';
    let u = await dbHelper.getUserByEmail(targetEmail);
    
    if (!u) {
      // Auto-register simulated users in the database so they exist in Supabase
      const isElite = targetEmail.toLowerCase() === 'admin@goobox.com';
      const displayName = targetEmail.split('@')[0].charAt(0).toUpperCase() + targetEmail.split('@')[0].slice(1);
      
      u = await dbHelper.createUser({
        name: displayName,
        email: targetEmail,
        passwordHash: '',
        balance: 0.00
      });

      if (isElite) {
        u.balance = 1000.00; // Give default admin R$ 1000.00 to test SMM orders
        u.status = 'Elite';
        u.totalOrders = 1475;
        u.totalSpent = 412.50;
        
        if (supabase) {
          try {
            await supabase
              .from('users')
              .update({
                balance: u.balance,
                status: u.status,
                total_orders: u.totalOrders,
                total_spent: u.totalSpent
              })
              .eq('email', targetEmail);
          } catch (err) {
            console.error('Failed to update admin initial balance in Supabase:', err);
          }
        }
      }
    }
    
    return u;
  },

  updateUserBalance: async (email: string, amount: number): Promise<void> => {
    if (supabase) {
      try {
        const user = await dbHelper.getUserByEmail(email);
        if (user) {
          const newBalance = user.balance + amount;
          const updates: any = { balance: newBalance };
          
          if (amount < 0) {
            updates.total_spent = user.totalSpent + Math.abs(amount);
            updates.total_orders = user.totalOrders + 1;
          }

          const { error } = await supabase
            .from('users')
            .update(updates)
            .eq('email', email);

          if (error) throw error;
          return;
        }
      } catch (err) {
        console.error('Supabase balance update failed, updating local DB:', err);
      }
    }

    // Local Fallback
    const db = getLocalDb();
    const isMainUser = db.user.email === email;
    const targetUser = isMainUser ? db.user : (db.usersList || []).find(u => u.email === email);

    if (targetUser) {
      targetUser.balance += amount;
      if (amount < 0) {
        targetUser.totalSpent += Math.abs(amount);
        targetUser.totalOrders += 1;
      }
      saveLocalDb(db);
    }
  },

  // Services
  getServices: async (): Promise<Service[]> => {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .order('category', { ascending: true });

        if (error) throw error;
        if (data && data.length > 0) {
          return data.map(s => ({
            id: s.id,
            name: s.name,
            category: s.category,
            ratePer1000: parseFloat(s.rate_per_1000),
            min: s.min,
            max: s.max,
            description: s.description || ''
          }));
        }
      } catch (err) {
        console.error('Supabase services fetch failed, using local services:', err);
      }
    }
    return getLocalDb().services;
  },

  // Orders
  getOrders: async (userEmail?: string): Promise<Order[]> => {
    if (supabase) {
      try {
        let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
        if (userEmail) {
          query = query.eq('user_email', userEmail);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        
        return (data || []).map(o => ({
          id: o.id,
          serviceId: o.service_id,
          serviceName: o.service_name,
          link: o.link,
          quantity: o.quantity,
          charge: parseFloat(o.charge),
          status: o.status as any,
          createdAt: o.created_at,
          userEmail: o.user_email
        }));
      } catch (err) {
        console.error('Supabase orders fetch failed:', err);
      }
    }

    const db = getLocalDb();
    if (userEmail) {
      return db.orders.filter(o => o.userEmail === userEmail);
    }
    return db.orders;
  },

  getOrderById: async (id: string): Promise<Order | null> => {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        return {
          id: data.id,
          serviceId: data.service_id,
          serviceName: data.service_name,
          link: data.link,
          quantity: data.quantity,
          charge: parseFloat(data.charge),
          status: data.status as any,
          createdAt: data.created_at,
          userEmail: data.user_email
        };
      } catch (err) {
        console.error(`Supabase fetch order by ID failed for ${id}:`, err);
      }
    }

    const db = getLocalDb();
    const found = db.orders.find(o => o.id === id);
    return found || null;
  },

  addOrder: async (order: Omit<Order, 'id' | 'createdAt' | 'status'> & { id?: string }): Promise<Order> => {
    const orderId = order.id || Math.floor(100000 + Math.random() * 900000).toString();
    const createdAt = new Date().toISOString();
    const defaultStatus = 'Processando';

    if (supabase) {
      try {
        const { error } = await supabase
          .from('orders')
          .insert({
            id: orderId,
            user_email: order.userEmail || 'admin@goobox.com',
            service_id: order.serviceId,
            service_name: order.serviceName,
            link: order.link,
            quantity: order.quantity,
            charge: order.charge,
            status: defaultStatus,
            created_at: createdAt
          });

        if (error) throw error;
      } catch (err) {
        console.error('Supabase order insert failed, saving to local:', err);
      }
    }

    // Save locally
    const db = getLocalDb();
    const newOrder: Order = {
      id: orderId,
      serviceId: order.serviceId,
      serviceName: order.serviceName,
      link: order.link,
      quantity: order.quantity,
      charge: order.charge,
      status: defaultStatus,
      createdAt: createdAt,
      userEmail: order.userEmail || 'admin@goobox.com'
    };
    db.orders.unshift(newOrder);
    saveLocalDb(db);
    return newOrder;
  },

  updateOrderStatus: async (id: string, status: string): Promise<void> => {
    if (supabase) {
      try {
        const { error } = await supabase
          .from('orders')
          .update({ status: status })
          .eq('id', id);

        if (error) throw error;
      } catch (err) {
        console.error(`Supabase order status update failed for ${id}:`, err);
      }
    }

    const db = getLocalDb();
    const order = db.orders.find(o => o.id === id);
    if (order) {
      order.status = status as any;
      saveLocalDb(db);
    }
  },

  // Payments
  getPayments: async (userEmail?: string): Promise<Payment[]> => {
    if (supabase) {
      try {
        let query = supabase.from('payments').select('*').order('created_at', { ascending: false });
        if (userEmail) {
          query = query.eq('user_email', userEmail);
        }
        const { data, error } = await query;
        if (error) throw error;
        
        return (data || []).map(p => ({
          id: p.id,
          amount: parseFloat(p.amount),
          status: p.status as any,
          qrCode: p.qr_code,
          qrCodeBase64: p.qr_code_base64,
          createdAt: p.created_at,
          userEmail: p.user_email
        }));
      } catch (err) {
        console.error('Supabase payments fetch failed:', err);
      }
    }

    const db = getLocalDb();
    if (userEmail) {
      return db.payments.filter(p => p.userEmail === userEmail);
    }
    return db.payments;
  },

  addPayment: async (payment: Payment): Promise<void> => {
    if (supabase) {
      try {
        const { error } = await supabase
          .from('payments')
          .insert({
            id: payment.id,
            user_email: payment.userEmail || 'admin@goobox.com',
            amount: payment.amount,
            status: payment.status,
            qr_code: payment.qrCode,
            qr_code_base64: payment.qrCodeBase64,
            created_at: payment.createdAt
          });

        if (error) throw error;
      } catch (err) {
        console.error('Supabase payment insert failed, saving to local:', err);
      }
    }

    const db = getLocalDb();
    db.payments.unshift(payment);
    saveLocalDb(db);
  },

  updatePaymentStatus: async (id: string, status: 'approved' | 'rejected'): Promise<Payment | null> => {
    if (supabase) {
      try {
        // Fetch payment details
        const { data: payData, error: payError } = await supabase
          .from('payments')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (payError) throw payError;

        if (payData && payData.status !== status) {
          const { error: updateError } = await supabase
            .from('payments')
            .update({ status: status })
            .eq('id', id);

          if (updateError) throw updateError;

          if (status === 'approved') {
            await dbHelper.updateUserBalance(payData.user_email, parseFloat(payData.amount));
          }

          return {
            id: payData.id,
            amount: parseFloat(payData.amount),
            status: status,
            qrCode: payData.qr_code,
            qrCodeBase64: payData.qr_code_base64,
            createdAt: payData.created_at,
            userEmail: payData.user_email
          };
        }
      } catch (err) {
        console.error('Supabase payment update failed, executing on local fallback:', err);
      }
    }

    // Local Fallback
    const db = getLocalDb();
    const payment = db.payments.find(p => p.id === id);
    if (payment && payment.status !== status) {
      payment.status = status;
      if (status === 'approved') {
        const targetEmail = payment.userEmail || db.user.email;
        const targetUser = db.user.email === targetEmail ? db.user : (db.usersList || []).find(u => u.email === targetEmail);
        if (targetUser) {
          targetUser.balance += payment.amount;
        }
      }
      saveLocalDb(db);
      return payment;
    }
    return null;
  },

  // Admin Operations
  getAllUsers: async (): Promise<UserStats[]> => {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          balance: parseFloat(u.balance),
          totalOrders: u.total_orders,
          totalSpent: parseFloat(u.total_spent),
          status: u.status,
          role: u.role
        }));
      } catch (err) {
        console.error('Supabase fetch users failed:', err);
      }
    }
    const db = getLocalDb();
    const mainUser = { ...db.user, role: db.user.role || 'admin' };
    const list = (db.usersList || []).map(u => ({ ...u, role: u.role || 'user' }));
    return [mainUser, ...list];
  },

  adjustUserBalance: async (email: string, amount: number): Promise<void> => {
    if (supabase) {
      try {
        const user = await dbHelper.getUserByEmail(email);
        if (user) {
          const newBalance = user.balance + amount;
          const { error } = await supabase
            .from('users')
            .update({ balance: newBalance })
            .eq('email', email);

          if (error) throw error;
          return;
        }
      } catch (err) {
        console.error('Supabase adjust balance failed:', err);
      }
    }
    
    const db = getLocalDb();
    const isMainUser = db.user.email === email;
    const targetUser = isMainUser ? db.user : (db.usersList || []).find(u => u.email === email);
    if (targetUser) {
      targetUser.balance += amount;
      saveLocalDb(db);
    }
  },

  getSetting: async (key: string, defaultValue: string): Promise<string> => {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('value')
          .eq('key', key)
          .maybeSingle();

        if (error) throw error;
        if (data) return data.value;
      } catch (err) {
        console.error('Supabase get setting failed:', err);
      }
    }
    const db = getLocalDb() as any;
    if (!db.settings) db.settings = {};
    if (db.settings[key] === undefined) {
      db.settings[key] = defaultValue;
      saveLocalDb(db);
    }
    return db.settings[key];
  },

  updateSetting: async (key: string, value: string): Promise<void> => {
    if (supabase) {
      try {
        const { error } = await supabase
          .from('settings')
          .upsert({ key, value })
          .eq('key', key);

        if (error) throw error;
        return;
      } catch (err) {
        console.error('Supabase update setting failed:', err);
      }
    }
    const db = getLocalDb() as any;
    if (!db.settings) db.settings = {};
    db.settings[key] = value;
    saveLocalDb(db);
  },

  adminCreateService: async (service: Omit<Service, 'updatedAt'>): Promise<Service> => {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('services')
          .insert({
            id: service.id,
            name: service.name,
            category: service.category,
            rate_per_1000: service.ratePer1000,
            min: service.min,
            max: service.max,
            description: service.description || ''
          })
          .select()
          .single();

        if (error) throw error;
        return {
          id: data.id,
          name: data.name,
          category: data.category,
          ratePer1000: parseFloat(data.rate_per_1000),
          min: data.min,
          max: data.max,
          description: data.description || ''
        };
      } catch (err) {
        console.error('Supabase adminCreateService failed, fallback to local DB:', err);
      }
    }

    const db = getLocalDb();
    const newService: Service = {
      id: service.id,
      name: service.name,
      category: service.category,
      ratePer1000: service.ratePer1000,
      min: service.min,
      max: service.max,
      description: service.description
    };
    db.services.push(newService);
    saveLocalDb(db);
    return newService;
  },

  adminUpdateService: async (id: string, service: Partial<Omit<Service, 'id'>>): Promise<Service | null> => {
    if (supabase) {
      try {
        const updates: any = {};
        if (service.name !== undefined) updates.name = service.name;
        if (service.category !== undefined) updates.category = service.category;
        if (service.ratePer1000 !== undefined) updates.rate_per_1000 = service.ratePer1000;
        if (service.min !== undefined) updates.min = service.min;
        if (service.max !== undefined) updates.max = service.max;
        if (service.description !== undefined) updates.description = service.description;
        updates.updated_at = new Date().toISOString();

        const { data, error } = await supabase
          .from('services')
          .update(updates)
          .eq('id', id)
          .select()
          .maybeSingle();

        if (error) throw error;
        if (data) {
          return {
            id: data.id,
            name: data.name,
            category: data.category,
            ratePer1000: parseFloat(data.rate_per_1000),
            min: data.min,
            max: data.max,
            description: data.description || ''
          };
        }
      } catch (err) {
        console.error('Supabase adminUpdateService failed, fallback to local DB:', err);
      }
    }

    const db = getLocalDb();
    const foundIndex = db.services.findIndex(s => s.id === id);
    if (foundIndex !== -1) {
      const updated = { ...db.services[foundIndex], ...service };
      db.services[foundIndex] = updated;
      saveLocalDb(db);
      return updated;
    }
    return null;
  },

  adminDeleteService: async (id: string): Promise<boolean> => {
    let deleted = false;
    if (supabase) {
      try {
        const { error } = await supabase
          .from('services')
          .delete()
          .eq('id', id);

        if (error) throw error;
        deleted = true;
      } catch (err) {
        console.error('Supabase adminDeleteService failed:', err);
      }
    }

    const db = getLocalDb();
    const originalLength = db.services.length;
    db.services = db.services.filter(s => s.id !== id);
    if (db.services.length !== originalLength) {
      saveLocalDb(db);
      deleted = true;
    }
    return deleted;
  },

  syncServicesFromSupplier: async (): Promise<Service[]> => {
    try {
      const rawServices = await supplierClient.getServices();
      const markupStr = await dbHelper.getSetting('service_markup_percent', '20');
      const markupPercent = parseFloat(markupStr) || 20;

      const syncedServices: Service[] = [];

      for (const srv of rawServices) {
        const baseRate = parseFloat(srv.rate);
        const sellingRate = baseRate * (1 + markupPercent / 100);
        const serviceId = srv.service.toString();
        const serviceName = srv.name;
        const category = srv.category;
        const min = srv.min;
        const max = srv.max;
        const description = `Serviço de alta velocidade de tipo: ${srv.type}. Pedido mínimo de ${srv.min} e máximo de ${srv.max} unidades.`;

        syncedServices.push({
          id: serviceId,
          name: `${serviceName} - R$ ${sellingRate.toFixed(2)} por 1000`,
          category: category,
          ratePer1000: sellingRate,
          min: min,
          max: max,
          description: description
        });
      }

      if (supabase) {
        try {
          const dbRows = syncedServices.map(s => ({
            id: s.id,
            name: s.name,
            category: s.category,
            rate_per_1000: s.ratePer1000,
            min: s.min,
            max: s.max,
            description: s.description,
            updated_at: new Date().toISOString()
          }));

          const { error } = await supabase
            .from('services')
            .upsert(dbRows, { onConflict: 'id' });

          if (error) throw error;
        } catch (err) {
          console.error('Supabase bulk upsert failed, syncing local JSON DB instead:', err);
        }
      }

      const db = getLocalDb();
      for (const s of syncedServices) {
        const idx = db.services.findIndex(existing => existing.id === s.id);
        if (idx !== -1) {
          db.services[idx] = s;
        } else {
          db.services.push(s);
        }
      }
      saveLocalDb(db);

      return syncedServices;
    } catch (err) {
      console.error('syncServicesFromSupplier failed:', err);
      return [];
    }
  },

  getCoupons: async (): Promise<Coupon[]> => {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('coupons')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(c => ({
          code: c.code,
          type: c.type,
          value: parseFloat(c.value),
          minDeposit: parseFloat(c.min_deposit),
          maxUses: c.max_uses,
          usedCount: c.used_count,
          isActive: c.is_active,
          createdAt: c.created_at
        }));
      } catch (err) {
        console.error('Supabase getCoupons failed:', err);
      }
    }
    const db = getLocalDb();
    return db.coupons || [];
  },

  createCoupon: async (coupon: Coupon): Promise<Coupon> => {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('coupons')
          .insert({
            code: coupon.code.toUpperCase(),
            type: coupon.type,
            value: coupon.value,
            min_deposit: coupon.minDeposit,
            max_uses: coupon.maxUses,
            used_count: 0,
            is_active: true
          })
          .select()
          .single();

        if (error) throw error;
        return {
          code: data.code,
          type: data.type,
          value: parseFloat(data.value),
          minDeposit: parseFloat(data.min_deposit),
          maxUses: data.max_uses,
          usedCount: data.used_count,
          isActive: data.is_active,
          createdAt: data.created_at
        };
      } catch (err) {
        console.error('Supabase createCoupon failed:', err);
      }
    }
    const db = getLocalDb();
    if (!db.coupons) db.coupons = [];
    const newCoupon: Coupon = {
      ...coupon,
      code: coupon.code.toUpperCase(),
      usedCount: 0,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    db.coupons.push(newCoupon);
    saveLocalDb(db);
    return newCoupon;
  },

  deleteCoupon: async (code: string): Promise<boolean> => {
    const cleanCode = code.toUpperCase();
    if (supabase) {
      try {
        const { error } = await supabase
          .from('coupons')
          .delete()
          .eq('code', cleanCode);

        if (error) throw error;
        return true;
      } catch (err) {
        console.error('Supabase deleteCoupon failed:', err);
      }
    }
    const db = getLocalDb();
    let changed = false;
    if (db.coupons) {
      const originalLength = db.coupons.length;
      db.coupons = db.coupons.filter(c => c.code !== cleanCode);
      if (db.coupons.length !== originalLength) {
        changed = true;
      }
    }
    if (db.couponUses) {
      const originalLength = db.couponUses.length;
      db.couponUses = db.couponUses.filter(u => u.couponCode !== cleanCode);
      if (db.couponUses.length !== originalLength) {
        changed = true;
      }
    }
    if (db.paymentCoupons) {
      const originalLength = db.paymentCoupons.length;
      db.paymentCoupons = db.paymentCoupons.filter(pc => pc.couponCode !== cleanCode);
      if (db.paymentCoupons.length !== originalLength) {
        changed = true;
      }
    }
    if (changed) {
      saveLocalDb(db);
      return true;
    }
    return false;
  },

  getCouponByCode: async (code: string): Promise<Coupon | null> => {
    const cleanCode = code.toUpperCase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('coupons')
          .select('*')
          .eq('code', cleanCode)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          return {
            code: data.code,
            type: data.type,
            value: parseFloat(data.value),
            minDeposit: parseFloat(data.min_deposit),
            maxUses: data.max_uses,
            usedCount: data.used_count,
            isActive: data.is_active,
            createdAt: data.created_at
          };
        }
        return null;
      } catch (err) {
        console.error('Supabase getCouponByCode failed:', err);
      }
    }
    const db = getLocalDb();
    const found = (db.coupons || []).find(c => c.code === cleanCode);
    return found || null;
  },

  checkCouponUse: async (code: string, email: string): Promise<boolean> => {
    const cleanCode = code.toUpperCase();
    const cleanEmail = email.toLowerCase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('coupon_uses')
          .select('id')
          .eq('coupon_code', cleanCode)
          .eq('user_email', cleanEmail)
          .maybeSingle();

        if (error) throw error;
        return !!data;
      } catch (err) {
        console.error('Supabase checkCouponUse failed:', err);
      }
    }
    const db = getLocalDb();
    const uses = db.couponUses || [];
    return uses.some(u => u.couponCode === cleanCode && u.userEmail === cleanEmail);
  },

  registerCouponUse: async (code: string, email: string): Promise<void> => {
    const cleanCode = code.toUpperCase();
    const cleanEmail = email.toLowerCase();
    if (supabase) {
      try {
        const { error: insertErr } = await supabase
          .from('coupon_uses')
          .insert({
            coupon_code: cleanCode,
            user_email: cleanEmail
          });

        if (insertErr) throw insertErr;

        const coupon = await dbHelper.getCouponByCode(cleanCode);
        if (coupon) {
          await supabase
            .from('coupons')
            .update({ used_count: coupon.usedCount + 1 })
            .eq('code', cleanCode);
        }
        return;
      } catch (err) {
        console.error('Supabase registerCouponUse failed:', err);
      }
    }
    const db = getLocalDb();
    if (!db.couponUses) db.couponUses = [];
    db.couponUses.push({
      couponCode: cleanCode,
      userEmail: cleanEmail,
      usedAt: new Date().toISOString()
    });

    if (db.coupons) {
      const couponIdx = db.coupons.findIndex(c => c.code === cleanCode);
      if (couponIdx !== -1) {
        db.coupons[couponIdx].usedCount += 1;
      }
    }
    saveLocalDb(db);
  },

  savePaymentCoupon: async (paymentId: string, code: string, bonusAmount: number): Promise<void> => {
    const cleanCode = code.toUpperCase();
    if (supabase) {
      try {
        const { error } = await supabase
          .from('payment_coupons')
          .insert({
            payment_id: paymentId,
            coupon_code: cleanCode,
            bonus_amount: bonusAmount
          });

        if (error) throw error;
        return;
      } catch (err) {
        console.error('Supabase savePaymentCoupon failed:', err);
      }
    }
    const db = getLocalDb();
    if (!db.paymentCoupons) db.paymentCoupons = [];
    db.paymentCoupons = db.paymentCoupons.filter(pc => pc.paymentId !== paymentId);
    db.paymentCoupons.push({
      paymentId,
      couponCode: cleanCode,
      bonusAmount
    });
    saveLocalDb(db);
  },

  getPaymentCoupon: async (paymentId: string): Promise<PaymentCoupon | null> => {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('payment_coupons')
          .select('*')
          .eq('payment_id', paymentId)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          return {
            paymentId: data.payment_id,
            couponCode: data.coupon_code,
            bonusAmount: parseFloat(data.bonus_amount)
          };
        }
        return null;
      } catch (err) {
        console.error('Supabase getPaymentCoupon failed:', err);
      }
    }
    const db = getLocalDb();
    const found = (db.paymentCoupons || []).find(pc => pc.paymentId === paymentId);
    return found || null;
  }
};
