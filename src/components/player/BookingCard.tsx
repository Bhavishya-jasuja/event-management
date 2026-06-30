"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X, MapPin, Calendar, Clock, Hash, Loader2, ArrowUpRight, AlertCircle } from "lucide-react";

const statusStyle: Record<string, { badge: string; label: string; dot: string }> = {
  CONFIRMED: { badge: "bg-green-400/15 text-green-400 border-green-400/30",    label: "Confirmed",  dot: "bg-green-400" },
  COMPLETED: { badge: "bg-blue-400/15 text-blue-400 border-blue-400/30",       label: "Completed",  dot: "bg-blue-400" },
  CANCELLED: { badge: "bg-destructive/15 text-destructive border-destructive/30", label: "Cancelled", dot: "bg-destructive" },
  PENDING:   { badge: "bg-yellow-400/15 text-yellow-400 border-yellow-400/30", label: "Pending",    dot: "bg-yellow-400" },
};

export type BookingGroupData = {
  id: string;
  groupRef: string | null;
  ids: string[];
  displayStatus: string;
  venue: { id: string; name: string; city: string; photos: string[] };
  court: string;
  dateStr: string;       // ISO string — pass from server
  startTime: string;
  endTime: string;
  totalAmount: number;
  slots: number;
  bookingRef: string;
  cancellationReason: string | null;
};

function durationLabel(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const min = (eh * 60 + em) - (sh * 60 + sm);
  return min >= 60
    ? `${(min / 60).toFixed(min % 60 === 0 ? 0 : 1)} hr`
    : `${min} min`;
}

