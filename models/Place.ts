export interface Place {
  id: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  category: 'restaurant' | 'cafe' | 'bar' | 'park' | 'office' | 'home' | 'other';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}