import { useEffect, useState, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
import {
  fetchTeam,
  fetchTeamSeasons,
  type Pick,
  type TeamSnapshot,
} from './api'
import { savedTeamId, saveTeamId, validTeamId } from './storage'

const positions: Record<number, string> = {
  1: 'Goalkeepers',
  2: 'Defenders',
  3: 'Midfielders',
  4: 'Forwards',
}
const availability: Record<string, string> = {
  a: 'Available',
  d: 'Doubtful',
  i: 'Injured',
  s: 'Suspended',
  u: 'Unavailable',
  n: 'Not available',
}
const chips: Record<string, string> = {
  bboost: 'Bench Boost',
  '3xc': 'Triple Captain',
  wildcard: 'Wildcard',
  freehit: 'Free Hit',
}
const number = (value: number | null) =>
  value === null ? 'Unavailable' : value.toLocaleString()
const money = (value: number | null) =>
  value === null ? 'Unavailable' : `£${value.toFixed(1)}m`
function errorMessage(error: unknown) {
  if (isAxiosError(error) && typeof error.response?.data?.detail === 'string')
    return error.response.data.detail as string
  return 'Unable to load FPL data. Please try again.'
}

function Player({ player }: { player: Pick }) {
  return (
    <details className='w-full min-w-0 rounded-lg border bg-card p-2 text-card-foreground shadow-sm'>
      <summary className='cursor-pointer rounded text-center text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:text-sm'>
        <span className='block font-semibold break-words'>{player.name}</span>
        <span className='block text-[10px] text-muted-foreground sm:text-xs'>
          {player.club ?? 'Unknown club'}
        </span>
        {player.is_captain && (
          <span
            className='mt-1 inline-block rounded bg-primary px-1.5 text-primary-foreground'
            aria-label='Captain'
          >
            C
          </span>
        )}
        {player.is_vice_captain && (
          <span
            className='mt-1 inline-block rounded bg-secondary px-1.5'
            aria-label='Vice-captain'
          >
            VC
          </span>
        )}
        {player.availability && player.availability !== 'a' && (
          <span className='block text-amber-700 dark:text-amber-400'>
            {availability[player.availability] ?? 'Status unknown'}
          </span>
        )}
      </summary>
      <dl className='mt-3 space-y-1 border-t pt-2 text-xs'>
        <dt className='font-semibold'>Current player information</dt>
        <dd>
          {player.element_type
            ? (positions[player.element_type] ?? 'Unknown position')
            : 'Unknown position'}
        </dd>
        <dt>Price</dt>
        <dd>{money(player.price)}</dd>
        <dt>Season points</dt>
        <dd>{number(player.season_points)}</dd>
        <dt>Availability</dt>
        <dd>{availability[player.availability ?? ''] ?? 'Unavailable'}</dd>
        <dt>News</dt>
        <dd className='break-words'>{player.news || 'No news reported'}</dd>
      </dl>
    </details>
  )
}

function Snapshot({ data }: { data: TeamSnapshot }) {
  const summary = data.summary
  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-xl font-semibold'>
          {data.team?.name ?? 'Unnamed team'}
        </h2>
        <p className='text-muted-foreground'>
          {data.team?.manager ?? 'Manager unavailable'} · Team ID{' '}
          {data.team?.id}
        </p>
      </div>
      {data.status === 'no_published_squad' ? (
        <p role='status'>
          No published squad yet. Your team will appear after its first gameweek
          is published.
        </p>
      ) : (
        summary && (
          <>
            <div className='space-y-1'>
              <h3 className='font-semibold'>
                Gameweek {data.gameweek} · {data.season}
              </h3>
              <p className='text-sm text-muted-foreground'>
                Latest published squad. Transfers and lineup changes for the
                next deadline may not be included. Points may change while the
                gameweek is in progress.
              </p>
            </div>
            <dl className='grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5'>
              {[
                ['Gameweek points', number(summary.points)],
                ['Gameweek rank', number(summary.rank)],
                ['Overall points', number(summary.total_points)],
                ['Overall rank', number(summary.overall_rank)],
                ['Squad value (snapshot)', money(summary.value)],
                ['Bank (snapshot)', money(summary.bank)],
                ['Transfers', number(summary.transfers)],
                [
                  'Transfer cost',
                  summary.transfer_cost === null
                    ? 'Unavailable'
                    : `${summary.transfer_cost} pts`,
                ],
                ['Bench points', number(summary.bench_points)],
                [
                  'Active chip',
                  summary.active_chip
                    ? (chips[summary.active_chip] ?? summary.active_chip)
                    : 'None',
                ],
              ].map(([label, value]) => (
                <div className='rounded-xl border bg-card p-3' key={label}>
                  <dt className='text-xs text-muted-foreground'>{label}</dt>
                  <dd className='mt-1 text-lg font-semibold'>{value}</dd>
                </div>
              ))}
            </dl>
            <Card>
              <CardHeader>
                <CardTitle>Starting XI</CardTitle>
                <p className='text-sm text-muted-foreground'>
                  Select a player for current price, availability and season
                  points.
                </p>
              </CardHeader>
              <CardContent className='space-y-4 px-2 sm:px-6'>
                <div
                  className='space-y-5 rounded-xl border border-emerald-600/30 bg-emerald-600/10 px-2 py-5 sm:px-4'
                  aria-label='Starting eleven pitch'
                >
                  {[1, 2, 3, 4, 0].map((position) => {
                    const players = data.picks.filter(
                      (p) =>
                        p.position <= 11 &&
                        (position === 0
                          ? !p.element_type || !positions[p.element_type]
                          : p.element_type === position)
                    )
                    if (!players.length) return null
                    return (
                      <section
                        key={position}
                        aria-label={positions[position] ?? 'Unknown positions'}
                      >
                        <h4 className='mb-2 text-center text-xs font-medium text-muted-foreground'>
                          {positions[position] ?? 'Unknown positions'}
                        </h4>
                        <div
                          className='mx-auto grid max-w-3xl items-start gap-1 sm:gap-3'
                          style={{
                            gridTemplateColumns: `repeat(${players.length}, minmax(0, 1fr))`,
                            maxWidth: `${players.length * 160}px`,
                          }}
                        >
                          {players.map((player) => (
                            <Player key={player.position} player={player} />
                          ))}
                        </div>
                      </section>
                    )
                  })}
                </div>
                <section aria-label='Substitutes'>
                  <h3 className='mb-3 font-semibold'>
                    Bench · substitution order
                  </h3>
                  <div className='grid grid-cols-2 items-start gap-3 sm:grid-cols-4'>
                    {data.picks
                      .filter((p) => p.position > 11)
                      .map((player) => (
                        <div key={player.position}>
                          <p className='mb-1 text-center text-xs text-muted-foreground'>
                            {player.position === 12
                              ? 'Goalkeeper'
                              : `Substitute ${player.position - 12}`}
                          </p>
                          <Player player={player} />
                        </div>
                      ))}
                  </div>
                </section>
              </CardContent>
            </Card>
            <section>
              <h3 className='font-semibold'>Automatic substitutions</h3>
              {data.automatic_substitutions.length ? (
                <ul className='mt-2 space-y-1 text-sm'>
                  {data.automatic_substitutions.map((sub, index) => (
                    <li key={index}>
                      {sub.player_in} in → {sub.player_out} out
                    </li>
                  ))}
                </ul>
              ) : (
                <p className='text-sm text-muted-foreground'>None reported.</p>
              )}
            </section>
          </>
        )
      )}
      <p className='text-xs text-muted-foreground'>
        Fetched {new Date(data.fetched_at).toLocaleString()}. Player details
        reflect the latest available FPL information.
      </p>
    </div>
  )
}

