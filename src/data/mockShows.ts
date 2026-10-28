export interface Location {
  city: string;
  state: string | null;
  country: string;
}

export interface Show {
  id: string;
  date: string;
  location: Location;
  venue: string;
  showName: string;
  lineup: string[];
}

export const shows: Show[] = [
  {
    id: '1',
    date: '2025-07-25',
    location: {
      city: 'Milford',
      state: 'CT',
      country: 'USA'
    },
    venue: 'United Presbyterian Church',
    showName: 'Milford CT Show',
    lineup: ['Spiter', 'Necralant', 'Hellfynder']
  },
  {
    id: '2',
    date: '2025-07-26',
    location: {
      city: 'Butler',
      state: 'NJ',
      country: 'USA'
    },
    venue: 'The Sanctuary',
    showName: 'New Jersey Show',
    lineup: ['Spiter', '...More']
  },
  {
    id: '3',
    date: '2025-08-30',
    location: {
      city: 'Montague',
      state: 'MA',
      country: 'USA'
    },
    venue: 'RPM Fest',
    showName: 'Ghoul Tour',
    lineup: ['Spiter', 'Ghoul', '...More']
  },
  {
    id: '4',
    date: '2025-08-31',
    location: {
      city: 'Syracuse',
      state: 'NY',
      country: 'USA'
    },
    venue: 'TBD',
    showName: 'Ghoul Tour',
    lineup: ['Spiter', 'Ghoul', 'No/Mas']
  },
  {
    id: '5',
    date: '2025-09-01',
    location: {
      city: 'Cleveland',
      state: 'OH',
      country: 'USA'
    },
    venue: 'TBD',
    showName: 'Ghoul Tour',
    lineup: ['Spiter', 'Ghoul', 'No/Mas']
  },
  {
    id: '6',
    date: '2025-09-02',
    location: {
      city: 'Pittsburgh',
      state: 'PA',
      country: 'USA'
    },
    venue: 'TBD',
    showName: 'Ghoul Tour',
    lineup: ['Spiter', 'Ghoul', 'No/Mas']
  },
  {
    id: '7',
    date: '2025-09-03',
    location: {
      city: 'Harrisburg',
      state: 'PA',
      country: 'USA'
    },
    venue: 'TBD',
    showName: 'Ghoul Tour',
    lineup: ['Spiter', 'Ghoul', 'No/Mas']
  },
  {
    id: '8',
    date: '2025-09-04',
    location: {
      city: 'Brooklyn',
      state: 'NY',
      country: 'USA'
    },
    venue: 'TBD',
    showName: 'Ghoul Tour',
    lineup: ['Spiter', 'Ghoul', 'No/Mas']
  },
  {
    id: '9',
    date: '2025-09-05',
    location: {
      city: 'Baltimore',
      state: 'MD',
      country: 'USA'
    },
    venue: 'TBD',
    showName: 'Ghoul Tour',
    lineup: ['Spiter', 'Ghoul', 'No/Mas']
  },
  {
    id: '10',
    date: '2025-09-06',
    location: {
      city: 'Philadelphia',
      state: 'PA',
      country: 'USA'
    },
    venue: 'TBD',
    showName: 'Ghoul Tour',
    lineup: ['Spiter', 'Ghoul', 'No/Mas']
  },
  {
    id: '11',
    date: '2025-09-17',
    location: {
      city: 'Mexicali',
      state: 'Baja California',
      country: 'Mexico'
    },
    venue: 'Malgro Cerveseria & Taproom',
    showName: 'Mexico Tour',
    lineup: ['Spiter', '...More']
  },
  {
    id: '12',
    date: '2025-09-18',
    location: {
      city: 'Morelia',
      state: 'Michoacán',
      country: 'Mexico'
    },
    venue: 'Cactux Gastrocultural Restaurante',
    showName: 'Mexico Tour',
    lineup: ['Spiter', '...More']
  },
  {
    id: '13',
    date: '2025-09-19',
    location: {
      city: 'Aguascalientes',
      state: 'Aguascalientes',
      country: 'Mexico'
    },
    venue: 'RockSi',
    showName: 'Mexico Tour',
    lineup: ['Spiter', '...More']
  },
  {
    id: '14',
    date: '2025-09-20',
    location: {
      city: 'Leon',
      state: 'Guanajuato',
      country: 'Mexico'
    },
    venue: 'Chain of Rock',
    showName: 'Mexico Tour',
    lineup: ['Spiter', '...More']
  },
  {
    id: '15',
    date: '2025-09-21',
    location: {
      city: 'Mexico City',
      state: 'Mexico City',
      country: 'Mexico'
    },
    venue: 'Gato Calavera',
    showName: 'Mexico Tour',
    lineup: ['Spiter', '...More']
  },
  {
    id: '16',
    date: '2025-09-24',
    location: {
      city: 'Los Angeles',
      state: 'California',
      country: 'USA'
    },
    venue: 'Knucklehead',
    showName: 'Los Angeles Show',
    lineup: ['Spiter', '...More']
  },
  {
    id: '17',
    date: '2025-10-25',
    location: {
      city: 'Stockholm',
      state: null,
      country: 'Sweden'
    },
    venue: 'Summoning of Darkness',
    showName: 'Spiter/Profanatica European Tour',
    lineup: ['Spiter', 'Profanatica']
  },
  {
    id: '18',
    date: '2025-10-26',
    location: {
      city: 'Turku',
      state: null,
      country: 'Finland'
    },
    venue: 'Nirvana',
    showName: 'Spiter/Profanatica European Tour',
    lineup: ['Spiter', 'Profanatica']
  },
  {
    id: '19',
    date: '2025-10-28',
    location: {
      city: 'Tallinn',
      state: null,
      country: 'Estonia'
    },
    venue: 'The Krypt',
    showName: 'Spiter/Profanatica European Tour',
    lineup: ['Spiter', 'Profanatica']
  },
  {
    id: '20',
    date: '2025-10-29',
    location: {
      city: 'Kaunas',
      state: null,
      country: 'Lithuania'
    },
    venue: 'Lemmy',
    showName: 'Spiter/Profanatica European Tour',
    lineup: ['Spiter', 'Profanatica']
  },
  {
    id: '21',
    date: '2025-10-30',
    location: {
      city: 'Warsaw',
      state: null,
      country: 'Poland'
    },
    venue: 'Voodoo Club',
    showName: 'Spiter/Profanatica European Tour',
    lineup: ['Spiter', 'Profanatica']
  },
  {
    id: '22',
    date: '2025-11-01',
    location: {
      city: 'Prague',
      state: null,
      country: 'Czech Republic'
    },
    venue: 'Prague Death Mass',
    showName: 'Spiter/Profanatica European Tour',
    lineup: ['Spiter', 'Profanatica']
  },
  {
    id: '23',
    date: '2025-11-02',
    location: {
      city: 'Linz',
      state: null,
      country: 'Austria'
    },
    venue: 'Kapu',
    showName: 'Spiter/Profanatica European Tour',
    lineup: ['Spiter', 'Profanatica']
  },
  {
    id: '24',
    date: '2025-11-03',
    location: {
      city: 'Bratislava',
      state: null,
      country: 'Slovakia'
    },
    venue: 'Zalar',
    showName: 'Spiter/Profanatica European Tour',
    lineup: ['Spiter', 'Profanatica']
  },
  {
    id: '25',
    date: '2025-11-05',
    location: {
      city: 'Illirska Bistrica',
      state: null,
      country: 'Slovenia'
    },
    venue: 'TBD',
    showName: 'Spiter/Profanatica European Tour',
    lineup: ['Spiter', 'Profanatica']
  },
  {
    id: '26',
    date: '2025-11-06',
    location: {
      city: 'Bologna',
      state: null,
      country: 'Italy'
    },
    venue: 'Freakout Club',
    showName: 'Spiter/Profanatica European Tour',
    lineup: ['Spiter', 'Profanatica']
  },
  {
    id: '27',
    date: '2025-11-07',
    location: {
      city: 'Erba',
      state: null,
      country: 'Italy'
    },
    venue: 'Centrale Rock',
    showName: 'Spiter/Profanatica European Tour',
    lineup: ['Spiter', 'Profanatica']
  },
  {
    id: '28',
    date: '2025-11-10',
    location: {
      city: 'Kortrijk',
      state: null,
      country: 'Belgium'
    },
    venue: 'DVG Club',
    showName: 'Spiter/Profanatica European Tour',
    lineup: ['Spiter', 'Profanatica']
  },
];
