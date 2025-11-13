import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CRYPTOCURRENCIES } from "@/lib/mock-data";

const createWalletSchema = z.object({
  cryptocurrency: z.string().min(1, "Please select a cryptocurrency"),
  walletType: z.enum(["hot", "cold"], {
    required_error: "Please select wallet type",
  }),
  balance: z.string().optional().default("0"),
  address: z.string().optional(),
});

type CreateWalletFormData = z.infer<typeof createWalletSchema>;

interface CreateWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function generateAddress(crypto: string): string {
  const prefixes: Record<string, string> = {
    BTC: "bc1q",
    ETH: "0x",
    USDT: "T",
    BNB: "bnb",
    SOL: "So1",
    XRP: "r",
  };
  
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const length = crypto === "ETH" ? 40 : 34;
  let address = prefixes[crypto] || "0x";
  
  for (let i = 0; i < length; i++) {
    address += chars[Math.floor(Math.random() * chars.length)];
  }
  
  return address;
}

export default function CreateWalletModal({ isOpen, onClose }: CreateWalletModalProps) {
  const { toast } = useToast();
  const [selectedCrypto, setSelectedCrypto] = useState("");

  const form = useForm<CreateWalletFormData>({
    resolver: zodResolver(createWalletSchema),
    defaultValues: {
      cryptocurrency: "",
      walletType: "hot",
      balance: "0",
      address: "",
    },
  });

  const createWalletMutation = useMutation({
    mutationFn: async (data: CreateWalletFormData) => {
      const payload = {
        cryptocurrency: data.cryptocurrency,
        walletType: data.walletType,
        balance: data.balance || "0",
        address: data.address || generateAddress(data.cryptocurrency),
      };
      
      return await apiRequest("POST", "/api/wallets", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      toast({
        title: "Wallet created",
        description: "Your new wallet has been created successfully.",
      });
      form.reset();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create wallet",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: CreateWalletFormData) => {
    createWalletMutation.mutate(data);
  };

  const handleGenerateAddress = () => {
    const crypto = form.getValues("cryptocurrency");
    if (crypto) {
      const address = generateAddress(crypto);
      form.setValue("address", address);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Wallet</DialogTitle>
          <DialogDescription>
            Add a new cryptocurrency wallet to your portfolio
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="cryptocurrency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cryptocurrency</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedCrypto(value);
                      if (!form.getValues("address")) {
                        form.setValue("address", generateAddress(value));
                      }
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-cryptocurrency">
                        <SelectValue placeholder="Select cryptocurrency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CRYPTOCURRENCIES.map((crypto) => (
                        <SelectItem 
                          key={crypto.symbol} 
                          value={crypto.symbol}
                          data-testid={`option-${crypto.symbol}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-mono">{crypto.icon}</span>
                            <span>{crypto.name}</span>
                            <span className="text-muted-foreground">({crypto.symbol})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="walletType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wallet Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-wallet-type">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="hot" data-testid="option-hot">
                        Hot Wallet (Online - Quick Access)
                      </SelectItem>
                      <SelectItem value="cold" data-testid="option-cold">
                        Cold Wallet (Offline - Secure Storage)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="balance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Balance (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.00000001"
                      placeholder="0.00000000"
                      {...field}
                      data-testid="input-balance"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Wallet Address</FormLabel>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleGenerateAddress}
                      disabled={!selectedCrypto}
                      data-testid="button-generate-address"
                    >
                      Generate
                    </Button>
                  </div>
                  <FormControl>
                    <Input
                      placeholder="Auto-generated or enter manually"
                      {...field}
                      className="font-mono text-xs"
                      data-testid="input-address"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={createWalletMutation.isPending}
                data-testid="button-create-wallet"
              >
                {createWalletMutation.isPending ? "Creating..." : "Create Wallet"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
