"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function LogoutButton({ variant = "outline" }: { variant?: "outline" | "ghost" }) {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <Button
      onClick={handleLogout}
      disabled={loading}
      variant={variant}
      size="sm"
      className="gap-2"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      {loading ? "Logging out..." : "Log out"}
    </Button>
  );
}
