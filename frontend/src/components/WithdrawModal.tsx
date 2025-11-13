import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const withdrawSchema = z.object({
  address: z.string().min(20, "Invalid address"),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Amount must be greater than 0",
  }),
});

type WithdrawFormData = z.infer<typeof withdrawSchema>;

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  cryptocurrency: string;
  availableBalance: string;
}

export default function WithdrawModal({
  isOpen,
  onClose,
  cryptocurrency,
  availableBalance,
}: WithdrawModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<WithdrawFormData>({
    resolver: zodResolver(withdrawSchema),
    defaultValues: {
      address: "",
      amount: "",
    },
  });

  const onSubmit = async (data: WithdrawFormData) => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);

    toast({
      title: "Withdrawal initiated",
      description: `Withdrawing ${data.amount} ${cryptocurrency} to ${data.address.slice(0, 10)}...`,
    });

    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent data-testid="modal-withdraw">
        <DialogHeader>
          <DialogTitle>Withdraw {cryptocurrency}</DialogTitle>
          <DialogDescription>
            Send {cryptocurrency} from your wallet to an external address
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination Address</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter wallet address"
                      className="font-mono text-sm"
                      data-testid="input-withdraw-address"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.00000001"
                      placeholder="0.00000000"
                      className="font-mono"
                      data-testid="input-withdraw-amount"
                    />
                  </FormControl>
                  <FormDescription>
                    Available: {parseFloat(availableBalance).toFixed(8)} {cryptocurrency}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                data-testid="button-cancel-withdraw"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1"
                data-testid="button-confirm-withdraw"
              >
                {isLoading ? "Processing..." : "Withdraw"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
