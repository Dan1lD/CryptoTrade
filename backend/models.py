from pydantic import BaseModel, EmailStr, ConfigDict, field_validator
from pydantic.alias_generators import to_camel
from typing import Optional, List, Literal
from datetime import datetime
from decimal import Decimal
from enum import Enum


class UserBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel, serialize_by_alias=True)
    
    username: str
    email: EmailStr


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: str
    completed_trades: int = 0
    success_rate: Decimal = Decimal("0")
    created_at: datetime


class UserResponse(User):
    password: Optional[str] = None


class WalletType(str, Enum):
    HOT = "hot"
    COLD = "cold"


class WalletBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel, serialize_by_alias=True)
    
    cryptocurrency: str
    balance: Decimal = Decimal("0")
    wallet_type: WalletType = WalletType.HOT
    address: str
    
    @field_validator('wallet_type', mode='before')
    @classmethod
    def normalize_wallet_type(cls, v):
        """Normalize wallet_type to lowercase and validate"""
        if isinstance(v, str):
            v = v.lower().strip()
            if v not in ['hot', 'cold']:
                raise ValueError('wallet_type must be either "hot" or "cold"')
        return v


class WalletCreate(WalletBase):
    user_id: Optional[str] = None


class Wallet(WalletBase):
    id: str
    user_id: str
    reserved_balance: Decimal = Decimal("0")


class TradeOfferBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel, serialize_by_alias=True)
    
    base_cryptocurrency: str
    quote_cryptocurrency: str
    offer_type: str
    amount: Decimal
    exchange_rate: Decimal
    payment_methods: List[str]
    terms: Optional[str] = None


class TradeOfferCreate(TradeOfferBase):
    seller_id: str


class TradeOffer(TradeOfferBase):
    id: str
    seller_id: str
    status: str = "active"
    reserved_wallet_id: Optional[str] = None
    reserved_amount: Decimal = Decimal("0")
    created_at: datetime


class TradeBase(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel, serialize_by_alias=True)
    
    offer_id: str
    base_cryptocurrency: str
    quote_cryptocurrency: str
    amount: Decimal
    exchange_rate: Decimal
    quote_amount: Decimal
    payment_method: str


class TradeCreate(TradeBase):
    buyer_id: str
    seller_id: str


class Trade(TradeBase):
    id: str
    buyer_id: str
    seller_id: str
    status: str = "pending"
    created_at: datetime
    completed_at: Optional[datetime] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel, serialize_by_alias=True)
    
    user: UserResponse
    session_id: str


class UpdateBalanceRequest(BaseModel):
    balance: str


class UpdateStatusRequest(BaseModel):
    status: str


class CreateTradeRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel, serialize_by_alias=True)
    
    offer_id: str
    amount: Optional[Decimal] = None
    payment_method: str
