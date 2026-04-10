'use client';

import ApolloIcon from '@/components/ui/ApolloIcon';
import { useEffect, useRef, useState } from 'react';

interface User {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

// Mock data for attendees - match the order in the image
const mockUsers: User[] = [
  { id: '2', name: 'Abert Claus', role: 'User' },
  { id: '3', name: 'Abkhezr Mahmood', role: 'User' },
  { id: '5', name: 'Achim Schlosser', role: 'User', avatar: 'A' },
  { id: '6', name: 'Adam Sellers', role: 'User' },
  { id: '7', name: 'Adolf Sebastian', role: 'User' },
  { id: '8', name: 'Albant Mathis', role: 'User' },
  { id: '9', name: 'Albert Hochdörfer', role: 'User' },
  { id: '10', name: 'Albrecht Baldauf', role: 'User' },
];

interface AttendeesSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (attendees: User[]) => void;
  initialAttendees?: User[];
}

const AttendeesSelector = ({
  isOpen,
  onClose,
  onSelect,
  initialAttendees = [],
}: AttendeesSelectorProps) => {
  const [selectedAttendees, setSelectedAttendees] = useState<User[]>(initialAttendees);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleAttendeeSelect = (user: User) => {
    // Check if the attendee is already selected
    if (!selectedAttendees.some((a) => a.id === user.id)) {
      const newAttendees = [...selectedAttendees, user];
      setSelectedAttendees(newAttendees);
      onSelect(newAttendees);
    }
  };

  const filteredUsers = mockUsers.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute -right-10 z-50 mt-1 w-64 rounded-md border border-gray-200 bg-white shadow-lg"
      style={{ maxHeight: '300px' }}
    >
      <div className="sticky top-0 border-b border-gray-100 bg-white p-2">
        <div className="relative">
          <input
            type="text"
            placeholder="Search attendees..."
            className="w-full rounded-md border border-gray-300 py-1 pr-2 pl-8 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
          <ApolloIcon
            name="search"
            className="absolute top-1/2 left-2 -translate-y-1/2 text-gray-400"
          />
        </div>
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: '250px' }}>
        {filteredUsers.map((user, index) => (
          <div
            key={user.id}
            className={`cursor-pointer px-3 py-2 ${selectedItemIndex === index ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
            onClick={() => handleAttendeeSelect(user)}
            onMouseEnter={() => setSelectedItemIndex(index)}
            onMouseLeave={() => setSelectedItemIndex(-1)}
          >
            {user.name}
          </div>
        ))}
        {filteredUsers.length === 0 && (
          <div className="p-3 text-center text-sm text-gray-500">No users found</div>
        )}
      </div>
    </div>
  );
};

export default AttendeesSelector;
