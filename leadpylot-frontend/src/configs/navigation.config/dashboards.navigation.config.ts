import { ADMIN_PREFIX_PATH, DASHBOARDS_PREFIX_PATH } from '@/constants/route.constant'
import {
  NAV_ITEM_TYPE_TITLE,
  NAV_ITEM_TYPE_ITEM,
  NAV_ITEM_TYPE_COLLAPSE,
} from '@/constants/navigation.constant'
import type { NavigationTree } from '@/@types/navigation'
import { Role } from './auth.route.config'

const dashboardsNavigationConfig: NavigationTree[] = [
  {
    key: 'dashboard',
    path: '',
    title: 'Workflow',
    translateKey: 'nav.dashboard.dashboard',
    icon: '',
    type: NAV_ITEM_TYPE_TITLE,
    authority: Object.values(Role),
    meta: {
      horizontalMenu: { layout: 'default' },
    },
    subMenu: [
      // ================= ADMIN =================
      {
        key: 'admin.import-leads',
        path: `${ADMIN_PREFIX_PATH}/import-leads`,
        title: 'Import',
        translateKey: 'nav.admin.import-leads',
        icon: 'dashboardImportLeads',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [Role.ADMIN],
        subMenu: [],
      },

      // ================= PROVIDER =================
      {
        key: 'dashboard.home',
        path: `${DASHBOARDS_PREFIX_PATH}/home`,
        title: 'Home',
        translateKey: 'nav.dashboard.home',
        icon: 'dashboardHome',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [Role.PROVIDER],
        subMenu: [],
      },

      // ================= ADMIN LEADS =================
      {
        key: 'dashboard.leads',
        path: `${DASHBOARDS_PREFIX_PATH}/leads`,
        title: 'Leads',
        translateKey: 'nav.dashboard.leads.leads',
        icon: 'dashboardLeads',
        type: NAV_ITEM_TYPE_COLLAPSE,
        authority: [Role.ADMIN],
        subMenu: [
          {
            key: 'dashboard.leads.all',
            path: `${DASHBOARDS_PREFIX_PATH}/leads`,
            title: 'All Leads',
            translateKey: 'nav.dashboard.leads.allLeads',
            icon: 'allLeadsIcon',
            type: NAV_ITEM_TYPE_ITEM,
            authority: [Role.ADMIN],
            subMenu: [],
          },
          {
            key: 'dashboard.leads.live',
            path: `${DASHBOARDS_PREFIX_PATH}/live-leads`,
            title: 'Live',
            translateKey: 'nav.dashboard.liveLeads',
            icon: 'liveLeadsIcon',
            type: NAV_ITEM_TYPE_ITEM,
            authority: [Role.ADMIN],
            subMenu: [],
          },
          {
            key: 'dashboard.leads.recycle',
            path: `${DASHBOARDS_PREFIX_PATH}/recycle-leads`,
            title: 'Recycle',
            translateKey: 'nav.dashboard.recycleLeads',
            icon: 'recycleLeadsIcon',
            type: NAV_ITEM_TYPE_ITEM,
            authority: [Role.ADMIN],
            subMenu: [],
          },
          {
            key: 'dashboard.leads.archived',
            path: `${DASHBOARDS_PREFIX_PATH}/leads/archived`,
            title: 'Out Leads',
            translateKey: 'nav.dashboard.leads.outLeads',
            icon: 'archivedLeadsIcon',
            type: NAV_ITEM_TYPE_ITEM,
            authority: [Role.ADMIN],
            subMenu: [],
          },
          {
            key: 'dashboard.leads.pending',
            path: `${DASHBOARDS_PREFIX_PATH}/leads/pending-leads`,
            title: 'Pending Leads',
            translateKey: 'nav.dashboard.leads.pendingLeads',
            icon: 'pendingLeadsIcon',
            type: NAV_ITEM_TYPE_ITEM,
            authority: [Role.ADMIN],
            subMenu: [],
          },
          {
            key: 'dashboard.leads.active',
            path: `${DASHBOARDS_PREFIX_PATH}/leads/active-leads`,
            title: 'Active Leads',
            translateKey: 'nav.dashboard.leads.activeLeads',
            icon: 'activeLeadsIcon',
            type: NAV_ITEM_TYPE_ITEM,
            authority: [Role.ADMIN],
            subMenu: [],
          },
          {
            key: 'dashboard.leads.useable',
            path: `${DASHBOARDS_PREFIX_PATH}/leads/useable-leads`,
            title: 'Useable Leads',
            translateKey: 'nav.dashboard.leads.useableLeads',
            icon: 'useableLeadsIcon',
            type: NAV_ITEM_TYPE_ITEM,
            authority: [Role.ADMIN],
            subMenu: [],
          },
        ],
      },
      {
        key: 'dashboard.calendar',
        path: `${DASHBOARDS_PREFIX_PATH}/calendar`,
        title: 'Calendar',
        translateKey: 'nav.dashboard.calendar',
        icon: 'calendar',
        type: NAV_ITEM_TYPE_COLLAPSE,
        authority: [Role.ADMIN, Role.PROVIDER, Role.AGENT],
        subMenu: [],
      },

      // ================= AGENT LEADS =================
      {
        key: 'dashboard.agent.leads',
        path: '',
        title: 'Leads',
        translateKey: 'nav.dashboard.calling',
        icon: 'dashboardLeads',
        type: NAV_ITEM_TYPE_COLLAPSE,
        authority: [Role.AGENT],
        subMenu: [
          {
            key: 'agent.live',
            path: `${DASHBOARDS_PREFIX_PATH}/live-leads`,
            title: 'Live',
            translateKey: 'nav.dashboard.agentLiveLeads',
            icon: 'agentLiveLeadsIcon',
            type: NAV_ITEM_TYPE_ITEM,
            authority: [Role.AGENT],
            subMenu: [],
          },
          {
            key: 'agent.recycle',
            path: `${DASHBOARDS_PREFIX_PATH}/recycle-leads`,
            title: 'Recycle',
            translateKey: 'nav.dashboard.agentRecycleLeads',
            icon: 'agentRecycleLeadsIcon',
            type: NAV_ITEM_TYPE_ITEM,
            authority: [Role.AGENT,Role.ADMIN],
            subMenu: [],
          },
          {
            key: 'agent.out',
            path: `${DASHBOARDS_PREFIX_PATH}/leads/archived`,
            title: 'Out',
            translateKey: 'nav.dashboard.agentOutLeads',
            icon: 'outOffersIcon',
            type: NAV_ITEM_TYPE_ITEM,
            authority: [Role.AGENT],
            subMenu: [],
          },
          {
            key: 'agent.reclamations',
            path: `${DASHBOARDS_PREFIX_PATH}/reclamations`,
            title: 'Reclamations',
            translateKey: 'nav.dashboard.reclamations.allReclamations',
            icon: 'dashboardReclamations',
            type: NAV_ITEM_TYPE_ITEM,
            authority: [Role.AGENT],
            subMenu: [],
          },
        ],
      },

      // ================= OFFERS =================
      {
        key: 'dashboard.offers',
        path: '',
        title: 'Offers',
        translateKey: 'nav.dashboard.offers',
        icon: 'dashboardOffers',
        type: NAV_ITEM_TYPE_COLLAPSE,
        authority: [Role.ADMIN, Role.AGENT],
        subMenu: [
          {
            key: 'offers.all',
            path: `${DASHBOARDS_PREFIX_PATH}/offers`,
            title: 'Offers',
            translateKey: 'nav.dashboard.offersSub.allOffers',
            icon: 'dashboardOffers',
            type: NAV_ITEM_TYPE_ITEM,
            authority: [Role.ADMIN, Role.AGENT],
            subMenu: [],
          },
          {
            key: 'offers.out',
            path: `${DASHBOARDS_PREFIX_PATH}/out-offers`,
            title: 'Out Offers',
            translateKey: 'nav.dashboard.offersSub.outOffers',
            icon: 'outOffersIcon',
            type: NAV_ITEM_TYPE_ITEM,
            authority: [Role.ADMIN, Role.AGENT],
            subMenu: 
            [
              
            ],
          },
        ],
      },

      // ================= CALENDAR =================
      {
          key: 'dashboard.mails',
          path: ``,
          title: 'Mails',
          translateKey: 'nav.dashboard.mails',
          icon: 'dashboardMails',
          type: NAV_ITEM_TYPE_COLLAPSE,
          authority: [Role.ADMIN, Role.PROVIDER, Role.AGENT],
          subMenu:
          [
            {
              key: 'dashboard.mails',
              path: `${DASHBOARDS_PREFIX_PATH}/mails`,
              title: 'Inbox',
              translateKey: 'nav.dashboard.mails',
              icon: 'dashboardMails',
              type: NAV_ITEM_TYPE_ITEM,
              authority: [Role.ADMIN, Role.PROVIDER, Role.AGENT],
              subMenu: [],
            },
            {
              key: 'dashboard.kanban',
              path: `${DASHBOARDS_PREFIX_PATH}/kanban`,
              title: 'Kanban',
              translateKey: 'nav.dashboard.kanban',
              icon: 'todoIcon',
              type: NAV_ITEM_TYPE_ITEM,
              authority: [Role.ADMIN, Role.PROVIDER, Role.AGENT],
              subMenu: [],
            },

            {
              key: 'dashboard.meetings',
              path: `${DASHBOARDS_PREFIX_PATH}/termin`,
              title: 'Meetings',
              translateKey: 'nav.dashboard.meetings',
              icon: 'dashboardMeetings',
              type: NAV_ITEM_TYPE_ITEM,
              authority: [Role.ADMIN, Role.PROVIDER, Role.AGENT],
              subMenu: [],
            },

            {
              key: 'dashboard.calendar',
              path: `${DASHBOARDS_PREFIX_PATH}/calendar`,
              title: 'Calendar',
              translateKey: 'nav.dashboard.calendar',
              icon: 'calendar',
              type: NAV_ITEM_TYPE_ITEM,
              authority: [Role.ADMIN, Role.PROVIDER, Role.AGENT],
              subMenu: [],
            },
          ],
      },
     
      {
        key: 'dashboard.todo',
        path: `${DASHBOARDS_PREFIX_PATH}/todo`,
        title: 'Todo',
        translateKey: 'nav.dashboard.todo',
        icon: 'todoIcon',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [Role.ADMIN, Role.AGENT],
        subMenu: [],
        badge: {
          count: 0,
          color: 'bg-amber-600',
          variant: 'solid',
          max: 99,
        },
      },
      {
        key: 'dashboard.documents',
        path: `${DASHBOARDS_PREFIX_PATH}/documents`,
        title: 'Documents',
        translateKey: 'nav.dashboard.documents',
        icon: 'dashboardDocuments',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [Role.ADMIN],
        subMenu: [],
      },
    ],
    
  },
]

export default dashboardsNavigationConfig