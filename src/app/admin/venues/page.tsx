import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle, PauseCircle } from "lucide-react";

const statusConfig = {
  PENDING:   { label: "Pending",   icon: Clock,         class: "border-yellow-400/30 bg-yellow-400/10 text-yellow-400" },
  ACTIVE:    { label: "Active",    icon: CheckCircle,   class: "border-green-400/30 bg-green-400/10 text-green-400" },
  REJECTED:  { label: "Rejected",  icon: XCircle,       class: "border-destructive/30 bg-destructive/10 text-destructive" },
  SUSPENDED: { label: "Suspended", icon: PauseCircle,   class: "border-orange-400/30 bg-orange-400/10 text-orange-400" },
};

export default async function AdminVenuesPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const venues = await prisma.venue.findMany({
    include: { owner: { select: { name: true, email: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Venues</h1>
        <p className="text-muted-foreground mt-1">Review and manage all venue submissions.</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(["ALL", "PENDING", "ACTIVE", "REJECTED", "SUSPENDED"] as const).map((s) => {
          const count = s === "ALL" ? venues.length : venues.filter((v) => v.status === s).length;
          return (
            <div key={s} className="px-3 py-1.5 rounded-lg border border-border/50 text-sm text-muted-foreground bg-card/40">
              {s === "ALL" ? "All" : statusConfig[s].label} <span className="text-foreground font-semibold ml-1">{count}</span>
            </div>
          );
        })}
      </div>

      {venues.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-card/40 p-10 text-center text-muted-foreground">
          No venues submitted yet
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card/40 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Venue</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Owner</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Location</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Sports</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Status</th>
                <th className="text-left px-5 py-3 text-muted-foreground font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {venues.map((venue) => {
                const s = statusConfig[venue.status];
                return (
                  <tr key={venue.id} className="border-b border-border/30 last:border-0 hover:bg-secondary/20 transition-colors">
                    <td className="px-5 py-4 font-medium">{venue.name}</td>
                    <td className="px-5 py-4">
                      <div className="text-sm">{venue.owner.name}</div>
                      <div className="text-xs text-muted-foreground">{venue.owner.email}</div>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{venue.city}, {venue.state}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {venue.sportTypes.slice(0, 2).map((sport) => (
                          <span key={sport} className="text-xs bg-secondary px-2 py-0.5 rounded-md">{sport}</span>
                        ))}
                        {venue.sportTypes.length > 2 && (
                          <span className="text-xs text-muted-foreground">+{venue.sportTypes.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${s.class}`}>
                        <s.icon className="h-3 w-3" />
                        {s.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <a href={`/admin/venues/${venue.id}`} className="text-primary hover:underline font-medium text-sm">
                        Review →
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
