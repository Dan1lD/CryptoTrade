import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  cryptocurrency: string;
  address: string;
}

export default function DepositModal({
  isOpen,
  onClose,
  cryptocurrency,
  address,
}: DepositModalProps) {
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent data-testid="modal-deposit">
        <DialogHeader>
          <DialogTitle>Deposit {cryptocurrency}</DialogTitle>
          <DialogDescription>
            Send {cryptocurrency} to this address to fund your wallet
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <div className="text-sm font-medium mb-2">Wallet Address</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 font-mono text-sm break-all bg-muted p-3 rounded" data-testid="text-deposit-address">
                {address}
              </div>
              <Button
                size="icon"
                variant="outline"
                onClick={copyAddress}
                data-testid="button-copy-address"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="font-medium text-sm">Important Notes:</div>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Only send {cryptocurrency} to this address</li>
              <li>Deposits typically take 10-30 minutes to confirm</li>
              <li>Minimum deposit: 0.0001 {cryptocurrency}</li>
            </ul>
          </div>

          <Button onClick={onClose} className="w-full" data-testid="button-close-deposit">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
