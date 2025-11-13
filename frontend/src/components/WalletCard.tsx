import { Wallet } from "@shared/schema";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Upload, Lock, Unlock } from "lucide-react";
import { CRYPTOCURRENCIES } from "@/lib/mock-data";

interface WalletCardProps {
  wallet: Wallet;
  usdPrice?: number;
  onDeposit: () => void;
  onWithdraw: () => void;
}

export default function WalletCard({ wallet, usdPrice = 0, onDeposit, onWithdraw }: WalletCardProps) {
  const crypto = CRYPTOCURRENCIES.find((c) => c.symbol === wallet.cryptocurrency);
  const usdValue = (parseFloat(wallet.balance) * usdPrice).toFixed(2);

  return (
    <Card className="hover-elevate" data-testid={`card-wallet-${wallet.cryptocurrency}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-2xl font-mono">
              {crypto?.icon}
            </div>
            <div>
              <div className="font-semibold">{crypto?.name}</div>
              <div className="text-sm text-muted-foreground">{wallet.cryptocurrency}</div>
            </div>
          </div>
          <Badge
            variant={wallet.walletType === "hot" ? "default" : "secondary"}
            className="gap-1"
            data-testid={`badge-type-${wallet.walletType}`}
          >
            {wallet.walletType === "hot" ? (
              <Unlock className="h-3 w-3" />
            ) : (
              <Lock className="h-3 w-3" />
            )}
            {wallet.walletType.toUpperCase()}
          </Badge>
        </div>

        <div className="mb-4">
          <div className="text-sm text-muted-foreground mb-1">Balance</div>
          <div className="text-2xl font-mono font-semibold" data-testid="text-balance">
            {parseFloat(wallet.balance).toFixed(8)}
          </div>
          {usdPrice > 0 && (
            <div className="text-sm text-muted-foreground mt-1" data-testid="text-usd-value">
              ≈ ${parseFloat(usdValue).toLocaleString()}
            </div>
          )}
        </div>

        <div>
          <div className="text-sm text-muted-foreground mb-1">Address</div>
          <div className="font-mono text-xs break-all bg-muted p-2 rounded" data-testid="text-address">
            {wallet.address}
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-6 pt-0 gap-2">
        <Button
          variant="outline"
          className="flex-1 gap-2"
          onClick={onDeposit}
          data-testid="button-deposit"
        >
          <Download className="h-4 w-4" />
          Deposit
        </Button>
        <Button
          variant="outline"
          className="flex-1 gap-2"
          onClick={onWithdraw}
          data-testid="button-withdraw"
        >
          <Upload className="h-4 w-4" />
          Withdraw
        </Button>
      </CardFooter>
    </Card>
  );
}
