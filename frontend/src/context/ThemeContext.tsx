import React, { createContext, useContext, useEffect, useState } from 'react';
type Theme = 'light' | 'dark';
const Ctx = createContext<{ theme: Theme; setTheme: (t: Theme) => void; toggle: () => void } | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'));
  
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  return <Ctx.Provider value={{ theme, setTheme, toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark') }}>{children}</Ctx.Provider>;
};

export const useThemeCustom = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('ThemeProvider gerekli');
  return c;
};
