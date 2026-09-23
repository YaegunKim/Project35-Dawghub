import { useState } from 'react'
import { Input } from '../../design-system/Input/Input'
import { S } from './BuildingAutocomplete.style'

const MAX_SUGGESTIONS = 8

type BuildingAutocompleteProps = {
  value: string
  onChange: (value: string) => void
  buildingNames: string[]
  placeholder: string
  ariaLabel: string
}

// Replaces <input list="..."> + <datalist> for the Directions origin/destination fields —
// Chrome's native datalist popup ignores CSS (width/position are browser-controlled), which
// read as broken next to a bottom-docked sheet sized to match the input. This is a small
// self-contained combobox instead: a filtered list positioned to exactly the input's own width.
export function BuildingAutocomplete({ value, onChange, buildingNames, placeholder, ariaLabel }: BuildingAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  const query = value.trim().toLowerCase()
  const matches = query
    ? buildingNames.filter((name) => name.toLowerCase().includes(query)).slice(0, MAX_SUGGESTIONS)
    : []
  const showList = open && matches.length > 0

  function selectMatch(name: string) {
    onChange(name)
    setOpen(false)
    setHighlightedIndex(-1)
  }

  return (
    <S.Wrap>
      <Input
        placeholder={placeholder}
        aria-label={ariaLabel}
        value={value}
        role="combobox"
        aria-expanded={showList}
        aria-autocomplete="list"
        onChange={(event) => {
          onChange(event.target.value)
          setOpen(true)
          setHighlightedIndex(-1)
        }}
        onFocus={() => setOpen(true)}
        // A delay, not an immediate close — lets a suggestion's onMouseDown (which fires
        // before this blur) run first; without it, clicking a suggestion would close the list
        // before the click is ever registered.
        onBlur={() => setTimeout(() => setOpen(false), 100)}
        onKeyDown={(event) => {
          if (!showList) return
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setHighlightedIndex((index) => Math.min(index + 1, matches.length - 1))
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            setHighlightedIndex((index) => Math.max(index - 1, 0))
          } else if (event.key === 'Enter' && highlightedIndex >= 0) {
            event.preventDefault()
            selectMatch(matches[highlightedIndex])
          } else if (event.key === 'Escape') {
            setOpen(false)
          }
        }}
      />
      {showList && (
        <S.List role="listbox">
          {matches.map((name, index) => (
            <S.Option
              // Index, not just name — ugaBuildingsData.json has genuine same-name buildings
              // at different locations (e.g. more than one building literally named
              // "Greenhouse 1" on the agricultural side of campus), so name alone isn't unique.
              key={`${name}-${index}`}
              role="option"
              aria-selected={index === highlightedIndex}
              $highlighted={index === highlightedIndex}
              onMouseDown={(event) => {
                event.preventDefault()
                selectMatch(name)
              }}
            >
              {name}
            </S.Option>
          ))}
        </S.List>
      )}
    </S.Wrap>
  )
}
