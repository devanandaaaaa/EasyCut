import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const ThemeContext = createContext(null);

const STORAGE_KEY = "easycut-theme";

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEY);

    return savedTheme === "dark" ? "dark" : "cute";
  });

  useEffect(() => {
    const root = document.documentElement;

    root.setAttribute("data-theme", theme);

    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,

      isCute: theme === "cute",
      isDark: theme === "dark",

      setTheme,

      toggleTheme: () => {
        setTheme((currentTheme) =>
          currentTheme === "cute" ? "dark" : "cute"
        );
      },
    }),
    [theme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme must be used inside ThemeProvider"
    );
  }

  return context;
}