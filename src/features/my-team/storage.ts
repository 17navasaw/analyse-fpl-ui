const STORAGE_KEY = 'analyse-fpl.team-ids'
export function validTeamId(value: string): boolean {
  return /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value))
}
function readIds(): Record<string, string> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return Object.fromEntries(
      Object.entries(value).filter(
        ([season, id]) =>
          /^\d{4}-\d{4}$/.test(season) &&
          typeof id === 'string' &&
          validTeamId(id)
      )
    )
  } catch {
    return {}
  }
}
export function savedTeamId(season: string) {
  return readIds()[season] ?? ''
}
export function saveTeamId(season: string, id: string | null) {
  try {
    const ids = readIds()
    if (id) ids[season] = id
    else delete ids[season]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    /* The page remains usable when browser storage is blocked. */
  }
}
