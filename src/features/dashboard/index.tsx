import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ThemeSwitch } from '@/components/theme-switch'
import { fetchAnalyse, fetchSeasons } from './api/analyse'
import { DefendersTable } from './components/defenders-table'
import { ForwardsTable } from './components/forwards-table'
import { MidfieldersTable } from './components/midfielders-table'

export function Dashboard() {
  const [requestedSeason, setRequestedSeason] = useState<string | null>(null)
  const seasonsQuery = useQuery({
    queryKey: ['seasons'],
    queryFn: ({ signal }) => fetchSeasons(signal),
    meta: { handleErrorLocally: true },
  })
  const seasons = seasonsQuery.data ?? []
  const season =
    requestedSeason && seasons.includes(requestedSeason)
      ? requestedSeason
      : seasons[0]
  const analysisQuery = useQuery({
    queryKey: ['analyse', season],
    queryFn: ({ signal }) => {
      if (!season) throw new Error('No season selected')
      return fetchAnalyse(season, signal)
    },
    enabled: Boolean(season) && !seasonsQuery.isError,
    meta: { handleErrorLocally: true },
  })
  const { isLoading, error } = analysisQuery
  const data = error ? undefined : analysisQuery.data
  const summaryPlaceholder = isLoading
    ? 'Loading...'
    : error
      ? 'Unable to load data'
      : 'No data available'
  const pastGameweeks = data?.past_gameweeks ?? []
  const gameweekRange = pastGameweeks.length
    ? pastGameweeks.length === 1
      ? String(pastGameweeks[0])
      : `${pastGameweeks[pastGameweeks.length - 1]}–${pastGameweeks[0]}`
    : summaryPlaceholder

  return (
    <>
      <Header>
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
        </div>
      </Header>

      <Main>
        <h1 className='mb-6 text-2xl font-bold tracking-tight'>FPL Overview</h1>
        <div className='space-y-4'>
          <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
            <Label htmlFor='dashboard-season'>Season</Label>
            <Select
              value={season ?? ''}
              onValueChange={setRequestedSeason}
              disabled={
                seasonsQuery.isPending || seasonsQuery.isError || !season
              }
            >
              <SelectTrigger id='dashboard-season' className='w-full sm:w-48'>
                <SelectValue
                  placeholder={
                    seasonsQuery.isPending
                      ? 'Loading seasons...'
                      : seasonsQuery.isError
                        ? 'Seasons unavailable'
                        : 'No seasons available'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {seasons.map((availableSeason) => (
                  <SelectItem key={availableSeason} value={availableSeason}>
                    {availableSeason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {seasonsQuery.isPending ? (
            <p role='status' className='text-muted-foreground'>
              Loading seasons...
            </p>
          ) : seasonsQuery.isError ? (
            <div role='alert' className='flex flex-wrap items-center gap-2'>
              <p className='text-destructive'>Unable to load seasons.</p>
              <Button
                variant='outline'
                disabled={seasonsQuery.isFetching}
                onClick={() => void seasonsQuery.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : !season ? (
            <p role='status' className='text-muted-foreground'>
              No seasons available.
            </p>
          ) : (
            <>
              {error && (
                <div role='alert' className='flex flex-wrap items-center gap-2'>
                  <p className='text-destructive'>
                    Unable to load data for {season}.
                  </p>
                  <Button
                    variant='outline'
                    disabled={analysisQuery.isFetching}
                    onClick={() => void analysisQuery.refetch()}
                  >
                    Retry
                  </Button>
                </div>
              )}
              <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                <Card>
                  <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                    <CardTitle className='text-sm font-medium'>
                      Next Gameweek
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='text-2xl font-bold'>
                      {data?.next_gameweek ?? summaryPlaceholder}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                    <CardTitle className='text-sm font-medium'>
                      Past Gameweeks in Data
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='text-2xl font-bold'>{gameweekRange}</div>
                  </CardContent>
                </Card>
              </div>
              <DefendersTable
                key={`defenders-${season}`}
                data={data}
                isLoading={isLoading}
                error={error}
              />
              <MidfieldersTable
                key={`midfielders-${season}`}
                data={data}
                isLoading={isLoading}
                error={error}
              />
              <ForwardsTable
                key={`forwards-${season}`}
                data={data}
                isLoading={isLoading}
                error={error}
              />
            </>
          )}
        </div>
      </Main>
    </>
  )
}
