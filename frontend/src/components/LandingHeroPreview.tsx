/**
 * Hero preview: styled dashboard mockup with 3D tilt and indigo glow.
 * Decorative only — shows header, sidebars, and a minimal graph in the center.
 */

export function LandingHeroPreview() {
  // Dense graph layout (percent of center area): hierarchical + cross-links
  const nodes: [number, number][] = [
    [50, 12],
    [28, 22],
    [52, 20],
    [75, 24],
    [18, 32],
    [35, 30],
    [48, 28],
    [62, 26],
    [78, 32],
    [12, 42],
    [25, 40],
    [38, 38],
    [52, 36],
    [68, 38],
    [82, 40],
    [8, 52],
    [22, 50],
    [35, 48],
    [48, 46],
    [62, 50],
    [75, 48],
    [88, 52],
    [18, 60],
    [32, 58],
    [45, 56],
    [55, 58],
    [70, 60],
    [28, 68],
    [42, 66],
    [58, 68],
    [72, 70],
    [38, 76],
    [52, 74],
    [65, 78],
  ]
  const edges: [number, number][] = [
    [0, 1],
    [0, 2],
    [0, 3],
    [1, 4],
    [1, 5],
    [2, 5],
    [2, 6],
    [2, 7],
    [3, 7],
    [3, 8],
    [4, 9],
    [4, 10],
    [5, 10],
    [5, 11],
    [6, 11],
    [6, 12],
    [7, 12],
    [7, 13],
    [8, 13],
    [8, 14],
    [9, 15],
    [10, 15],
    [10, 16],
    [11, 16],
    [11, 17],
    [12, 17],
    [12, 18],
    [13, 18],
    [13, 19],
    [14, 19],
    [14, 20],
    [15, 21],
    [16, 21],
    [16, 22],
    [17, 22],
    [17, 23],
    [18, 23],
    [18, 24],
    [19, 24],
    [19, 25],
    [20, 25],
    [20, 26],
    [21, 27],
    [22, 27],
    [22, 28],
    [23, 28],
    [23, 29],
    [24, 29],
    [24, 30],
    [25, 30],
    [26, 30],
    [27, 31],
    [28, 31],
    [28, 32],
    [29, 32],
    [29, 33],
    [30, 33],
    [5, 12],
    [11, 18],
    [17, 23],
    [22, 28],
  ]

  return (
    <div
      className="relative flex justify-center w-full max-w-lg lg:max-w-xl mx-auto"
      aria-hidden="true"
    >
      {/* Blob blur behind image */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        aria-hidden="true"
      >
        <div className="absolute w-80 h-80 rounded-full bg-indigo-500/20 dark:bg-indigo-400/10 blur-3xl" />
        <div className="absolute w-64 h-64 rounded-full bg-violet-500/15 dark:bg-violet-400/10 blur-3xl translate-x-8 -translate-y-4" />
      </div>
      <div
        className="relative z-10 w-full perspective-[1000px]"
        style={{ perspective: '1000px' }}
      >
        <div className="relative w-full">
          <div
            className="relative w-full overflow-hidden rounded-xl border border-indigo-200/50 dark:border-indigo-500/30 bg-white dark:bg-slate-900/90 shadow-xl transition-transform duration-300 hover:scale-[1.02] hover:shadow-2xl"
            style={{
              aspectRatio: '16/10',
              transform: 'rotateX(6deg) rotateY(-8deg)',
              boxShadow:
                '0 0 0 1px rgba(99, 102, 241, 0.2), 0 0 24px rgba(99, 102, 241, 0.4), 0 25px 50px -12px rgba(99, 102, 241, 0.25), 0 0 40px rgba(99, 102, 241, 0.15), 0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
          {/* Title bar — macOS-style window controls */}
          <div className="flex items-center gap-3 h-9 pl-3 pr-4 border-b border-gray-200 dark:border-white/5 bg-gray-100/90 dark:bg-slate-800/90">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57] shadow-sm" aria-hidden />
              <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e] shadow-sm" aria-hidden />
              <span className="w-2.5 h-2.5 rounded-full bg-[#28c840] shadow-sm" aria-hidden />
            </div>
            <p className="text-[10px] font-medium text-gray-500 dark:text-slate-400 truncate min-w-0">
              Dependency Visualizer
            </p>
          </div>

          {/* Body: three columns */}
          <div className="flex flex-1 min-h-0" style={{ height: 'calc(100% - 2.25rem)' }}>
            {/* Left sidebar ~15% */}
            <div className="w-[15%] shrink-0 border-r border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-slate-800/50 flex flex-col gap-1 p-1.5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-2 rounded bg-gray-200 dark:bg-slate-700"
                  style={{ width: `${60 + i * 15}%` }}
                />
              ))}
            </div>

            {/* Center ~60% — graph */}
            <div className="flex-1 relative min-w-0 bg-slate-100 dark:bg-slate-800/80">
              {/* Graph tab pill */}
              <div className="absolute top-1.5 left-2 flex gap-0.5 rounded-md bg-slate-200/80 dark:bg-slate-700/80 p-0.5">
                <div className="h-1.5 w-8 rounded-sm bg-indigo-500 dark:bg-indigo-400" />
                <div className="h-1.5 w-6 rounded-sm bg-transparent" />
              </div>
              {/* Nodes and edges (SVG overlay) */}
              <svg
                className="absolute inset-0 w-full h-full"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient
                    id="hero-edge-gradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0.3" />
                  </linearGradient>
                </defs>
                {/* Edges */}
                {edges.map(([a, b], i) => {
                  const [x1, y1] = nodes[a]
                  const [x2, y2] = nodes[b]
                  return (
                    <line
                      key={i}
                      x1={`${x1}%`}
                      y1={`${y1}%`}
                      x2={`${x2}%`}
                      y2={`${y2}%`}
                      stroke="url(#hero-edge-gradient)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  )
                })}
                {/* Nodes */}
                {nodes.map(([x, y], i) => (
                  <circle
                    key={i}
                    cx={`${x}%`}
                    cy={`${y}%`}
                    r="4"
                    className="fill-indigo-500 dark:fill-indigo-400 stroke-white dark:stroke-slate-800"
                    strokeWidth="1"
                  />
                ))}
              </svg>
            </div>

            {/* Right sidebar ~25% */}
            <div className="w-[25%] shrink-0 border-l border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-slate-800/50 flex flex-col gap-2 p-2">
              <div className="h-3 w-full rounded bg-gray-200 dark:bg-slate-700" />
              <div className="h-2 w-4/5 rounded bg-gray-200 dark:bg-slate-700" />
              <div className="h-2 w-full rounded bg-gray-200 dark:bg-slate-700" />
              <div className="h-2 w-3/4 rounded bg-gray-200 dark:bg-slate-700" />
            </div>
          </div>
          </div>
          {/* Reflection: scaleY(-1) + mask for shiny surface effect */}
          <div
            className="absolute left-0 right-0 top-full mt-0.5 h-[38%] overflow-hidden rounded-b-xl pointer-events-none bg-white dark:bg-slate-900"
            style={{
              transform: 'scaleY(-1)',
              WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.45), transparent)',
              maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.45), transparent)',
            }}
          />
        </div>
      </div>
    </div>
  )
}
