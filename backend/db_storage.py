import os
import asyncpg
from typing import Optional, List, Dict, Any
from decimal import Decimal
from datetime import datetime
import uuid
import asyncio

def row_to_dict(row: asyncpg.Record) -> Dict[str, Any]:
    """Convert asyncpg.Record to dict, converting UUIDs to strings"""
    if row is None:
        return None
    result = dict(row)
    # Convert UUID objects to strings
    for key, value in result.items():
        if isinstance(value, uuid.UUID):
            result[key] = str(value)
    return result

class DatabaseStorage:
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
        
    async def initialize(self):
        """Initialize database connection pool with retry logic"""
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            raise ValueError("DATABASE_URL environment variable not set")
        
        max_retries = 5
        retry_delay = 2
        
        for attempt in range(max_retries):
            try:
                self.pool = await asyncpg.create_pool(
                    database_url,
                    min_size=2,
                    max_size=10,
                    command_timeout=60,
                    timeout=30,
                    max_inactive_connection_lifetime=300,
                )
                print(f"Database connection pool initialized successfully")
                return
            except Exception as e:
                if attempt < max_retries - 1:
                    print(f"Database connection attempt {attempt + 1}/{max_retries} failed: {e}")
                    print(f"Retrying in {retry_delay} seconds...")
                    await asyncio.sleep(retry_delay)
                else:
                    print(f"Failed to initialize database after {max_retries} attempts")
                    raise
        
    async def close(self):
        """Close database connection pool"""
        if self.pool:
            await self.pool.close()
    
    # ========== User Methods ==========
    
    async def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Get user by username"""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM users WHERE username = $1",
                username
            )
            return row_to_dict(row) if row else None
    
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email"""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM users WHERE email = $1",
                email
            )
            return row_to_dict(row) if row else None
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM users WHERE id = $1",
                user_id
            )
            return row_to_dict(row) if row else None
    
    async def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new user"""
        user_id = str(uuid.uuid4())
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO users (id, username, password, email, completed_trades, success_rate)
                VALUES ($1, $2, $3, $4, $5, $6)
                """,
                user_id,
                user_data["username"],
                user_data["password"],
                user_data["email"],
                user_data.get("completed_trades", 0),
                user_data.get("success_rate", Decimal("0.00"))
            )
            return await self.get_user_by_id(user_id)
    
    async def update_user_stats(self, user_id: str, completed_trades: int, success_rate: Decimal):
        """Update user trading statistics"""
        async with self.pool.acquire() as conn:
            await conn.execute(
                "UPDATE users SET completed_trades = $1, success_rate = $2 WHERE id = $3",
                completed_trades,
                success_rate,
                user_id
            )
    
    # ========== Session Methods ==========
    
    async def create_session(self, user_id: str) -> str:
        """Create a new session for a user"""
        session_id = str(uuid.uuid4())
        async with self.pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO sessions (session_id, user_id) VALUES ($1, $2)",
                session_id,
                user_id
            )
        return session_id
    
    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session by session ID"""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM sessions WHERE session_id = $1",
                session_id
            )
            return row_to_dict(row) if row else None
    
    async def delete_session(self, session_id: str):
        """Delete a session"""
        async with self.pool.acquire() as conn:
            await conn.execute(
                "DELETE FROM sessions WHERE session_id = $1",
                session_id
            )
    
    # ========== Wallet Methods ==========
    
    async def get_user_wallets(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all wallets for a user"""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM wallets WHERE user_id = $1",
                user_id
            )
            return [row_to_dict(row) for row in rows]
    
    async def get_wallet(self, wallet_id: str) -> Optional[Dict[str, Any]]:
        """Get wallet by ID"""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM wallets WHERE id = $1",
                wallet_id
            )
            return row_to_dict(row) if row else None
    
    async def get_user_wallet_by_crypto(self, user_id: str, cryptocurrency: str) -> Optional[Dict[str, Any]]:
        """Get user's wallet for a specific cryptocurrency"""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM wallets WHERE user_id = $1 AND cryptocurrency = $2 LIMIT 1",
                user_id,
                cryptocurrency
            )
            return row_to_dict(row) if row else None
    
    async def has_hot_wallet_for_currency(self, user_id: str, cryptocurrency: str) -> bool:
        """Check if user already has a hot wallet for this cryptocurrency"""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT id FROM wallets WHERE user_id = $1 AND cryptocurrency = $2 AND wallet_type = 'hot' LIMIT 1",
                user_id,
                cryptocurrency
            )
            return row is not None
    
    async def create_wallet(self, wallet_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new wallet"""
        wallet_id = str(uuid.uuid4())
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO wallets (id, user_id, cryptocurrency, balance, wallet_type, address)
                VALUES ($1, $2, $3, $4, $5, $6)
                """,
                wallet_id,
                wallet_data["user_id"],
                wallet_data["cryptocurrency"],
                wallet_data["balance"],
                wallet_data["wallet_type"],
                wallet_data["address"]
            )
            return await self.get_wallet(wallet_id)
    
    async def update_wallet_balance(self, wallet_id: str, new_balance: Decimal):
        """Update wallet balance"""
        async with self.pool.acquire() as conn:
            await conn.execute(
                "UPDATE wallets SET balance = $1 WHERE id = $2",
                new_balance,
                wallet_id
            )
    
    async def get_hot_wallet_for_currency(self, user_id: str, cryptocurrency: str) -> Optional[Dict[str, Any]]:
        """Get user's hot wallet for a specific cryptocurrency"""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM wallets WHERE user_id = $1 AND cryptocurrency = $2 AND wallet_type = 'hot' LIMIT 1",
                user_id,
                cryptocurrency
            )
            return row_to_dict(row) if row else None
    
    async def reserve_wallet_funds(self, wallet_id: str, amount: Decimal) -> bool:
        """
        Reserve funds in a wallet (increase reserved_balance).
        Uses SELECT ... FOR UPDATE to prevent race conditions.
        Returns True if successful, False if insufficient funds.
        """
        async with self.pool.acquire() as conn:
            async with conn.transaction(isolation='serializable'):
                # Lock the wallet row
                wallet = await conn.fetchrow(
                    "SELECT balance, reserved_balance FROM wallets WHERE id = $1 FOR UPDATE",
                    wallet_id
                )
                
                if not wallet:
                    return False
                
                available = wallet['balance'] - wallet['reserved_balance']
                if available < amount:
                    return False
                
                # Reserve the funds
                new_reserved = wallet['reserved_balance'] + amount
                await conn.execute(
                    "UPDATE wallets SET reserved_balance = $1 WHERE id = $2",
                    new_reserved,
                    wallet_id
                )
                
                return True
    
    async def release_wallet_funds(self, wallet_id: str, amount: Decimal) -> bool:
        """
        Release reserved funds in a wallet (decrease reserved_balance).
        Uses transaction to ensure atomicity.
        Returns True if successful, False if insufficient reserved funds.
        """
        async with self.pool.acquire() as conn:
            async with conn.transaction(isolation='serializable'):
                wallet = await conn.fetchrow(
                    "SELECT reserved_balance FROM wallets WHERE id = $1 FOR UPDATE",
                    wallet_id
                )
                
                if not wallet:
                    return False
                
                # Validate that we have enough reserved funds to release
                if wallet['reserved_balance'] < amount:
                    # Log error - this indicates a bug in reservation tracking
                    print(f"ERROR: Attempted to release {amount} from wallet {wallet_id} but only {wallet['reserved_balance']} reserved")
                    return False
                
                new_reserved = wallet['reserved_balance'] - amount
                await conn.execute(
                    "UPDATE wallets SET reserved_balance = $1 WHERE id = $2",
                    new_reserved,
                    wallet_id
                )
                
                return True
    
    async def transfer_between_wallets(
        self, 
        from_wallet_id: str, 
        to_wallet_id: str, 
        amount: Decimal,
        release_reservation: bool = False
    ) -> bool:
        """
        Transfer cryptocurrency from one wallet to another atomically.
        If release_reservation is True, validates reserved_balance >= amount and releases it.
        Returns True if successful, False if insufficient funds or missing wallet.
        
        INVARIANT: Reservations are released EXACTLY ONCE
        - When release_reservation=True: validates reserved >= amount before deducting (line 320-322)
        - If reserved < amount: returns False (prevents double-release)
        - Callers MUST pass release_reservation=False after calling with =True
        - SERIALIZABLE isolation prevents race conditions
        """
        async with self.pool.acquire() as conn:
            async with conn.transaction(isolation='serializable'):
                # Lock both wallets
                from_wallet = await conn.fetchrow(
                    "SELECT balance, reserved_balance FROM wallets WHERE id = $1 FOR UPDATE",
                    from_wallet_id
                )
                to_wallet = await conn.fetchrow(
                    "SELECT balance FROM wallets WHERE id = $1 FOR UPDATE",
                    to_wallet_id
                )
                
                # Explicitly validate both wallets exist
                if not from_wallet:
                    print(f"ERROR: Transfer failed - source wallet {from_wallet_id} not found")
                    return False
                
                if not to_wallet:
                    print(f"ERROR: Transfer failed - destination wallet {to_wallet_id} not found")
                    return False
                
                # If releasing reservation, validate and deduct from reserved first
                if release_reservation:
                    if from_wallet['reserved_balance'] < amount:
                        print(f"ERROR: Transfer requires {amount} reserved but only {from_wallet['reserved_balance']} reserved in wallet {from_wallet_id}")
                        return False
                    
                    # Deduct from both balance and reserved_balance
                    new_from_balance = from_wallet['balance'] - amount
                    new_reserved = from_wallet['reserved_balance'] - amount
                    
                    # Validate balance >= reserved after transfer (safety check)
                    if new_from_balance < new_reserved:
                        print(f"ERROR: Transfer would violate balance >= reserved invariant in wallet {from_wallet_id}")
                        return False
                    
                    new_to_balance = to_wallet['balance'] + amount
                    
                    await conn.execute(
                        "UPDATE wallets SET balance = $1, reserved_balance = $2 WHERE id = $3",
                        new_from_balance,
                        new_reserved,
                        from_wallet_id
                    )
                    
                    # Update destination wallet
                    await conn.execute(
                        "UPDATE wallets SET balance = $1 WHERE id = $2",
                        new_to_balance,
                        to_wallet_id
                    )
                else:
                    # Check if source has enough available (non-reserved) funds
                    available = from_wallet['balance'] - from_wallet['reserved_balance']
                    if available < amount:
                        print(f"ERROR: Transfer failed - insufficient available funds. Wallet {from_wallet_id} has balance={from_wallet['balance']}, reserved={from_wallet['reserved_balance']}, available={available}, needed={amount}")
                        return False
                    
                    new_from_balance = from_wallet['balance'] - amount
                    new_to_balance = to_wallet['balance'] + amount
                    
                    # Validate invariant: balance >= reserved after debit
                    if new_from_balance < from_wallet['reserved_balance']:
                        print(f"ERROR: Transfer would violate balance >= reserved in wallet {from_wallet_id}")
                        return False
                    
                    await conn.execute(
                        "UPDATE wallets SET balance = $1 WHERE id = $2",
                        new_from_balance,
                        from_wallet_id
                    )
                    
                    # Update destination wallet
                    await conn.execute(
                        "UPDATE wallets SET balance = $1 WHERE id = $2",
                        new_to_balance,
                        to_wallet_id
                    )
                
                return True
    
    async def execute_dual_settlement(
        self,
        seller_base_wallet_id: str,
        buyer_base_wallet_id: str,
        seller_quote_wallet_id: str,
        buyer_quote_wallet_id: str,
        base_amount: Decimal,
        quote_amount: Decimal
    ) -> bool:
        """
        Execute atomic dual-currency settlement for crypto-to-crypto trades.
        Transfers base crypto from seller to buyer AND quote crypto from buyer to seller.
        Both wallet reservations are released atomically.
        
        Returns True if successful, False if insufficient funds or wallet mismatch.
        """
        async with self.pool.acquire() as conn:
            async with conn.transaction(isolation='serializable'):
                # Lock all four wallets
                seller_base = await conn.fetchrow(
                    "SELECT balance, reserved_balance FROM wallets WHERE id = $1 FOR UPDATE",
                    seller_base_wallet_id
                )
                buyer_base = await conn.fetchrow(
                    "SELECT balance FROM wallets WHERE id = $1 FOR UPDATE",
                    buyer_base_wallet_id
                )
                buyer_quote = await conn.fetchrow(
                    "SELECT balance, reserved_balance FROM wallets WHERE id = $1 FOR UPDATE",
                    buyer_quote_wallet_id
                )
                seller_quote = await conn.fetchrow(
                    "SELECT balance FROM wallets WHERE id = $1 FOR UPDATE",
                    seller_quote_wallet_id
                )
                
                # Validate all wallets exist
                if not all([seller_base, buyer_base, buyer_quote, seller_quote]):
                    print("ERROR: Dual settlement failed - one or more wallets not found")
                    return False
                
                # Validate seller has reserved base amount
                if seller_base['reserved_balance'] < base_amount:
                    print(f"ERROR: Seller base reservation insufficient: {seller_base['reserved_balance']} < {base_amount}")
                    return False
                
                # Validate buyer has reserved quote amount
                if buyer_quote['reserved_balance'] < quote_amount:
                    print(f"ERROR: Buyer quote reservation insufficient: {buyer_quote['reserved_balance']} < {quote_amount}")
                    return False
                
                # Execute dual transfer
                # 1. Transfer base from seller to buyer (with reservation release)
                new_seller_base_balance = seller_base['balance'] - base_amount
                new_seller_base_reserved = seller_base['reserved_balance'] - base_amount
                new_buyer_base_balance = buyer_base['balance'] + base_amount
                
                # 2. Transfer quote from buyer to seller (with reservation release)
                new_buyer_quote_balance = buyer_quote['balance'] - quote_amount
                new_buyer_quote_reserved = buyer_quote['reserved_balance'] - quote_amount
                new_seller_quote_balance = seller_quote['balance'] + quote_amount
                
                # Validate invariants
                if new_seller_base_balance < new_seller_base_reserved:
                    print("ERROR: Seller base wallet would violate balance >= reserved")
                    return False
                if new_buyer_quote_balance < new_buyer_quote_reserved:
                    print("ERROR: Buyer quote wallet would violate balance >= reserved")
                    return False
                
                # Update all wallets atomically
                await conn.execute(
                    "UPDATE wallets SET balance = $1, reserved_balance = $2 WHERE id = $3",
                    new_seller_base_balance, new_seller_base_reserved, seller_base_wallet_id
                )
                await conn.execute(
                    "UPDATE wallets SET balance = $1 WHERE id = $2",
                    new_buyer_base_balance, buyer_base_wallet_id
                )
                await conn.execute(
                    "UPDATE wallets SET balance = $1, reserved_balance = $2 WHERE id = $3",
                    new_buyer_quote_balance, new_buyer_quote_reserved, buyer_quote_wallet_id
                )
                await conn.execute(
                    "UPDATE wallets SET balance = $1 WHERE id = $2",
                    new_seller_quote_balance, seller_quote_wallet_id
                )
                
                return True
    
    # ========== Trade Offer Methods ==========
    
    async def get_active_offers(self) -> List[Dict[str, Any]]:
        """Get all active trade offers"""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM trade_offers WHERE is_active = TRUE ORDER BY created_at DESC"
            )
            return [row_to_dict(row) for row in rows]
    
    async def get_offer(self, offer_id: str) -> Optional[Dict[str, Any]]:
        """Get trade offer by ID"""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM trade_offers WHERE id = $1",
                offer_id
            )
            return row_to_dict(row) if row else None
    
    async def create_offer(self, offer_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new trade offer with optional wallet reservation"""
        offer_id = str(uuid.uuid4())
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO trade_offers 
                (id, seller_id, base_cryptocurrency, quote_cryptocurrency, offer_type, amount, exchange_rate, 
                 payment_methods, terms, reserved_wallet_id, reserved_amount)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                """,
                offer_id,
                offer_data.get("user_id") or offer_data.get("seller_id"),
                offer_data["base_cryptocurrency"],
                offer_data["quote_cryptocurrency"],
                offer_data["offer_type"],
                offer_data["amount"],
                offer_data.get("exchange_rate"),
                offer_data["payment_methods"],
                offer_data.get("terms", ""),
                offer_data.get("reserved_wallet_id"),
                offer_data.get("reserved_amount", Decimal("0"))
            )
            return await self.get_offer(offer_id)
    
    async def deactivate_offer(self, offer_id: str, release_reservation: bool = True) -> bool:
        """
        Deactivate a trade offer and optionally release any reserved funds.
        
        Args:
            offer_id: ID of the offer to deactivate
            release_reservation: If True, release reserved funds. Set to False if reservation
                                was already released (e.g., during CryptoTrade wallet transfer)
        
        Returns True if successful, False if reservation mismatch detected.
        """
        async with self.pool.acquire() as conn:
            # Get offer details first
            offer = await conn.fetchrow(
                "SELECT reserved_wallet_id, reserved_amount FROM trade_offers WHERE id = $1",
                offer_id
            )
            
            # Deactivate the offer
            await conn.execute(
                "UPDATE trade_offers SET is_active = FALSE WHERE id = $1",
                offer_id
            )
            
            # Release reserved funds if requested and if any exist
            if release_reservation and offer and offer['reserved_wallet_id'] and offer['reserved_amount'] > 0:
                # CRITICAL: Requery wallet to verify reservation hasn't been partially consumed
                # This prevents silent corruption from stale offer data
                wallet = await conn.fetchrow(
                    "SELECT reserved_balance FROM wallets WHERE id = $1 FOR UPDATE",
                    offer['reserved_wallet_id']
                )
                
                if not wallet:
                    print(f"CRITICAL ERROR: Offer {offer_id} references non-existent wallet {offer['reserved_wallet_id']}")
                    # Still mark as inactive but log critical error
                    return False
                
                # Verify wallet has at least the expected reservation
                # Note: reserved_balance may be > reserved_amount if wallet has multiple active offers
                if wallet['reserved_balance'] < offer['reserved_amount']:
                    print(f"CRITICAL ERROR: Offer {offer_id} reservation shortage! Need to release {offer['reserved_amount']}, but wallet {offer['reserved_wallet_id']} only has {wallet['reserved_balance']} reserved")
                    print(f"  This indicates the reservation was already consumed or corrupted")
                    # DO NOT attempt to release - insufficient reserved funds
                    return False
                
                # Log if wallet has more reserved than this offer (indicates multiple offers)
                if wallet['reserved_balance'] > offer['reserved_amount']:
                    print(f"INFO: Wallet {offer['reserved_wallet_id']} has {wallet['reserved_balance']} reserved total, releasing {offer['reserved_amount']} for offer {offer_id}")
                    print(f"  This is expected when wallet has multiple active offers")
                
                # Release exact expected amount
                release_success = await self.release_wallet_funds(offer['reserved_wallet_id'], offer['reserved_amount'])
                if not release_success:
                    print(f"ERROR: Failed to release {offer['reserved_amount']} from wallet {offer['reserved_wallet_id']} for offer {offer_id}")
                    return False
            
            return True
    
    # ========== Order Methods (TimescaleDB) ==========
    
    async def create_order(self, order_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new order in TimescaleDB for crypto-to-crypto exchange"""
        order_id = str(uuid.uuid4())
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO orders 
                (id, user_id, base_cryptocurrency, quote_cryptocurrency, order_type, side, amount, exchange_rate, status, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                """,
                order_id,
                order_data["user_id"],
                order_data["base_cryptocurrency"],
                order_data["quote_cryptocurrency"],
                order_data["order_type"],
                order_data.get("side", "buy"),
                order_data["amount"],
                order_data.get("exchange_rate"),
                "pending",
                datetime.now()
            )
            return await self.get_order(order_id)
    
    async def get_order(self, order_id: str) -> Optional[Dict[str, Any]]:
        """Get order by ID"""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM orders WHERE id = $1 ORDER BY created_at DESC LIMIT 1",
                order_id
            )
            return row_to_dict(row) if row else None
    
    async def get_pending_orders(self, base_cryptocurrency: str, quote_cryptocurrency: str, order_type: str) -> List[Dict[str, Any]]:
        """Get all pending orders for a specific crypto pair and order type"""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT * FROM orders 
                WHERE base_cryptocurrency = $1 AND quote_cryptocurrency = $2 AND order_type = $3 AND status = 'pending'
                ORDER BY exchange_rate DESC, created_at ASC
                """,
                base_cryptocurrency,
                quote_cryptocurrency,
                order_type
            )
            return [row_to_dict(row) for row in rows]
    
    async def update_order_status(self, order_id: str, status: str, filled_amount: Decimal):
        """Update order status and filled amount"""
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE orders 
                SET status = $1, filled_amount = $2
                WHERE id = $3
                """,
                status,
                filled_amount,
                order_id
            )
    
    # ========== Trade Methods (TimescaleDB) ==========
    
    async def create_trade(self, trade_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new trade in TimescaleDB for crypto-to-crypto exchange"""
        trade_id = str(uuid.uuid4())
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO trades 
                (id, buyer_id, seller_id, buy_order_id, sell_order_id, base_cryptocurrency, 
                 quote_cryptocurrency, amount, exchange_rate, quote_amount, payment_method, status, executed_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                """,
                trade_id,
                trade_data["buyer_id"],
                trade_data["seller_id"],
                trade_data["buy_order_id"],
                trade_data["sell_order_id"],
                trade_data["base_cryptocurrency"],
                trade_data["quote_cryptocurrency"],
                trade_data["amount"],
                trade_data["exchange_rate"],
                trade_data["quote_amount"],
                trade_data.get("payment_method"),
                trade_data.get("status", "completed"),
                datetime.now()
            )
            return await self.get_trade(trade_id)
    
    async def get_trade(self, trade_id: str) -> Optional[Dict[str, Any]]:
        """Get trade by ID"""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM trades WHERE id = $1 ORDER BY executed_at DESC LIMIT 1",
                trade_id
            )
            return row_to_dict(row) if row else None
    
    async def get_user_trades(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all trades for a user"""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT * FROM trades 
                WHERE buyer_id = $1 OR seller_id = $1
                ORDER BY executed_at DESC
                """,
                user_id
            )
            return [row_to_dict(row) for row in rows]

# Global database instance
db = DatabaseStorage()
