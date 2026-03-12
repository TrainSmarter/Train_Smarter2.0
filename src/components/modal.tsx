"use client"

import * as React from "react"
import { AlertTriangle, Info } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

/**
 * Modal — wraps shadcn Dialog with size presets and backdrop blur.
 *
 * Sizes: sm (400px), md (500px), lg (640px), xl (768px), full (95vw)
 * Features: backdrop blur, ESC closes, focus trap (via Radix)
 */

const sizeClasses: Record<string, string> = {
  sm: "max-w-[400px]",
  md: "max-w-[500px]",
  lg: "max-w-[640px]",
  xl: "max-w-[768px]",
  full: "max-w-[95vw] h-[90vh]",
}

export interface ModalProps {
  /** Controlled open state */
  open?: boolean
  /** Callback when open state changes (or modal closes) */
  onOpenChange?: (open: boolean) => void
  /** Size preset */
  size?: "sm" | "md" | "lg" | "xl" | "full"
  /** Modal title (required for accessibility) */
  title: string
  /** Optional description below the title */
  description?: string
  /** Modal body content */
  children: React.ReactNode
  /** Footer content (e.g. action buttons) */
  footer?: React.ReactNode
  /** Optional trigger element */
  trigger?: React.ReactNode
  /** Additional className for the content container */
  className?: string
}

function Modal({
  open,
  onOpenChange,
  size = "md",
  title,
  description,
  children,
  footer,
  trigger,
  className,
}: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className={cn(
          sizeClasses[size],
          size === "full" && "overflow-y-auto",
          className
        )}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        <div className="py-2">{children}</div>
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}
Modal.displayName = "Modal"

/**
 * ConfirmDialog — a specialized Modal for confirmation actions.
 *
 * Shows an icon background, title, message, and confirm/cancel buttons.
 * Variants: primary (info style) and danger (destructive style).
 */

export interface ConfirmDialogProps {
  /** Controlled open state */
  open?: boolean
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void
  /** Visual variant */
  variant?: "primary" | "danger"
  /** Dialog title */
  title: string
  /** Descriptive message */
  message: string
  /** Confirm button label */
  confirmLabel?: string
  /** Cancel button label */
  cancelLabel?: string
  /** Callback when user confirms */
  onConfirm?: () => void
  /** Callback when user cancels */
  onCancel?: () => void
  /** Whether the confirm action is in progress */
  loading?: boolean
}

function ConfirmDialog({
  open,
  onOpenChange,
  variant = "primary",
  title,
  message,
  confirmLabel = "Bestätigen",
  cancelLabel = "Abbrechen",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  const isDanger = variant === "danger"

  const handleCancel = () => {
    onCancel?.()
    onOpenChange?.(false)
  }

  const handleConfirm = () => {
    onConfirm?.()
  }

  const IconComponent = isDanger ? AlertTriangle : Info

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px]">
        <div className="flex flex-col items-center gap-4 pt-2 text-center">
          {/* Icon with background */}
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full",
              isDanger
                ? "bg-error-light text-error dark:bg-error/20"
                : "bg-info-light text-info dark:bg-info/20"
            )}
            aria-hidden="true"
          >
            <IconComponent className="h-6 w-6" />
          </div>

          <DialogHeader className="space-y-2">
            <DialogTitle className="text-center">{title}</DialogTitle>
            <DialogDescription className="text-center">
              {message}
            </DialogDescription>
          </DialogHeader>
        </div>

        <DialogFooter className="mt-4 flex-row gap-2 sm:justify-center">
          <DialogClose asChild>
            <Button variant="outline" onClick={handleCancel}>
              {cancelLabel}
            </Button>
          </DialogClose>
          <Button
            variant={isDanger ? "destructive" : "default"}
            onClick={handleConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
ConfirmDialog.displayName = "ConfirmDialog"

export { Modal, ConfirmDialog }
