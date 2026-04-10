import { NavigationTree } from '@/@types/navigation';

export function filterNavigationByRole(tree: NavigationTree[], role: string): NavigationTree[] {
  const upperCaseRole = role.toUpperCase();
  return tree
    .filter((item) =>
      item.authority.some((authRole: string) => authRole.toUpperCase() === upperCaseRole)
    )
    .map((item) => ({
      ...item,
      subMenu: item.subMenu.length ? filterNavigationByRole(item.subMenu, role) : [],
    }));
}
