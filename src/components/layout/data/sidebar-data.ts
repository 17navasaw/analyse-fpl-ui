import { LayoutDashboard, Users } from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  navGroups: [
    {
      title: 'Player Insights',
      items: [
        { title: 'My Team', url: '/my-team', icon: Users },
        {
          title: 'Overview',
          url: '/',
          icon: LayoutDashboard,
        },
      ],
    },
  ],
}
