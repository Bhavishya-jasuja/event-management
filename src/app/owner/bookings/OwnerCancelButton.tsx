"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";

export default function OwnerCancelButton({ bookingId, playerName }: { bookingId: string; playerName: string }) {
  const router = useRouter();
  const [show,   setShow]   = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error,  setError]  = useState("");

  async function handleCancel() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/owner/bookings/${bookingId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "CANCEL", reason }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Failed.");
      setLoading(false);
      return;
    }
    setShow(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setShow(true)}
        className="text-xs border border-destructive/30 text-destructive hover:bg-destructive/10 px-2.5 py-1 rounded-lg transition-colors"
      >
        Cancel
      </button>

      {show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShow(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">Cancel booking?</h3>
              <button onClick={() => setShow(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Cancel {playerName}&apos;s booking? The slot will be freed and they will see the cancellation reason.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason e.g. Ground maintenance, event closure..."
              rows={3}
              className="w-full rounded-lg border border-border/60 bg-secondary/50 px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-primary mb-4 placeholder:text-muted-foreground"
            />
            {error && <p className="text-xs text-destructive mb-3">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-destructive text-white py-2.5 rounded-xl text-sm font-medium hover:bg-destructive/90 disabled:opacity-60 transition-colors"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Cancel Booking
              </button>
              <button onClick={() => setShow(false)} className="flex-1 border border-border/50 py-2.5 rounded-xl text-sm font-medium hover:bg-secondary/40 transition-colors">
                Keep
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
