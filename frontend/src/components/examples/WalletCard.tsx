import WalletCard from "../WalletCard";
import { mockWallets } from "@/lib/mock-data";

export default function WalletCardExample() {
  return (
    <div className="max-w-md p-8">
      <WalletCard
        wallet={mockWallets[0]}
        usdPrice={43250}
        onDeposit={() => console.log("Deposit")}
        onWithdraw={() => console.log("Withdraw")}
      />
    </div>
  );
}
