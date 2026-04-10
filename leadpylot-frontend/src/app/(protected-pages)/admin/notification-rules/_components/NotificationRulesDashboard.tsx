'use client';

import { useState, useMemo } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Switcher from '@/components/ui/Switcher';
import Select from '@/components/ui/Select';
import Dialog from '@/components/ui/Dialog';
import Skeleton from '@/components/ui/Skeleton';
import Tabs from '@/components/ui/Tabs';
import Tooltip from '@/components/ui/Tooltip';
import {
  HiOutlineBell,
  HiOutlineSearch,
  HiOutlinePencil,
  HiOutlineRefresh,
  HiOutlinePlay,
  HiOutlineChartBar,
  HiOutlineUserGroup,
  HiOutlineUser,
  HiOutlineCog,
  HiOutlineCheck,
  HiOutlineX,
  HiOutlineMusicNote,
} from 'react-icons/hi';
import {
  useNotificationRules,
  useToggleNotificationRule,
  useTestNotificationRule,
  useResetNotificationRule,
} from '@/services/hooks/useNotificationRules';
import type { NotificationRule } from '@/services/NotificationRulesService';
import { NotificationRuleEditor } from './NotificationRuleEditor';
import { NotificationAnalytics } from './NotificationAnalytics';
import ConfirmDialog from '@/components/shared/ConfirmDialog';

const { TabList, TabNav, TabContent } = Tabs;

// Category configuration with better colors
const CATEGORY_CONFIG: Record<string, { label: string; bgColor: string; textColor: string; borderColor: string }> = {
  leads: { label: 'Leads', bgColor: 'bg-blue-50', textColor: 'text-blue-700', borderColor: 'border-blue-200' },
  offers: { label: 'Offers & Business', bgColor: 'bg-emerald-50', textColor: 'text-emerald-700', borderColor: 'border-emerald-200' },
  email: { label: 'Email', bgColor: 'bg-violet-50', textColor: 'text-violet-700', borderColor: 'border-violet-200' },
  auth: { label: 'Authentication', bgColor: 'bg-amber-50', textColor: 'text-amber-700', borderColor: 'border-amber-200' },
  project: { label: 'Projects', bgColor: 'bg-indigo-50', textColor: 'text-indigo-700', borderColor: 'border-indigo-200' },
  task: { label: 'Tasks & Tickets', bgColor: 'bg-orange-50', textColor: 'text-orange-700', borderColor: 'border-orange-200' },
  document: { label: 'Documents', bgColor: 'bg-pink-50', textColor: 'text-pink-700', borderColor: 'border-pink-200' },
  system: { label: 'System', bgColor: 'bg-slate-50', textColor: 'text-slate-700', borderColor: 'border-slate-200' },
  other: { label: 'Other', bgColor: 'bg-gray-50', textColor: 'text-gray-700', borderColor: 'border-gray-200' },
};

// Priority badges
const PRIORITY_BADGE: Record<string, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  medium: { label: 'Medium', className: 'bg-blue-100 text-blue-600 border-blue-200' },
  high: { label: 'High', className: 'bg-red-100 text-red-600 border-red-200' },
};

// Recipient badge component
const RecipientBadge = ({ label, icon: Icon }: { label: string; icon: React.ElementType }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
    <Icon className="w-3 h-3" />
    {label}
  </span>
);

