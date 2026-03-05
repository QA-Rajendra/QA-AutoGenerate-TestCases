import { useState } from 'react';
import { useAuthTheme, AuthTheme, THEME_COLORS } from '../contexts/ThemeContext';

export default function ThemeToggle(): JSX.Element {
  const { authTheme, setAuthTheme } = useAuthTheme();
  const [isOpen, setIsOpen] = useState(false);

  const themes: AuthTheme[] = ['blue', 'purple', 'cyan', 'indigo', 'emerald', 'rose'];
  const themeIcons: Record<AuthTheme, string> = {
    blue: '🔵',
    purple: '🟣',
    cyan: '🔷',
    indigo: '🟦',
    emerald: '💚',
    rose: '🌹',
  };

  const themeLabels: Record<AuthTheme, string> = {
    blue: 'Blue',
    purple: 'Purple',
    cyan: 'Cyan',
    indigo: 'Indigo',
    emerald: 'Emerald',
    rose: 'Rose',
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="btn btn-g" 
        title="Change theme"
        style={{ position: 'relative' }}
      >
        {themeIcons[authTheme]} {authTheme.charAt(0).toUpperCase() + authTheme.slice(1)}
      </button>
      
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: 4,
          backgroundColor: 'var(--card)',
          border: `1px solid var(--border)`,
          borderRadius: 6,
          padding: '4px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          zIndex: 1000,
          minWidth: 140,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}>
          {themes.map(t => (
            <button
              key={t}
              onClick={() => {
                setAuthTheme(t);
                setIsOpen(false);
              }}
              style={{
                padding: '8px 12px',
                border: authTheme === t ? `2px solid var(--accent)` : `1px solid var(--border)`,
                backgroundColor: authTheme === t ? 'var(--highlight)' : 'transparent',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: 'var(--text)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                const btn = e.currentTarget as HTMLButtonElement;
                if (authTheme !== t) {
                  btn.style.borderColor = 'var(--accent)';
                  btn.style.backgroundColor = 'var(--accentDim)';
                }
              }}
              onMouseLeave={(e) => {
                const btn = e.currentTarget as HTMLButtonElement;
                if (authTheme !== t) {
                  btn.style.borderColor = 'var(--border)';
                  btn.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span style={{ fontSize: 14 }}>{themeIcons[t]}</span>
              {themeLabels[t]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
