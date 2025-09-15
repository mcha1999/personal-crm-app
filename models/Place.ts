export interface Place {
  id: string;
  name: string;
  normalizedName: string;
  address?: string;
  latitude: number;
  longitude: number;
  category: 'restaurant' | 'cafe' | 'bar' | 'park' | 'office' | 'home' | 'other';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlaceWithStats extends Place {
  visitCount: number;
  lastVisit: Date;
  peopleCount: number;
  recentPeople: string[];
}

export function normalizePlaceName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/room\s*\d+/gi, '')
    .replace(/floor\s*\d+/gi, '')
    .replace(/building\s*[a-z]?\d*/gi, '')
    .replace(/suite\s*\d+/gi, '')
    .replace(/apt\s*\d+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}