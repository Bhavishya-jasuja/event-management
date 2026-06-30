"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Zap, Menu, X } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useState } from "react";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-6 flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-md shadow-primary/20">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            Nex<span className="text-primary">Arc</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <Link href="/venues" className="hover:text-foreground transition-colors font-medium">Find Venues</Link>
          <Link href="/#how-it-works" className="hover:text-foreground transition-colors">How it works</Link>
          <Link href="/#owners" className="hover:text-foreground transition-colors">List your venue</Link>
        </div>

        {/* Desktop auth buttons */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground font-medium">
              Log in
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-sm shadow-primary/20">
              Get started
            </Button>
          </Link>
        </div>

        {/* Mobile: theme toggle + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-border bg-background/98 backdrop-blur-xl px-6 py-4 space-y-1">
          <Link href="/venues" onClick={() => setMenuOpen(false)}
            className="flex items-center h-10 px-3 rounded-lg text-sm font-medium text-foreground hover:bg-secondary/60 transition-colors">
            Find Venues
          </Link>
          <Link href="/#how-it-works" onClick={() => setMenuOpen(false)}
            className="flex items-center h-10 px-3 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors">
            How it works
          </Link>
          <Link href="/#owners" onClick={() => setMenuOpen(false)}
            className="flex items-center h-10 px-3 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors">
            List your venue
          </Link>
          <div className="pt-3 pb-1 border-t border-border flex flex-col gap-2">
            <Link href="/login" onClick={() => setMenuOpen(false)}>
              <Button variant="outline" className="w-full border-border">Log in</Button>
            </Link>
            <Link href="/signup" onClick={() => setMenuOpen(false)}>
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">Get started</Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
