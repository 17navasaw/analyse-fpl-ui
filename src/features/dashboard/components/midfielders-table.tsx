import { useState, useMemo } from 'react'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CaretSortIcon,
} from '@radix-ui/react-icons'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { DataTablePagination } from '@/components/data-table-pagination'
import { type AnalyseResponse, type PlayerStat } from '../api/analyse'

export interface AggregatedPlayerStatMidfielder {
  id: number
  web_name: string
  team_name: string
  event_points: number
  minutes: number
  defensive_contribution: number
  clean_sheets: number
  expected_assists: number
  expected_goals: number
  goals_scored: number
  assists: number
  expected_goal_involvements: number
  gameweek_count: number
  custom_score: number
}

interface MidfieldersTableProps {
  data: AnalyseResponse | undefined
  isLoading: boolean
  error: Error | null
}

export function MidfieldersTable({ data, isLoading, error }: MidfieldersTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortColumn, setSortColumn] = useState<keyof AggregatedPlayerStatMidfielder | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selectedGameweeks, setSelectedGameweeks] = useState<string>('all')
  const [minMinutes, setMinMinutes] = useState<string>('45')
  const [customScoreNumerator, setCustomScoreNumerator] = useState<string>('event_points')
  const [customScoreDenominator, setCustomScoreDenominator] = useState<string>('minutes')

  // Available numeric columns for custom score calculation
  const numericColumns: Array<{
    key: keyof AggregatedPlayerStatMidfielder
    label: string
  }> = [
    { key: 'event_points', label: 'Event Points (Avg)' },
    { key: 'minutes', label: 'Minutes (Avg)' },
    { key: 'defensive_contribution', label: 'Defensive Contribution (Avg)' },
    { key: 'clean_sheets', label: 'Clean Sheets (Avg)' },
    { key: 'expected_assists', label: 'Expected Assists (Avg)' },
    { key: 'expected_goals', label: 'Expected Goals (Avg)' },
  ]

  // Filter, aggregate player_stats for Defender positions
  const midfielderStats = useMemo(() => {
    if (!data?.player_stats || !data?.past_gameweeks) return []
    
    // Determine which gameweeks to include
    let gameweeksToInclude: number[] = []
    if (selectedGameweeks === 'all') {
      gameweeksToInclude = data.past_gameweeks
    } else {
      const numGameweeks = parseInt(selectedGameweeks, 10)
      // Get the last X gameweeks (most recent first)
      gameweeksToInclude = data.past_gameweeks.slice(0, numGameweeks)
    }
    
    // Filter player_stats to only include selected gameweeks
    const allStats: PlayerStat[] = []
    Object.values(data.player_stats).forEach((stats) => {
      // Filter stats by gameweek
      const relevantStats = stats.filter((stat) =>
        gameweeksToInclude.includes(stat.gameweek)
      )
      allStats.push(...relevantStats)
    })
    
    const midfielderStats = allStats.filter(
      (stat) => stat.position === 'MID' || stat.position === 'Midfielder'
    )

    // Group by player id and calculate averages
    const playerMap = new Map<number, {
      id: number
      web_name: string
      team_name: string
      event_points: number[]
      minutes: number[]
      defensive_contribution: number[]
      clean_sheets: number[]
      expected_assists: number[]
      expected_goals: number[]
      goals_scored: number[]
      assists: number[]
      expected_goal_involvements: number[]
    }>()

    midfielderStats.forEach((stat) => {
      const existing = playerMap.get(stat.id)
      if (existing) {
        existing.event_points.push(stat.event_points)
        existing.minutes.push(stat.minutes)
        existing.defensive_contribution.push(stat.defensive_contribution)
        existing.clean_sheets.push(stat.clean_sheets)
        existing.expected_assists.push(stat.expected_assists)
        existing.expected_goals.push(stat.expected_goals)
        existing.goals_scored.push(stat.goals_scored)
        existing.assists.push(stat.assists)
        existing.expected_goal_involvements.push(stat.expected_goal_involvements)
      } else {
        playerMap.set(stat.id, {
          id: stat.id,
          web_name: stat.web_name,
          team_name: stat.team_name,
          event_points: [stat.event_points],
          minutes: [stat.minutes],
          defensive_contribution: [stat.defensive_contribution],
          clean_sheets: [stat.clean_sheets],
          expected_assists: [stat.expected_assists],
          expected_goals: [stat.expected_goals],
          goals_scored: [stat.goals_scored],
          assists: [stat.assists],
          expected_goal_involvements: [stat.expected_goal_involvements],
        })
      }
    })

    // Calculate averages for each player
    const aggregated: AggregatedPlayerStatMidfielder[] = Array.from(playerMap.values()).map((player) => {
      const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)
      const avg = (arr: number[]) => sum(arr) / arr.length

      const playerData = {
        id: player.id,
        web_name: player.web_name,
        team_name: player.team_name,
        event_points: Number(avg(player.event_points).toFixed(2)),
        minutes: Number(avg(player.minutes).toFixed(2)),
        defensive_contribution: Number(avg(player.defensive_contribution).toFixed(2)),
        clean_sheets: Number(avg(player.clean_sheets).toFixed(2)),
        expected_assists: Number(avg(player.expected_assists).toFixed(2)),
        expected_goals: Number(avg(player.expected_goals).toFixed(2)),
        gameweek_count: player.event_points.length,
        custom_score: 0,
        goals_scored: Number(avg(player.goals_scored).toFixed(2)),
        assists: Number(avg(player.assists).toFixed(2)),
        expected_goal_involvements: Number(avg(player.expected_goal_involvements).toFixed(2)),
      }

      // Calculate custom score if both numerator and denominator are selected
      if (customScoreNumerator && customScoreDenominator) {
        const numerator = playerData[customScoreNumerator as keyof AggregatedPlayerStatMidfielder] as number
        const denominator = playerData[customScoreDenominator as keyof AggregatedPlayerStatMidfielder] as number
        playerData.custom_score =
          denominator !== 0 ? Number((numerator / denominator).toFixed(4)) : 0
      }

      return playerData
    })

    // Filter out players with average minutes below minimum
    const minMinutesValue = parseFloat(minMinutes) || 45
    return aggregated.filter((player) => player.minutes >= minMinutesValue)
  }, [data, selectedGameweeks, minMinutes, customScoreNumerator, customScoreDenominator])

  // Calculate 90th percentile for each numeric field
  const PERCENTILE_TO_HIGHLIGHT = 0.9
  const percentiles = useMemo(() => {
    if (midfielderStats.length === 0) return {}

    const numericFields: (keyof AggregatedPlayerStatMidfielder)[] = [
      'event_points',
      'minutes',
      'goals_scored',
      'assists',
      'expected_goal_involvements',
      'defensive_contribution',
      'clean_sheets',
      'expected_assists',
      'expected_goals',
      'custom_score',
    ]

    const fieldsToSortReverse: Record<keyof AggregatedPlayerStatMidfielder, boolean> = {
      'event_points': false,
      'minutes': false,
      'goals_scored': false,
      'assists': false,
      'expected_goal_involvements': false,
      'defensive_contribution': false,
      'clean_sheets': false,
      'expected_assists': false,
      'expected_goals': false,
      'custom_score': false,
      'gameweek_count': false,
      'id': false,
      'web_name': false,
      'team_name': false,
    }

    const result: Record<string, number> = {}

    numericFields.forEach((field) => {
      const values = midfielderStats
        .map((stat) => stat[field] as number)
        .filter((v) => typeof v === 'number' && !isNaN(v))
        .sort((a, b) => fieldsToSortReverse[field] ? b - a : a - b)

      if (values.length > 0) {
        const index = Math.ceil(values.length * PERCENTILE_TO_HIGHLIGHT) - 1
        result[field] = values[Math.max(0, index)]
      }
    })

    return result
  }, [midfielderStats])

  // Helper function to check if value is at or above 90th percentile
  const isAtOrAbove90thPercentile = (
    field: keyof AggregatedPlayerStatMidfielder,
    value: number,
    lowerIsBetter: boolean = false,
  ): boolean => {
    const percentile = percentiles[field]
    return percentile !== undefined && (lowerIsBetter ? value <= percentile : value >= percentile)
  }

  // Sort the data
  const sortedMidfielderStats = useMemo(() => {
    if (!sortColumn) return midfielderStats

    return [...midfielderStats].sort((a, b) => {
      const aValue = a[sortColumn]
      const bValue = b[sortColumn]

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      return 0
    })
  }, [midfielderStats, sortColumn, sortDirection])

  // Calculate pagination
  const totalPages = Math.ceil(sortedMidfielderStats.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedMidfielderStats = sortedMidfielderStats.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const handleSort = (column: keyof AggregatedPlayerStatMidfielder) => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // Set new column and default to ascending
      setSortColumn(column)
      setSortDirection('asc')
    }
    // Reset to first page when sorting changes
    setCurrentPage(1)
  }

  const getSortIcon = (column: keyof AggregatedPlayerStatMidfielder) => {
    if (sortColumn !== column) {
      return <CaretSortIcon className='ms-2 h-4 w-4 opacity-50' />
    }
    return sortDirection === 'asc' ? (
      <ArrowUpIcon className='ms-2 h-4 w-4' />
    ) : (
      <ArrowDownIcon className='ms-2 h-4 w-4' />
    )
  }

  return (
    <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
      <Card className='col-span-1 lg:col-span-7'>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle>Midfielders</CardTitle>
            <div className='flex items-center gap-4'>
              <div className='flex items-center gap-2'>
                <label className='text-sm text-muted-foreground'>
                  Gameweeks:
                </label>
                <Select
                  value={selectedGameweeks}
                  onValueChange={(value) => {
                    setSelectedGameweeks(value)
                    setCurrentPage(1) // Reset to first page when changing gameweeks
                  }}
                >
                  <SelectTrigger className='w-full max-w-48'>
                    <SelectValue placeholder='Select gameweeks' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All Gameweeks</SelectItem>
                    {data?.past_gameweeks &&
                      Array.from(
                        { length: data.past_gameweeks.length },
                        (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>
                            Past {i + 1} Gameweek{i === 0 ? '' : 's'}
                          </SelectItem>
                        )
                      )}
                  </SelectContent>
                </Select>
              </div>
              <div className='flex items-center gap-2'>
                <label className='text-sm text-muted-foreground'>
                  Min Minutes:
                </label>
                <Input
                  type='number'
                  value={minMinutes}
                  onChange={(e) => {
                    setMinMinutes(e.target.value)
                    setCurrentPage(1) // Reset to first page when changing filter
                  }}
                  placeholder='45'
                  className='w-20'
                  min='0'
                />
              </div>
              <div className='flex items-center gap-2'>
                <label className='text-sm text-muted-foreground'>
                  Custom Score:
                </label>
                <Select
                  value={customScoreNumerator}
                  onValueChange={(value) => {
                    setCustomScoreNumerator(value)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className='w-full max-w-48'>
                    <SelectValue placeholder='Numerator' />
                  </SelectTrigger>
                  <SelectContent>
                    {numericColumns.map((col) => (
                      <SelectItem key={col.key} value={col.key}>
                        {col.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className='text-sm text-muted-foreground'>/</span>
                <Select
                  value={customScoreDenominator}
                  onValueChange={(value) => {
                    setCustomScoreDenominator(value)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className='w-full max-w-48'>
                    <SelectValue placeholder='Denominator' />
                  </SelectTrigger>
                  <SelectContent>
                    {numericColumns.map((col) => (
                      <SelectItem key={col.key} value={col.key}>
                        {col.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className='text-center text-muted-foreground py-4'>
              Loading...
            </div>
          ) : error ? (
            <div className='text-center text-destructive py-4'>
              Error loading data
            </div>
          ) : sortedMidfielderStats.length === 0 ? (
            <div className='text-center text-muted-foreground py-4'>
              No defender stats available
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='sticky left-0 z-10 bg-background border-r'>
                      <button
                        onClick={() => handleSort('web_name')}
                        className='flex items-center gap-2 hover:text-foreground transition-colors cursor-pointer'
                      >
                        Web Name
                        {getSortIcon('web_name')}
                      </button>
                    </TableHead>
                    <TableHead className='sticky left-[100px] z-10 bg-background border-r'>
                      <button
                        onClick={() => handleSort('team_name')}
                        className='flex items-center gap-2 hover:text-foreground transition-colors cursor-pointer'
                      >
                        Team Name
                        {getSortIcon('team_name')}
                      </button>
                    </TableHead>
                    {customScoreNumerator && customScoreDenominator && (
                      <TableHead>
                        <button
                          onClick={() => handleSort('custom_score')}
                          className='flex items-center gap-2 hover:text-foreground transition-colors cursor-pointer'
                        >
                          Custom Score
                          {getSortIcon('custom_score')}
                        </button>
                      </TableHead>
                    )}
                    <TableHead>
                      <button
                        onClick={() => handleSort('event_points')}
                        className='flex items-center gap-2 hover:text-foreground transition-colors cursor-pointer'
                      >
                        Event Points (Avg)
                        {getSortIcon('event_points')}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('minutes')}
                        className='flex items-center gap-2 hover:text-foreground transition-colors cursor-pointer'
                      >
                        Minutes (Avg)
                        {getSortIcon('minutes')}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('goals_scored')}
                        className='flex items-center gap-2 hover:text-foreground transition-colors cursor-pointer'
                      >
                        Goals Scored (Avg)
                        {getSortIcon('goals_scored')}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('assists')}
                        className='flex items-center gap-2 hover:text-foreground transition-colors cursor-pointer'
                      >
                        Assists (Avg)
                        {getSortIcon('assists')}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('expected_goal_involvements')}
                        className='flex items-center gap-2 hover:text-foreground transition-colors cursor-pointer'
                      >
                        Expected Goal Involvements (Avg)
                        {getSortIcon('expected_goal_involvements')}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('defensive_contribution')}
                        className='flex items-center gap-2 hover:text-foreground transition-colors cursor-pointer'
                      >
                        Defensive Contribution (Avg)
                        {getSortIcon('defensive_contribution')}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('clean_sheets')}
                        className='flex items-center gap-2 hover:text-foreground transition-colors cursor-pointer'
                      >
                        Clean Sheets (Avg)
                        {getSortIcon('clean_sheets')}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('expected_assists')}
                        className='flex items-center gap-2 hover:text-foreground transition-colors cursor-pointer'
                      >
                        Expected Assists (Avg)
                        {getSortIcon('expected_assists')}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('expected_goals')}
                        className='flex items-center gap-2 hover:text-foreground transition-colors cursor-pointer'
                      >
                        Expected Goals (Avg)
                        {getSortIcon('expected_goals')}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('gameweek_count')}
                        className='flex items-center gap-2 hover:text-foreground transition-colors cursor-pointer'
                      >
                        Gameweeks
                        {getSortIcon('gameweek_count')}
                      </button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedMidfielderStats.map((stat) => (
                    <TableRow key={stat.id}>
                      <TableCell className='sticky left-0 z-10 bg-background border-r'>{stat.web_name}</TableCell>
                      <TableCell className='sticky left-[100px] z-10 bg-background border-r'>{stat.team_name}</TableCell>
                      {customScoreNumerator && customScoreDenominator && (
                        <TableCell
                          className={
                            isAtOrAbove90thPercentile('custom_score', stat.custom_score)
                              ? 'text-red-500'
                              : ''
                          }
                        >
                          {stat.custom_score}
                        </TableCell>
                      )}
                      <TableCell
                        className={
                          isAtOrAbove90thPercentile('event_points', stat.event_points)
                            ? 'text-red-500'
                            : ''
                        }
                      >
                        {stat.event_points}
                      </TableCell>
                      <TableCell
                        className={
                          isAtOrAbove90thPercentile('minutes', stat.minutes)
                            ? 'text-red-500'
                            : ''
                        }
                      >
                        {stat.minutes}
                      </TableCell>
                      <TableCell
                        className={
                          isAtOrAbove90thPercentile('goals_scored', stat.goals_scored)
                            ? 'text-red-500'
                            : ''
                        }
                      >
                        {stat.goals_scored}
                      </TableCell>
                      <TableCell
                        className={
                          isAtOrAbove90thPercentile('assists', stat.assists)
                            ? 'text-red-500'
                            : ''
                        }
                      >
                        {stat.assists}
                      </TableCell>
                      <TableCell
                        className={
                          isAtOrAbove90thPercentile('expected_goal_involvements', stat.expected_goal_involvements)
                            ? 'text-red-500'
                            : ''
                        }
                      >
                        {stat.expected_goal_involvements}
                      </TableCell>
                      <TableCell
                        className={
                          isAtOrAbove90thPercentile(
                            'defensive_contribution',
                            stat.defensive_contribution
                          )
                            ? 'text-red-500'
                            : ''
                        }
                      >
                        {stat.defensive_contribution}
                      </TableCell>
                      <TableCell
                        className={
                          isAtOrAbove90thPercentile('clean_sheets', stat.clean_sheets)
                            ? 'text-red-500'
                            : ''
                        }
                      >
                        {stat.clean_sheets}
                      </TableCell>
                      <TableCell
                        className={
                          isAtOrAbove90thPercentile(
                            'expected_assists',
                            stat.expected_assists
                          )
                            ? 'text-red-500'
                            : ''
                        }
                      >
                        {stat.expected_assists}
                      </TableCell>
                      <TableCell
                        className={
                          isAtOrAbove90thPercentile('expected_goals', stat.expected_goals)
                            ? 'text-red-500'
                            : ''
                        }
                      >
                        {stat.expected_goals}
                      </TableCell>
                      <TableCell>{stat.gameweek_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <DataTablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                onPageSizeChange={setPageSize}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
