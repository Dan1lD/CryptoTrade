import OrderHistoryTable from "../OrderHistoryTable";
import { mockTrades } from "@/lib/mock-data";

export default function OrderHistoryTableExample() {
  return (
    <div className="p-8">
      <OrderHistoryTable trades={mockTrades} />
    </div>
  );
}
