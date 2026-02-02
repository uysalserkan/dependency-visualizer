# Frontend Architecture Report

**Scope:** `frontend/` — Import Visualizer UI  
**Stack:** React 18, TypeScript, Vite 6, Tailwind CSS, Zustand, TanStack Query, Cytoscape.js, urql/GraphQL (unused)

---

## 1. Structure & Architecture

**Layout:**
- **Entry:** `main.tsx` → `App.tsx` (no router; single-page flow)
- **Components:** `src/components/` — 10 feature components (ProjectSelector, GraphVisualization, ControlPanel, MetricsPanel, InsightsPanel, ExportButton, CodePreview, Comparison, FilePreviewModal, ThemeToggle)
- **State:** `src/stores/` — Zustand stores (`graphStore`, `themeStore`)
- **Data:** `src/lib/` — REST client (`api.ts`), GraphQL client (`graphql.ts`), `utils.ts` (cn)
- **Types:** `src/types/api.ts` — shared API types
- **Hooks:** `src/hooks/` — `useAnalysis`, `useWebSocket`, `useKeyboardShortcuts`

**Assessment:**
- Clear separation: components, hooks, stores, lib, types.
- No routing: single view with conditional render on `analysis` (project selector vs. graph view). Acceptable for current scope; add a router if you add multiple top-level pages.
- `App.tsx` is large and mixes layout with feature lists; consider extracting a `LandingContent` and `DashboardLayout` for readability.

---

## 2. Tech Stack & Dependencies

| Area        | Choice              | Notes                                      |
|------------|---------------------|--------------------------------------------|
| Framework  | React 18             | Current, no issues.                        |
| Build      | Vite 6               | Fast, path alias `@/*` → `./src/*`.        |
| Language   | TypeScript 5.7       | Strict mode, path mapping.                 |
| Styling    | Tailwind 3 + CSS vars| Semantic tokens (primary, background…).   |
| State      | Zustand              | Lightweight, good fit.                     |
| Server state | TanStack Query    | Used for mutations (analyze) and queries (insights). |
| Graph      | Cytoscape + cola     | Layout and rendering.                     |
| GraphQL    | urql + graphql       | **Defined but unused** (see §6).          |

**Config:**
- `tsconfig.json`: strict, ESNext, path `@/*`; `vite-env.d.ts` for Vite client types.
- `vite.config.ts`: React plugin, `@` alias, dev proxy `/api` → backend (env `VITE_API_URL`).
- `tailwind.config.js`: class-based dark mode, semantic colors from CSS variables.

**Gaps:**
- No React Router (fine for single view).
- No E2E/testing stack referenced in scripts (only `lint`).
- GraphQL client and queries are never imported; REST is used everywhere.

---

## 3. Components & Patterns

**Strengths:**
- Functional components + hooks; Zustand selectors used correctly (`useGraphStore((s) => s.analysis)`).
- Shared `cn()` from `lib/utils.ts` (clsx + tailwind-merge) for class names; CVA is in deps but not used in sampled files.
- Lucide icons used consistently.
- Dark mode via `dark:` and theme store with persistence.

**Patterns:**
- **ProjectSelector:** local state + `useAnalyzeProject()` mutation, writes result to `graphStore`.
- **GraphVisualization:** Cytoscape in `useEffect`, refs for container and cy instance; reads layout/filter from store.
- **InsightsPanel:** `useQuery` for insights; loading/empty handled.

**Gaps:**
- **Accessibility:** No `aria-*` or role usage in sampled components; keyboard focus for graph nodes not verified. Buttons and inputs are native, which helps.
- **Error boundaries:** No React error boundary in `main.tsx` or `App.tsx`; a failing component can blank the page.
- **Loading UX:** ProjectSelector shows "Analyzing..." but the main content area has no global loading/skeleton when `analysis` is being set.
- **Reuse:** Some duplicated card/panel styling; no shared `Card` or `Panel` component.

**Recommendations:**
- Add an error boundary around the main content (e.g. in `App.tsx`).
- Introduce a small `Card` (and optionally `Panel`) that use `cn()` and semantic classes.
- Add `aria-live`/`aria-busy` and a visible loading state for the analyze action (e.g. skeleton where the graph will appear).

---

## 4. API Integration

**REST (`src/lib/api.ts`):**
- Base URL: `/api` (relative; relies on Vite proxy or same-origin in prod).
- Methods: `analyzeProject`, `getAnalysis`, `deleteAnalysis`, `getFilePreview`, `exportGraph`, `getInsights`.
- Error handling: `response.ok` check, `response.json().catch(() => ({ detail: 'Unknown error' }))`, throw `Error(error.detail)`.
- No centralized retry or timeout; no request/response interceptors.

