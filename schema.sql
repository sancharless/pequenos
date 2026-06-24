-- SQL Schema Setup for Goobox SMM Panel
-- Execute this script in the Supabase SQL Editor

-- 1. Create USERS table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    balance DECIMAL(15, 5) DEFAULT 0.03095,
    total_orders INTEGER DEFAULT 0,
    total_spent DECIMAL(15, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'Iniciante',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create SERVICES cache table
CREATE TABLE IF NOT EXISTS services (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL,
    rate_per_1000 DECIMAL(15, 5) NOT NULL,
    min INTEGER NOT NULL,
    max INTEGER NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create ORDERS table
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(50) PRIMARY KEY, -- can be the supplier order ID
    user_email VARCHAR(255) NOT NULL,
    service_id VARCHAR(50) NOT NULL,
    service_name VARCHAR(255) NOT NULL,
    link TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    charge DECIMAL(15, 5) NOT NULL,
    status VARCHAR(50) DEFAULT 'Processando' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create PAYMENTS table
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(100) PRIMARY KEY, -- Mercado Pago payment ID
    user_email VARCHAR(255) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' NOT NULL,
    qr_code TEXT NOT NULL,
    qr_code_base64 TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Row Level Security) if needed or keep simple for admin backend connections
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all actions from service role key (backend operations)
CREATE POLICY "Allow all to service_role" ON users USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to service_role" ON services USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to service_role" ON orders USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to service_role" ON payments USING (true) WITH CHECK (true);
