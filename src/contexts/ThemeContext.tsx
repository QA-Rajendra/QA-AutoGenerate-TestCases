import { createContext, useContext, useState, useEffect, ReactNode, JSX } from "react";

export type AuthTheme = "blue" | "purple" | "cyan" | "indigo" | "emerald" | "rose";

interface ThemeContextType {
  authTheme: AuthTheme;
  setAuthTheme: (theme: AuthTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  const [authTheme, setAuthTheme] = useState<AuthTheme>(() => {
    const saved = localStorage.getItem("authTheme") as AuthTheme | null;
    return saved || "blue";
  });

  useEffect(() => {
    localStorage.setItem("authTheme", authTheme);
  }, [authTheme]);

  return (
    <ThemeContext.Provider value={{ authTheme, setAuthTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAuthTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useAuthTheme must be used within ThemeProvider");
  }
  return context;
}

export const THEME_COLORS: Record<AuthTheme, { from: string; to: string; accent: string; hover: string }> = {
  blue: {
    from: "from-blue-500",
    to: "to-cyan-500",
    accent: "focus:ring-blue-500",
    hover: "hover:from-blue-600 hover:to-cyan-600"
  },
  purple: {
    from: "from-purple-500",
    to: "to-pink-500",
    accent: "focus:ring-purple-500",
    hover: "hover:from-purple-600 hover:to-pink-600"
  },
  cyan: {
    from: "from-cyan-500",
    to: "to-blue-500",
    accent: "focus:ring-cyan-500",
    hover: "hover:from-cyan-600 hover:to-blue-600"
  },
  indigo: {
    from: "from-indigo-500",
    to: "to-purple-500",
    accent: "focus:ring-indigo-500",
    hover: "hover:from-indigo-600 hover:to-purple-600"
  },
  emerald: {
    from: "from-emerald-500",
    to: "to-teal-500",
    accent: "focus:ring-emerald-500",
    hover: "hover:from-emerald-600 hover:to-teal-600"
  },
  rose: {
    from: "from-rose-500",
    to: "to-orange-500",
    accent: "focus:ring-rose-500",
    hover: "hover:from-rose-600 hover:to-orange-600"
  }
};
