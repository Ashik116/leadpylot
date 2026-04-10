import { useState, useCallback } from 'react';
import { useEmailStore } from '../_stores/emailStore';
import { updateUrlHash } from './useUrlSync';
import type { EmailFilters } from '../_types/email.types';

const OPENING_OPTIONS = [
    { value: 'opening', label: 'Opening' },
    { value: 'confirmation', label: 'Confirmations' },
    { value: 'payment', label: 'Payments' },
    { value: 'netto', label: 'Netto' },
    { value: 'lost', label: 'Lost' },
] as const;

type FiltersUpdater = (prev: EmailFilters) => EmailFilters;

export function useEmailFilters() {
    const { filters, setFilters, setAssignedAgent, clearAssignedAgent, setStage, setCurrentView } = useEmailStore();
    const [isOpeningExpanded, setIsOpeningExpanded] = useState(false);
    const [isAssigningExpanded, setIsAssigningExpanded] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const selectedOpening = filters.stage || null;
    const selectedAgent = filters.agent_id || null;

    const updateFilters = useCallback(
        (modifier: FiltersUpdater) => {
            setFilters(modifier(filters));
        },
        [filters, setFilters]
    );

    const handlePendingClick = useCallback(() => {
        updateFilters((prev) => {
            const next = { ...prev, viewed: false };
            delete next.agent_id;
            delete next.stage;
            return next;
        });
        clearAssignedAgent();
        setStage(null);
        setCurrentView('pending');
        updateUrlHash('pending');
        setIsOpeningExpanded(false);
        setIsAssigningExpanded(false);
    }, [updateFilters, clearAssignedAgent, setStage]);

    const handleOpeningToggle = useCallback(() => {
        setIsOpeningExpanded((prev) => !prev);
    }, []);

    const handleOpeningSelect = useCallback(
        (value: string) => {
            updateFilters((prev) => ({ ...prev, stage: value }));
            setStage(value);
        },
        [updateFilters, setStage]
    );

    const handleClearOpening = useCallback(() => {
        updateFilters((prev) => {
            const next = { ...prev };
            delete next.stage;
            return next;
        });
        setStage(null);
    }, [updateFilters, setStage]);

    const handleAssigningToggle = useCallback(() => {
        setIsAssigningExpanded((prev) => !prev);
    }, []);

    const handleAgentSelect = useCallback(
        (agentId: string) => {
            updateFilters((prev) => ({ ...prev, agent_id: agentId }));
            setAssignedAgent(agentId);
        },
        [updateFilters, setAssignedAgent]
    );

    const handleClearAgent = useCallback(() => {
        updateFilters((prev) => {
            const next = { ...prev };
            delete next.agent_id;
            return next;
        });
        clearAssignedAgent();
    }, [updateFilters, clearAssignedAgent]);

    return {
        OPENING_OPTIONS,
        isOpeningExpanded,
        isAssigningExpanded,
        searchTerm,
        selectedOpening,
        selectedAgent,
        setSearchTerm,
        handlePendingClick,
        handleOpeningToggle,
        handleOpeningSelect,
        handleClearOpening,
        handleAssigningToggle,
        handleAgentSelect,
        handleClearAgent,
    };
}

