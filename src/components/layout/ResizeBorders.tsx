import { getCurrentWindow } from '@tauri-apps/api/window'

import type { AppPlatform } from '@/types'

type ResizeDirection =
  | 'East'
  | 'North'
  | 'NorthEast'
  | 'NorthWest'
  | 'South'
  | 'SouthEast'
  | 'SouthWest'
  | 'West'

interface ResizeBordersProps {
  platform: AppPlatform
}

const handles: Array<{
  direction: ResizeDirection
  className: string
}> = [
  { direction: 'North', className: 'absolute inset-x-2 top-0 h-1 cursor-n-resize' },
  { direction: 'South', className: 'absolute inset-x-2 bottom-0 h-1 cursor-s-resize' },
  { direction: 'East', className: 'absolute inset-y-2 right-0 w-1 cursor-e-resize' },
  { direction: 'West', className: 'absolute inset-y-2 left-0 w-1 cursor-w-resize' },
  { direction: 'NorthEast', className: 'absolute right-0 top-0 h-3 w-3 cursor-ne-resize' },
  { direction: 'NorthWest', className: 'absolute left-0 top-0 h-3 w-3 cursor-nw-resize' },
  { direction: 'SouthEast', className: 'absolute bottom-0 right-0 h-3 w-3 cursor-se-resize' },
  { direction: 'SouthWest', className: 'absolute bottom-0 left-0 h-3 w-3 cursor-sw-resize' },
]

export function ResizeBorders({ platform }: ResizeBordersProps) {
  if (platform !== 'linux') {
    return null
  }

  const startResize = async (direction: ResizeDirection) => {
    try {
      await getCurrentWindow().startResizeDragging(direction)
    } catch (error) {
      console.warn('Resize dragging unavailable', error)
    }
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[10]">
      {handles.map((handle) => (
        <div
          key={handle.direction}
          className={`pointer-events-auto ${handle.className}`}
          onMouseDown={(event) => {
            event.preventDefault()
            void startResize(handle.direction)
          }}
        />
      ))}
    </div>
  )
}
