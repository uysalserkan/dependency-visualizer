import { createContext, useContext } from 'react'

export interface EdgeBundlingContextValue {
  bundledPaths: Map<string, string> | null
}

export const EdgeBundlingContext = createContext<EdgeBundlingContextValue>({
  bundledPaths: null,
})

export function useEdgeBundling() {
  return useContext(EdgeBundlingContext)
}
