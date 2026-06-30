import VenueCreateForm from "./VenueCreateForm";

export default function NewVenuePage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Add New Venue</h1>
        <p className="text-muted-foreground mt-1">
          Fill in your venue details. Our team will review and approve within 24–48 hours.
        </p>
      </div>
      <VenueCreateForm />
    </div>
  );
}
