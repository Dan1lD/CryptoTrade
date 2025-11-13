import { useLocation } from "wouter";
import Navbar from "@/components/Navbar";
import CreateOfferForm from "@/components/CreateOfferForm";

export default function CreateOfferPage() {
  const [, setLocation] = useLocation();

  const handleSuccess = () => {
    setLocation("/marketplace");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Create Trade Offer</h1>
          <p className="text-muted-foreground">
            List your cryptocurrency for sale or create a buy order
          </p>
        </div>

        <div className="max-w-3xl">
          <CreateOfferForm onSuccess={handleSuccess} />
        </div>
      </main>
    </div>
  );
}
