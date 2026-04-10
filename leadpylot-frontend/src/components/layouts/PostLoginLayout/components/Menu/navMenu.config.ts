/**
 * NavMenu Configuration
 * Defines the order and structure of items in the horizontal navigation menu
 * Order: Leads > Offers > Openings > HOLD > Termine (Calendar) > Tickets (Task)
 * Note: Mails and Calls are now in the More menu
 */

export interface NavMenuConfigItem {
  key: string; // Navigation key from navigation config
  type: 'nav' | 'custom'; // 'nav' = from navigation tree, 'custom' = special item like Task drawer
  customLabel?: string; // Custom label if different from nav title
  customIcon?: string; // Custom icon if different from nav icon
}

export const navMenuConfig: NavMenuConfigItem[] = [
  {
    key: 'dashboard.leads',
    type: 'nav',
  },
  {
    key: 'dashboard.offers',
    type: 'nav',
  },
  {
    key: 'dashboard.openings',
    type: 'nav',
  },
  {
    key: 'dashboard.holds',
    type: 'nav',
  },
  {
    key: 'dashboard.calendar',
    type: 'nav',
  },
  {
    key: 'dashboard.mails',
    type: 'nav',
  },
  {
    key: 'dashboard.kanban',
    type: 'nav', // Kanban board route
  },

  {
    key: 'dashboard.add-task',
    type: 'custom',
    // customLabel: 'Task',
    customIcon: 'plus',
  },
  // {
  //   key: 'dashboard.cashflow',
  //   type: 'nav',
  // },
  // {
  //   key: 'dashboard.todo',
  //   type: 'custom', // Task drawer - commented out for now, Tickets moved to nav menu
  //   customLabel: 'Tickets',
  // },
];
