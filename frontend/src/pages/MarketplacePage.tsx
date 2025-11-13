import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import TradeOfferCard from "@/components/TradeOfferCard";
import TradeOfferFilters from "@/components/TradeOfferFilters";
import { TradeOffer } from "@/types";
import { apiRequest } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";

export default function MarketplacePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    cryptocurrency: "all",
    offerType: "all",
    paymentMethod: "all",
    searchQuery: "",
  });

  const { data: offers = [], isLoading } = useQuery<TradeOffer[]>({
    queryKey: ["/api/offers"],
  });

  const filteredOffers = offers.filter((offer) => {
    if (filters.cryptocurrency !== "all" && offer.baseCryptocurrency !== filters.cryptocurrency && offer.quoteCryptocurrency !== filters.cryptocurrency) {
      return false;
    }
    if (filters.offerType !== "all" && offer.offerType !== filters.offerType) {
      return false;
    }
    if (filters.paymentMethod !== "all" && !offer.paymentMethods.includes(filters.paymentMethod)) {
      return false;
    }
    if (filters.searchQuery && !offer.baseCryptocurrency.toLowerCase().includes(filters.searchQuery.toLowerCase()) && !offer.quoteCryptocurrency.toLowerCase().includes(filters.searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleAcceptOffer = async (offerId: string, paymentMethod: string) => {
    try {
      const res = await apiRequest("/api/trades", {
        method: "POST",
        body: JSON.stringify({
          offerId,
          paymentMethod,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const isCompleted = data.status === "completed";
        
        toast({
          title: "Offer accepted",
          description: isCompleted 
            ? "Trade completed successfully! Funds have been transferred to your wallet."
            : "Trade created successfully! Please complete payment using the selected method.",
        });
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["/api/offers"] }).catch(() => {});
        queryClient.invalidateQueries({ queryKey: ["/api/wallets"] }).catch(() => {});
        queryClient.invalidateQueries({ queryKey: ["/api/trades"] }).catch(() => {});
      } else {
        const error = await res.json();
        toast({
          variant: "destructive",
          title: "Failed to accept offer",
          description: error.detail || error.error || "Something went wrong",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to accept offer",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Marketplace</h1>
          <p className="text-muted-foreground">
            Browse and accept peer-to-peer cryptocurrency trade offers
          </p>
        </div>

        <div className="mb-8">
          <TradeOfferFilters onFilterChange={setFilters} />
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading offers...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredOffers.length === 0 ? (
              <div className="col-span-2 text-center py-12">
                <p className="text-muted-foreground text-lg">No offers match your filters</p>
              </div>
            ) : (
              filteredOffers.map((offer) => (
                <TradeOfferCard
                  key={offer.id}
                  offer={offer}
                  onAccept={handleAcceptOffer}
                  currentUserId={user?.id}
                />
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
