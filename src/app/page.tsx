import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/layout/Navbar";
import { ArrowRight, MapPin, CalendarCheck, Zap, Star, ChevronRight, Shield, Clock, IndianRupee } from "lucide-react";

const sports = [
  { name: "Cricket",    emoji: "🏏", venues: "240+", value: "CRICKET" },
  { name: "Football",   emoji: "⚽", venues: "180+", value: "FOOTBALL" },
  { name: "Badminton",  emoji: "🏸", venues: "320+", value: "BADMINTON" },
  { name: "Tennis",     emoji: "🎾", venues: "150+", value: "TENNIS" },
  { name: "Turf",       emoji: "🟢", venues: "200+", value: "TURF" },
  { name: "Basketball", emoji: "🏀", venues: "90+",  value: "BASKETBALL" },
];

const steps = [
  {
    icon: MapPin,
    title: "Find nearby venues",
    desc: "Search by sport and location. See real-time availability without making a single call.",
  },
  {
    icon: CalendarCheck,
    title: "Pick your slot",
    desc: "Live calendar shows exactly what's open. Select your date and time in seconds.",
  },
  {
    icon: Zap,
    title: "Pay & play",
    desc: "Confirm with UPI instantly. Booking ID on your phone — just show up and play.",
  },
];

const stats = [
  { value: "1,200+", label: "Venues listed" },
  { value: "50,000+", label: "Bookings made" },
  { value: "4.8★", label: "Average rating" },
  { value: "12", label: "Cities covered" },
];

const features = [
  { icon: Shield, title: "Instant confirmation", desc: "No waiting for callbacks. Your slot is locked the moment you pay." },
  { icon: Clock,  title: "Real-time availability", desc: "Live slot calendar — see what's open right now, not yesterday's data." },
  { icon: IndianRupee, title: "UPI payments", desc: "Pay instantly with any UPI app. No card required, no hidden fees." },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-primary/8 blur-[140px]" />
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          <Badge
            variant="secondary"
            className="mb-6 gap-1.5 border border-primary/30 bg-primary/10 text-primary px-4 py-1.5 text-sm font-medium"
          >
            <Zap className="h-3.5 w-3.5" />
            Instant sports venue booking
          </Badge>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.08] mb-6">
            Book your game.{" "}
            <span className="gradient-text">Skip the call.</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Discover cricket grounds, badminton courts, football turfs and more near you.
            Real-time availability. Instant confirmation. No waiting.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/venues">
              <Button size="lg" className="h-12 px-8 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
                Browse Venues
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/signup?role=owner">
              <Button size="lg" variant="outline" className="h-12 px-8 text-base font-semibold border-border hover:bg-secondary">
                List your venue
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="flex -space-x-2">
              {["🧑", "👩", "👨", "🧑"].map((e, i) => (
                <div key={i} className="h-8 w-8 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-xs">
                  {e}
                </div>
              ))}
            </div>
            <span>Joined by <strong className="text-foreground">10,000+</strong> players this month</span>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-border/50 bg-secondary/30 py-10 px-6">
        <div className="mx-auto max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-bold text-primary">{s.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Sports grid */}
      <section id="sports" className="py-20 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Every sport, one platform</h2>
            <p className="text-muted-foreground text-lg">Find the right venue for every game you love</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {sports.map((sport) => (
              <Link
                key={sport.name}
                href={`/venues?sport=${sport.value}`}
                className="group rounded-xl border border-border bg-card p-5 text-center hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
              >
                <div className="text-4xl mb-3">{sport.emoji}</div>
                <div className="font-semibold text-sm">{sport.name}</div>
                <div className="text-xs text-primary mt-1">{sport.venues} venues</div>
              </Link>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link href="/venues">
              <Button variant="outline" className="border-border hover:bg-secondary">
                View all venues <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Why NexArc */}
      <section className="py-20 px-6 bg-secondary/20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Why players love NexArc</h2>
            <p className="text-muted-foreground text-lg">No phone calls. No double bookings. Just play.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-border bg-card p-7 hover:border-primary/30 transition-colors">
                <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Book in under 60 seconds</h2>
            <p className="text-muted-foreground text-lg">Three steps between you and the game</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <div key={step.title} className="rounded-2xl border border-border bg-card p-7 relative">
                <div className="absolute top-6 right-6 text-4xl font-black text-primary/10 select-none">
                  {i + 1}
                </div>
                <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
                  <step.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">
                  Step {i + 1}
                </div>
                <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-16 px-6 bg-secondary/20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="flex justify-center mb-4">
            {[1,2,3,4,5].map(i => <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />)}
          </div>
          <blockquote className="text-2xl font-medium text-foreground mb-6 leading-relaxed">
            "Finally, no more calling 5 different turfs. Found a slot, paid, got the confirmation. Played within the hour."
          </blockquote>
          <div className="flex items-center justify-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-lg">🏸</div>
            <div className="text-left">
              <div className="font-semibold text-sm">Priya Nair</div>
              <div className="text-xs text-muted-foreground">Badminton player, Hyderabad</div>
            </div>
          </div>
        </div>
      </section>

      {/* Owner CTA */}
      <section id="owners" className="py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-3xl border border-border bg-card p-10 md:p-16 text-center relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-primary/5 blur-[80px]" />
            </div>
            <div className="relative">
              <Badge variant="secondary" className="mb-5 border border-primary/30 bg-primary/10 text-primary">
                For venue owners
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Replace your register with a{" "}
                <span className="gradient-text">digital dashboard</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
                Manage all your courts, slots, and bookings from one place. No more phone calls,
                no more double bookings, no more guesswork.
              </p>
              <div className="flex flex-wrap gap-4 justify-center mb-8 text-sm">
                {["Real-time slot calendar", "UPI payment collection", "Occupancy analytics", "Multiple court management"].map((f) => (
                  <div key={f} className="flex items-center gap-1.5 text-muted-foreground">
                    <Star className="h-3.5 w-3.5 text-primary fill-primary" />
                    {f}
                  </div>
                ))}
              </div>
              <Link href="/signup?role=owner">
                <Button size="lg" className="font-semibold px-8 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
                  List your venue free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/30 py-10 px-6">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
              <Zap className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="font-bold">Nex<span className="text-primary">Arc</span></span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 NexArc. Built for players, by players.</p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
