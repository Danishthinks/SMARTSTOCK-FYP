import { useTheme } from "../ThemeContext";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle({ id = "themeToggleBtn", className = "", style = {} }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      <style>{`
        .theme-switch {
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }
        .theme-switch .switch-track {
          width: 46px;
          height: 26px;
          background: #cbd5e1;
          border-radius: 999px;
          position: relative;
          display: inline-block;
          border: 1px solid rgba(0, 0, 0, 0.06);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
        }
        .theme-switch .switch-thumb {
          width: 20px;
          height: 20px;
          background: #fff;
          border-radius: 50%;
          position: absolute;
          left: 3px;
          top: 3px;
          transition: all 220ms cubic-bezier(0.2, 0.9, 0.3, 1);
          box-shadow: 0 6px 16px rgba(2, 6, 23, 0.25);
        }
        [data-theme="dark"] .theme-switch .switch-track {
          background: #22304a;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        [data-theme="dark"] .theme-switch .switch-thumb {
          left: 23px;
        }
        #themeToggleBtn.theme-switch-init {
          display: inline-flex !important;
          align-items: center !important;
          gap: 8px !important;
          width: auto !important;
          background: transparent !important;
          border: none !important;
          color: inherit !important;
          padding: 6px !important;
          cursor: pointer !important;
        }
        .theme-icon {
          width: 14px;
          height: 14px;
          color: currentColor;
        }
        [data-theme="dark"] .theme-icon {
          color: white;
        }
      `}</style>
      <button
        id={id}
        onClick={toggleTheme}
        className={`theme-switch ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          width: 'auto',
          background: 'transparent',
          border: 'none',
          color: 'inherit',
          padding: '6px',
          cursor: 'pointer',
          ...style
        }}
      >
        <span style={{ fontSize: '13px', marginRight: '8px', opacity: 0.95, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          {theme === 'dark' ? (
            <>
              <Moon className="theme-icon" size={14} />
              <span>Dark</span>
            </>
          ) : (
            <>
              <Sun className="theme-icon" size={14} />
              <span>Light</span>
            </>
          )}
        </span>
        <span className="switch-track">
          <span className="switch-thumb"></span>
        </span>
      </button>
    </>
  );
}
