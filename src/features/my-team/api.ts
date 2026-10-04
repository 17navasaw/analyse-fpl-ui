import { apiClient } from '@/lib/api-client'

export interface TeamSeasons {
  live_season: string
  seasons: { season: string; squad_available: boolean }[]
}
export interface Pick {
  id: number
  name: string
  club: string | null
  element_type: number | null
  position: number
  multiplier: number
  is_captain: boolean
  is_vice_captain: boolean
  price: number | null
  availability: string | null
  news: string | null
  season_points: number | null
}
export interface TeamSnapshot {
  status: 'ready' | 'no_published_squad' | 'season_unavailable'
  season: string
  fetched_at: string
  team: { id: number; name: string | null; manager: string | null } | null
  gameweek: number | null
  summary: {
    points: number | null
    rank: number | null
    total_points: number | null
    overall_rank: number | null
    value: number | null
    bank: number | null
    transfers: number | null
    transfer_cost: number | null
    bench_points: number | null
    active_chip: string | null
  } | null
  picks: Pick[]
  automatic_substitutions: { player_in: string; player_out: string }[]
}
export async function fetchTeamSeasons(signal?: AbortSignal) {
  return (await apiClient.get<TeamSeasons>('/team/seasons', { signal })).data
}
export async function fetchTeam(
  id: string,
  season: string,
  signal?: AbortSignal
) {
  return (
    await apiClient.get<TeamSnapshot>(`/team/${id}`, {
      params: { season },
      signal,
    })
  ).data
}
