import { Member } from '../types';

// Mock board members
const MEMBERS: Member[] = [
  {
    id: 'member-1',
    name: 'TM Tanzil Mia',
    avatar: 'TM',
    email: 'tanzil@example.com',
  },
  {
    id: 'member-2',
    name: 'John Doe',
    avatar: 'JD',
    email: 'john@example.com',
  },
  {
    id: 'member-3',
    name: 'Jane Smith',
    avatar: 'JS',
    email: 'jane@example.com',
  },
  {
    id: 'member-4',
    name: 'Alice Johnson',
    avatar: 'AJ',
    email: 'alice@example.com',
  },
];

export const getMembers = (): Member[] => {
  return MEMBERS;
};

export const getMemberById = (id: string): Member | undefined => {
  return MEMBERS.find((member) => member.id === id);
};

export const getMembersByIds = (ids: string[]): Member[] => {
  return MEMBERS.filter((member) => ids.includes(member.id));
};

export const searchMembers = (query: string): Member[] => {
  if (!query.trim()) return MEMBERS;
  const lowerQuery = query.toLowerCase();
  return MEMBERS.filter(
    (member) =>
      member.name.toLowerCase().includes(lowerQuery) ||
      member.email?.toLowerCase().includes(lowerQuery)
  );
};
