import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import VenueReviewActions from "./VenueReviewActions";
import { MapPin, User, Calendar, Tag } from "lucide-react";

export default async function AdminVenueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const { id } = await params;

  const venue = await prisma.venue.findUnique({
    where: { id },
    include: {
      owner: { select: { name: true, email: true, phone: true, createdAt: true } },
      courts: true,
      reviewedBy: { select: { name: true } },
    },
  });

  if (!venue) notFound();

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <a href="/admin/venues" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to venues
        </a>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">{venue.name}</h1>
          <div className="flex items-center gap-1.5 text-muted-foreground mt-1">
            <MapPin className="h-3.5 w-3.5" />
            <span className="text-sm">{venue.address}, {venue.city}, {venue.state} — {venue.pincode}</span>
          </div>
        </div>
        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
          venue.status === "PENDING"   ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-400" :
          venue.status === "ACTIVE"    ? "border-green-400/30 bg-green-400/10 text-green-400" :
          venue.status === "REJECTED"  ? "border-destructive/30 bg-destructive/10 text-destructive" :
          "border-orange-400/30 bg-orange-400/10 text-orange-400"
        }`}>
          {venue.status}
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Owner info */}
        <div className="rounded-xl border border-border/50 bg-card/40 p-5">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Owner Details</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{venue.owner.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{venue.owner.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone</span>
              <span>{venue.owner.phone ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Registered</span>
              <span>{new Date(venue.owner.createdAt).toLocaleDateString("en-IN")}</span>
            </div>
          </div>
        </div>

        {/* Venue info */}
        <div className="rounded-xl border border-border/50 bg-card/40 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Venue Details</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sports</span>
              <span>{venue.sportTypes.join(", ") || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Courts</span>
              <span>{venue.courts.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amenities</span>
              <span>{venue.amenities.length > 0 ? venue.amenities.join(", ") : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Submitted</span>
              <span>{new Date(venue.createdAt).toLocaleDateString("en-IN")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {venue.description && (
        <div className="rounded-xl border border-border/50 bg-card/40 p-5 mb-6">
          <h2 className="font-semibold mb-2">Description</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{venue.description}</p>
        </div>
      )}

      {/* Photos */}
      {venue.photos.length > 0 && (
        <div className="rounded-xl border border-border/50 bg-card/40 p-5 mb-6">
          <h2 className="font-semibold mb-3">Photos ({venue.photos.length})</h2>
          <div className="grid grid-cols-3 gap-3">
            {venue.photos.map((photo, i) => (
              <img key={i} src={photo} alt={`Venue photo ${i + 1}`} className="rounded-lg w-full h-32 object-cover" />
            ))}
          </div>
        </div>
      )}

      {/* Rejection reason */}
      {venue.status === "REJECTED" && venue.rejectionReason && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-5 mb-6">
          <h2 className="font-semibold text-destructive mb-1">Rejection Reason</h2>
          <p className="text-sm text-muted-foreground">{venue.rejectionReason}</p>
        </div>
      )}

      {/* Review info */}
      {venue.reviewedBy && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
          <Calendar className="h-3.5 w-3.5" />
          Reviewed by {venue.reviewedBy.name} on {venue.reviewedAt ? new Date(venue.reviewedAt).toLocaleDateString("en-IN") : "—"}
        </div>
      )}

      {/* Action buttons */}
      <VenueReviewActions venueId={venue.id} currentStatus={venue.status} />
    </div>
  );
}
