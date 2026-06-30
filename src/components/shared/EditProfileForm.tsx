"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, Pencil, X } from "lucide-react";

export default function EditProfileForm({
  initial,
}: {
  initial: { name: string; phone: string | null };
}) {
  const router  = useRouter();
  const [editing, setEditing] = useState(false);
  const [name,    setName]    = useState(initial.name);
  const [phone,   setPhone]   = useState(initial.phone ?? "");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState("");

  async function save() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/user/profile", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name, phone }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to save.");
      setLoading(false);
      return;
    }
    setSuccess(true);
    setEditing(false);
    setLoading(false);
    setTimeout(() => setSuccess(false), 3000);
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Personal Info</h3>
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 border border-primary/30 hover:border-primary/60 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <Pencil className="h-3 w-3" /> Edit
          </button>
        </div>

        <div className="space-y-3">
          <InfoRow label="Full Name"    value={initial.name} />
          <InfoRow label="Phone"        value={initial.phone ?? "—"} />
        </div>

        {success && (
          <div className="flex items-center gap-2 text-sm text-green-400 bg-green-400/10 border border-green-400/30 rounded-lg px-3 py-2">
            <CheckCircle2 className="h-4 w-4" /> Profile updated successfully
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Edit Profile</h3>
        <button onClick={() => { setEditing(false); setName(initial.name); setPhone(initial.phone ?? ""); }}
          className="text-muted-foreground hover:text-foreground p-1">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Full Name</label>
          <input
            value={name} onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-border/60 bg-secondary/50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Phone (10 digits)</label>
          <input
            value={phone} onChange={(e) => setPhone(e.target.value)}
            placeholder="9876543210"
            maxLength={10}
            className="w-full rounded-lg border border-border/60 bg-secondary/50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={save} disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />} Save Changes
        </button>
        <button
          onClick={() => { setEditing(false); setName(initial.name); setPhone(initial.phone ?? ""); }}
          className="flex-1 border border-border/50 py-2.5 rounded-xl text-sm font-medium hover:bg-secondary/40 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
