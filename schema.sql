-- SQL Schema for Pequenos Estilosos Children's Clothing E-commerce
-- Execute this script in the Supabase SQL Editor

-- 1. Create PRODUCTS table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(15, 2) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'Bebê', 'Menino', 'Menina', 'Acessórios'
    sizes TEXT[] NOT NULL, -- e.g. ['P', 'M', 'G', '2', '4', '6']
    images TEXT[] NOT NULL, -- URLs or base64 data
    stock INTEGER DEFAULT 0 NOT NULL,
    featured BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create ECOMMERCE_ORDERS table
CREATE TABLE IF NOT EXISTS ecommerce_orders (
    id VARCHAR(100) PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    customer_address JSONB NOT NULL, -- street, number, complement, neighborhood, city, state, zipCode
    items JSONB NOT NULL, -- [{ productId, name, price, quantity, size, image }]
    total_amount DECIMAL(15, 2) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'pending' NOT NULL, -- 'pending', 'approved', 'rejected'
    payment_id VARCHAR(100), -- Mercado Pago payment ID
    qr_code TEXT,
    qr_code_base64 TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create ECOMMERCE_SETTINGS table
CREATE TABLE IF NOT EXISTS ecommerce_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL
);

-- Insert default settings
INSERT INTO ecommerce_settings (key, value) VALUES 
('whatsappNumber', '5581999999999'),
('instagramUrl', 'https://instagram.com/pequenosestilosos'),
('mercadoPagoToken', ''),
('shippingFee', '15.00')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Enable Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecommerce_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecommerce_settings ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all actions from service role key (backend operations)
CREATE POLICY "Allow all to service_role" ON products USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to service_role" ON ecommerce_orders USING (true) WITH CHECK (true);
CREATE POLICY "Allow all to service_role" ON ecommerce_settings USING (true) WITH CHECK (true);

-- Allow public read access to products and settings
CREATE POLICY "Allow public read products" ON products FOR SELECT USING (true);
CREATE POLICY "Allow public read settings" ON ecommerce_settings FOR SELECT USING (true);
