import { ReactNode } from 'react'

type DrawerProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  placement?: 'left' | 'right'
  className?: string
  children?: ReactNode
}

export function Drawer(props: DrawerProps) {
  if (!props.open) return null
  
  return (
    <div className={props.className}>
      {props.children}
    </div>
  )
} 