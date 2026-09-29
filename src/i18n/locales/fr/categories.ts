import type { categories as en } from '@/i18n/locales/en/categories';
import type { Translation } from '@/i18n/translation.types';

/** French display names for the seeded default categories. */
export const categories: Translation<typeof en> = {
  food: 'Alimentation',
  groceries: 'Courses',
  restaurant: 'Restaurant',
  snacks: 'Grignotages',
  transport: 'Transport',
  taxi: 'Taxi',
  fuel: 'Carburant',
  publicTransport: 'Transports en commun',
  bills: 'Factures',
  rent: 'Loyer',
  electricity: 'Électricité',
  water: 'Eau',
  internet: 'Internet',
  phone: 'Téléphone',
  health: 'Santé',
  pharmacy: 'Pharmacie',
  doctor: 'Médecin',
  entertainment: 'Loisirs',
  streaming: 'Streaming',
  outings: 'Sorties',
  education: 'Éducation',
  books: 'Livres',
  courses: 'Formations',
  shopping: 'Achats',
  clothing: 'Vêtements',
  household: 'Maison',
  other: 'Autre',
  miscellaneous: 'Divers',
};
