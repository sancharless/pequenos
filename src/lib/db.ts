import fs from 'fs';
import path from 'path';
import { supabase } from './supabase';

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

interface DatabaseSchema {
  user: UserStats;
  services: Service[];
  orders: Order[];
  payments: Payment[];
  usersList?: UserStats[];
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
  payments: []
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
  }
};
