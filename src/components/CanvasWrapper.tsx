'use client'

import { ReactFlowProvider } from 'reactflow'
import { Canvas } from './Canvas'
import { ErrorBoundary } from './ErrorBoundary'

interface CanvasWrapperProps {
  canvasId: string
  readOnly?: boolean
}

export function CanvasWrapper({ canvasId, readOnly = false }: CanvasWrapperProps) {
  // Force a new React Flow instance for each canvas
  return (
    <ErrorBoundary>
      <ReactFlowProvider key={`provider-${canvasId}`}>
        <Canvas key={`canvas-${canvasId}`} canvasId={canvasId} readOnly={readOnly} />
      </ReactFlowProvider>
    </ErrorBoundary>
  )
}