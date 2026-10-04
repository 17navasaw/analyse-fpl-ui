import { createFileRoute } from '@tanstack/react-router'
import { MyTeam } from '@/features/my-team'

export const Route = createFileRoute('/_authenticated/my-team/')({
  component: MyTeam,
})
