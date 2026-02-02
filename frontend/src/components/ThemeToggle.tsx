import { Moon, Sun } from 'lucide-react'
import { useThemeStore } from '@/stores/themeStore'

export function ThemeToggle() {
  const { isDark, toggleTheme } = useThemeStore()

  return (
    <button
      onClick={toggleTheme}
      className="p-2.5 rounded-xl bg-white/10 dark:bg-white/10 hover:bg-white/20 dark:hover:bg-white/20 transition-all duration-300 backdrop-blur-xl border border-white/10"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-gray-900 dark:text-gray-300" />
      ) : (
        <Moon className="w-4 h-4 text-gray-600" />
      )}
    </button>
  )
}
