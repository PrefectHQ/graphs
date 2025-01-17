type ButtonGroupProps = {
  value: string
  onChange: (value: any) => void
  options: readonly string[]
  small?: boolean
}

export function ButtonGroup(props: ButtonGroupProps) {
  return (
    <div>
      {props.options.map(option => (
        <button
          key={option}
          onClick={() => props.onChange(option)}
          className={props.value === option ? 'active' : ''}
        >
          {option}
        </button>
      ))}
    </div>
  )
} 