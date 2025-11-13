from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
from decimal import Decimal
from datetime import datetime
from contextlib import asynccontextmanager

from models import (
    User, UserCreate, UserResponse, AuthResponse, LoginRequest,
    Wallet, WalletCreate, TradeOffer, TradeOfferCreate, TradeOfferBase,
    Trade, TradeCreate, CreateTradeRequest,
    UpdateBalanceRequest, UpdateStatusRequest
)
from db_storage import db
from matching_engine import ProRataMatchingEngine


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup, close on shutdown"""
    await db.initialize()
    yield
    await db.close()


app = FastAPI(title="P2P Crypto Trading Platform", lifespan=lifespan)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize matching engine
matching_engine = ProRataMatchingEngine(db)


# Dependency for authentication
async def get_current_user_id(x_session_id: Optional[str] = Header(None)) -> str:
    if not x_session_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    session = await db.get_session(x_session_id)
    if not session:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    return session["user_id"]


# Auth routes
@app.post("/api/auth/signup", response_model=AuthResponse)
async def signup(user_data: UserCreate):
    existing = await db.get_user_by_username(user_data.username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    existing_email = await db.get_user_by_email(user_data.email)
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    user = await db.create_user(user_data.model_dump(by_alias=False))
    session_id = await db.create_session(user["id"])
    
    user_copy = user.copy()
    user_copy.pop("password", None)
    
    return {"user": user_copy, "session_id": session_id}


@app.post("/api/auth/login", response_model=AuthResponse)
async def login(credentials: LoginRequest):
    user = await db.get_user_by_username(credentials.username)
    
    if not user or user["password"] != credentials.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    session_id = await db.create_session(user["id"])
    
    user_copy = user.copy()
    user_copy.pop("password", None)
    
    return {"user": user_copy, "session_id": session_id}


@app.post("/api/auth/logout")
async def logout(x_session_id: Optional[str] = Header(None)):
    if x_session_id:
        await db.delete_session(x_session_id)
    return {"success": True}


@app.get("/api/auth/me", response_model=UserResponse)
async def get_me(user_id: str = Depends(get_current_user_id)):
    user = await db.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_copy = user.copy()
    user_copy.pop("password", None)
    return user_copy


# Wallet routes
@app.get("/api/wallets", response_model=List[Wallet])
async def get_wallets(user_id: str = Depends(get_current_user_id)):
    wallets = await db.get_user_wallets(user_id)
    return wallets


@app.post("/api/wallets", response_model=Wallet)
async def create_wallet(
    wallet_data: WalletCreate,
    user_id: str = Depends(get_current_user_id)
):
    wallet_dict = wallet_data.model_dump(by_alias=False)
    wallet_dict["user_id"] = user_id
    
    # Normalize wallet_type to string value (Pydantic Enum returns enum object)
    wallet_dict["wallet_type"] = wallet_dict["wallet_type"].value if hasattr(wallet_dict["wallet_type"], "value") else str(wallet_dict["wallet_type"]).lower()
    
    # Validate: user can have no more than 1 hot wallet per currency
    if wallet_dict["wallet_type"] == "hot":
        has_hot = await db.has_hot_wallet_for_currency(user_id, wallet_dict["cryptocurrency"])
        if has_hot:
            raise HTTPException(
                status_code=400, 
                detail=f"You already have a hot wallet for {wallet_dict['cryptocurrency']}. You can only have 1 hot wallet per currency."
            )
    
    wallet = await db.create_wallet(wallet_dict)
    return wallet


@app.patch("/api/wallets/{wallet_id}/balance", response_model=Wallet)
async def update_wallet_balance(
    wallet_id: str,
    balance_data: UpdateBalanceRequest,
    user_id: str = Depends(get_current_user_id)
):
    wallet = await db.get_wallet(wallet_id)
    if not wallet or wallet["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    await db.update_wallet_balance(wallet_id, Decimal(balance_data.balance))
    updated = await db.get_wallet(wallet_id)
    return updated


# Trade offer routes (legacy P2P marketplace)
@app.get("/api/offers", response_model=List[TradeOffer])
async def get_offers(user_id: str = Depends(get_current_user_id)):
    """Get all active crypto-to-crypto offers with timezone-aware timestamps"""
    from datetime import timezone
    
    offers_db = await db.get_active_offers()
    
    # Normalize timestamps to timezone-aware UTC
    normalized_offers = []
    for offer in offers_db:
        # Make created_at timezone-aware if needed
        created_at = offer.get("created_at")
        if created_at and not created_at.tzinfo:
            created_at = created_at.replace(tzinfo=timezone.utc)
        elif not created_at:
            created_at = datetime.now(timezone.utc)
        
        normalized_offer = TradeOffer(
            id=offer["id"],
            seller_id=offer["seller_id"],
            base_cryptocurrency=offer["base_cryptocurrency"],
            quote_cryptocurrency=offer["quote_cryptocurrency"],
            offer_type=offer["offer_type"],
            amount=Decimal(str(offer["amount"])),
            exchange_rate=Decimal(str(offer["exchange_rate"])),
            payment_methods=offer["payment_methods"],
            terms=offer.get("terms", ""),
            status=offer["status"],
            created_at=created_at
        )
        normalized_offers.append(normalized_offer)
    
    return normalized_offers


@app.post("/api/offers", response_model=TradeOffer)
async def create_offer(
    offer_data: TradeOfferBase,
    user_id: str = Depends(get_current_user_id)
):
    """
    Create crypto-to-crypto trade offer.
    Seller offers base_cryptocurrency in exchange for quote_cryptocurrency.
    """
    offer_dict = offer_data.model_dump(by_alias=False)
    offer_dict["seller_id"] = user_id
    
    # Validate base != quote
    if offer_dict["base_cryptocurrency"] == offer_dict["quote_cryptocurrency"]:
        raise HTTPException(
            status_code=400,
            detail="Base and quote cryptocurrencies must be different"
        )
    
    # Validate exchange_rate > 0
    if offer_dict.get("exchange_rate", 0) <= 0:
        raise HTTPException(
            status_code=400,
            detail="Exchange rate must be greater than 0"
        )
    
    # Check if offer uses CryptoTrade wallet payment method
    uses_cryptotrade_wallet = "CryptoTrade wallet" in offer_dict.get("payment_methods", [])
    
    if uses_cryptotrade_wallet:
        # Validate user has a hot wallet for BASE cryptocurrency (what they're selling)
        hot_wallet = await db.get_hot_wallet_for_currency(user_id, offer_dict["base_cryptocurrency"])
        
        if not hot_wallet:
            raise HTTPException(
                status_code=400,
                detail=f"You must have a hot wallet for {offer_dict['base_cryptocurrency']} to use CryptoTrade wallet payment method"
            )
        
        # Check if user has enough available balance
        available = Decimal(str(hot_wallet['balance'])) - Decimal(str(hot_wallet['reserved_balance']))
        if available < Decimal(str(offer_dict["amount"])):
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient balance. Available: {available} {offer_dict['base_cryptocurrency']}, Required: {offer_dict['amount']}"
            )
        
        # Reserve the funds
        reservation_success = await db.reserve_wallet_funds(hot_wallet["id"], Decimal(str(offer_dict["amount"])))
        
        if not reservation_success:
            raise HTTPException(
                status_code=400,
                detail="Failed to reserve funds. Please try again."
            )
        
        # Store reservation info in offer
        offer_dict["reserved_wallet_id"] = hot_wallet["id"]
        offer_dict["reserved_amount"] = Decimal(str(offer_dict["amount"]))
    
    offer = await db.create_offer(offer_dict)
    return offer


# Order routes (TimescaleDB - Pro-Rata matching)
@app.post("/api/orders")
async def create_order(
    order_data: dict,
    user_id: str = Depends(get_current_user_id)
):
    """
    Create a new order and match it using Pro-Rata algorithm.
    
    Request body:
    {
        "cryptocurrency": "BTC",
        "fiatCurrency": "USD",
        "orderType": "buy" | "sell",
        "amount": 0.5,
        "price": 43500.00
    }
    """
    # Convert camelCase to snake_case
    order_dict = {
        "user_id": user_id,
        "cryptocurrency": order_data.get("cryptocurrency"),
        "fiat_currency": order_data.get("fiatCurrency"),
        "order_type": order_data.get("orderType"),
        "amount": Decimal(str(order_data.get("amount"))),
        "price": Decimal(str(order_data.get("price")))
    }
    
    # Create order in database
    order = await db.create_order(order_dict)
    
    # Match order using Pro-Rata algorithm
    trades = await matching_engine.match_order(order)
    
    return {
        "order": order,
        "trades": trades,
        "message": f"Order created. Matched {len(trades)} trades."
    }


@app.get("/api/orders")
async def get_orders(user_id: str = Depends(get_current_user_id)):
    """Get all orders for the current user"""
    # Note: This would need a get_user_orders method in db_storage
    # For now, return empty list
    return []


# Trade routes  
@app.get("/api/trades", response_model=List[Trade])
async def get_trades(user_id: str = Depends(get_current_user_id)):
    """Get all crypto-to-crypto trades for the current user"""
    trades_db = await db.get_user_trades(user_id)
    
    # Format trades to match Pydantic Trade model with timezone-aware timestamps
    from datetime import timezone
    
    formatted_trades = []
    for trade in trades_db:
        # Extract offer ID from buy_order_id or sell_order_id (if legacy format)
        buy_order_id = trade.get("buy_order_id", "")
        offer_id = buy_order_id.replace("legacy_offer_", "") if "legacy_offer_" in buy_order_id else buy_order_id
        
        # Make database timestamps timezone-aware (assume UTC)
        executed_at = trade["executed_at"]
        if executed_at and not executed_at.tzinfo:
            executed_at = executed_at.replace(tzinfo=timezone.utc)
        
        created_at = executed_at or datetime.now(timezone.utc)
        completed_at = executed_at if trade["status"] == "completed" else None
        
        formatted_trades.append(Trade(
            id=trade["id"],
            offer_id=offer_id,
            buyer_id=trade["buyer_id"],
            seller_id=trade["seller_id"],
            base_cryptocurrency=trade["base_cryptocurrency"],
            quote_cryptocurrency=trade["quote_cryptocurrency"],
            amount=Decimal(str(trade["amount"])),
            exchange_rate=Decimal(str(trade["exchange_rate"])),
            quote_amount=Decimal(str(trade["quote_amount"])),
            payment_method=trade.get("payment_method", ""),
            status=trade["status"],
            created_at=created_at,
            completed_at=completed_at
        ))
    
    return formatted_trades


@app.post("/api/trades", response_model=Trade)
async def create_trade(
    trade_request: CreateTradeRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Accept a crypto-to-crypto trade offer.
    - CryptoTrade wallet: executes instant dual-currency settlement
    - Other payment methods: NOT SUPPORTED (crypto-to-crypto requires on-platform wallets)
    """
    offer = await db.get_offer(trade_request.offer_id)
    if not offer or not offer["is_active"]:
        raise HTTPException(status_code=400, detail="Offer not available")
    
    buyer_id = user_id
    seller_id = offer["seller_id"]
    exchange_rate = Decimal(str(offer["exchange_rate"]))
    base_cryptocurrency = offer["base_cryptocurrency"]
    quote_cryptocurrency = offer["quote_cryptocurrency"]
    payment_method = trade_request.payment_method
    
    # MVP: Full offer amounts only (no partial fills)
    offer_amount = Decimal(str(offer["amount"]))
    
    if trade_request.amount:
        requested_amount = Decimal(str(trade_request.amount))
        # Allow full fills only
        if requested_amount != offer_amount:
            raise HTTPException(
                status_code=400,
                detail=f"Partial fills not supported. You must accept the full offer amount ({offer_amount})."
            )
        base_amount = requested_amount
    else:
        base_amount = offer_amount
    
    quote_amount = base_amount * exchange_rate
    
    # Prevent accepting your own offer
    if buyer_id == seller_id:
        raise HTTPException(status_code=400, detail="Cannot accept your own offer")
    
    # Only CryptoTrade wallet supported for crypto-to-crypto
    if payment_method != "CryptoTrade wallet":
        raise HTTPException(
            status_code=400,
            detail="Only CryptoTrade wallet payment is supported for crypto-to-crypto trades"
        )
    
    # Check if buyer already accepted this offer
    async with db.pool.acquire() as conn:
        existing = await conn.fetchrow(
            "SELECT id FROM offer_acceptances WHERE offer_id = $1 AND buyer_id = $2",
            trade_request.offer_id,
            buyer_id
        )
        if existing:
            raise HTTPException(status_code=400, detail="You have already accepted this offer")
    
    # Validate seller has base reservation
    if not offer.get("reserved_wallet_id") or not offer.get("reserved_amount"):
        raise HTTPException(status_code=400, detail="Offer does not have reserved funds")
    
    # Get all 4 wallets needed for dual settlement
    seller_base_wallet_id = offer["reserved_wallet_id"]
    buyer_base_wallet = await db.get_hot_wallet_for_currency(buyer_id, base_cryptocurrency)
    buyer_quote_wallet = await db.get_hot_wallet_for_currency(buyer_id, quote_cryptocurrency)
    seller_quote_wallet = await db.get_hot_wallet_for_currency(seller_id, quote_cryptocurrency)
    
    if not buyer_base_wallet:
        raise HTTPException(status_code=400, detail=f"Buyer must have a hot wallet for {base_cryptocurrency}")
    if not buyer_quote_wallet:
        raise HTTPException(status_code=400, detail=f"Buyer must have a hot wallet for {quote_cryptocurrency}")
    if not seller_quote_wallet:
        raise HTTPException(status_code=400, detail=f"Seller must have a hot wallet for {quote_cryptocurrency}")
    
    # Check buyer has enough quote currency BEFORE reserving
    buyer_quote_available = Decimal(str(buyer_quote_wallet['balance'])) - Decimal(str(buyer_quote_wallet['reserved_balance']))
    if buyer_quote_available < quote_amount:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient {quote_cryptocurrency}. Available: {buyer_quote_available}, Required: {quote_amount}"
        )
    
    # Reserve buyer's quote funds
    buyer_quote_reserved = False
    try:
        reservation_success = await db.reserve_wallet_funds(buyer_quote_wallet["id"], quote_amount)
        if not reservation_success:
            raise HTTPException(status_code=400, detail="Failed to reserve buyer quote funds")
        buyer_quote_reserved = True
        
        # Execute dual settlement (atomic 4-wallet transfer)
        # NOTE: This releases BOTH reservations atomically
        success = await db.execute_dual_settlement(
            seller_base_wallet_id=seller_base_wallet_id,
            buyer_base_wallet_id=buyer_base_wallet["id"],
            seller_quote_wallet_id=seller_quote_wallet["id"],
            buyer_quote_wallet_id=buyer_quote_wallet["id"],
            base_amount=base_amount,
            quote_amount=quote_amount
        )
        
        if not success:
            # Dual settlement failed - release buyer quote reservation
            # (seller base reservation still exists, will be released when offer is cancelled)
            await db.release_wallet_funds(buyer_quote_wallet["id"], quote_amount)
            raise HTTPException(status_code=400, detail="Dual settlement failed")
        
        # Dual settlement succeeded - both reservations are already released
        buyer_quote_reserved = False  # Prevent double-release
        
        # Deactivate offer (full fill only - no partial fills in MVP)
        await db.deactivate_offer(trade_request.offer_id, release_reservation=False)
        
        # Record acceptance
        async with db.pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO offer_acceptances (offer_id, buyer_id) VALUES ($1, $2)",
                trade_request.offer_id,
                buyer_id
            )
        
        trade_status = "completed"
        
    except HTTPException:
        # Release buyer's quote reservation if it was created and not yet consumed
        if buyer_quote_reserved:
            await db.release_wallet_funds(buyer_quote_wallet["id"], quote_amount)
        raise
    except Exception as e:
        # Release buyer's quote reservation on unexpected errors
        if buyer_quote_reserved:
            await db.release_wallet_funds(buyer_quote_wallet["id"], quote_amount)
        raise HTTPException(status_code=500, detail=f"Trade execution failed: {str(e)}")
    
    # Create the trade record
    trade_db = await db.create_trade({
        "buyer_id": buyer_id,
        "seller_id": seller_id,
        "buy_order_id": "legacy_offer_" + offer["id"],
        "sell_order_id": "legacy_offer_" + offer["id"],
        "base_cryptocurrency": base_cryptocurrency,
        "quote_cryptocurrency": quote_cryptocurrency,
        "amount": base_amount,
        "exchange_rate": exchange_rate,
        "quote_amount": quote_amount,
        "payment_method": payment_method,
        "status": trade_status
    })
    
    # Update user stats only for completed trades
    if trade_status == "completed":
        buyer = await db.get_user_by_id(buyer_id)
        seller = await db.get_user_by_id(seller_id)
        
        if buyer:
            await db.update_user_stats(
                buyer_id,
                buyer["completed_trades"] + 1,
                buyer["success_rate"]
            )
        if seller:
            await db.update_user_stats(
                seller_id,
                seller["completed_trades"] + 1,
                seller["success_rate"]
            )
    
    # Return Trade model instance - FastAPI will serialize via response_model
    # Ensure created_at is never None and all timestamps are timezone-aware
    from datetime import timezone
    
    executed_at = trade_db["executed_at"]
    if executed_at and not executed_at.tzinfo:
        executed_at = executed_at.replace(tzinfo=timezone.utc)
    
    created_at = executed_at or datetime.now(timezone.utc)
    completed_at = executed_at if trade_status == "completed" else None
    
    return Trade(
        id=trade_db["id"],
        offer_id=offer["id"],
        buyer_id=buyer_id,
        seller_id=seller_id,
        base_cryptocurrency=base_cryptocurrency,
        quote_cryptocurrency=quote_cryptocurrency,
        amount=base_amount,
        exchange_rate=exchange_rate,
        quote_amount=quote_amount,
        payment_method=payment_method,
        status=trade_status,
        created_at=created_at,
        completed_at=completed_at
    )


@app.get("/")
async def root():
    return {"message": "P2P Crypto Trading API with TimescaleDB"}


@app.get("/health")
async def health():
    """Health check endpoint for Docker"""
    try:
        # Check database connection
        if db.pool:
            await db.pool.fetchval("SELECT 1")
            return {"status": "healthy", "database": "connected"}
        else:
            return {"status": "unhealthy", "error": "Database not initialized"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001)
