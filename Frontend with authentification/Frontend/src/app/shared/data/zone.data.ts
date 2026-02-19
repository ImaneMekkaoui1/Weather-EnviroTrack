export interface Zone {
    description: string;
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    type: 'cheminée' | 'port' | 'usine' | 'autre';
  }

export const ZONES: Zone[] = [
  {
    id: 1, name: 'Cheminée Nord', latitude: 32.283, longitude: -8.530, type: 'cheminée',
    description: ""
  },
  {
    id: 2, name: 'Port Jorf', latitude: 32.290, longitude: -8.540, type: 'port',
    description: ""
  },
  // ... toutes les zones réelles de Jorf Lasfar
];