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

export interface AggregatedPlayerStatDefender {
  id: number
  web_name: string
  team_name: string
  event_points: number
  minutes: number
  expected_goals_conceded: number
  defensive_contribution: number
  clean_sheets: number
  expected_assists: number
  expected_goals: number
  gameweek_count: number
  custom_score: number
}

interface DefendersTableProps {
  data: AnalyseResponse | undefined
  isLoading: boolean
  error: Error | null
}

export function DefendersTable({ data, isLoading, error }: DefendersTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortColumn, setSortColumn] = useState<keyof AggregatedPlayerStatDefender | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selectedGameweeks, setSelectedGameweeks] = useState<string>('all')
  const [minMinutes, setMinMinutes] = useState<string>('45')
  const [customScoreNumerator, setCustomScoreNumerator] = useState<string>('event_points')
  const [customScoreDenominator, setCustomScoreDenominator] = useState<string>('expected_goals_conceded')

  // Available numeric columns for custom score calculation
  const numericColumns: Array<{
    key: keyof AggregatedPlayerStatDefender
    label: string
  }> = [
    { key: 'event_points', label: 'Event Points (Avg)' },
    { key: 'minutes', label: 'Minutes (Avg)' },
    { key: 'expected_goals_conceded', label: 'Expected Goals Conceded (Avg)' },
    { key: 'defensive_contribution', label: 'Defensive Contribution (Avg)' },
    { key: 'clean_sheets', label: 'Clean Sheets (Avg)' },
    { key: 'expected_assists', label: 'Expected Assists (Avg)' },
    { key: 'expected_goals', label: 'Expected Goals (Avg)' },
  ]

  // Filter, aggregate player_stats for Defender positions
  const defenderStats = useMemo(() => {
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
    
    // Filter for Defender positions (DEF or Defender)
    const defenderStats = allStats.filter(
      (stat) => stat.position === 'DEF' || stat.position === 'Defender'
    )

    // Group by player id and calculate averages
    const playerMap = new Map<number, {
      id: number
      web_name: string
      team_name: string
      event_points: number[]
      minutes: number[]
      expected_goals_conceded: number[]
      defensive_contribution: number[]
      clean_sheets: number[]
      expected_assists: number[]
      expected_goals: number[]
    }>()

    defenderStats.forEach((stat) => {
      const existing = playerMap.get(stat.id)
      if (existing) {
        existing.event_points.push(stat.event_points)
        existing.minutes.push(stat.minutes)
        existing.expected_goals_conceded.push(stat.expected_goals_conceded)
        existing.defensive_contribution.push(stat.defensive_contribution)
        existing.clean_sheets.push(stat.clean_sheets)
        existing.expected_assists.push(stat.expected_assists)
        existing.expected_goals.push(stat.expected_goals)
      } else {
        playerMap.set(stat.id, {
          id: stat.id,
          web_name: stat.web_name,
          team_name: stat.team_name,
          event_points: [stat.event_points],
          minutes: [stat.minutes],
          expected_goals_conceded: [stat.expected_goals_conceded],
          defensive_contribution: [stat.defensive_contribution],
          clean_sheets: [stat.clean_sheets],
          expected_assists: [stat.expected_assists],
          expected_goals: [stat.expected_goals],
        })
      }
    })

    // Calculate averages for each player
    const aggregated: AggregatedPlayerStatDefender[] = Array.from(playerMap.values()).map((player) => {
      const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)
      const avg = (arr: number[]) => sum(arr) / arr.length

      const playerData = {
        id: player.id,
        web_name: player.web_name,
        team_name: player.team_name,
        event_points: Number(avg(player.event_points).toFixed(2)),
        minutes: Number(avg(player.minutes).toFixed(2)),
        expected_goals_conceded: Number(avg(player.expected_goals_conceded).toFixed(2)),
        defensive_contribution: Number(avg(player.defensive_contribution).toFixed(2)),
        clean_sheets: Number(avg(player.clean_sheets).toFixed(2)),
        expected_assists: Number(avg(player.expected_assists).toFixed(2)),
        expected_goals: Number(avg(player.expected_goals).toFixed(2)),
        gameweek_count: player.event_points.length,
        custom_score: 0,
      }

      // Calculate custom score if both numerator and denominator are selected
      if (customScoreNumerator && customScoreDenominator) {
        const numerator = playerData[customScoreNumerator as keyof AggregatedPlayerStatDefender] as number
        const denominator = playerData[customScoreDenominator as keyof AggregatedPlayerStatDefender] as number
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
    if (defenderStats.length === 0) return {}

    const numericFields: (keyof AggregatedPlayerStatDefender)[] = [
      'event_points',
      'minutes',
      'expected_goals_conceded',
      'defensive_contribution',
      'clean_sheets',
      'expected_assists',
      'expected_goals',
      'custom_score',
    ]

    const fieldsToSortReverse: Record<keyof AggregatedPlayerStatDefender, boolean> = {
      'event_points': false,
      'minutes': false,
      'expected_goals_conceded': true,
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
      const values = defenderStats
        .map((stat) => stat[field] as number)
        .filter((v) => typeof v === 'number' && !isNaN(v))
        .sort((a, b) => fieldsToSortReverse[field] ? b - a : a - b)

      if (values.length > 0) {
        const index = Math.ceil(values.length * PERCENTILE_TO_HIGHLIGHT) - 1
        result[field] = values[Math.max(0, index)]
      }
    })

    return result
  }, [defenderStats])

  // Helper function to check if value is at or above 90th percentile
  const isAtOrAbove90thPercentile = (
    field: keyof AggregatedPlayerStatDefender,
    value: number,
    lowerIsBetter: boolean = false,
  ): boolean => {
    const percentile = percentiles[field]
    return percentile !== undefined && (lowerIsBetter ? value <= percentile : value >= percentile)
  }

  // Sort the data
  const sortedDefenderStats = useMemo(() => {
    if (!sortColumn) return defenderStats

    return [...defenderStats].sort((a, b) => {
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
  }, [defenderStats, sortColumn, sortDirection])

  // Calculate pagination
  const totalPages = Math.ceil(sortedDefenderStats.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedDefenderStats = sortedDefenderStats.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const handleSort = (column: keyof AggregatedPlayerStatDefender) => {
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

  const getSortIcon = (column: keyof AggregatedPlayerStatDefender) => {
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
            <CardTitle>Defenders</CardTitle>
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
          ) : sortedDefenderStats.length === 0 ? (
            <div className='text-center text-muted-foreground py-4'>
              No defender stats available
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <button
                        onClick={() => handleSort('web_name')}
                        className='flex items-center gap-2 hover:text-foreground transition-colors cursor-pointer'
                      >
                        Web Name
                        {getSortIcon('web_name')}
                      </button>
                    </TableHead>
                    <TableHead>
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
                        onClick={() => handleSort('expected_goals_conceded')}
                        className='flex items-center gap-2 hover:text-foreground transition-colors cursor-pointer'
                      >
                        Expected Goals Conceded (Avg)
                        {getSortIcon('expected_goals_conceded')}
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
                  {paginatedDefenderStats.map((stat) => (
                    <TableRow key={stat.id}>
                      <TableCell>{stat.web_name}</TableCell>
                      <TableCell>{stat.team_name}</TableCell>
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
                          isAtOrAbove90thPercentile(
                            'expected_goals_conceded',
                            stat.expected_goals_conceded,
                            true,
                          )
                            ? 'text-red-500'
                            : ''
                        }
                      >
                        {stat.expected_goals_conceded}
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
