import { useState } from "react";
import { TradeOffer } from "@/types";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TrendingUp, TrendingDown, Clock, AlertCircle } from "lucide-react";
import { mockUsers, CRYPTOCURRENCIES } from "@/lib/mock-data";
import { formatDistanceToNow, parseISO } from "date-fns";

interface TradeOfferCardProps {
  offer: TradeOffer;
  onAccept: (offerId: string, paymentMethod: string) => void;
  currentUserId?: string;
}

export default function TradeOfferCard({ offer, onAccept, currentUserId }: TradeOfferCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(offer.paymentMethods[0] || "");
  
  const seller = mockUsers.find((u) => u.id === offer.sellerId);
  const baseCrypto = CRYPTOCURRENCIES.find((c) => c.symbol === offer.baseCryptocurrency);
  const quoteCrypto = CRYPTOCURRENCIES.find((c) => c.symbol === offer.quoteCryptocurrency);
  const quoteAmount = (parseFloat(offer.amount) * parseFloat(offer.exchangeRate)).toFixed(8);
  const isOwnOffer = !!(currentUserId && offer.sellerId === currentUserId);

  const handleAcceptClick = () => {
    setIsDialogOpen(true);
  };

  const handleConfirmAccept = () => {
    onAccept(offer.id, selectedPaymentMethod);
    setIsDialogOpen(false);
  };

  return (
    <>
      <Card className="hover-elevate" data-testid={`card-offer-${offer.id}`}>
        <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xl font-mono">
              {baseCrypto?.icon || offer.baseCryptocurrency.charAt(0)}
            </div>
            <div>
              <div className="text-lg font-semibold">
                {offer.baseCryptocurrency}/{offer.quoteCryptocurrency}
              </div>
              <div className="text-sm text-muted-foreground">
                {baseCrypto?.name || offer.baseCryptocurrency} → {quoteCrypto?.name || offer.quoteCryptocurrency}
              </div>
            </div>
          </div>
          <Badge
            variant={offer.offerType === "sell" ? "destructive" : "default"}
            className="gap-1"
            data-testid={`badge-type-${offer.offerType}`}
          >
            {offer.offerType === "sell" ? (
              <TrendingDown className="h-3 w-3" />
            ) : (
              <TrendingUp className="h-3 w-3" />
            )}
            {offer.offerType.toUpperCase()}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Selling</div>
            <div className="font-mono font-medium" data-testid="text-amount">
              {parseFloat(offer.amount).toFixed(8)} {offer.baseCryptocurrency}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Exchange Rate</div>
            <div className="font-mono font-medium" data-testid="text-rate">
              {parseFloat(offer.exchangeRate).toFixed(8)}
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="text-sm text-muted-foreground mb-1">You'll receive</div>
          <div className="text-xl font-semibold font-mono" data-testid="text-quote">
            {quoteAmount} {offer.quoteCryptocurrency}
          </div>
        </div>

        <div className="mb-4">
          <div className="text-sm text-muted-foreground mb-2">Payment Methods</div>
          <div className="flex flex-wrap gap-2">
            {offer.paymentMethods.map((method) => (
              <Badge key={method} variant="secondary" data-testid={`badge-payment-${method}`}>
                {method}
              </Badge>
            ))}
          </div>
        </div>

        {offer.terms && (
          <div className="mb-4">
            <div className="text-sm text-muted-foreground mb-1">Terms</div>
            <div className="text-sm">{offer.terms}</div>
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            Seller: <span className="font-medium">{seller?.username}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(parseISO(offer.createdAt), { addSuffix: true })}
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-6 pt-0">
        <Button
          className="w-full"
          onClick={handleAcceptClick}
          disabled={isOwnOffer}
          data-testid="button-accept-offer"
        >
          {isOwnOffer ? "Your Offer" : "Accept Offer"}
        </Button>
      </CardFooter>
    </Card>

    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent data-testid="dialog-select-payment">
        <DialogHeader>
          <DialogTitle>Select Payment Method</DialogTitle>
          <DialogDescription>
            Choose how you want to pay for this trade
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
            {offer.paymentMethods.map((method) => (
              <div key={method} className="flex items-center space-x-2 py-2">
                <RadioGroupItem value={method} id={`payment-${method}`} data-testid={`radio-${method}`} />
                <Label htmlFor={`payment-${method}`} className="flex-1 cursor-pointer">
                  {method}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {selectedPaymentMethod === "CryptoTrade wallet" && (
            <div className="mt-4 p-3 bg-muted rounded-md flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                <strong>Note:</strong> Using CryptoTrade wallet requires you to have a hot wallet with {quoteAmount} {offer.quoteCryptocurrency}. The funds will be transferred instantly to both parties.
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="button-cancel">
            Cancel
          </Button>
          <Button onClick={handleConfirmAccept} data-testid="button-confirm-accept">
            Confirm Purchase
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
