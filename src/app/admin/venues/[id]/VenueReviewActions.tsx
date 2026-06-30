"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, PauseCircle, Loader2, RefreshCw } from "lucide-react";

type VenueStatus = "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED";
type Action = "APPROVE" | "REJECT" | "SUSPEND" | "REACTIVATE";

export default function VenueReviewActions({
  venueId,
  currentStatus,
}: {
  venueId: string;
  currentStatus: VenueStatus;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<Action | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState("");

  async function handleAction(action: Action, reason?: string) {
    setLoading(action);
    setError("");

    try {
      const res = await fetch(`/api/admin/venues/${venueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });

      if (!res.ok) {
        setError("Action failed. Please try again.");
        setLoading(null);
        return;
      }

      router.refresh();
      setShowRejectModal(false);
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card/40 p-5">
      <h2 className="font-semibold mb-4">Review Actions</h2>

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive mb-4">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {currentStatus !== "ACTIVE" && (
          <Button
            onClick={() => handleAction("APPROVE")}
            disabled={!!loading}
            className="bg-green-600 hover:bg-green-700 text-white gap-2"
          >
            {loading === "APPROVE" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Approve Venue
          </Button>
        )}

        {currentStatus !== "REJECTED" && (
          <Button
            onClick={() => setShowRejectModal(true)}
            disabled={!!loading}
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/10 gap-2"
          >
            <XCircle className="h-4 w-4" />
            Reject Venue
          </Button>
        )}

        {currentStatus === "ACTIVE" && (
          <Button
            onClick={() => handleAction("SUSPEND")}
            disabled={!!loading}
            variant="outline"
            className="border-orange-400/40 text-orange-400 hover:bg-orange-400/10 gap-2"
          >
            {loading === "SUSPEND" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PauseCircle className="h-4 w-4" />}
            Suspend Venue
          </Button>
        )}

        {(currentStatus === "SUSPENDED" || currentStatus === "REJECTED") && (
          <Button
            onClick={() => handleAction("REACTIVATE")}
            disabled={!!loading}
            variant="outline"
            className="border-blue-400/40 text-blue-400 hover:bg-blue-400/10 gap-2"
          >
            {loading === "REACTIVATE" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Reactivate Venue
          </Button>
        )}
      </div>

      {/* Reject modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-bold text-lg mb-1">Reject Venue</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Provide a reason so the owner knows what to fix and can resubmit.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Photos are unclear, address could not be verified, missing ownership proof..."
              rows={4}
              className="w-full rounded-lg border border-border/60 bg-secondary/50 px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-primary placeholder:text-muted-foreground"
            />
            <div className="flex gap-3 mt-4">
              <Button
                onClick={() => handleAction("REJECT", rejectReason)}
                disabled={!rejectReason.trim() || !!loading}
                className="flex-1 bg-destructive hover:bg-destructive/90 text-white gap-2"
              >
                {loading === "REJECT" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                Confirm Rejection
              </Button>
              <Button
                onClick={() => { setShowRejectModal(false); setRejectReason(""); }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
