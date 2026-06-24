import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'database.json');

export interface UserStats {
  balance: number;
  totalOrders: number;
  totalSpent: number;
  status: string;
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
  status: 'Pendente' | 'Processando' | 'Concluido' | 'Cancelado';
  createdAt: string;
}

export interface Payment {
  id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  qrCodeBase64: string;
  qrCode: string;
  createdAt: string;
}

interface DatabaseSchema {
  user: UserStats;
  services: Service[];
  orders: Order[];
  payments: Payment[];
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
  },
  {
    id: '3045',
    name: 'TikTok Visualizações Ultra Rápidas ⚡ - R$ 0,15 por 1000',
    category: 'TIKTOK',
    ratePer1000: 0.15,
    min: 100,
    max: 1000000,
    description: 'Visualizações baratas e extremamente rápidas para vídeos do TikTok.'
  },
  {
    id: '4012',
    name: 'YouTube Visualizações Alta Retenção 📈 - R$ 12,90 por 1000',
    category: 'YOUTUBE',
    ratePer1000: 12.90,
    min: 50,
    max: 50000,
    description: 'Visualizações qualificadas com retenção de 2 a 5 minutos.'
  }
];

const INITIAL_DB: DatabaseSchema = {
  user: {
    balance: 0.03095,
    totalOrders: 6238743,
    totalSpent: 2209.63,
    status: 'Elite'
  },
  services: DEFAULT_SERVICES,
  orders: [],
  payments: []
};

function getDb(): DatabaseSchema {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(INITIAL_DB, null, 2), 'utf-8');
    return INITIAL_DB;
  }
  try {
    const content = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading database file, returning initial DB', error);
    return INITIAL_DB;
  }
}

function saveDb(db: DatabaseSchema) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

export const dbHelper = {
  getUser: (): UserStats => {
    return getDb().user;
  },
  updateUserBalance: (amount: number): UserStats => {
    const db = getDb();
    db.user.balance += amount;
    if (amount > 0) {
      // Recharging increases spent statistics if they are active users, but here it's just balance update.
    } else {
      // Placing an order reduces balance, increases total spent, and total orders
      db.user.totalSpent += Math.abs(amount);
      db.user.totalOrders += 1;
    }
    saveDb(db);
    return db.user;
  },
  getServices: (): Service[] => {
    return getDb().services;
  },
  getOrders: (): Order[] => {
    return getDb().orders;
  },
  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'status'>): Order => {
    const db = getDb();
    const newOrder: Order = {
      ...order,
      id: Math.floor(100000 + Math.random() * 900000).toString(),
      status: 'Processando',
      createdAt: new Date().toISOString()
    };
    db.orders.unshift(newOrder);
    saveDb(db);
    return newOrder;
  },
  getPayments: (): Payment[] => {
    return getDb().payments;
  },
  addPayment: (payment: Payment): void => {
    const db = getDb();
    db.payments.unshift(payment);
    saveDb(db);
  },
  updatePaymentStatus: (id: string, status: 'approved' | 'rejected'): Payment | null => {
    const db = getDb();
    const payment = db.payments.find(p => p.id === id);
    if (payment && payment.status !== status) {
      payment.status = status;
      if (status === 'approved') {
        db.user.balance += payment.amount;
      }
      saveDb(db);
      return payment;
    }
    return null;
  }
};
