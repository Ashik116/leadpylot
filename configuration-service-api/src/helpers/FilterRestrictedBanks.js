const filterRestrictedBanks = (banks, user) => {
    if (!banks || !Array.isArray(banks) || !user) {
      return banks || [];
    }
  
    return banks.filter(bank => {
      // If access restriction is not enabled for this bank (false, null, undefined), show it to all agents
      if (bank.isRestricted !== true) {
        return true;
      }
      
      // If access restriction is enabled, check if current user is in allowed agents
      if (bank.allowedAgents && Array.isArray(bank.allowedAgents)) {
        const userIdString = user._id.toString();
        const isAllowed = bank.allowedAgents.some(allowedId => 
          allowedId.toString() === userIdString
        );
        
        return isAllowed; // Show bank only if user IS allowed
      }
      
      // If access restriction is enabled but no allowed agents array, hide the bank
      return false;
    });
  };

module.exports = {
  filterRestrictedBanks
};