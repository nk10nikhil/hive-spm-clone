import { useRef, useEffect, useCallback } from 'react'
import vegaEmbed, { type Result, type VisualizationSpec, type EmbedOptions } from 'vega-embed'

interface VegaLiteChartProps {
  spec: VisualizationSpec
  className?: string
  options?: EmbedOptions
}

/**
 * React wrapper component for VegaLite charts using vega-embed.
 * Handles mounting, updating, and cleanup of Vega views.
 */
export function VegaLiteChart({ spec, className, options }: VegaLiteChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const vegaResultRef = useRef<Result | null>(null)

  const renderChart = useCallback(async () => {
    if (!containerRef.current || !spec) return

    // Cleanup previous render to prevent memory leaks
    if (vegaResultRef.current) {
      vegaResultRef.current.finalize()
      vegaResultRef.current = null
    }

    try {
      const result = await vegaEmbed(containerRef.current, spec, {
        actions: false,
        tooltip: { theme: 'dark' },
        ...options,
      })
      vegaResultRef.current = result
    } catch (error) {
      console.error('Failed to render VegaLite chart:', error)
    }
  }, [spec, options])

  useEffect(() => {
    renderChart()

    return () => {
      // Cleanup on unmount
      if (vegaResultRef.current) {
        vegaResultRef.current.finalize()
        vegaResultRef.current = null
      }
    }
  }, [renderChart])

  return <div ref={containerRef} className={className} />
}
