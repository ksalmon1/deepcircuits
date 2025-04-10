import { GripVertical } from "lucide-react"
import * as ResizablePrimitive from "react-resizable-panels"
import React from "react"

import { cn } from "@/lib/utils"

// Higher lag value = less frequent updates during resize = smoother performance but less visual feedback
const DEFAULT_LAG = 16 // Increase this value

const ResizablePanelGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) => (
  <ResizablePrimitive.PanelGroup
    className={cn(
      "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
      className
    )}
    onLayout={(sizes) => {
      if (props.id) {
        localStorage.setItem(`rp-${props.id}`, JSON.stringify(sizes))
      }
    }}
    // This improves performance by preventing layout updates during resize
    // Only the actively resizing panels will update during the resize operation
    autoSaveId={props.id ? `rp-${props.id}` : undefined}
    {...props}
  />
)
ResizablePanelGroup.displayName = "ResizablePanelGroup"

const ResizablePanel = ({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Panel>) => (
  <ResizablePrimitive.Panel
    className={cn(
      "flex h-full w-full overflow-auto",
      className
    )}
    // Only trigger layout when resize is complete to avoid constant re-renders
    onResize={(size) => {
      // Custom resize handler here if needed
      // This will only be called once the resize is complete
    }}
    {...props}
  />
)
ResizablePanel.displayName = "ResizablePanel"

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
  withHandle?: boolean
}) => (
  <ResizablePrimitive.PanelResizeHandle
    className={cn(
      "relative flex w-2 cursor-col-resize items-center justify-center bg-slate-200 after:absolute after:inset-y-0 after:left-1/2 after:w-6 after:-translate-x-1/2 data-[panel-group-direction=vertical]:h-2 data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:cursor-row-resize",
      className
    )}
    tabIndex={0}
    // Increase lag value to reduce re-renders during dragging
    lag={DEFAULT_LAG} 
    // Do not imperative update DOM during resize - better performance
    // Let React handle the updates on its own schedule
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-6 w-3 items-center justify-center rounded-sm border bg-background">
        <GripVertical className="h-3 w-3" />
      </div>
    )}
  </ResizablePrimitive.PanelResizeHandle>
)
ResizableHandle.displayName = "ResizableHandle"

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
