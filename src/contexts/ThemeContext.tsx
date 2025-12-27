import { createContext, useContext, useEffect, useState } from "react";
import type React from "react";

interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Initialize with default value (SSR-safe)
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Client-side initialization - check localStorage and system preference
  useEffect(() => {
    const stored = localStorage.getItem("dark-mode");
    if (stored !== null) {
      setIsDarkMode(stored === "true");
    } else if (window.matchMedia) {
      setIsDarkMode(window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("dark-mode", isDarkMode.toString());

    // Apply dark class to html element for global styling
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
