import { useCallback, useRef, useState } from 'react'

export interface Position {
  x: number
  y: number
}

export interface UseDraggableResult {
  position: Position
  isDragging: boolean
  handlePointerDown: (e: React.PointerEvent<HTMLElement>) => void
}

export function useDraggable(initialPosition?: Position): UseDraggableResult {
  const [position, setPosition] = useState<Position>(
    initialPosition ?? { x: 0, y: 0 },
  )
  const [isDragging, setIsDragging] = useState(false)

  const offsetRef = useRef<Position>({ x: 0, y: 0 })

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const panelWidth = 380
    const panelHeight = 520

    const rawX = e.clientX - offsetRef.current.x
    const rawY = e.clientY - offsetRef.current.y

    const clampedX = Math.max(0, Math.min(rawX, window.innerWidth - panelWidth))
    const clampedY = Math.max(0, Math.min(rawY, window.innerHeight - panelHeight))

    setPosition({ x: clampedX, y: clampedY })
  }, [])

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      setIsDragging(false)
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    },
    [handlePointerMove],
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      e.preventDefault()
      offsetRef.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      }
      setIsDragging(true)
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp as EventListener)
    },
    [position, handlePointerMove, handlePointerUp],
  )

  return { position, isDragging, handlePointerDown }
}
