import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import WalletCard from "@/components/WalletCard";
import DepositModal from "@/components/DepositModal";
import WithdrawModal from "@/components/WithdrawModal";
import CreateWalletModal from "@/components/CreateWalletModal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet } from "@/types";
import { Wallet as WalletIcon, Lock, Unlock, Plus } from "lucide-react";

export default function WalletPage() {
  const [createWalletModal, setCreateWalletModal] = useState(false);
  const [depositModal, setDepositModal] = useState<{ isOpen: boolean; wallet: any }>({
    isOpen: false,
    wallet: null,
  });
  const [withdrawModal, setWithdrawModal] = useState<{ isOpen: boolean; wallet: any }>({
    isOpen: false,
    wallet: null,
  });

  const { data: wallets = [], isLoading } = useQuery<Wallet[]>({
    queryKey: ["/api/wallets"],
  });

  const cryptoPrices: Record<string, number> = {
    BTC: 43250,
    ETH: 2280,
    USDT: 1,
    BNB: 305,
  };

  const hotWallets = wallets.filter((w) => w.walletType === "hot");
  const coldWallets = wallets.filter((w) => w.walletType === "cold");

  const totalHotValue = hotWallets.reduce(
    (sum, w) => sum + parseFloat(w.balance) * (cryptoPrices[w.cryptocurrency] || 0),
    0
  );
  const totalColdValue = coldWallets.reduce(
    (sum, w) => sum + parseFloat(w.balance) * (cryptoPrices[w.cryptocurrency] || 0),
    0
  );
  const totalValue = totalHotValue + totalColdValue;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-6 py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading wallets...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold mb-2">Wallet</h1>
            <p className="text-muted-foreground">
              Manage your cryptocurrency wallets and balances
            </p>
          </div>
          <Button 
            onClick={() => setCreateWalletModal(true)}
            data-testid="button-create-wallet"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Wallet
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <WalletIcon className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Portfolio</span>
              </div>
              <div className="text-3xl font-semibold" data-testid="text-total-portfolio">
                ${totalValue.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Unlock className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Hot Wallet</span>
              </div>
              <div className="text-3xl font-semibold" data-testid="text-hot-wallet">
                ${totalHotValue.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Lock className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Cold Wallet</span>
              </div>
              <div className="text-3xl font-semibold" data-testid="text-cold-wallet">
                ${totalColdValue.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {hotWallets.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Hot Wallets</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {hotWallets.map((wallet) => (
                <WalletCard
                  key={wallet.id}
                  wallet={wallet}
                  usdPrice={cryptoPrices[wallet.cryptocurrency]}
                  onDeposit={() => setDepositModal({ isOpen: true, wallet })}
                  onWithdraw={() => setWithdrawModal({ isOpen: true, wallet })}
                />
              ))}
            </div>
          </div>
        )}

        {coldWallets.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Cold Wallets</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {coldWallets.map((wallet) => (
                <WalletCard
                  key={wallet.id}
                  wallet={wallet}
                  usdPrice={cryptoPrices[wallet.cryptocurrency]}
                  onDeposit={() => setDepositModal({ isOpen: true, wallet })}
                  onWithdraw={() => setWithdrawModal({ isOpen: true, wallet })}
                />
              ))}
            </div>
          </div>
        )}

        {wallets.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">No wallets found</p>
          </div>
        )}
      </main>

      {depositModal.wallet && (
        <DepositModal
          isOpen={depositModal.isOpen}
          onClose={() => setDepositModal({ isOpen: false, wallet: null })}
          cryptocurrency={depositModal.wallet.cryptocurrency}
          address={depositModal.wallet.address}
        />
      )}

      {withdrawModal.wallet && (
        <WithdrawModal
          isOpen={withdrawModal.isOpen}
          onClose={() => setWithdrawModal({ isOpen: false, wallet: null })}
          cryptocurrency={withdrawModal.wallet.cryptocurrency}
          availableBalance={withdrawModal.wallet.balance}
        />
      )}

      <CreateWalletModal
        isOpen={createWalletModal}
        onClose={() => setCreateWalletModal(false)}
      />
    </div>
  );
}
