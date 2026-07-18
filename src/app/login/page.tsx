"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Eye, EyeOff, Loader2, Star, CheckCircle2 } from "lucide-react";

const TESTIMONIALS = [
  { quote: "Booked a badminton court in 30 seconds. No calls, no hassle — just played.", name: "Arjun Mehta", role: "Regular player, Bangalore", emoji: "🏸" },
  { quote: "Finally no double booking drama. The slot I pick stays mine.", name: "Priya Nair", role: "Cricket enthusiast, Hyderabad", emoji: "🏏" },
];

const AUTH_ERRORS: Record<string, string> = {
  OAuthAccountNotLinked: "This email is registered with a password. Please log in with email & password instead.",
  OAuthSignin: "Google sign-in failed. Please try again.",
  OAuthCallback: "Google sign-in failed. Please try again.",
  Callback: "Sign-in failed. Please try again.",
  Default: "Something went wrong. Please try again.",
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "" });

  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError) setError(AUTH_ERRORS[urlError] ?? AUTH_ERRORS.Default);
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Invalid email or password.");
    } else {
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      const role = session?.user?.role;
      router.push(role === "OWNER" ? "/owner/dashboard" : "/dashboard");
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
        {/* Background decoration */}
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
            Your next game is<br />
            <span className="gradient-text">one tap away.</span>
          </h2>
          <p className="text-muted-foreground mb-10">
            1,200+ venues. Instant confirmation. No phone calls.
          </p>

          {/* Feature list */}
          <div className="space-y-4 mb-10">
            {[
              "Real-time slot availability across 12 cities",
              "Instant UPI payment — no prepaid credits needed",
              "Booking ID on your phone in seconds",
              "Cancel anytime before the slot starts",
            ].map((f) => (
              <div key={f} className="flex items-center gap-3 text-sm">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="text-foreground/80">{f}</span>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="rounded-2xl border border-border bg-secondary/30 p-5">
            <div className="flex gap-0.5 mb-3">
              {[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />)}
            </div>
            <p className="text-sm text-foreground/80 italic mb-4 leading-relaxed">
              &quot;{TESTIMONIALS[0].quote}&quot;
            </p>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center text-base">
                {TESTIMONIALS[0].emoji}
              </div>
              <div>
                <div className="text-sm font-semibold">{TESTIMONIALS[0].name}</div>
                <div className="text-xs text-muted-foreground">{TESTIMONIALS[0].role}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats footer */}
        <div className="relative z-10 flex gap-8 text-sm border-t border-border pt-6">
          <div>
            <div className="text-xl font-bold text-foreground">1,200+</div>
            <div className="text-muted-foreground text-xs mt-0.5">Venues listed</div>
          </div>
          <div>
            <div className="text-xl font-bold text-foreground">50K+</div>
            <div className="text-muted-foreground text-xs mt-0.5">Bookings made</div>
          </div>
          <div>
            <div className="text-xl font-bold text-foreground">4.8★</div>
            <div className="text-muted-foreground text-xs mt-0.5">Average rating</div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link href="/" className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">Nex<span className="text-primary">Arc</span></span>
          </Link>

          <h1 className="text-3xl font-bold mb-1">Welcome back</h1>
          <p className="text-muted-foreground mb-8">Log in to book your next game</p>

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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="h-11 bg-secondary/50 border-border focus:border-primary"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  className="h-11 bg-secondary/50 border-border focus:border-primary pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log in"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary font-semibold hover:underline">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
