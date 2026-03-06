import { useState, useCallback, useRef } from 'react'

export function usePanZoom(initialZoom = 1) {
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(initialZoom)
  const panning = useRef(null)

  const onBgMouseDown = useCallback(e => {
    if (e.button !== 0) return
    panning.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
  }, [pan])

  const onMouseMove = useCallback(e => {
    if (!panning.current) return
    setPan({ x: e.clientX - panning.current.x, y: e.clientY - panning.current.y })
  }, [])

  const onMouseUp = useCallback(() => { panning.current = null }, [])

  const onWheel = useCallback((e, svgRect) => {
    e.preventDefault()
    const factor = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(z => {
      const nz = Math.min(4, Math.max(0.1, z * factor))
      // Zoom toward cursor
      const cx = e.clientX - svgRect.left
      const cy = e.clientY - svgRect.top
      setPan(p => ({
        x: cx - (cx - p.x) * (nz / z),
        y: cy - (cy - p.y) * (nz / z),
      }))
      return nz
    })
  }, [])

  const reset = useCallback(() => { setPan({ x: 0, y: 0 }); setZoom(1) }, [])

  return { pan, setPan, zoom, setZoom, onBgMouseDown, onMouseMove, onMouseUp, onWheel, reset, isPanning: () => !!panning.current }
}
