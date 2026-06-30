"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
const KEY = "nexarc-theme";

function applyTheme(t: Theme) {
  if (t === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

const Ctx = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "light",
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    const initial: Theme = stored === "dark" ? "dark" : "light";
    setTheme(initial);
    applyTheme(initial);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem(KEY, next);
    applyTheme(next);
  }

  return <Ctx.Provider value={{ theme, toggle }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  return useContext(Ctx);
}
