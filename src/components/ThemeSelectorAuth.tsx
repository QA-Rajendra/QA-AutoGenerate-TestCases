import { JSX } from "react";
import { useAuthTheme, AuthTheme, THEME_COLORS } from "../contexts/ThemeContext";

export default function ThemeSelectorAuth(): JSX.Element {
  const { authTheme, setAuthTheme } = useAuthTheme();
  const themes: AuthTheme[] = ["blue", "purple", "cyan", "indigo", "emerald", "rose"];
  const themeLabels: Record<AuthTheme, string> = {
    blue: "Ocean",
    purple: "Midnight",
    cyan: "Sky",
    indigo: "Royal",
    emerald: "Forest",
    rose: "Sunset"
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-full shadow-lg border border-white/20 dark:border-slate-700/50 p-2 flex gap-2">
        {themes.map((theme) => {
          const colors = THEME_COLORS[theme];
          const gradientClass = `bg-gradient-to-r ${colors.from} ${colors.to}`;
          return (
            <button
              key={theme}
              onClick={() => setAuthTheme(theme)}
              title={themeLabels[theme]}
              className={`w-8 h-8 rounded-full transition-all duration-200 ${
                authTheme === theme
                  ? "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-800 scale-110"
                  : "hover:scale-110"
              } ${gradientClass} cursor-pointer`}
            />
          );
        })}
      </div>
    </div>
  );
}
