"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Zap, User, Building2, Loader2, ArrowRight } from "lucide-react";

type Role = "PLAYER" | "OWNER";

export default function RolePickerPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleContinue() {
    if (!selected) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selected }),
      });

      if (!res.ok) {
        setError("Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      // Force session refresh then redirect
      await fetch("/api/auth/session");
      router.push(selected === "OWNER" ? "/owner/dashboard" : "/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-12">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold">Nex<span className="text-primary">Arc</span></span>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-3">What brings you to NexArc?</h1>
          <p className="text-muted-foreground">
            We&apos;ll set up the right experience for you. You can only choose once.
          </p>
        </div>

        {/* Role cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            type="button"
            onClick={() => setSelected("PLAYER")}
            className={`relative flex flex-col items-center gap-4 rounded-2xl border-2 p-8 text-left transition-all duration-200 ${
              selected === "PLAYER"
                ? "border-primary bg-primary/10"
                : "border-border/50 hover:border-border hover:bg-secondary/40"
            }`}
          >
            {selected === "PLAYER" && (
              <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${
              selected === "PLAYER" ? "bg-primary/20 border border-primary/40" : "bg-secondary"
            }`}>
              <User className={`h-7 w-7 ${selected === "PLAYER" ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div className="text-center">
              <div className="font-bold text-lg mb-1">I&apos;m a Player</div>
              <div className="text-sm text-muted-foreground leading-relaxed">
                I want to discover and book sports venues near me
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelected("OWNER")}
            className={`relative flex flex-col items-center gap-4 rounded-2xl border-2 p-8 text-left transition-all duration-200 ${
              selected === "OWNER"
                ? "border-primary bg-primary/10"
                : "border-border/50 hover:border-border hover:bg-secondary/40"
            }`}
          >
            {selected === "OWNER" && (
              <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${
              selected === "OWNER" ? "bg-primary/20 border border-primary/40" : "bg-secondary"
            }`}>
              <Building2 className={`h-7 w-7 ${selected === "OWNER" ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div className="text-center">
              <div className="font-bold text-lg mb-1">I&apos;m an Owner</div>
              <div className="text-sm text-muted-foreground leading-relaxed">
                I own a sports venue and want to manage bookings
              </div>
            </div>
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive mb-4 text-center">
            {error}
          </div>
        )}

        <Button
          onClick={handleContinue}
          disabled={!selected || loading}
          className="w-full h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Continue as {selected === "OWNER" ? "Owner" : selected === "PLAYER" ? "Player" : "..."}
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground mt-4">
          This cannot be changed later. Choose carefully.
        </p>
      </div>
    </div>
  );
}
