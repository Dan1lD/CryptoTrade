import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import OrderHistoryTable from "@/components/OrderHistoryTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trade } from "@/types";

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState("all");

  const { data: trades = [], isLoading } = useQuery<Trade[]>({
    queryKey: ["/api/trades"],
  });

  const filteredTrades = trades.filter((trade) => {
    if (activeTab === "all") return true;
    return trade.status === activeTab;
  });

  const completedCount = trades.filter((t) => t.status === "completed").length;
  const pendingCount = trades.filter((t) => t.status === "pending").length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">My Trades</h1>
          <p className="text-muted-foreground">
            View and manage your trading history
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading trades...</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="all" data-testid="tab-all">
                All Trades ({trades.length})
              </TabsTrigger>
              <TabsTrigger value="completed" data-testid="tab-completed">
                Completed ({completedCount})
              </TabsTrigger>
              <TabsTrigger value="pending" data-testid="tab-pending">
                Pending ({pendingCount})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              <OrderHistoryTable trades={filteredTrades} />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
