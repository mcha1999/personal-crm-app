import { Place } from '@/models/Place';
import { mockPlaces } from './mockData';

export class PlaceRepository {
  async getAllPlaces(): Promise<Place[]> {
    return mockPlaces;
  }

  async getPlaceById(id: string): Promise<Place | undefined> {
    return mockPlaces.find(p => p.id === id);
  }

  async getPlacesByCategory(category: Place['category']): Promise<Place[]> {
    return mockPlaces.filter(p => p.category === category);
  }
}