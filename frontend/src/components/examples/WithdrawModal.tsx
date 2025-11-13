import { useState } from "react";
import WithdrawModal from "../WithdrawModal";
import { Button } from "@/components/ui/button";

export default function WithdrawModalExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="p-8">
      <Button onClick={() => setIsOpen(true)}>Open Withdraw Modal</Button>
      <WithdrawModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        cryptocurrency="BTC"
        availableBalance="0.45823000"
      />
    </div>
  );
}
