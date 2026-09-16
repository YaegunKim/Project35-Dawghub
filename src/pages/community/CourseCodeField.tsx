import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '../../design-system/Input/Input'
import { client } from '../../lib/amplifyClient'
import { S } from './CourseCodeField.style'

type Props = {
  value: string
  onChange: (courseCode: string) => void
}

const MAX_SUGGESTIONS = 8
const DEBOUNCE_MS = 300

// Typeahead for attaching a real course code to a Classes-board post, backed by the
// same searchUgaClasses query the Schedule tab's "search and add a class" flow uses —
// this is a lighter, purpose-built combobox rather than reusing Schedule's own search UI
// (which is bundled into a much larger add-to-schedule flow this post composer doesn't
// need, ai/SPEC.md §3.4).
export function CourseCodeField({ value, onChange }: Props) {
  const { t } = useTranslation()
  const [query, setQuery] = useState(value)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!query.trim() || query === value) {
      setSuggestions([])
      return
    }
    const timer = setTimeout(() => {
      client.queries
        .searchUgaClasses({ query: query.trim() })
        .then(({ data }) => {
          const codes = Array.from(
            new Set(
              (data ?? [])
                .map((meeting) => meeting?.courseCode)
                .filter((code): code is string => !!code),
            ),
          ).slice(0, MAX_SUGGESTIONS)
          setSuggestions(codes)
        })
        .catch(() => setSuggestions([]))
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query, value])

  function select(code: string) {
    onChange(code)
    setQuery(code)
    setOpen(false)
  }

  function clear() {
    onChange('')
    setQuery('')
  }

  return (
    <S.Wrap>
      <Input
        placeholder={t('community.classes.courseSearchPlaceholder')}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          if (value) onChange('')
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 100)}
      />
      {value && (
        <S.Attached>
          {value}
          <S.RemoveButton type="button" onClick={clear} aria-label={t('schedule.close')}>
            ×
          </S.RemoveButton>
        </S.Attached>
      )}
      {open && suggestions.length > 0 && (
        <S.List>
          {suggestions.map((code) => (
            <S.Option key={code} onMouseDown={(event) => { event.preventDefault(); select(code) }}>
              {code}
            </S.Option>
          ))}
        </S.List>
      )}
    </S.Wrap>
  )
}