export const NotificationRulesDashboard = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showEnabledOnly, setShowEnabledOnly] = useState(false);
  const [activeTab, setActiveTab] = useState('rules');
  
  // Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);
  
  // Reset confirmation dialog state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [ruleToReset, setRuleToReset] = useState<NotificationRule | null>(null);

  // Fetch rules
  const { data, isLoading, error, refetch } = useNotificationRules();
  
  // Mutations
  const toggleRule = useToggleNotificationRule();
  const testRule = useTestNotificationRule();
  const resetRule = useResetNotificationRule();

  // Filter and sort rules
  const filteredRules = useMemo(() => {
    if (!data?.rules) return [];

    return data.rules.filter((rule) => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          rule.displayName.toLowerCase().includes(search) ||
          rule.eventType.toLowerCase().includes(search) ||
          rule.description?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      if (selectedCategory !== 'all' && rule.category !== selectedCategory) {
        return false;
      }

      if (showEnabledOnly && !rule.enabled) {
        return false;
      }

      return true;
    });
  }, [data?.rules, searchTerm, selectedCategory, showEnabledOnly]);

  // Group rules by category
  const groupedRules = useMemo(() => {
    const groups: Record<string, NotificationRule[]> = {};
    filteredRules.forEach((rule) => {
      if (!groups[rule.category]) {
        groups[rule.category] = [];
      }
      groups[rule.category].push(rule);
    });
    // Sort categories
    const sortedGroups: Record<string, NotificationRule[]> = {};
    Object.keys(groups).sort().forEach(key => {
      sortedGroups[key] = groups[key];
    });
    return sortedGroups;
  }, [filteredRules]);

  const handleEditRule = (rule: NotificationRule) => {
    setEditingRule(rule);
    setEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setEditorOpen(false);
    setEditingRule(null);
  };

  const handleToggleRule = async (rule: NotificationRule) => {
    toggleRule.mutate(rule._id);
  };

  const handleTestRule = async (rule: NotificationRule) => {
    testRule.mutate(rule._id);
  };

  const handleResetRule = (rule: NotificationRule) => {
    setRuleToReset(rule);
    setShowResetConfirm(true);
  };

  const handleConfirmReset = () => {
    if (ruleToReset) {
      resetRule.mutate(ruleToReset._id);
      setShowResetConfirm(false);
      setRuleToReset(null);
    }
  };

  // Stats
  const enabledCount = data?.rules?.filter((r) => r.enabled).length || 0;
  const disabledCount = data?.rules?.filter((r) => !r.enabled).length || 0;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <HiOutlineX className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load notification rules</h3>
        <p className="text-sm text-gray-500 mb-4">Please check your connection and try again</p>
        <Button variant="solid" onClick={() => refetch()}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Notification Rules</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure who receives notifications for each system event
          </p>
        </div>
        <Button
          variant="default"
          size="sm"
          icon={<HiOutlineRefresh className={isLoading ? 'animate-spin' : ''} />}
          onClick={() => refetch()}
        >
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <HiOutlineBell className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Rules</p>
              <p className="text-2xl font-semibold text-gray-900">{data?.total || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <HiOutlineCheck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Enabled</p>
              <p className="text-2xl font-semibold text-green-600">{enabledCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <HiOutlineX className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Disabled</p>
              <p className="text-2xl font-semibold text-gray-500">{disabledCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={setActiveTab}>
        <TabList>
          <TabNav value="rules">
            <span className="flex items-center gap-2">
              <HiOutlineCog className="w-4 h-4" />
              Rules Configuration
            </span>
          </TabNav>
          {/* <TabNav value="analytics">
            <span className="flex items-center gap-2">
              <HiOutlineChartBar className="w-4 h-4" />
              Delivery Analytics
            </span>
          </TabNav> */}
        </TabList>

        <TabContent value="rules">
          {/* Filters */}
          <Card className="p-4 mt-4 border border-gray-200">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Search */}
              <div className="flex-1 min-w-[250px]">
                <Input
                  placeholder="Search by name or event type..."
                  prefix={<HiOutlineSearch className="text-gray-400" />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Category Filter */}
              <div className="w-52">
                <Select
                  instanceId="notification-rules-category-filter"
                  placeholder="Filter by category"
                  value={selectedCategory}
                  onChange={(option: any) => option && setSelectedCategory(option.value)}
                  options={[
                    { value: 'all', label: 'All Categories' },
                    ...Object.entries(CATEGORY_CONFIG).map(([key, config]) => ({
                      value: key,
                      label: config.label,
                    })),
                  ]}
                />
              </div>

              {/* Enabled Filter */}
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                <Switcher
                  checked={showEnabledOnly}
                  onChange={() => setShowEnabledOnly(!showEnabledOnly)}
                />
                <span className="text-sm text-gray-600">Show enabled only</span>
              </div>
            </div>
          </Card>

          {/* Rules List */}
          {isLoading ? (
            <div className="space-y-4 mt-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6 border border-gray-200">
                  <div className="space-y-3">
                    <Skeleton height={20} width="40%" />
                    <Skeleton height={16} width="60%" />
                    <div className="flex gap-2">
                      <Skeleton height={24} width={80} />
                      <Skeleton height={24} width={100} />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-6 mt-6">
              {Object.entries(groupedRules).map(([category, rules]) => {
                const categoryConfig = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;
                
                return (
                  <div key={category}>
                    {/* Category Header */}
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-t-lg border border-b-0 ${categoryConfig.bgColor} ${categoryConfig.borderColor}`}>
                      <h3 className={`font-semibold ${categoryConfig.textColor}`}>
                        {categoryConfig.label}
                      </h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryConfig.bgColor} ${categoryConfig.textColor} border ${categoryConfig.borderColor}`}>
                        {rules.length} {rules.length === 1 ? 'rule' : 'rules'}
                      </span>
                    </div>

                    {/* Rules in Category */}
                    <Card className="rounded-t-none border border-gray-200">
                      <div className="divide-y divide-gray-100">
                        {rules.map((rule) => (
                          <div
                            key={rule._id}
                            className={`p-4 hover:bg-gray-50 transition-colors ${!rule.enabled ? 'bg-gray-50/50' : ''}`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              {/* Rule Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-1">
                                  <h4 className={`font-medium ${rule.enabled ? 'text-gray-900' : 'text-gray-500'}`}>
                                    {rule.displayName}
                                  </h4>
                                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${PRIORITY_BADGE[rule.priority]?.className}`}>
                                    {PRIORITY_BADGE[rule.priority]?.label}
                                  </span>
                                  {rule.isDefault && (
                                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-blue-50 text-blue-600 border border-blue-200">
                                      Default
                                    </span>
                                  )}
                                  {!rule.enabled && (
                                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-500 border border-gray-200">
                                      Disabled
                                    </span>
                                  )}
                                  {rule.audio && (
                                    <Tooltip title={`Custom audio: ${rule.audio.filename}`}>
                                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-purple-50 text-purple-600 border border-purple-200">
                                        <HiOutlineMusicNote className="w-3 h-3 mr-1" />
                                        Audio
                                      </span>
                                    </Tooltip>
                                  )}
                                </div>
                                
                                <p className="text-sm text-gray-500 mb-3">
                                  {rule.description || `Event: ${rule.eventType}`}
                                </p>
                                
                                {/* Recipients Summary */}
                                <div className="flex flex-wrap gap-2">
                                  {rule.recipients.roles.length > 0 && (
                                    <RecipientBadge 
                                      label={`Roles: ${rule.recipients.roles.join(', ')}`} 
                                      icon={HiOutlineUserGroup} 
                                    />
                                  )}
                                  {rule.recipients.dynamicTargets.assignedAgent && (
                                    <RecipientBadge label="Assigned Agent" icon={HiOutlineUser} />
                                  )}
                                  {rule.recipients.dynamicTargets.leadOwner && (
                                    <RecipientBadge label="Lead Owner" icon={HiOutlineUser} />
                                  )}
                                  {rule.recipients.dynamicTargets.projectAgents && (
                                    <RecipientBadge label="Project Agents" icon={HiOutlineUserGroup} />
                                  )}
                                  {rule.recipients.dynamicTargets.creator && (
                                    <RecipientBadge label="Creator" icon={HiOutlineUser} />
                                  )}
                                  {rule.recipients.dynamicTargets.mentionedUsers && (
                                    <RecipientBadge label="@Mentioned" icon={HiOutlineUser} />
                                  )}
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-2 shrink-0">
                                <Tooltip title="Send test notification (plays custom audio if rule has one, otherwise default)">
                                  <Button
                                    size="xs"
                                    variant="plain"
                                    icon={<HiOutlinePlay className="w-4 h-4" />}
                                    onClick={() => handleTestRule(rule)}
                                    loading={testRule.isPending && testRule.variables === rule._id}
                                  />
                                </Tooltip>
                                <Tooltip title="Reset to default">
                                  <Button
                                    size="xs"
                                    variant="plain"
                                    icon={<HiOutlineRefresh className="w-4 h-4" />}
                                    onClick={() => handleResetRule(rule)}
                                    loading={resetRule.isPending && resetRule.variables === rule._id}
                                    disabled={!rule.isDefault}
                                  />
                                </Tooltip>
                                <Tooltip title="Edit rule">
                                  <Button
                                    size="xs"
                                    variant="plain"
                                    icon={<HiOutlinePencil className="w-4 h-4" />}
                                    onClick={() => handleEditRule(rule)}
                                  />
                                </Tooltip>
                                <div className="ml-2 pl-2 border-l border-gray-200">
                                  <Switcher
                                    checked={rule.enabled}
                                    onChange={() => handleToggleRule(rule)}
                                    disabled={toggleRule.isPending}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                );
              })}

              {filteredRules.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <HiOutlineBell className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No notification rules found</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {searchTerm ? 'Try adjusting your search or filters' : 'No rules have been configured yet'}
                  </p>
                  {searchTerm && (
                    <Button variant="plain" onClick={() => setSearchTerm('')}>
                      Clear search
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </TabContent>

        <TabContent value="analytics">
          <div className="mt-6">
            <NotificationAnalytics />
          </div>
        </TabContent>
      </Tabs>

      {/* Rule Editor Dialog */}
      <Dialog
        isOpen={editorOpen}
        onClose={handleCloseEditor}
        width={800}
      >
        {editingRule && (
          <NotificationRuleEditor
            rule={editingRule}
            onClose={handleCloseEditor}
          />
        )}
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showResetConfirm}
        onClose={() => {
          setShowResetConfirm(false);
          setRuleToReset(null);
        }}
        onConfirm={handleConfirmReset}
        title="Reset Notification Rule"
        type="warning"
        confirmText="Reset"
        confirmButtonProps={{ variant: 'destructive' }}
      >
        {ruleToReset && (
          <p className="text-sm text-gray-600">
            Are you sure you want to reset "{ruleToReset.displayName}" to default settings? This will remove all custom configurations.
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
};