function SeasonTeam({
  season,
  available,
}: {
  season: string
  available: boolean
}) {
  const [id, setId] = useState(() => (available ? savedTeamId(season) : ''))
  const [input, setInput] = useState(id)
  const [validation, setValidation] = useState('')
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['team', season, id],
    queryFn: ({ signal }) => fetchTeam(id, season, signal),
    enabled: available && Boolean(id),
    staleTime: 60_000,
    retry: false,
    meta: { handleErrorLocally: true },
  })
  useEffect(() => {
    if (
      query.data &&
      !query.isError &&
      query.data.season === season &&
      query.data.team?.id === Number(id) &&
      query.data.status !== 'season_unavailable'
    )
      saveTeamId(season, id)
  }, [query.data, query.isError, season, id])
  function clear(forget: boolean) {
    void queryClient.cancelQueries({ queryKey: ['team', season] })
    queryClient.removeQueries({ queryKey: ['team', season] })
    if (forget) saveTeamId(season, null)
    setId('')
    setInput('')
    setValidation('')
  }
  function submit(event: FormEvent) {
    event.preventDefault()
    const next = input.trim()
    if (!validTeamId(next)) {
      setValidation('Enter a positive, whole-number FPL team ID.')
      return
    }
    setValidation('')
    setId(next)
  }
  if (!available)
    return (
      <Card>
        <CardContent className='py-6'>
          <p role='status' className='font-medium'>
            Squad data unavailable for this season
          </p>
          <p className='mt-2 text-sm text-muted-foreground'>
            Historical player statistics are available in Overview, but manager
            squads have not been archived. Select the live season to view your
            team.
          </p>
        </CardContent>
      </Card>
    )
  return (
    <div className='space-y-6'>
      {!id ? (
        <Card>
          <CardHeader>
            <CardTitle>Find your team</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className='max-w-lg space-y-3'>
              <Label htmlFor='team-id'>FPL team ID</Label>
              <div className='flex gap-2'>
                <Input
                  id='team-id'
                  inputMode='numeric'
                  autoComplete='off'
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  aria-describedby='team-id-help team-id-error'
                  aria-invalid={Boolean(validation)}
                  placeholder='e.g. 268040'
                />
                <Button type='submit'>Load team</Button>
              </div>
              <p id='team-id-help' className='text-sm text-muted-foreground'>
                On the FPL website, open your Points page. Your team ID is the
                number after /entry/ in its URL. Successfully loaded IDs are
                remembered on this browser for each season.
              </p>
              <p
                id='team-id-error'
                role={validation ? 'alert' : undefined}
                className='text-sm text-destructive'
              >
                {validation}
              </p>
            </form>
            <Button
              className='mt-3'
              variant='ghost'
              onClick={() => clear(true)}
            >
              Forget saved team
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className='flex flex-wrap items-center gap-2'>
            <span className='mr-2 text-sm'>Team ID {id}</span>
            <Button
              variant='outline'
              disabled={query.isFetching}
              onClick={() => void query.refetch()}
            >
              {query.isFetching ? 'Loading…' : 'Refresh'}
            </Button>
            <Button variant='outline' onClick={() => clear(false)}>
              Change team
            </Button>
            <Button variant='ghost' onClick={() => clear(true)}>
              Forget team
            </Button>
          </div>
          {query.isPending ? (
            <p role='status'>Loading your team…</p>
          ) : query.isError ? (
            <div role='alert' className='space-y-3'>
              <p className='text-destructive'>{errorMessage(query.error)}</p>
              <Button
                variant='outline'
                disabled={query.isFetching}
                onClick={() => void query.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : query.data?.status === 'season_unavailable' ? (
            <p role='status'>Squad data unavailable for this season</p>
          ) : query.data &&
            query.data.season === season &&
            query.data.team?.id === Number(id) ? (
            <Snapshot data={query.data} />
          ) : null}
        </>
      )}
    </div>
  )
}

export function MyTeam() {
  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Analyse FPL | My Team'
    return () => {
      document.title = previousTitle
    }
  }, [])
  const [requestedSeason, setRequestedSeason] = useState<string | null>(null)
  const seasons = useQuery({
    queryKey: ['team-seasons'],
    queryFn: ({ signal }) => fetchTeamSeasons(signal),
    staleTime: 60_000,
    retry: false,
    meta: { handleErrorLocally: true },
  })
  const season = requestedSeason ?? seasons.data?.live_season
  const available =
    seasons.data?.seasons.find((item) => item.season === season)
      ?.squad_available ?? false
  return (
    <>
      <Header>
        <div className='ms-auto'>
          <ThemeSwitch />
        </div>
      </Header>
      <Main>
        <div className='mb-6'>
          <h1 className='text-2xl font-bold tracking-tight'>My Team</h1>
          <p className='mt-1 text-muted-foreground'>
            Your latest published FPL squad and team overview.
          </p>
        </div>
        <div className='space-y-6'>
          <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
            <Label htmlFor='team-season'>Season</Label>
            <Select
              value={season ?? ''}
              onValueChange={setRequestedSeason}
              disabled={!seasons.data || seasons.isError}
            >
              <SelectTrigger id='team-season' className='w-full sm:w-48'>
                <SelectValue placeholder='Select season' />
              </SelectTrigger>
              <SelectContent>
                {seasons.data?.seasons.map((item) => (
                  <SelectItem key={item.season} value={item.season}>
                    {item.season}
                    {item.season === seasons.data.live_season ? ' (live)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {seasons.isPending ? (
            <p role='status'>Loading seasons…</p>
          ) : seasons.isError ? (
            <div role='alert'>
              <p className='mb-3 text-destructive'>
                {errorMessage(seasons.error)}
              </p>
              <Button variant='outline' onClick={() => void seasons.refetch()}>
                Retry
              </Button>
            </div>
          ) : season ? (
            <SeasonTeam key={season} season={season} available={available} />
          ) : null}
        </div>
      </Main>
    </>
  )
}
