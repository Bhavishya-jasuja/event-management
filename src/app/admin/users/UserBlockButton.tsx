"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldOff, ShieldCheck } from "lucide-react";

export default function UserBlockButton({
  userId,
  isBlacklisted,
}: {
  userId: string;
  isBlacklisted: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: isBlacklisted ? "UNBLOCK" : "BLOCK" }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-50 ${
        isBlacklisted
          ? "border-green-400/30 text-green-400 hover:bg-green-400/10"
          : "border-destructive/30 text-destructive hover:bg-destructive/10"
      }`}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : isBlacklisted ? (
        <><ShieldCheck className="h-3 w-3" /> Unblock</>
      ) : (
        <><ShieldOff className="h-3 w-3" /> Block</>
      )}
    </button>
  );
}
