import { Trade } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatTradeTimestamp } from "@/lib/date-utils";

interface OrderHistoryTableProps {
  trades: Trade[];
}

export default function OrderHistoryTable({ trades }: OrderHistoryTableProps) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "pending":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Pair</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trades.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                No trades found
              </TableCell>
            </TableRow>
          ) : (
            trades.map((trade) => {
              const price = parseFloat(trade.pricePerUnit || "0");
              const total = parseFloat(trade.totalPrice || "0");
              const amount = parseFloat(trade.amount || "0");
              
              return (
                <TableRow key={trade.id} data-testid={`row-trade-${trade.id}`}>
                  <TableCell className="font-medium">
                    {formatTradeTimestamp(trade.createdAt)}
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">
                      {trade.cryptocurrency}/{trade.fiatCurrency}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" data-testid={`badge-type-${trade.id}`}>
                      Trade
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono" data-testid={`text-amount-${trade.id}`}>
                    {amount.toFixed(8)}
                  </TableCell>
                  <TableCell className="text-right" data-testid={`text-price-${trade.id}`}>
                    ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right font-semibold" data-testid={`text-total-${trade.id}`}>
                    ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>{trade.paymentMethod || "--"}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(trade.status)} data-testid={`badge-status-${trade.id}`}>
                      {trade.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
