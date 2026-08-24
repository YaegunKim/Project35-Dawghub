const LIBCAL_GRID_URL = 'https://api3.libcal.com/widget/hours/grid?iid=4280&lid=0'

// UGA Libraries run every location's hours through one LibCal system (iid 4280) —
// each library's own /hours page (e.g. libs.uga.edu/main/hours) just embeds this
// same widget scoped to its lid, so one grid request covers all of them.
const LIBRARY_LOCATION_IDS: Record<string, number> = {
  'Main Library': 7558,
  'Shirley Mathis McBay Science Library': 7565,
  'Carnegie Library Learning Center': 7567,
  'Zell B. Miller Learning Center': 7716,
  'Richard B. Russell Jr. Special Collections': 7559,
  'Lamar Dodd School of Art': 7569,
  'Hugh Hodgson School of Music': 7568,
  'Aderhold Hall': 7581,
}

export type LibraryHoursToday = Record<string, string>

let cached: Promise<LibraryHoursToday> | null = null

export function fetchLibraryHoursToday(): Promise<LibraryHoursToday> {
  if (!cached) {
    cached = fetch(LIBCAL_GRID_URL)
      .then((response) => response.text())
      .then((html) => {
        const result: LibraryHoursToday = {}

        for (const [name, id] of Object.entries(LIBRARY_LOCATION_IDS)) {
          const rowMatch = html.match(new RegExp(`s-lc-whw-loc-tr-${id}\\b[\\s\\S]*?</tr>`))
          if (!rowMatch) continue

          const cellMatch = rowMatch[0].match(/class="s-lc-whw-today"[\s\S]*?<\/td>/)
          if (!cellMatch) continue

          if (/s-lc-closed/.test(cellMatch[0])) {
            result[name] = 'Closed'
            continue
          }

          const timeMatch = cellMatch[0].match(/<span class="s-lc-time[^"]*">([\s\S]*?)<\/span>/)
          if (timeMatch) {
            result[name] = timeMatch[1]
              .replace(/&ndash;/g, '–')
              .replace(/\s+/g, ' ')
              .trim()
          }
        }

        return result
      })
      .catch(() => ({}))
  }
  return cached
}
