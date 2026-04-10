// import React from 'react';
// import { CustomFieldDefinition, CustomFieldValue, Member, Label } from '../../types';
// import { getMembers } from '../../_data/members-data';
// import { getLabels } from '../../_data/labels-data';
// import { FileText, CheckSquare, Calendar, Hash, Users, Tag, CheckSquare2 } from 'lucide-react';

// interface CustomFieldBadgeProps {
//   fieldDefinition: CustomFieldDefinition;
//   fieldValue: CustomFieldValue;
//   onClick?: () => void;
//   className?: string;
// }

// export const CustomFieldBadge: React.FC<CustomFieldBadgeProps> = ({
//   fieldDefinition,
//   fieldValue,
//   onClick,
//   className = '',
// }) => {
//   const formatValue = (): string => {
//     const value = fieldValue.value;
    
//     if (value === null || value === undefined || value === '') {
//       return 'Not set';
//     }

//     switch (fieldDefinition.type) {
//       case 'checkbox':
//         return value ? 'Yes' : 'No';
//       case 'date':
//         return new Date(value).toLocaleDateString();
//       case 'number':
//         return value.toString();
//       case 'todo':
//         if (Array.isArray(value) && value.length > 0) {
//           const completed = value.filter((t: any) => t.completed).length;
//           return `${completed}/${value.length} completed`;
//         }
//         return 'No todos';
//       case 'member':
//         const members = getMembers();
//         const member = Array.isArray(value) 
//           ? members.find((m) => value.includes(m.id))
//           : members.find((m) => m.id === value);
//         return member ? member.name : 'Unknown';
//       case 'label':
//         const labels = getLabels();
//         const label = Array.isArray(value)
//           ? labels.find((l) => value.includes(l.id))
//           : labels.find((l) => l.id === value);
//         return label ? label.name : 'Unknown';
//       default:
//         return String(value);
//     }
//   };

//   const getTypeColor = (): { bg: string; text: string; border: string; iconBg: string } => {
//     switch (fieldDefinition.type) {
//       case 'text':
//       case 'textarea':
//         return {
//           bg: 'bg-blue-50',
//           text: 'text-blue-700',
//           border: 'border-blue-200',
//           iconBg: 'bg-blue-100',
//         };
//       case 'number':
//         return {
//           bg: 'bg-purple-50',
//           text: 'text-purple-700',
//           border: 'border-purple-200',
//           iconBg: 'bg-purple-100',
//         };
//       case 'date':
//         return {
//           bg: 'bg-green-50',
//           text: 'text-green-700',
//           border: 'border-green-200',
//           iconBg: 'bg-green-100',
//         };
//       case 'select':
//         return {
//           bg: 'bg-orange-50',
//           text: 'text-orange-700',
//           border: 'border-orange-200',
//           iconBg: 'bg-orange-100',
//         };
//       case 'checkbox':
//         return {
//           bg: 'bg-gray-50',
//           text: 'text-gray-700',
//           border: 'border-gray-200',
//           iconBg: 'bg-gray-100',
//         };
//       case 'member':
//         return {
//           bg: 'bg-indigo-50',
//           text: 'text-indigo-700',
//           border: 'border-indigo-200',
//           iconBg: 'bg-indigo-100',
//         };
//       case 'label':
//         return {
//           bg: 'bg-pink-50',
//           text: 'text-pink-700',
//           border: 'border-pink-200',
//           iconBg: 'bg-pink-100',
//         };
//       default:
//         return {
//           bg: 'bg-gray-50',
//           text: 'text-gray-700',
//           border: 'border-gray-200',
//           iconBg: 'bg-gray-100',
//         };
//     }
//   };

//   const getTypeIcon = () => {
//     const colors = getTypeColor();
//     switch (fieldDefinition.type) {
//       case 'text':
//       case 'textarea':
//         return <FileText className={`h-3.5 w-3.5 ${colors.text}`} />;
//       case 'number':
//         return <Hash className={`h-3.5 w-3.5 ${colors.text}`} />;
//       case 'date':
//         return <Calendar className={`h-3.5 w-3.5 ${colors.text}`} />;
//       case 'checkbox':
//         return <CheckSquare className={`h-3.5 w-3.5 ${colors.text}`} />;
//       case 'member':
//         return <Users className={`h-3.5 w-3.5 ${colors.text}`} />;
//       case 'label':
//         return <Tag className={`h-3.5 w-3.5 ${colors.text}`} />;
//       case 'todo':
//         return <CheckSquare className={`h-3.5 w-3.5 ${colors.text}`} />;
//       default:
//         return <FileText className={`h-3.5 w-3.5 ${colors.text}`} />;
//     }
//   };

//   const colors = getTypeColor();

//   return (
//     <div
//       onClick={onClick}
//       className={`group inline-flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-all ${
//         onClick ? 'cursor-pointer hover:shadow-md active:scale-95' : ''
//       } ${colors.bg} ${colors.border} ${colors.text} ${className}`}
//     >
//       {/* Icon */}
//       <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${colors.iconBg}`}>
//         {getTypeIcon()}
//       </div>

//       {/* Content */}
//       <div className="flex flex-col">
//         <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
//           {fieldDefinition.name}
//         </span>
//         <span className="font-semibold leading-tight">{formatValue()}</span>
//       </div>
//     </div>
//   );
// };
