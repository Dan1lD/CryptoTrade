import TradeOfferCard from "../TradeOfferCard";
import { mockTradeOffers } from "@/lib/mock-data";

export default function TradeOfferCardExample() {
  return (
    <div className="max-w-md p-8">
      <TradeOfferCard
        offer={mockTradeOffers[0]}
        onAccept={(id) => console.log("Accept offer:", id)}
      />
    </div>
  );
}
