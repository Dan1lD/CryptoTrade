import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CRYPTOCURRENCIES, PAYMENT_METHODS } from "@/lib/mock-data";
import { Search } from "lucide-react";

interface TradeOfferFiltersProps {
  onFilterChange: (filters: {
    cryptocurrency: string;
    offerType: string;
    paymentMethod: string;
    searchQuery: string;
  }) => void;
}

export default function TradeOfferFilters({ onFilterChange }: TradeOfferFiltersProps) {
  const [cryptocurrency, setCryptocurrency] = useState("all");
  const [offerType, setOfferType] = useState("all");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = {
      cryptocurrency: key === "cryptocurrency" ? value : cryptocurrency,
      offerType: key === "offerType" ? value : offerType,
      paymentMethod: key === "paymentMethod" ? value : paymentMethod,
      searchQuery: key === "searchQuery" ? value : searchQuery,
    };

    if (key === "cryptocurrency") setCryptocurrency(value);
    if (key === "offerType") setOfferType(value);
    if (key === "paymentMethod") setPaymentMethod(value);
    if (key === "searchQuery") setSearchQuery(value);

    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    setCryptocurrency("all");
    setOfferType("all");
    setPaymentMethod("all");
    setSearchQuery("");
    onFilterChange({
      cryptocurrency: "all",
      offerType: "all",
      paymentMethod: "all",
      searchQuery: "",
    });
  };

  return (
    <div className="bg-card p-6 rounded-lg border space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Filter Offers</h3>
        <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
          Clear Filters
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Cryptocurrency</label>
          <Select value={cryptocurrency} onValueChange={(v) => handleFilterChange("cryptocurrency", v)}>
            <SelectTrigger data-testid="select-cryptocurrency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cryptocurrencies</SelectItem>
              {CRYPTOCURRENCIES.map((crypto) => (
                <SelectItem key={crypto.symbol} value={crypto.symbol}>
                  {crypto.icon} {crypto.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Offer Type</label>
          <Select value={offerType} onValueChange={(v) => handleFilterChange("offerType", v)}>
            <SelectTrigger data-testid="select-offer-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="buy">Buy Offers</SelectItem>
              <SelectItem value="sell">Sell Offers</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Payment Method</label>
          <Select value={paymentMethod} onValueChange={(v) => handleFilterChange("paymentMethod", v)}>
            <SelectTrigger data-testid="select-payment-method">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              {PAYMENT_METHODS.map((method) => (
                <SelectItem key={method} value={method}>
                  {method}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search offers..."
              value={searchQuery}
              onChange={(e) => handleFilterChange("searchQuery", e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
