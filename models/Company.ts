export interface Company {
  id: string;
  name: string;
  industry?: string;
  website?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}