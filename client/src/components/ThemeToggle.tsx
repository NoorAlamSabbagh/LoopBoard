import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui';
import { useTheme } from '@/store/theme';

export function ThemeToggle({ className }: { className?: string }) {
  const mode = useTheme((s) => s.mode);
  const toggle = useTheme((s) => s.toggle);
  const dark = mode === 'dark';

  return (
    <Button
      variant="ghost"
      type="button"
      className={className}
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
