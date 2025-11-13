import { useState } from "react";
import DepositModal from "../DepositModal";
import { Button } from "@/components/ui/button";

export default function DepositModalExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="p-8">
      <Button onClick={() => setIsOpen(true)}>Open Deposit Modal</Button>
      <DepositModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        cryptocurrency="BTC"
        address="bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
      />
    </div>
  );
}
