import { apiClient } from '@/lib/api-client'

export interface PlayerStat {
  id: number
  first_name: string
  second_name: string
  web_name: string
  team_name: string
  gameweek: number
  event_points: number
  position: string
  minutes: number
  expected_goals_conceded: number
  defensive_contribution: number
  clean_sheets: number
  expected_assists: number
  expected_goals: number
  goals_scored: number
  assists: number
  expected_goal_involvements: number
}

export interface AnalyseResponse {
  past_gameweeks: number[]
  next_gameweek: number | null
  player_stats: Record<string, PlayerStat[]>
}

export async function fetchSeasons(signal?: AbortSignal): Promise<string[]> {
  const response = await apiClient.get<string[]>('/seasons', { signal })
  return response.data
}

export async function fetchAnalyse(
  season: string,
  signal?: AbortSignal
): Promise<AnalyseResponse> {
  const response = await apiClient.get<AnalyseResponse>('/analyse', {
    params: { season },
    signal,
  })
  return response.data
}
