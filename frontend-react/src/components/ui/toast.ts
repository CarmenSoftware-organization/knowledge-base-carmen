// Stub types for use-toast hook — full component ported in a later task.
import type * as React from 'react'

export type ToastProps = {
  id?: string
  variant?: 'default' | 'destructive'
  title?: React.ReactNode
  description?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

export type ToastActionElement = React.ReactElement
