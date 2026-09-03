import { S, type SegmentedControlVariant } from './SegmentedControl.style'

export type SegmentedControlOption<T extends string> = {
  value: T
  label: string
}

type SegmentedControlProps<T extends string> = {
  options: readonly SegmentedControlOption<T>[]
  value: T
  onChange: (value: T) => void
  // Escape hatch for a per-option color override (e.g. a "hide" option that should read as
  // dangerous once selected) — the flat options/value/onChange API covers the common case,
  // this covers the rest without needing a second component.
  getVariant?: (value: T, active: boolean) => SegmentedControlVariant
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  getVariant,
}: SegmentedControlProps<T>) {
  return (
    <S.Group>
      {options.map((option) => {
        const active = option.value === value
        const variant = getVariant ? getVariant(option.value, active) : 'accent'
        return (
          <S.Segment
            key={option.value}
            type="button"
            $active={active}
            $variant={variant}
            aria-pressed={active}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </S.Segment>
        )
      })}
    </S.Group>
  )
}