**Types (`src/types/api.ts`):**
- Interfaces align with REST usage: `AnalysisResult`, `Node`, `Edge`, `GraphMetrics`, `FilePreview`, `AnalyzeRequest`, etc.
- **InsightsResponse mismatch:** Backend returns `health_score`, `health_status`, `issues`, `recommendations`, `statistics`. Frontend types and `InsightsPanel` expect `insights` (array) and `summary` (object). So `insights.insights` and `insights.summary` are undefined; health score and raw `recommendations` may work if backend recommendation dicts match `{ title, description, priority }`. **Action:** Align backend response with frontend (`insights` + `summary`) or adapt frontend to consume `issues` and `statistics`.

**TanStack Query:**
- `useAnalyzeProject()` in `ProjectSelector`; success writes to Zustand.
- `InsightsPanel` uses `useQuery(['insights', analysis?.id], ...)` with `api.getInsights(analysis.id)`.
- No explicit `useQuery` for the main analysis in the graph view (data comes from store after mutation).

**WebSocket (`useWebSocket.ts`):**
- Connects to `WS_URL/api/ws/${clientId}`; used for real-time updates (e.g. analysis progress). Ref and timeout typed as `ReturnType<typeof setTimeout>` (browser-safe).

**Recommendations:**
- Fix Insights API contract: either backend adds `insights`/`summary` or frontend maps `issues`/`statistics` into the shape `InsightsPanel` expects.
- Optionally add a thin API layer (e.g. axios or fetch wrapper) with base URL from env, timeouts, and a single place for error parsing.

---

## 5. Performance & DX

**Bundle:**
- Single entry; no route-based code splitting (no router).
- Cytoscape + cola are heavy; consider dynamic `import()` for the graph page if you add more top-level views.
- Vite build output: one main chunk; chunk size warning in build is expected without splitting.

**DX:**
- Path alias `@/*` works in TS and Vite.
- Strict TypeScript and ESLint; Prettier config present.
- No test script in `package.json`; no Vitest/Jest config in the listed tree.

**Recommendations:**
- Add Vitest (or Jest) + React Testing Library and a `test` script; at least smoke tests for `ProjectSelector` and store.
- If the app grows (e.g. multiple pages), add React Router and lazy-load the graph screen: `const GraphView = lazy(() => import('@/components/GraphView'))`.

---

## 6. Gaps & Prioritized Recommendations

### High priority
1. **Insights API contract** — Backend returns `issues` and `statistics`; frontend expects `insights` and `summary`. Update backend DTO or frontend types and `InsightsPanel` so the health panel works correctly. **Files:** `backend/app/api/models.py` (InsightsResponse), `backend/app/api/routes.py` (insights endpoint), `frontend/src/types/api.ts`, `frontend/src/components/InsightsPanel.tsx`.
2. **Error boundary** — Wrap main content in an error boundary so a single component failure doesn’t blank the app. **File:** `frontend/src/App.tsx` (or a new `ErrorBoundary.tsx` and use in `main.tsx`).

### Medium priority
3. **Remove or use GraphQL** — `src/lib/graphql.ts` and urql/graphql are unused; all data is REST. Either remove the GraphQL client and deps or add a feature that uses it (e.g. analysis by ID) and document the choice.
4. **Shared Card/Panel** — Extract a `Card` (and optionally `Panel`) component for the repeated white/dark card style to reduce duplication and standardize spacing.
5. **Loading state for analyze** — When analysis is in progress, show a skeleton or placeholder in the main area instead of only the button “Analyzing...”.

### Lower priority
6. **Tests** — Add Vitest + RTL, `test` script, and a few tests for critical paths (e.g. analyze flow, store updates).
7. **Accessibility** — Add `aria-*` and roles where needed (e.g. graph region, live region for status), and ensure keyboard navigation for the graph.
8. **API base URL** — Ensure production build uses `VITE_API_URL` for API and WebSocket (e.g. in `api.ts`, `useWebSocket.ts`) so it works when not using the dev proxy.

---

## File Reference Summary

| Path | Purpose |
|------|--------|
| `src/App.tsx` | Root layout, conditional project selector vs. dashboard |
| `src/main.tsx` | React root, QueryClientProvider |
| `src/stores/graphStore.ts` | Analysis, selected node, layout, filters |
| `src/stores/themeStore.ts` | Dark mode + persist |
| `src/lib/api.ts` | REST client |
| `src/lib/graphql.ts` | GraphQL client (unused) |
| `src/types/api.ts` | API types; InsightsResponse mismatched with backend |
| `src/components/InsightsPanel.tsx` | Consumes insights API; expects `insights`/`summary` |
| `src/hooks/useAnalysis.ts` | useAnalyzeProject mutation |
| `src/hooks/useWebSocket.ts` | WebSocket hook |
| `tailwind.config.js` | Theme, dark mode, semantic colors |
| `src/index.css` | CSS variables, Tailwind layers |
