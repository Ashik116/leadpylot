'use client';

import React, { useState } from 'react';
import Pagination from '@/components/ui/Pagination';
import Select from '@/components/ui/Select';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { LeadWithTodos } from '@/services/AdminTodoService';
import {
  useAssignAdminTodoToAgent,
  useMakeAdminTodoAdminOnly,
  useToggleAdminTodoStatus,
  useDeleteAdminTodo,
} from '@/services/hooks/useAdminTodos';

import TodoItem from './TodoItem';
import AssignTodoModal from './AssignTodoModal';

interface AdminTodosListProps {
  data: LeadWithTodos[];
  isLoading: boolean;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pages: number;
  };
  onPaginationChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const AdminTodosList: React.FC<AdminTodosListProps> = ({
  data,
  isLoading,
  pagination,
  onPaginationChange,
  onPageSizeChange,
}) => {
  const [expandedLeads, setExpandedLeads] = useState<Set<string>>(new Set());
  const [expandedOffers, setExpandedOffers] = useState<Set<string>>(new Set());
  const [assignModalState, setAssignModalState] = useState<{
    isOpen: boolean;
    todoId?: string;
  }>({ isOpen: false });

  // Page size options
  const pageSizeOptions = [
    { value: 10, label: '10 per page' },
    { value: 25, label: '25 per page' },
    { value: 50, label: '50 per page' },
    { value: 100, label: '100 per page' },
  ];

  // Mutations
  const assignTodoMutation = useAssignAdminTodoToAgent();
  const makeAdminOnlyMutation = useMakeAdminTodoAdminOnly();
  const toggleStatusMutation = useToggleAdminTodoStatus();
  const deleteTodoMutation = useDeleteAdminTodo();

  // Toggle lead expansion
  const toggleLeadExpansion = (leadId: string) => {
    const newExpanded = new Set(expandedLeads);
    if (newExpanded.has(leadId)) {
      newExpanded.delete(leadId);
      // Also collapse all offers under this lead
      const newExpandedOffers = new Set(expandedOffers);
      data
        .find((lead) => lead._id === leadId)
        ?.offers.forEach((offer) => {
          newExpandedOffers.delete(offer.offer._id);
        });
      setExpandedOffers(newExpandedOffers);
    } else {
      newExpanded.add(leadId);
    }
    setExpandedLeads(newExpanded);
  };

  // Toggle offer expansion
  const toggleOfferExpansion = (offerId: string) => {
    const newExpanded = new Set(expandedOffers);
    if (newExpanded.has(offerId)) {
      newExpanded.delete(offerId);
    } else {
      newExpanded.add(offerId);
    }
    setExpandedOffers(newExpanded);
  };

  // Todo actions
  const handleAssignTodo = (todoId: string, agentId: string) => {
    assignTodoMutation.mutate({ todoId, agentId });
    setAssignModalState({ isOpen: false });
  };

  const handleMakeAdminOnly = (todoId: string) => {
    makeAdminOnlyMutation.mutate(todoId);
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="space-y-6">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="mb-3 h-20 rounded-lg bg-gradient-to-r from-gray-200 to-gray-300 shadow-sm"></div>
              <div className="ml-8 space-y-3">
                <div className="h-16 rounded-lg bg-gradient-to-r from-gray-100 to-gray-200 shadow-sm"></div>
                <div className="ml-12 space-y-2">
                  <div className="h-12 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100"></div>
                  <div className="h-12 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="p-16 text-center">
        <div className="mx-auto max-w-md">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100">
            <ApolloIcon name="list-ui" className="h-10 w-10 text-blue-600" />
          </div>
          <h3 className="mb-3 text-xl font-semibold text-gray-900">No admin todos found</h3>
          <p className="leading-relaxed text-gray-600">
            Admin todos will appear here when offers are created and match your templates. Configure
            your todo templates in settings to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Hierarchical List */}
      <div className="max-h-[calc(100dvh-230px)] min-h-0 space-y-2 overflow-hidden overflow-y-auto rounded-2xl">
        {data.map((leadGroup) => (
          <div key={leadGroup._id} className="overflow-hidden rounded-2xl border-0">
            {/* Lead Header */}
            <div
              className="cursor-pointer rounded-2xl border-b border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-3 transition-all duration-200 hover:from-blue-100 hover:to-indigo-100"
              onClick={() => toggleLeadExpansion(leadGroup._id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white">
                    <ApolloIcon
                      name={
                        expandedLeads.has(leadGroup._id)
                          ? 'chevron-arrow-down'
                          : 'chevron-arrow-right'
                      }
                    />
                  </div>
                  <div className="flex space-x-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {leadGroup.lead.contact_name}
                    </h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <ApolloIcon name="mail" />
                        <span>{leadGroup.lead.email_from}</span>
                      </div>
                      {leadGroup.lead.phone && (
                        <div className="flex items-center space-x-1">
                          <ApolloIcon name="phone" />
                          <span>{leadGroup.lead.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="rounded-full border border-blue-200 bg-blue-100 px-3 py-1 font-medium text-blue-700">
                    {leadGroup.totalTodos} todos
                  </div>
                  <div className="rounded-full border border-amber-200 bg-amber-100 px-3 py-1 font-medium text-amber-700">
                    {leadGroup.pendingTodos} pending
                  </div>
                  <div className="rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 font-medium text-emerald-700">
                    {leadGroup.completedTodos} completed
                  </div>
                </div>
              </div>
            </div>

            {/* Offers (when lead is expanded) */}
            {expandedLeads.has(leadGroup._id) && (
              <div>
                {leadGroup.offers.map((offerGroup) => (
                  <div key={offerGroup.offer._id} className="border-gray-200">
                    {/* Offer Header */}
                    <div
                      className="ml-8 cursor-pointer overflow-hidden rounded-2xl border-b border-l-4 border-green-400 bg-gradient-to-r from-green-50 to-emerald-50 p-3 transition-all duration-200 hover:from-green-100 hover:to-emerald-100"
                      onClick={() => toggleOfferExpansion(offerGroup.offer._id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500 text-white">
                            <ApolloIcon
                              name={
                                expandedOffers.has(offerGroup.offer._id)
                                  ? 'chevron-arrow-down'
                                  : 'chevron-arrow-right'
                              }
                            />
                          </div>
                          <div className="flex space-x-2">
                            <h4 className="font-normal text-gray-900">{offerGroup.offer.title}</h4>
                            <div className="flex items-center space-x-1 text-sm text-gray-600">
                              <span>
                                💰 Investment: €
                                {offerGroup.offer.investment_volume?.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="rounded-full border border-green-200 bg-green-100 px-3 py-1 font-medium text-green-700">
                          {offerGroup.todoCount} todos
                        </div>
                      </div>
                    </div>
                    {/* Todos (when offer is expanded) */}
                    {expandedOffers.has(offerGroup.offer._id) && (
                      <div className="ml-12 border-gray-300">
                        {offerGroup.todos
                          .filter((todo) => todo && todo._id)
                          .map((todo) => (
                            <TodoItem
                              key={todo._id}
                              todo={todo}
                              onMakeAdminOnly={() => handleMakeAdminOnly(todo._id)}
                              isLoading={
                                assignTodoMutation.isPending ||
                                makeAdminOnlyMutation.isPending ||
                                toggleStatusMutation.isPending ||
                                deleteTodoMutation.isPending
                              }
                            />
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination.total > 0 && (
        <div className="mt-2 flex justify-between gap-4 rounded-md bg-gray-50 p-4">
          <div />
          {/* Pagination Component */}
          <div>
            <Pagination
              currentPage={pagination.page}
              total={pagination.total}
              pageSize={pagination.pageSize}
              onChange={onPaginationChange}
              displayTotal={false}
              className="shrink-0"
            />
          </div>
          <Select
            value={pageSizeOptions.find((option) => option.value === pagination.pageSize)}
            onChange={(selectedOption) => {
              if (selectedOption && 'value' in selectedOption) {
                onPageSizeChange(selectedOption.value);
              }
            }}
            options={pageSizeOptions}
            className="w-40"
            size="sm"
            isSearchable={false}
          />
        </div>
      )}

      {/* Assign Todo Modal */}
      <AssignTodoModal
        isOpen={assignModalState.isOpen}
        todoId={assignModalState.todoId}
        onClose={() => setAssignModalState({ isOpen: false })}
        onAssign={handleAssignTodo}
      />
    </div>
  );
};

export default AdminTodosList;
