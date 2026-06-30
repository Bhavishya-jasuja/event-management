"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Eye, EyeOff, Loader2, User, Building2, CheckCircle2, Trophy, Clock, IndianRupee } from "lucide-react";

type Role = "PLAYER" | "OWNER";

const PLAYER_BENEFITS = [
  { icon: Clock,         text: "Book any slot in under 60 seconds" },
  { icon: IndianRupee,   text: "Pay via UPI — no credit card needed" },
  { icon: Trophy,        text: "Booking ID instantly on your phone" },
  { icon: CheckCircle2,  text: "Cancel before slot starts, no questions asked" },
];

const OWNER_BENEFITS = [
  { icon: Clock,        text: "Go live and accept bookings same day" },
  { icon: IndianRupee,  text: "UPI payments directly to your account" },
  { icon: Trophy,       text: "Real-time occupancy & revenue analytics" },
  { icon: CheckCircle2, text: "Manage unlimited courts and slots" },
];

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole = (searchParams.get("role") === "owner" ? "OWNER" : "PLAYER") as Role;

  const [role, setRole] = useState<Role>(defaultRole);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const benefits = role === "PLAYER" ? PLAYER_BENEFITS : OWNER_BENEFITS;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setLoading(false);
        return;
      }

      await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      router.push(role === "OWNER" ? "/owner/dashboard" : "/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    await signIn("google", { callbackUrl: "/dashboard" });
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[45%] relative bg-card flex-col p-12 overflow-hidden border-r border-border">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 right-0 h-[300px] w-[300px] rounded-full bg-primary/8 blur-[100px]" />
          <div className="absolute bottom-0 left-0 h-[200px] w-[200px] rounded-full bg-primary/5 blur-[80px]" />
        </div>

        {/* Logo */}
        <Link href="/" className="relative flex items-center gap-2.5 z-10">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Zap className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">Nex<span className="text-primary">Arc</span></span>
        </Link>

        {/* Main content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center py-10">
          <h2 className="text-4xl font-bold mb-3 leading-tight">
            {role === "PLAYER"
              ? <>Your game, your<br /><span className="gradient-text">schedule.</span></>
              : <>Your venue, your<br /><span className="gradient-text">business.</span></>
            }
          </h2>
          <p className="text-muted-foreground mb-10">
            {role === "PLAYER"
              ? "Find available slots, pay instantly, and play — all in under 60 seconds."
              : "List your courts, manage bookings, and grow your revenue with zero hassle."
            }
          </p>

          {/* Benefits */}
          <div className="space-y-4">
            {benefits.map((b) => (
              <div key={b.text} className="flex items-center gap-3 text-sm">
                <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <b.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-foreground/80">{b.text}</span>
              </div>
            ))}
          </div>

          {/* Sport icons (player) / venue icons (owner) */}
          <div className="mt-10 flex gap-3">
            {role === "PLAYER"
              ? ["🏏", "⚽", "🏸", "🎾", "🏀", "🟢"].map((e) => (
                  <div key={e} className="h-10 w-10 rounded-xl bg-secondary/60 border border-border flex items-center justify-center text-xl">{e}</div>
                ))
              : ["📊", "📅", "💳", "🏆"].map((e) => (
                  <div key={e} className="h-10 w-10 rounded-xl bg-secondary/60 border border-border flex items-center justify-center text-xl">{e}</div>
                ))
            }
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 border-t border-border pt-6 text-sm text-muted-foreground">
          Trusted by players and venue owners across 12 cities in India.
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background overflow-y-auto">
        <div className="w-full max-w-md py-8">
          <Link href="/" className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">Nex<span className="text-primary">Arc</span></span>
          </Link>

          <h1 className="text-3xl font-bold mb-1">Create your account</h1>
          <p className="text-muted-foreground mb-6">Get started — it&apos;s free</p>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => setRole("PLAYER")}
              className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-all ${
                role === "PLAYER"
                  ? "border-primary bg-primary/10 text-foreground shadow-sm"
                  : "border-border text-muted-foreground hover:border-primary/30 hover:bg-secondary/50"
              }`}
            >
              <User className={`h-6 w-6 ${role === "PLAYER" ? "text-primary" : "text-muted-foreground"}`} />
              I&apos;m a Player
              <span className="text-xs font-normal opacity-70">Book venues</span>
            </button>
            <button
              type="button"
              onClick={() => setRole("OWNER")}
              className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-all ${
                role === "OWNER"
                  ? "border-primary bg-primary/10 text-foreground shadow-sm"
                  : "border-border text-muted-foreground hover:border-primary/30 hover:bg-secondary/50"
              }`}
            >
              <Building2 className={`h-6 w-6 ${role === "OWNER" ? "text-primary" : "text-muted-foreground"}`} />
              I&apos;m an Owner
              <span className="text-xs font-normal opacity-70">List venues</span>
            </button>
          </div>

          {/* Google */}
          <Button
            onClick={handleGoogle}
            disabled={googleLoading}
            variant="outline"
            className="w-full h-11 border-border hover:bg-secondary font-medium mb-6"
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            Continue with Google
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs text-muted-foreground">
              <span className="bg-background px-3">or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" type="text" placeholder="Arjun Mehta" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required className="h-11 bg-secondary/50 border-border focus:border-primary" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required className="h-11 bg-secondary/50 border-border focus:border-primary" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="Min. 8 characters"
                  value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required minLength={8} className="h-11 bg-secondary/50 border-border focus:border-primary pr-11" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading}
              className="w-full h-11 font-semibold bg-primary text-primary-foreground hover:bg-primary/90">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : `Create ${role === "OWNER" ? "owner" : "player"} account`}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">Log in</Link>
          </p>

          <p className="text-center text-xs text-muted-foreground mt-3">
            By signing up you agree to our{" "}
            <Link href="#" className="underline underline-offset-2 hover:text-foreground">Terms</Link>{" "}
            and{" "}
            <Link href="#" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
