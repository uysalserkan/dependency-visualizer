import { createContext, useContext } from 'react'

export interface ViewportLODContextValue {
  zoom: number
}

const defaultZoom = 1

export const ViewportLODContext = createContext<ViewportLODContextValue>({
  zoom: defaultZoom,
})

export function useViewportLOD(): ViewportLODContextValue {
  return useContext(ViewportLODContext)
}

export function useViewportZoom(): number {
  const { zoom } = useViewportLOD()
  return typeof zoom === 'number' ? zoom : defaultZoom
}
