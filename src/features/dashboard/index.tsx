import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CaretSortIcon,
} from '@radix-ui/react-icons'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { DataTablePagination } from '@/components/data-table-pagination'
import { Analytics } from './components/analytics'
import { fetchAnalyse, type PlayerStat } from './api/analyse'

export function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['analyse'],
    queryFn: fetchAnalyse,
  })

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortColumn, setSortColumn] = useState<keyof AggregatedPlayerStatDefender | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selectedGameweeks, setSelectedGameweeks] = useState<string>('all')
  const [minMinutes, setMinMinutes] = useState<string>('45')
  const [customScoreNumerator, setCustomScoreNumerator] = useState<string>('event_points')
  const [customScoreDenominator, setCustomScoreDenominator] = useState<string>('expected_goals_conceded')

  // Aggregated player stats interface
  interface AggregatedPlayerStatDefender {
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

  // Sort the data
  const sortedStats = useMemo(() => {
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
  const totalPages = Math.ceil(sortedStats.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedStats = sortedStats.slice(startIndex, endIndex)

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
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <TopNav links={topNav} />
        <div className='ms-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      {/* ===== Main ===== */}
      <Main>
        <div className='mb-2 flex items-center justify-between space-y-2'>
          <h1 className='text-2xl font-bold tracking-tight'>Dashboard</h1>
          <div className='flex items-center space-x-2'>
            <Button>Download</Button>
          </div>
        </div>
        <Tabs
          orientation='vertical'
          defaultValue='overview'
          className='space-y-4'
        >
          <div className='w-full overflow-x-auto pb-2'>
            <TabsList>
              <TabsTrigger value='overview'>Overview</TabsTrigger>
              <TabsTrigger value='analytics'>Analytics</TabsTrigger>
              <TabsTrigger value='reports' disabled>
                Reports
              </TabsTrigger>
              <TabsTrigger value='notifications' disabled>
                Notifications
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value='overview' className='space-y-4'>
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Next Gameweek
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>{data?.next_gameweek || 'No data available'}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Past Gameweeks in Data
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>{data?.past_gameweeks[data?.past_gameweeks.length - 1] || 'No data available'}-{data?.past_gameweeks[0]}</div>
                </CardContent>
              </Card>
            </div>
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
                  ) : sortedStats.length === 0 ? (
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
                          {paginatedStats.map((stat) => (
                            <TableRow key={stat.id}>
                              <TableCell>{stat.web_name}</TableCell>
                              <TableCell>{stat.team_name}</TableCell>
                              {customScoreNumerator && customScoreDenominator && (
                                <TableCell>{stat.custom_score}</TableCell>
                              )}
                              <TableCell>{stat.event_points}</TableCell>
                              <TableCell>{stat.minutes}</TableCell>
                              <TableCell>{stat.expected_goals_conceded}</TableCell>
                              <TableCell>{stat.defensive_contribution}</TableCell>
                              <TableCell>{stat.clean_sheets}</TableCell>
                              <TableCell>{stat.expected_assists}</TableCell>
                              <TableCell>{stat.expected_goals}</TableCell>
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
            {/* <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Total Revenue
                  </CardTitle>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    className='h-4 w-4 text-muted-foreground'
                  >
                    <path d='M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' />
                  </svg>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>$45,231.89</div>
                  <p className='text-xs text-muted-foreground'>
                    +20.1% from last month
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Subscriptions
                  </CardTitle>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    className='h-4 w-4 text-muted-foreground'
                  >
                    <path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' />
                    <circle cx='9' cy='7' r='4' />
                    <path d='M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' />
                  </svg>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>+2350</div>
                  <p className='text-xs text-muted-foreground'>
                    +180.1% from last month
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>Sales</CardTitle>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    className='h-4 w-4 text-muted-foreground'
                  >
                    <rect width='20' height='14' x='2' y='5' rx='2' />
                    <path d='M2 10h20' />
                  </svg>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>+12,234</div>
                  <p className='text-xs text-muted-foreground'>
                    +19% from last month
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Active Now
                  </CardTitle>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    className='h-4 w-4 text-muted-foreground'
                  >
                    <path d='M22 12h-4l-3 9L9 3l-3 9H2' />
                  </svg>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>+573</div>
                  <p className='text-xs text-muted-foreground'>
                    +201 since last hour
                  </p>
                </CardContent>
              </Card>
            </div>
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
              <Card className='col-span-1 lg:col-span-4'>
                <CardHeader>
                  <CardTitle>Overview</CardTitle>
                </CardHeader>
                <CardContent className='ps-2'>
                  <Overview />
                </CardContent>
              </Card>
              <Card className='col-span-1 lg:col-span-3'>
                <CardHeader>
                  <CardTitle>Recent Sales</CardTitle>
                  <CardDescription>
                    You made 265 sales this month.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RecentSales />
                </CardContent>
              </Card>
            </div> */}
          </TabsContent>
          <TabsContent value='analytics' className='space-y-4'>
            <Analytics />
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}

const topNav = [
  {
    title: 'Overview',
    href: '/dashboard',
    isActive: true,
    disabled: false,
  }
]
