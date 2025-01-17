import { ReactNode } from 'react'

type LabelProps = {
  label: string
  children?: ReactNode
}

export function Label(props: LabelProps) {
  return (
    <div>
      <label>{props.label}</label>
      {props.children}
    </div>
  )
} 