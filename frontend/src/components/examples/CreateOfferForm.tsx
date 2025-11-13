import CreateOfferForm from "../CreateOfferForm";

export default function CreateOfferFormExample() {
  return (
    <div className="max-w-3xl mx-auto p-8">
      <CreateOfferForm onSuccess={() => console.log("Offer created")} />
    </div>
  );
}
