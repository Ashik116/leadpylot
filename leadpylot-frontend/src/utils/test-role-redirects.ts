import { Role } from '@/configs/navigation.config/auth.route.config';
import { ADMIN, USER as AGENT, PROVIDER } from '@/constants/roles.constant';
import { getRoleBasedRedirectPath } from '@/utils/roleBasedRedirect';
import { isDev } from './utils';

/**
 * Test suite for role-based redirects
 */
export function testRoleBasedRedirects() {
  isDev && console.log('=== Testing Role-Based Redirects ===\n');

  // Test role-based redirect paths
  isDev && console.log('1. Testing redirect paths:');

  // Test Admin role
  const adminPath = getRoleBasedRedirectPath(Role.ADMIN);
  isDev && console.log(`   Admin (${Role.ADMIN}) → ${adminPath}`);

  // Test Agent role
  const agentPath = getRoleBasedRedirectPath(Role.AGENT);
  isDev && console.log(`   Agent (${Role.AGENT}) → ${agentPath}`);

  // Test Provider role
  const providerPath = getRoleBasedRedirectPath(Role.PROVIDER);
  isDev && console.log(`   Provider (${Role.PROVIDER}) → ${providerPath}`);

  // Test with string constants
  isDev && console.log('\n2. Testing with string constants:');
  isDev && console.log(`   ADMIN (${ADMIN}) → ${getRoleBasedRedirectPath(ADMIN)}`);
  isDev && console.log(`   AGENT (${AGENT}) → ${getRoleBasedRedirectPath(AGENT)}`);
  isDev && console.log(`   PROVIDER (${PROVIDER}) → ${getRoleBasedRedirectPath(PROVIDER)}`);

  const unknownPath = getRoleBasedRedirectPath('UnknownRole');

  const isAdminCorrect = adminPath === '/dashboards/leads';
  const isAgentCorrect = agentPath === '/dashboards/projects';
  const isProviderCorrect = providerPath === '/dashboards/reclamations';
  const isFallbackCorrect = unknownPath === '/dashboards/leads';

  const allTestsPassed = isAdminCorrect && isAgentCorrect && isProviderCorrect && isFallbackCorrect;
  isDev && console.log(`\n=== All tests passed: ${allTestsPassed} ===`);

  return allTestsPassed;
}

// Export for use in browser console or testing
if (typeof window !== 'undefined') {
  (window as any).testRoleBasedRedirects = testRoleBasedRedirects;
}
