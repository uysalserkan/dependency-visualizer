/**
 * Supported languages as text pills. Grayscale by default, language color on hover.
 */

const LANGUAGES = [
  { name: 'Python', hoverColor: '#3776ab' },
  { name: 'JavaScript', hoverColor: '#f7df1e' },
  { name: 'TypeScript', hoverColor: '#3178c6' },
  { name: 'Go', hoverColor: '#00add8' },
  { name: 'Java', hoverColor: '#ed8b00' },
] as const

export function LandingLanguageLogos() {
  return (
    <>
      {LANGUAGES.map(({ name, hoverColor }) => (
        <span
          key={name}
          className="inline-flex items-center rounded-full border border-gray-200/80 dark:border-white/10 bg-gray-100/80 dark:bg-slate-800/50 px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-slate-400 opacity-90 transition-all duration-200 hover:opacity-100 hover:border-gray-300 dark:hover:border-white/20 hover:[color:var(--pill-hover)]"
          style={{ ['--pill-hover' as string]: hoverColor } as React.CSSProperties}
        >
          {name}
        </span>
      ))}
    </>
  )
}
