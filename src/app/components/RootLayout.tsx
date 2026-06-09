import { useState, useEffect } from 'react';
import { Outlet } from 'react-router';
import { Navbar } from './Navbar';

export function RootLayout() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Check for saved theme preference or default to light
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar theme={theme} onThemeToggle={toggleTheme} />
      <main className="container mx-auto px-4 py-8 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}