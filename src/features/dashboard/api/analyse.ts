import { apiClient } from '@/lib/api-client'

export interface PlayerStat {
  id: number
  first_name: string
  second_name: string
  gameweek: number
  total_points: number
  position: string
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
