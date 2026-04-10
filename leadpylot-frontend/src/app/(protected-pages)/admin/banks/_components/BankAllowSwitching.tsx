import Switcher from '@/components/ui/Switcher';
import { useBankUpdate } from "@/services/hooks/useBankUpdate";

const BankAllowSwitching = ({ bankId, isAllow }: { bankId: string; isAllow: boolean }) => {
    const { mutate, isPending } = useBankUpdate(bankId);

    const handleIsAllowChange = (checked: boolean) => {
        mutate({ is_allow: checked, state: checked ? 'active' : 'stop' });
    };

    return (
        <span onClick={(e) => e.stopPropagation()} className="inline-block align-middle -mt-2">
            <Switcher checked={isAllow} onChange={handleIsAllowChange} isLoading={isPending} switcherClass="bg-ocean-2" />
        </span>
    );
};

export default BankAllowSwitching;