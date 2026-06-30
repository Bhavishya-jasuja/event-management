"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, CalendarCheck, BarChart3, Zap, LogOut, PlusCircle, CalendarRange, User } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/ThemeToggle";

const navItems = [
  { href: "/owner/dashboard", label: "Dashboard",       icon: LayoutDashboard },
  { href: "/owner/venues",    label: "My Venues",       icon: Building2 },
  { href: "/owner/bookings",  label: "Bookings",        icon: CalendarCheck },
  { href: "/owner/slots",     label: "Slot Management", icon: CalendarRange },
  { href: "/owner/analytics", label: "Analytics",       icon: BarChart3 },
  { href: "/owner/profile",   label: "Profile",         icon: User },
];

export default function OwnerSidebar({ ownerName }: { ownerName: string }) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-sidebar border-r border-sidebar-border flex flex-col z-40">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <div>
            <span className="font-bold text-sm">Nex<span className="text-primary">Arc</span></span>
            <div className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[100px]">{ownerName}</div>
          </div>
        </div>
        <ThemeToggle />
      </div>

      {/* Add venue CTA */}
      <div className="px-3 pt-3">
        <Link
          href="/owner/venues/new"
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg bg-primary/15 border border-primary/25 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          Add New Venue
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 mt-2 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-primary/15 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              )}>
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors w-full"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </div>
    </aside>
  );
}
