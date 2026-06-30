import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusCircle, Building2, Clock, CheckCircle, XCircle, PauseCircle } from "lucide-react";

const statusConfig = {
  PENDING:   { label: "Under Review", icon: Clock,       class: "border-yellow-400/30 bg-yellow-400/10 text-yellow-400" },
  ACTIVE:    { label: "Active",       icon: CheckCircle, class: "border-green-400/30 bg-green-400/10 text-green-400" },
  REJECTED:  { label: "Rejected",     icon: XCircle,     class: "border-destructive/30 bg-destructive/10 text-destructive" },
  SUSPENDED: { label: "Suspended",    icon: PauseCircle, class: "border-orange-400/30 bg-orange-400/10 text-orange-400" },
};

export default async function OwnerVenuesPage() {
  const session = await auth();
  if (!session || session.user.role !== "OWNER") redirect("/login");

  const venues = await prisma.venue.findMany({
    where: { ownerId: session.user.id },
    include: { _count: { select: { courts: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">My Venues</h1>
        <Link href="/owner/venues/new">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
            <PlusCircle className="h-4 w-4" /> Add Venue
          </Button>
        </Link>
      </div>

      {venues.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-16 text-center">
          <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">No venues yet</h3>
          <p className="text-muted-foreground text-sm mb-6">
            List your venue to start accepting bookings from players.
          </p>
          <Link href="/owner/venues/new">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
              <PlusCircle className="h-4 w-4" /> Add your first venue
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {venues.map((venue) => {
            const cfg = statusConfig[venue.status];
            return (
              <div key={venue.id} className="rounded-xl border border-border/50 bg-card/40 p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl overflow-hidden bg-secondary flex-shrink-0">
                    {venue.photos[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={venue.photos[0]} alt={venue.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold">{venue.name}</div>
                    <div className="text-sm text-muted-foreground">{venue.city}, {venue.state}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {venue._count.courts} court{venue._count.courts !== 1 ? "s" : ""} · {venue.sportTypes.map((s) => s.charAt(0) + s.slice(1).toLowerCase()).join(", ")}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {venue.status === "REJECTED" && venue.rejectionReason && (
                    <div className="max-w-xs text-xs text-muted-foreground bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                      <span className="text-destructive font-medium">Reason: </span>
                      {venue.rejectionReason}
                    </div>
                  )}
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.class}`}>
                    <cfg.icon className="h-3 w-3" />
                    {cfg.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
