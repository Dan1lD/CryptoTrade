from decimal import Decimal
from typing import List, Dict, Any, Tuple
from datetime import datetime

class ProRataMatchingEngine:
    """
    Pro-Rata matching algorithm for order matching.
    
    Pro-Rata distributes fills proportionally based on order size at each price level.
    Orders at the same price level are filled in proportion to their size, with
    time priority as a tiebreaker.
    """
    
    def __init__(self, db_storage):
        self.db = db_storage
    
    async def match_order(self, new_order: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Match a new order against existing orders using Pro-Rata algorithm.
        
        Args:
            new_order: The new order to match
            
        Returns:
            List of executed trades
        """
        trades = []
        remaining_amount = Decimal(str(new_order["amount"]))
        
        # Get counter orders (buy matches sell, sell matches buy)
        counter_type = "sell" if new_order["order_type"] == "buy" else "buy"
        counter_orders = await self.db.get_pending_orders(
            new_order["cryptocurrency"],
            counter_type
        )
        
        # Filter orders that can match based on price
        if new_order["order_type"] == "buy":
            # Buy order matches sell orders at or below buy price
            matchable_orders = [
                o for o in counter_orders 
                if Decimal(str(o["price"])) <= Decimal(str(new_order["price"]))
            ]
            # Sort by price (ascending), then by time (oldest first)
            matchable_orders.sort(
                key=lambda x: (Decimal(str(x["price"])), x["created_at"])
            )
        else:
            # Sell order matches buy orders at or above sell price
            matchable_orders = [
                o for o in counter_orders 
                if Decimal(str(o["price"])) >= Decimal(str(new_order["price"]))
            ]
            # Sort by price (descending), then by time (oldest first)
            matchable_orders.sort(
                key=lambda x: (-Decimal(str(x["price"])), x["created_at"])
            )
        
        # Group orders by price level for Pro-Rata distribution
        price_levels = self._group_by_price(matchable_orders)
        
        # Match orders at each price level using Pro-Rata
        for price, orders in price_levels:
            if remaining_amount <= 0:
                break
            
            # Calculate total available at this price level
            total_available = sum(
                Decimal(str(o["amount"])) - Decimal(str(o["filled_amount"]))
                for o in orders
            )
            
            if total_available <= 0:
                continue
            
            # Determine how much to fill at this price level
            fill_at_price = min(remaining_amount, total_available)
            
            # Distribute fills Pro-Rata based on order size
            trades_at_price = await self._distribute_pro_rata(
                new_order,
                orders,
                fill_at_price,
                price
            )
            
            trades.extend(trades_at_price)
            remaining_amount -= fill_at_price
        
        # Update new order status
        filled_amount = Decimal(str(new_order["amount"])) - remaining_amount
        if filled_amount >= Decimal(str(new_order["amount"])):
            status = "completed"
        elif filled_amount > 0:
            status = "partial"
        else:
            status = "pending"
        
        await self.db.update_order_status(
            new_order["id"],
            status,
            filled_amount
        )
        
        return trades
    
    def _group_by_price(self, orders: List[Dict[str, Any]]) -> List[Tuple[Decimal, List[Dict[str, Any]]]]:
        """Group orders by price level"""
        price_levels = {}
        for order in orders:
            price = Decimal(str(order["price"]))
            if price not in price_levels:
                price_levels[price] = []
            price_levels[price].append(order)
        
        # Return as sorted list of (price, orders) tuples
        return sorted(price_levels.items(), key=lambda x: x[0])
    
    async def _distribute_pro_rata(
        self,
        new_order: Dict[str, Any],
        counter_orders: List[Dict[str, Any]],
        total_fill: Decimal,
        execution_price: Decimal
    ) -> List[Dict[str, Any]]:
        """
        Distribute fills among counter orders using Pro-Rata algorithm.
        
        Pro-Rata distributes based on the proportion of each order's size
        to the total size at this price level.
        """
        trades = []
        
        # Calculate total unfilled amount at this price level
        total_unfilled = sum(
            Decimal(str(o["amount"])) - Decimal(str(o["filled_amount"]))
            for o in counter_orders
        )
        
        if total_unfilled == 0:
            return trades
        
        # Track allocated amount to handle rounding
        allocated = Decimal("0")
        
        for i, counter_order in enumerate(counter_orders):
            unfilled = Decimal(str(counter_order["amount"])) - Decimal(str(counter_order["filled_amount"]))
            
            if unfilled <= 0:
                continue
            
            # Calculate Pro-Rata share
            if i == len(counter_orders) - 1:
                # Last order gets remaining to handle rounding
                fill_amount = total_fill - allocated
            else:
                # Pro-Rata: (order_size / total_size) * total_fill
                fill_amount = (unfilled / total_unfilled) * total_fill
                # Round to 8 decimal places (crypto precision)
                fill_amount = fill_amount.quantize(Decimal("0.00000001"))
            
            # Don't overfill the counter order
            fill_amount = min(fill_amount, unfilled)
            
            if fill_amount > 0:
                # Create trade
                trade = await self._execute_trade(
                    new_order,
                    counter_order,
                    fill_amount,
                    execution_price
                )
                trades.append(trade)
                
                # Update counter order status
                new_filled = Decimal(str(counter_order["filled_amount"])) + fill_amount
                if new_filled >= Decimal(str(counter_order["amount"])):
                    counter_status = "completed"
                else:
                    counter_status = "partial"
                
                await self.db.update_order_status(
                    counter_order["id"],
                    counter_status,
                    new_filled
                )
                
                allocated += fill_amount
        
        return trades
    
    async def _execute_trade(
        self,
        buy_order: Dict[str, Any],
        sell_order: Dict[str, Any],
        amount: Decimal,
        price: Decimal
    ) -> Dict[str, Any]:
        """
        Execute a trade between two orders and update wallet balances.
        """
        # Determine buyer and seller based on order types
        if buy_order["order_type"] == "buy":
            buyer_id = buy_order["user_id"]
            seller_id = sell_order["user_id"]
            buy_order_id = buy_order["id"]
            sell_order_id = sell_order["id"]
        else:
            buyer_id = sell_order["user_id"]
            seller_id = buy_order["user_id"]
            buy_order_id = sell_order["id"]
            sell_order_id = buy_order["id"]
        
        cryptocurrency = buy_order["cryptocurrency"]
        
        # Update wallet balances
        # Decrease seller's crypto balance
        seller_wallet = await self.db.get_user_wallet_by_crypto(seller_id, cryptocurrency)
        if seller_wallet:
            new_balance = Decimal(str(seller_wallet["balance"])) - amount
            await self.db.update_wallet_balance(seller_wallet["id"], new_balance)
        
        # Increase buyer's crypto balance
        buyer_wallet = await self.db.get_user_wallet_by_crypto(buyer_id, cryptocurrency)
        if buyer_wallet:
            new_balance = Decimal(str(buyer_wallet["balance"])) + amount
            await self.db.update_wallet_balance(buyer_wallet["id"], new_balance)
        else:
            # Create wallet if doesn't exist
            await self.db.create_wallet({
                "user_id": buyer_id,
                "cryptocurrency": cryptocurrency,
                "balance": amount,
                "wallet_type": "hot",
                "address": f"auto_{cryptocurrency}_{buyer_id[:8]}"
            })
        
        # Create trade record
        trade = await self.db.create_trade({
            "buyer_id": buyer_id,
            "seller_id": seller_id,
            "buy_order_id": buy_order_id,
            "sell_order_id": sell_order_id,
            "cryptocurrency": cryptocurrency,
            "fiat_currency": buy_order["fiat_currency"],
            "amount": amount,
            "price": price,
            "payment_method": None
        })
        
        return trade
