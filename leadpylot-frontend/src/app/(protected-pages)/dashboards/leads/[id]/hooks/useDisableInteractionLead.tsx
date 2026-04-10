import { TLead } from '@/services/LeadsService';

const useDisableInteractionLead = (lead: TLead) => {
  const temporary_access = lead?.temporary_access ? lead.temporary_access : false;

  return {
    disableInteractionLead: temporary_access,
  };
};

export default useDisableInteractionLead;
