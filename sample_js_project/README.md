# Sample JavaScript/TypeScript Project

This is a sample project to demonstrate Import Visualizer's JavaScript/TypeScript support.

## Structure

```
sample_js_project/
├── src/
│   ├── components/
│   │   ├── Button.tsx      # Button component (imports helpers, logger)
│   │   ├── Card.tsx        # Card component (imports helpers)
│   │   └── index.ts        # Component exports
│   ├── utils/
│   │   ├── helpers.js      # Utility functions
│   │   ├── logger.ts       # Logger utility (imports config)
│   │   └── index.js        # Utils exports (index file)
│   └── main.ts             # Entry point (imports components, utils, config)
├── lib/
│   └── config.js           # Configuration
└── tsconfig.json           # Path aliases: @/ → src/, ~/lib/ → lib/

## Features Demonstrated

- ✅ **Relative imports**: `./components/Button`, `../utils/helpers`
- ✅ **Path aliases**: `@/utils/logger` (from tsconfig.json)
- ✅ **Index files**: `./utils` resolves to `./utils/index.js`
- ✅ **Mixed extensions**: `.js`, `.jsx`, `.ts`, `.tsx`
- ✅ **External packages**: `react` (shown as external node)

## Try It

1. Analyze with Import Visualizer (local path mode)
2. Click on nodes to see dependencies
3. Notice path alias resolution (`@/` → `src/`)
4. See index file resolution (`./utils` → `utils/index.js`)
