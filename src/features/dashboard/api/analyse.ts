import { apiClient } from '@/lib/api-client'

export interface PlayerStat {
  id: number
  first_name: string
  second_name: string
  web_name: string
  team_name: string
  gameweek: number
  total_points: number
  position: string
  minutes: number
  expected_goals_conceded: number
  defensive_contribution: number
  clean_sheets: number
  expected_assists: number
  expected_goals: number
}

export interface AnalyseResponse {
  past_gameweeks: number[]
  next_gameweek: number
  player_stats: Record<string, PlayerStat[]>
}

export async function fetchAnalyse(): Promise<AnalyseResponse> {
  const response = await apiClient.get<AnalyseResponse>('/analyse')
  return response.data
}
