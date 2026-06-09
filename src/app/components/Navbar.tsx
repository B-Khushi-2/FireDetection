import { Moon, Sun } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { Button } from './ui/button';

interface NavbarProps {
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
}

export function Navbar({ theme, onThemeToggle }: NavbarProps) {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Navigation Links */}
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
              <Link to="/">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`relative px-3 sm:px-4 ${
                    isActive('/')
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="hidden sm:inline">Detection</span>
                  <span className="sm:hidden">Detect</span>
                </Button>
              </Link>
              <Link to="/history">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`relative px-3 sm:px-4 ${
                    isActive('/history')
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  History
                </Button>
              </Link>
            </div>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onThemeToggle}
              className="rounded-lg shrink-0"
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}