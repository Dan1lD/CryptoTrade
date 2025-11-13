import TradeOfferFilters from "../TradeOfferFilters";

export default function TradeOfferFiltersExample() {
  return (
    <div className="p-8">
      <TradeOfferFilters
        onFilterChange={(filters) => console.log("Filters changed:", filters)}
      />
    </div>
  );
}
