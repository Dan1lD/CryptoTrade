"""
Seed the database with initial test data
"""
import asyncio
import os
from decimal import Decimal
from db_storage import db


async def seed_database():
    """Seed database with test users, wallets, and offers"""
    
    # Initialize database connection
    await db.initialize()
    
    print("Starting database seeding...")
    
    # Check if cryptotrader already exists
    existing_user = await db.get_user_by_username("cryptotrader")
    if existing_user:
        print("Data already seeded. Skipping...")
        await db.close()
        return
    
    # Create test user 1: cryptotrader
    user1 = await db.create_user({
        "username": "cryptotrader",
        "password": "password",
        "email": "crypto@example.com",
        "completed_trades": 12,
        "success_rate": Decimal("95.50")
    })
    print(f"Created user: {user1['username']}")
    
    # Create wallets for user 1
    wallets_data = [
        {"cryptocurrency": "BTC", "balance": Decimal("0.45823"), "wallet_type": "hot", "address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"},
        {"cryptocurrency": "ETH", "balance": Decimal("3.25"), "wallet_type": "hot", "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"},
        {"cryptocurrency": "USDT", "balance": Decimal("5000.00"), "wallet_type": "cold", "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"},
        {"cryptocurrency": "BNB", "balance": Decimal("10.5"), "wallet_type": "hot", "address": "bnb1grpf0955h0ykzq3ar5nmum7y6gdfl6lxfn46h2"},
    ]
    
    for wallet_data in wallets_data:
        wallet_data["user_id"] = user1["id"]
        await db.create_wallet(wallet_data)
    print(f"Created {len(wallets_data)} wallets for {user1['username']}")
    
    # Create test user 2: btc_enthusiast
    user2 = await db.create_user({
        "username": "btc_enthusiast",
        "password": "password123",
        "email": "btc@example.com",
        "completed_trades": 15,
        "success_rate": Decimal("98.50")
    })
    print(f"Created user: {user2['username']}")
    
    # Create wallets for user 2
    seller_wallets = [
        {"cryptocurrency": "BTC", "balance": Decimal("2.5"), "wallet_type": "hot", "address": "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2"},
        {"cryptocurrency": "ETH", "balance": Decimal("5.0"), "wallet_type": "hot", "address": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F"},
    ]
    
    for wallet_data in seller_wallets:
        wallet_data["user_id"] = user2["id"]
        await db.create_wallet(wallet_data)
    print(f"Created {len(seller_wallets)} wallets for {user2['username']}")
    
    # Create test user 3: eth_trader
    user3 = await db.create_user({
        "username": "eth_trader",
        "password": "password456",
        "email": "eth@example.com",
        "completed_trades": 8,
        "success_rate": Decimal("92.00")
    })
    print(f"Created user: {user3['username']}")
    
    # Create wallets for user 3
    trader_wallets = [
        {"cryptocurrency": "ETH", "balance": Decimal("10.0"), "wallet_type": "hot", "address": "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed"},
        {"cryptocurrency": "BTC", "balance": Decimal("0.8"), "wallet_type": "cold", "address": "1BoatSLRHtKNngkdXEeobR76b53LETtpyT"},
    ]
    
    for wallet_data in trader_wallets:
        wallet_data["user_id"] = user3["id"]
        await db.create_wallet(wallet_data)
    print(f"Created {len(trader_wallets)} wallets for {user3['username']}")
    
    # Create crypto-to-crypto trade offers
    offers_data = [
        {
            "seller_id": user2["id"],
            "base_cryptocurrency": "BTC",
            "quote_cryptocurrency": "ETH",
            "offer_type": "sell",
            "amount": Decimal("0.5"),
            "exchange_rate": Decimal("15.5"),
            "payment_methods": ["CryptoTrade wallet"],
            "terms": "Selling 0.5 BTC for ETH at 1:15.5 rate. Fast and secure on-platform settlement."
        },
        {
            "seller_id": user3["id"],
            "base_cryptocurrency": "ETH",
            "quote_cryptocurrency": "BTC",
            "offer_type": "sell",
            "amount": Decimal("10.0"),
            "exchange_rate": Decimal("0.065"),
            "payment_methods": ["CryptoTrade wallet"],
            "terms": "Selling 10 ETH for BTC at 1:0.065 rate. Instant settlement."
        },
        {
            "seller_id": user1["id"],
            "base_cryptocurrency": "BNB",
            "quote_cryptocurrency": "USDT",
            "offer_type": "sell",
            "amount": Decimal("5.0"),
            "exchange_rate": Decimal("620.00"),
            "payment_methods": ["CryptoTrade wallet"],
            "terms": "Selling 5 BNB for USDT at 1:620 rate."
        },
    ]
    
    for offer_data in offers_data:
        await db.create_offer(offer_data)
    print(f"Created {len(offers_data)} trade offers")
    
    # Create some sample crypto-to-crypto orders for matching engine
    orders_data = [
        {
            "user_id": user1["id"],
            "base_cryptocurrency": "BTC",
            "quote_cryptocurrency": "ETH",
            "order_type": "limit",
            "amount": Decimal("0.1"),
            "exchange_rate": Decimal("15.0")
        },
        {
            "user_id": user2["id"],
            "base_cryptocurrency": "ETH",
            "quote_cryptocurrency": "BTC",
            "order_type": "limit",
            "amount": Decimal("1.5"),
            "exchange_rate": Decimal("0.067")
        },
    ]
    
    for order_data in orders_data:
        await db.create_order(order_data)
    print(f"Created {len(orders_data)} sample orders")
    
    print("✅ Database seeding completed successfully!")
    
    await db.close()


if __name__ == "__main__":
    asyncio.run(seed_database())