export default function BookingCard({ group, compact = false }: { group: BookingGroupData; compact?: boolean }) {
  const [open, setOpen] = useState(false);

  const cfg     = statusStyle[group.displayStatus] ?? statusStyle.CONFIRMED;
  const date    = new Date(group.dateStr);
  const dur     = durationLabel(group.startTime, group.endTime);
  const dateStr = date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  return (
    <>
      {/* Card */}
      <button
        onClick={() => setOpen(true)}
        className={`w-full text-left group rounded-xl border border-border/50 bg-card/40 hover:border-primary/30 hover:bg-card/70 transition-all p-4 flex items-center gap-4 ${compact ? "py-3" : ""}`}
      >
        <div className={`${compact ? "h-14 w-14" : "h-16 w-16"} rounded-xl overflow-hidden bg-secondary flex-shrink-0`}>
          {group.venue.photos[0]
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={group.venue.photos[0]} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-2xl">🏟️</div>}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate group-hover:text-primary transition-colors">{group.venue.name}</div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <MapPin className="h-3 w-3 flex-shrink-0" /> {group.venue.city} · {group.court}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 flex-wrap">
            <Clock className="h-3 w-3 flex-shrink-0" />
            {compact
              ? `${dateStr} · ${group.startTime}–${group.endTime}`
              : <>{group.startTime} – {group.endTime}</>}
            <span className="bg-secondary/70 px-1.5 py-0.5 rounded text-[10px]">{dur}</span>
            {group.slots > 1 && (
              <span className="bg-primary/15 text-primary px-1.5 py-0.5 rounded text-[10px]">{group.slots} slots</span>
            )}
          </div>
          {!compact && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <Calendar className="h-3 w-3 flex-shrink-0" /> {dateStr}
            </div>
          )}
        </div>

        <div className="text-right flex-shrink-0">
          <div className="font-bold text-primary text-sm">₹{group.totalAmount.toLocaleString("en-IN")}</div>
          <span className={`inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.badge}`}>
            {cfg.label}
          </span>
        </div>
      </button>

      {/* Detail Modal */}
      {open && (
        <BookingDetailModal group={group} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function BookingDetailModal({ group, onClose }: { group: BookingGroupData; onClose: () => void }) {
  const router  = useRouter();
  const cfg     = statusStyle[group.displayStatus] ?? statusStyle.CONFIRMED;
  const date    = new Date(group.dateStr);
  const dur     = durationLabel(group.startTime, group.endTime);

  const [cancelling, setCancelling] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [reason,     setReason]     = useState("");
  const [error,      setError]      = useState("");

  async function handleCancel() {
    setCancelling(true);
    setError("");
    try {
      await Promise.all(
        group.ids.map((id) =>
          fetch(`/api/bookings/${id}`, {
            method:  "PATCH",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ action: "CANCEL", reason }),
          })
        )
      );
      onClose();
      router.refresh();
    } catch {
      setError("Failed to cancel. Please try again.");
      setCancelling(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border/60 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero image */}
        <div className="relative h-44 bg-secondary rounded-t-3xl sm:rounded-t-2xl overflow-hidden">
          {group.venue.photos[0]
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={group.venue.photos[0]} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-6xl opacity-30">🏟️</div>}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 h-8 w-8 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            <X className="h-4 w-4 text-white" />
          </button>
          <div className="absolute bottom-0 left-0 p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${cfg.badge}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </span>
            </div>
            <h2 className="text-white font-bold text-xl leading-tight">{group.venue.name}</h2>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Booking ref */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Hash className="h-3.5 w-3.5" />
            <span className="font-mono">Booking #{group.bookingRef.slice(-8).toUpperCase()}</span>
            {group.slots > 1 && (
              <span className="ml-auto bg-primary/15 text-primary px-2 py-0.5 rounded text-[10px] font-medium">{group.slots} slots</span>
            )}
          </div>

          {/* Detail rows */}
          <div className="rounded-xl border border-border/40 bg-secondary/30 divide-y divide-border/30">
            <DetailRow icon={MapPin} label="Location" value={`${group.venue.city}`} />
            <DetailRow icon={MapPin} label="Court" value={group.court} />
            <DetailRow
              icon={Calendar}
              label="Date"
              value={date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            />
            <DetailRow
              icon={Clock}
              label="Time"
              value={`${group.startTime} – ${group.endTime}`}
              badge={dur}
            />
          </div>

          {/* Amount */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Amount</span>
            <span className="text-2xl font-bold text-primary">₹{group.totalAmount.toLocaleString("en-IN")}</span>
          </div>

          {/* Cancellation reason */}
          {group.cancellationReason && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 flex gap-2">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-destructive mb-0.5">Cancellation Reason</div>
                <div className="text-xs text-muted-foreground">{group.cancellationReason}</div>
              </div>
            </div>
          )}

          {/* Cancel flow */}
          {group.displayStatus === "CONFIRMED" && (
            <>
              {showCancel ? (
                <div className="space-y-3">
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason for cancellation (optional)"
                    rows={3}
                    className="w-full rounded-xl border border-border/60 bg-secondary/50 px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-primary placeholder:text-muted-foreground"
                  />
                  {error && <p className="text-xs text-destructive">{error}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancel}
                      disabled={cancelling}
                      className="flex-1 flex items-center justify-center gap-2 bg-destructive text-white py-2.5 rounded-xl text-sm font-medium hover:bg-destructive/90 disabled:opacity-60 transition-colors"
                    >
                      {cancelling && <Loader2 className="h-4 w-4 animate-spin" />}
                      Confirm Cancel
                    </button>
                    <button
                      onClick={() => setShowCancel(false)}
                      className="flex-1 border border-border/50 py-2.5 rounded-xl text-sm font-medium hover:bg-secondary/40 transition-colors"
                    >
                      Keep Booking
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowCancel(true)}
                  className="w-full border border-destructive/30 text-destructive py-2.5 rounded-xl text-sm font-medium hover:bg-destructive/10 transition-colors"
                >
                  Cancel Booking
                </button>
              )}
            </>
          )}

          {/* View venue link */}
          <Link
            href={`/venues/${group.venue.id}`}
            className="flex items-center justify-center gap-2 w-full bg-primary/10 text-primary py-2.5 rounded-xl text-sm font-medium hover:bg-primary/20 transition-colors"
          >
            View Venue <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value, badge }: { icon: any; label: string; value: string; badge?: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className="text-sm font-medium truncate">{value}</div>
      </div>
      {badge && <span className="bg-secondary/80 text-muted-foreground px-2 py-0.5 rounded text-[10px] flex-shrink-0">{badge}</span>}
    </div>
  );
}
