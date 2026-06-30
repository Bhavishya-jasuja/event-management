"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";

export default function CancelBookingButton({ bookingIds, groupRef }: { bookingIds: string[]; groupRef: string | null }) {
  const router  = useRouter();
  const [show,  setShow]    = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error,  setError]   = useState("");

  async function handleCancel() {
    setLoading(true);
    setError("");
    try {
      for (const id of bookingIds) {
        const res = await fetch(`/api/bookings/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "CANCEL", reason }),
        });
        if (!res.ok) {
          const d = await res.json();
          setError(d.error ?? "Cancel failed.");
          setLoading(false);
          return;
        }
      }
      setShow(false);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setShow(true)}
        className="text-xs text-muted-foreground hover:text-destructive border border-border/40 hover:border-destructive/40 px-2.5 py-1 rounded-lg transition-colors"
      >
        Cancel
      </button>

      {show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShow(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">Cancel booking{bookingIds.length > 1 ? "s" : ""}?</h3>
              <button onClick={() => setShow(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {bookingIds.length > 1
                ? `This will cancel all ${bookingIds.length} slots in this booking.`
                : "This slot will be freed up for other players."}
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (optional)..."
              rows={3}
              className="w-full rounded-lg border border-border/60 bg-secondary/50 px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-primary mb-4 placeholder:text-muted-foreground"
            />
            {error && <p className="text-xs text-destructive mb-3">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-destructive text-white py-2.5 rounded-xl text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Yes, Cancel
              </button>
              <button
                onClick={() => setShow(false)}
                className="flex-1 border border-border/50 py-2.5 rounded-xl text-sm font-medium hover:bg-secondary/40 transition-colors"
              >
                Keep it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
