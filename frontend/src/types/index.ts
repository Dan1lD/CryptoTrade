// Frontend types matching Python Pydantic models

export interface User {
  id: string;
  username: string;
  email: string;
  completedTrades: number;
  successRate: string;
  createdAt: string;
}

export interface UserResponse extends User {
  password?: string;
}

export interface Wallet {
  id: string;
  userId: string;
  cryptocurrency: string;
  balance: string;
  walletType: string;
  address: string;
}

export interface WalletCreate {
  cryptocurrency: string;
  balance: string;
  walletType: string;
  address: string;
}

export interface TradeOffer {
  id: string;
  sellerId: string;
  baseCryptocurrency: string;
  quoteCryptocurrency: string;
  offerType: string;
  amount: string;
  exchangeRate: string;
  paymentMethods: string[];
  terms?: string;
  status: string;
  createdAt: string;
}

export interface TradeOfferCreate {
  baseCryptocurrency: string;
  quoteCryptocurrency: string;
  offerType: string;
  amount: string;
  exchangeRate: string;
  paymentMethods: string[];
  terms?: string;
}

export interface Trade {
  id: string;
  offerId: string;
  buyerId: string;
  sellerId: string;
  baseCryptocurrency: string;
  quoteCryptocurrency: string;
  amount: string;
  exchangeRate: string;
  quoteAmount: string;
  paymentMethod: string;
  status: string;
  createdAt: string;
  completedAt?: string | null;
}

export interface AuthResponse {
  user: UserResponse;
  sessionId: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface CreateTradeRequest {
  offerId: string;
  amount?: string;
  paymentMethod: string;
}
