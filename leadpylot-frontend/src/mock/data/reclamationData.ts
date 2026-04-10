interface Reclamation {
  id: string;
  project: string;
  lead: string;
  date_created: string;
  status: {
    status: string;
    response?: string;
  };
  replaced_lead?: string;
}

export const reclamationsData: Reclamation[] = [
  {
    id: '1',
    project: 'Alpha Campaign',
    lead: 'John Smith',
    date_created: '2025-04-15',
    status: {
      status: 'Open',
      response: 'Initial review pending.',
    },
  },
  {
    id: '2',
    project: 'Beta Launch',
    lead: 'Maria Garcia',
    date_created: '2025-04-16',
    status: {
      status: 'Closed',
      response: 'Issue resolved, lead contacted.',
    },
  },
  {
    id: '3',
    project: 'Website Redesign Q2',
    lead: 'David Lee',
    date_created: '2025-04-17',
    status: {
      status: 'Rejected',
      response: 'Insufficient information provided.',
    },
    replaced_lead: 'Emily White',
  },
  {
    id: '4',
    project: 'Lead Gen Initiative',
    lead: 'Sarah Chen',
    date_created: '2025-04-18',
    status: {
      status: 'Pending',
    },
  },
  {
    id: '5',
    project: 'Marketing Push May',
    lead: 'Michael Brown',
    date_created: '2025-04-19',
    status: {
      status: 'Approved',
      response: 'Lead replacement approved.',
    },
    replaced_lead: 'Jessica Miller',
  },
  {
    id: '6',
    project: 'Alpha Campaign',
    lead: 'Chris Davis',
    date_created: '2025-04-20',
    status: {
      status: 'Investigating',
    },
  },
  {
    id: '7',
    project: 'Beta Launch',
    lead: 'Laura Wilson',
    date_created: '2025-04-21',
    status: {
      status: 'Open',
    },
  },
  {
    id: '8',
    project: 'Website Redesign Q2',
    lead: 'James Rodriguez',
    date_created: '2025-04-22',
    status: {
      status: 'Closed',
      response: 'Duplicate reclamation.',
    },
  },
  {
    id: '9',
    project: 'Lead Gen Initiative',
    lead: 'Patricia Martinez',
    date_created: '2025-04-23',
    status: {
      status: 'Rejected',
      response: 'Outside of reclamation period.',
    },
  },
  {
    id: '10',
    project: 'Marketing Push May',
    lead: 'Robert Taylor',
    date_created: '2025-04-24',
    status: {
      status: 'Pending',
    },
  },
  {
    id: '11',
    project: 'Alpha Campaign',
    lead: 'Jennifer Anderson',
    date_created: '2025-04-25',
    status: {
      status: 'Approved',
      response: 'Credit issued.',
    },
  },
  {
    id: '12',
    project: 'Beta Launch',
    lead: 'William Thomas',
    date_created: '2025-04-26',
    status: {
      status: 'Investigating',
    },
  },
  {
    id: '13',
    project: 'Website Redesign Q2',
    lead: 'Linda Jackson',
    date_created: '2025-04-27',
    status: {
      status: 'Open',
    },
  },
  {
    id: '14',
    project: 'Lead Gen Initiative',
    lead: 'Richard White',
    date_created: '2025-04-28',
    status: {
      status: 'Closed',
      response: 'Resolved after investigation.',
    },
  },
  {
    id: '15',
    project: 'Marketing Push May',
    lead: 'Susan Harris',
    date_created: '2025-04-29',
    status: {
      status: 'Rejected',
      response: 'Incorrect lead data cited.',
    },
    replaced_lead: 'Daniel Clark',
  },
  {
    id: '16',
    project: 'Alpha Campaign',
    lead: 'Joseph Lewis',
    date_created: '2025-04-30',
    status: {
      status: 'Pending',
    },
  },
  {
    id: '17',
    project: 'Beta Launch',
    lead: 'Karen Robinson',
    date_created: '2025-05-01',
    status: {
      status: 'Approved',
      response: 'Lead replaced as requested.',
    },
    replaced_lead: 'Mark Walker',
  },
  {
    id: '18',
    project: 'Website Redesign Q2',
    lead: 'Charles Perez',
    date_created: '2025-05-01',
    status: {
      status: 'Investigating',
    },
  },
  {
    id: '19',
    project: 'Lead Gen Initiative',
    lead: 'Nancy Hall',
    date_created: '2025-05-02',
    status: {
      status: 'Open',
    },
  },
  {
    id: '20',
    project: 'Marketing Push May',
    lead: 'Thomas Young',
    date_created: '2025-05-02',
    status: {
      status: 'Closed',
      response: 'Client withdrew reclamation.',
    },
  },
  {
    id: '21',
    project: 'Project Phoenix',
    lead: 'Betty Allen',
    date_created: '2025-03-10',
    status: {
      status: 'Rejected',
      response: 'Data does not match criteria.',
    },
  },
  {
    id: '22',
    project: 'Project Phoenix',
    lead: 'Paul King',
    date_created: '2025-03-11',
    status: {
      status: 'Pending',
    },
  },
  {
    id: '23',
    project: 'Q1 Sales Drive',
    lead: 'Steven Wright',
    date_created: '2025-03-12',
    status: {
      status: 'Approved',
      response: 'Approved after review.',
    },
  },
  {
    id: '24',
    project: 'Q1 Sales Drive',
    lead: 'Sandra Scott',
    date_created: '2025-03-13',
    status: {
      status: 'Investigating',
    },
  },
  {
    id: '25',
    project: 'New Market Entry',
    lead: 'Kevin Green',
    date_created: '2025-03-14',
    status: {
      status: 'Open',
    },
  },
  {
    id: '26',
    project: 'New Market Entry',
    lead: 'Donna Adams',
    date_created: '2025-03-15',
    status: {
      status: 'Closed',
      response: 'Lead successfully replaced.',
    },
    replaced_lead: 'George Baker',
  },
  {
    id: '27',
    project: 'Alpha Campaign',
    lead: 'Brian Nelson',
    date_created: '2025-03-16',
    status: {
      status: 'Rejected',
      response: 'Already processed.',
    },
  },
  {
    id: '28',
    project: 'Beta Launch',
    lead: 'Kimberly Carter',
    date_created: '2025-03-17',
    status: {
      status: 'Pending',
    },
  },
  {
    id: '29',
    project: 'Website Redesign Q2',
    lead: 'Jason Mitchell',
    date_created: '2025-03-18',
    status: {
      status: 'Approved',
      response: 'Valid claim, replacement pending.',
    },
  },
  {
    id: '30',
    project: 'Lead Gen Initiative',
    lead: 'Cynthia Roberts',
    date_created: '2025-03-19',
    status: {
      status: 'Investigating',
    },
  },
  {
    id: '31',
    project: 'Marketing Push May',
    lead: 'Matthew Turner',
    date_created: '2025-03-20',
    status: {
      status: 'Open',
    },
  },
  {
    id: '32',
    project: 'Project Phoenix',
    lead: 'Angela Phillips',
    date_created: '2025-03-21',
    status: {
      status: 'Closed',
      response: 'System error identified and fixed.',
    },
  },
  {
    id: '33',
    project: 'Q1 Sales Drive',
    lead: 'Gary Campbell',
    date_created: '2025-03-22',
    status: {
      status: 'Rejected',
      response: 'Lead quality within acceptable parameters.',
    },
  },
  {
    id: '34',
    project: 'New Market Entry',
    lead: 'Michelle Parker',
    date_created: '2025-03-23',
    status: {
      status: 'Pending',
    },
  },
  {
    id: '35',
    project: 'Alpha Campaign',
    lead: 'Edward Evans',
    date_created: '2025-03-24',
    status: {
      status: 'Approved',
      response: 'Replacement lead provided.',
    },
    replaced_lead: 'Sharon Edwards',
  },
  {
    id: '36',
    project: 'Beta Launch',
    lead: 'Ronald Collins',
    date_created: '2025-03-25',
    status: {
      status: 'Investigating',
    },
  },
  {
    id: '37',
    project: 'Website Redesign Q2',
    lead: 'Deborah Stewart',
    date_created: '2025-03-26',
    status: {
      status: 'Open',
    },
  },
  {
    id: '38',
    project: 'Lead Gen Initiative',
    lead: 'Timothy Sanchez',
    date_created: '2025-03-27',
    status: {
      status: 'Closed',
      response: 'Handled via support ticket #12345.',
    },
  },
  {
    id: '39',
    project: 'Marketing Push May',
    lead: 'Amanda Morris',
    date_created: '2025-03-28',
    status: {
      status: 'Rejected',
      response: 'Submitted after deadline.',
    },
  },
  {
    id: '40',
    project: 'Project Phoenix',
    lead: 'Brandon Rogers',
    date_created: '2025-03-29',
    status: {
      status: 'Pending',
    },
  },
  {
    id: '41',
    project: 'Q1 Sales Drive',
    lead: 'Stephanie Reed',
    date_created: '2025-03-30',
    status: {
      status: 'Approved',
      response: 'Partial credit approved.',
    },
  },
  {
    id: '42',
    project: 'New Market Entry',
    lead: 'Jeffrey Cook',
    date_created: '2025-03-31',
    status: {
      status: 'Investigating',
    },
  },
  {
    id: '43',
    project: 'Alpha Campaign',
    lead: 'Rebecca Morgan',
    date_created: '2025-04-01',
    status: {
      status: 'Open',
    },
  },
  {
    id: '44',
    project: 'Beta Launch',
    lead: 'Ryan Bell',
    date_created: '2025-04-02',
    status: {
      status: 'Closed',
      response: 'Lead confirmed valid by sales team.',
    },
  },
  {
    id: '45',
    project: 'Website Redesign Q2',
    lead: 'Sharon Murphy',
    date_created: '2025-04-03',
    status: {
      status: 'Rejected',
      response: 'No response from claimant.',
    },
    replaced_lead: 'Justin Bailey',
  },
  {
    id: '46',
    project: 'Lead Gen Initiative',
    lead: 'Laura Rivera',
    date_created: '2025-04-04',
    status: {
      status: 'Pending',
    },
  },
  {
    id: '47',
    project: 'Marketing Push May',
    lead: 'Eric Cooper',
    date_created: '2025-04-05',
    status: {
      status: 'Approved',
      response: 'Approved, replacement sent.',
    },
    replaced_lead: 'Melissa Richardson',
  },
  {
    id: '48',
    project: 'Project Phoenix',
    lead: 'Nicole Cox',
    date_created: '2025-04-06',
    status: {
      status: 'Investigating',
    },
  },
  {
    id: '49',
    project: 'Q1 Sales Drive',
    lead: 'Jonathan Howard',
    date_created: '2025-04-07',
    status: {
      status: 'Open',
    },
  },
  {
    id: '50',
    project: 'New Market Entry',
    lead: 'Kathleen Ward',
    date_created: '2025-04-08',
    status: {
      status: 'Closed',
      response: 'Issue resolved internally.',
    },
  },
];
