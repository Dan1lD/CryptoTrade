-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    completed_trades INTEGER DEFAULT 0,
    total_trades INTEGER DEFAULT 0,
    success_rate NUMERIC(5,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cryptocurrency VARCHAR(50) NOT NULL,
    balance NUMERIC(20,8) DEFAULT 0.00000000,
    reserved_balance NUMERIC(20,8) DEFAULT 0.00000000 CHECK (reserved_balance >= 0),
    wallet_type VARCHAR(20) DEFAULT 'hot' CHECK (wallet_type IN ('hot', 'cold')),
    address VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_available_balance CHECK (balance >= reserved_balance)
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Create trade_offers table
-- Crypto-to-crypto trading: sell base_cryptocurrency for quote_cryptocurrency
CREATE TABLE IF NOT EXISTS trade_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    base_cryptocurrency VARCHAR(50) NOT NULL,
    quote_cryptocurrency VARCHAR(50) NOT NULL,
    offer_type VARCHAR(10) NOT NULL,
    amount NUMERIC(20,8) NOT NULL,
    exchange_rate NUMERIC(20,8) NOT NULL,
    payment_methods TEXT[] NOT NULL,
    reserved_wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
    reserved_amount NUMERIC(20,8) DEFAULT 0.00000000,
    terms TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active'
);

-- Create orders table (TimescaleDB hypertable)
-- Crypto-to-crypto orders
CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    base_cryptocurrency VARCHAR(50) NOT NULL,
    quote_cryptocurrency VARCHAR(50) NOT NULL,
    order_type VARCHAR(10) NOT NULL,
    side VARCHAR(10) NOT NULL,
    amount NUMERIC(20,8) NOT NULL,
    exchange_rate NUMERIC(20,8) NOT NULL,
    filled_amount NUMERIC(20,8) DEFAULT 0.00000000,
    status VARCHAR(20) DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
);

-- Convert orders to hypertable
SELECT create_hypertable('orders', 'created_at', if_not_exists => TRUE);

-- Create trades table (TimescaleDB hypertable)
-- Crypto-to-crypto trades
CREATE TABLE IF NOT EXISTS trades (
    id UUID DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    buy_order_id VARCHAR(255),
    sell_order_id VARCHAR(255),
    base_cryptocurrency VARCHAR(50) NOT NULL,
    quote_cryptocurrency VARCHAR(50) NOT NULL,
    amount NUMERIC(20,8) NOT NULL,
    exchange_rate NUMERIC(20,8) NOT NULL,
    quote_amount NUMERIC(20,8) NOT NULL,
    payment_method VARCHAR(100),
    status VARCHAR(20) DEFAULT 'completed',
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, executed_at)
);

-- Convert trades to hypertable
SELECT create_hypertable('trades', 'executed_at', if_not_exists => TRUE);

-- Create offer_acceptances table
-- Tracks CryptoTrade wallet offer acceptances to prevent double-spending
CREATE TABLE IF NOT EXISTS offer_acceptances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID NOT NULL REFERENCES trade_offers(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    accepted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(offer_id, buyer_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_crypto ON wallets(cryptocurrency);

-- Partial unique index: Only 1 hot wallet per currency per user (allows multiple cold wallets)
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallets_one_hot_per_currency 
ON wallets(user_id, cryptocurrency) 
WHERE wallet_type = 'hot';
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_trade_offers_seller ON trade_offers(seller_id);
CREATE INDEX IF NOT EXISTS idx_trade_offers_base_crypto ON trade_offers(base_cryptocurrency);
CREATE INDEX IF NOT EXISTS idx_trade_offers_quote_crypto ON trade_offers(quote_cryptocurrency);
CREATE INDEX IF NOT EXISTS idx_trade_offers_active ON trade_offers(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_base_crypto ON orders(base_cryptocurrency, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_quote_crypto ON orders(quote_cryptocurrency, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_buyer ON trades(buyer_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_seller ON trades(seller_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_base_crypto ON trades(base_cryptocurrency, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_quote_crypto ON trades(quote_cryptocurrency, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_offer_acceptances_offer ON offer_acceptances(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_acceptances_buyer ON offer_acceptances(buyer_id);
