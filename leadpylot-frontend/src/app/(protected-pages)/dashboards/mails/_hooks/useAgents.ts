import { useQuery } from '@tanstack/react-query';
import AxiosBase from '@/services/axios/AxiosBase';
import { useMemo } from 'react';

export function useAgents() {

    const { data: agentsData, isLoading } = useQuery({
        queryKey: ['assigned-agents'],
        queryFn: async () => {
            const response = await AxiosBase.get('/email-system/assigned-agents');
            return response.data.data || [];
        },
    });

    const agents = useMemo(() => {
        if (!agentsData) return [];
        return Array.isArray(agentsData) ? agentsData : [];
    }, [agentsData]);

    const filterAgents = (searchTerm: string) => {
        if (!searchTerm) return agents;
        const term = searchTerm.toLowerCase();
        return agents.filter((agent: any) => {
            const name = (agent?.info?.name || agent?.login || '').toLowerCase();
            const login = (agent?.login || '').toLowerCase();
            return name.includes(term) || login.includes(term);
        });
    };

    return { agents, isLoading, filterAgents };
}

