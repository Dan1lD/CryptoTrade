import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CRYPTOCURRENCIES, PAYMENT_METHODS } from "@/lib/mock-data";
import { apiRequest } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, TrendingDown } from "lucide-react";

const createOfferSchema = z.object({
  baseCryptocurrency: z.string().min(1, "Select base cryptocurrency (what you're selling)"),
  quoteCryptocurrency: z.string().min(1, "Select quote cryptocurrency (what you want)"),
  offerType: z.enum(["buy", "sell"]),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Amount must be greater than 0",
  }),
  exchangeRate: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Exchange rate must be greater than 0",
  }),
  paymentMethods: z.array(z.string()).min(1, "Select at least one payment method"),
  terms: z.string().optional(),
}).refine((data) => data.baseCryptocurrency !== data.quoteCryptocurrency, {
  message: "Base and quote cryptocurrencies must be different",
  path: ["quoteCryptocurrency"],
});

type CreateOfferFormData = z.infer<typeof createOfferSchema>;

export default function CreateOfferForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CreateOfferFormData>({
    resolver: zodResolver(createOfferSchema),
    defaultValues: {
      baseCryptocurrency: "",
      quoteCryptocurrency: "",
      offerType: "sell",
      amount: "",
      exchangeRate: "",
      paymentMethods: [],
      terms: "",
    },
  });

  const onSubmit = async (data: CreateOfferFormData) => {
    setIsLoading(true);

    try {
      const res = await apiRequest("/api/offers", {
        method: "POST",
        body: JSON.stringify({
          baseCryptocurrency: data.baseCryptocurrency,
          quoteCryptocurrency: data.quoteCryptocurrency,
          offerType: data.offerType,
          amount: parseFloat(data.amount).toFixed(8),
          exchangeRate: parseFloat(data.exchangeRate).toFixed(8),
          paymentMethods: data.paymentMethods,
          terms: data.terms || null,
        }),
      });

      if (res.ok) {
        const quoteAmount = (parseFloat(data.amount) * parseFloat(data.exchangeRate)).toFixed(8);
        
        // Invalidate offers query to refetch updated data (non-blocking)
        queryClient.invalidateQueries({ queryKey: ["/api/offers"] }).catch(() => {
          // Cache refresh failed, but offer was created successfully
          // User can manually refresh to see the new offer
        });
        
        toast({
          title: "Offer created successfully",
          description: `Your ${data.offerType} offer for ${data.amount} ${data.baseCryptocurrency} at rate ${data.exchangeRate} (total: ${quoteAmount} ${data.quoteCryptocurrency}) is now live.`,
        });
        form.reset();
        onSuccess();
      } else {
        const error = await res.json();
        toast({
          variant: "destructive",
          title: "Failed to create offer",
          description: error.detail || error.error || "Something went wrong",
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create offer",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Trade Offer</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="baseCryptocurrency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Cryptocurrency (What you're selling)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-base-cryptocurrency">
                          <SelectValue placeholder="Select base crypto" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CRYPTOCURRENCIES.map((crypto) => (
                          <SelectItem key={crypto.symbol} value={crypto.symbol}>
                            {crypto.icon} {crypto.name} ({crypto.symbol})
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
                name="quoteCryptocurrency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quote Cryptocurrency (What you want)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-quote-cryptocurrency">
                          <SelectValue placeholder="Select quote crypto" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CRYPTOCURRENCIES.map((crypto) => (
                          <SelectItem key={crypto.symbol} value={crypto.symbol}>
                            {crypto.icon} {crypto.name} ({crypto.symbol})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="offerType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Offer Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid grid-cols-2 gap-4"
                    >
                      <div>
                        <RadioGroupItem value="sell" id="sell" className="peer sr-only" />
                        <label
                          htmlFor="sell"
                          className="flex items-center justify-center gap-2 rounded-md border-2 border-muted bg-card p-4 hover-elevate peer-data-[state=checked]:border-destructive cursor-pointer"
                          data-testid="radio-sell"
                        >
                          <TrendingDown className="h-5 w-5" />
                          <span className="font-medium">Sell</span>
                        </label>
                      </div>
                      <div>
                        <RadioGroupItem value="buy" id="buy" className="peer sr-only" />
                        <label
                          htmlFor="buy"
                          className="flex items-center justify-center gap-2 rounded-md border-2 border-muted bg-card p-4 hover-elevate peer-data-[state=checked]:border-primary cursor-pointer"
                          data-testid="radio-buy"
                        >
                          <TrendingUp className="h-5 w-5" />
                          <span className="font-medium">Buy</span>
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        data-testid="input-amount"
                      />
                    </FormControl>
                    <FormDescription>Amount of cryptocurrency</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="exchangeRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exchange Rate</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.00000001"
                        placeholder="0.00000000"
                        className="font-mono"
                        data-testid="input-exchange-rate"
                      />
                    </FormControl>
                    <FormDescription>Quote per 1 unit of base</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="paymentMethods"
              render={() => (
                <FormItem>
                  <FormLabel>Payment Methods</FormLabel>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {PAYMENT_METHODS.map((method) => (
                      <FormField
                        key={method}
                        control={form.control}
                        name="paymentMethods"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(method)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, method])
                                    : field.onChange(
                                        field.value?.filter((value) => value !== method)
                                      );
                                }}
                                data-testid={`checkbox-${method}`}
                              />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              {method}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="terms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Terms & Conditions (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Add any additional terms or requirements for this trade..."
                      className="resize-none"
                      rows={4}
                      data-testid="textarea-terms"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-submit">
              {isLoading ? "Creating offer..." : "Create Trade Offer"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
