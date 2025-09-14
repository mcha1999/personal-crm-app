import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import JSZip from 'jszip';
import { Database } from './Database';
import { PersonDAO } from './PersonDAO';
import { InteractionDAO } from './InteractionDAO';
import { TaskDAO } from './TaskDAO';
import { PlaceDAO } from './PlaceDAO';
import { Platform } from 'react-native';

export class LocalExport {
  private db: Database;
  private personDAO: PersonDAO;
  private interactionDAO: InteractionDAO;
  private taskDAO: TaskDAO;
  private placeDAO: PlaceDAO;

  constructor() {
    this.db = Database.getInstance();
    this.personDAO = new PersonDAO();
    this.interactionDAO = new InteractionDAO();
    this.taskDAO = new TaskDAO();
    this.placeDAO = new PlaceDAO();
  }

  async exportData(): Promise<void> {
    if (Platform.OS === 'web') {
      throw new Error('Export is not available on web platform');
    }
    
    try {
      console.log('Starting data export...');
      
      const zip = new JSZip();
      
      // Export database as JSON
      const exportData = await this.collectAllData();
      zip.file('kin_data.json', JSON.stringify(exportData, null, 2));
      
      // Add metadata
      const metadata = {
        exportDate: new Date().toISOString(),
        version: '1.0.0',
        platform: Platform.OS,
        recordCounts: {
          persons: exportData.persons.length,
          interactions: exportData.interactions.length,
          tasks: exportData.tasks.length,
          places: exportData.places.length,
        }
      };
      zip.file('metadata.json', JSON.stringify(metadata, null, 2));
      
      // Generate the zip file
      const zipContent = await zip.generateAsync({ type: 'base64' });
      
      // Save to file system
      const fileName = `kin_export_${new Date().getTime()}.zip`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(fileUri, zipContent, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      console.log('Export file created:', fileUri);
      
      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/zip',
          dialogTitle: 'Export Kin Data',
        });
      } else {
        console.log('Sharing is not available on this platform');
        throw new Error('Sharing is not available on this platform');
      }
      
      console.log('Export completed successfully');
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }

  private async collectAllData() {
    const [persons, interactions, tasks, places] = await Promise.all([
      this.personDAO.getAllPersons(),
      this.interactionDAO.getRecent(1000), // Use method that returns proper Interaction objects
      this.taskDAO.getAllTasks(),
      this.placeDAO.getAllPlaces(),
    ]);

    // Convert dates to ISO strings for JSON serialization
    return {
      persons: persons.map(p => ({
        ...p,
        birthday: p.birthday?.toISOString(),
        lastInteraction: p.lastInteraction?.toISOString(),
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
      interactions: interactions.map(i => ({
        ...i,
        date: i.date instanceof Date ? i.date.toISOString() : i.date,
        createdAt: i.createdAt instanceof Date ? i.createdAt.toISOString() : i.createdAt,
        updatedAt: i.updatedAt instanceof Date ? i.updatedAt.toISOString() : i.updatedAt,
      })),
      tasks: tasks.map(t => ({
        ...t,
        dueDate: t.dueDate?.toISOString(),
        completedAt: t.completedAt?.toISOString(),
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
      places: places.map(p => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    };
  }

  async importData(fileUri: string): Promise<void> {
    if (Platform.OS === 'web') {
      throw new Error('Import is not available on web platform');
    }
    
    try {
      console.log('Starting data import from:', fileUri);
      
      // Read the zip file
      const zipContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      const zip = await JSZip.loadAsync(zipContent, { base64: true });
      
      // Extract and parse the data
      const dataFile = zip.file('kin_data.json');
      if (!dataFile) {
        throw new Error('Invalid export file: missing kin_data.json');
      }
      
      const dataContent = await dataFile.async('string');
      const importData = JSON.parse(dataContent);
      
      // Import data (this is a simplified version - you might want to handle conflicts)
      console.log('Importing persons...');
      for (const person of importData.persons) {
        await this.personDAO.create({
          firstName: person.firstName,
          lastName: person.lastName,
          nickname: person.nickname,
          email: person.email,
          phone: person.phone,
          birthday: person.birthday ? new Date(person.birthday) : undefined,
          avatar: person.avatar,
          relationship: person.relationship,
          tags: person.tags,
          notes: person.notes,
          companyId: person.companyId,
          lastInteraction: person.lastInteraction ? new Date(person.lastInteraction) : undefined,
        });
      }
      
      console.log('Importing places...');
      for (const place of importData.places) {
        await this.placeDAO.create({
          name: place.name,
          address: place.address,
          latitude: place.latitude,
          longitude: place.longitude,
          category: place.category,
        });
      }
      
      console.log('Importing interactions...');
      for (const interaction of importData.interactions) {
        await this.interactionDAO.create({
          personId: interaction.personId,
          type: interaction.type,
          date: new Date(interaction.date),
          notes: interaction.notes,
          placeId: interaction.placeId,
        });
      }
      
      console.log('Importing tasks...');
      for (const task of importData.tasks) {
        await this.taskDAO.create({
          title: task.title,
          description: task.description,
          dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
          completed: task.completed,
          completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
          type: task.type,
          personId: task.personId,
        });
      }
      
      console.log('Import completed successfully');
    } catch (error) {
      console.error('Import failed:', error);
      throw error;
    }
  }

  async getDatabaseSize(): Promise<number> {
    if (Platform.OS === 'web') {
      return 0;
    }
    
    try {
      const dbPath = `${FileSystem.documentDirectory}SQLite/kin.db`;
      const info = await FileSystem.getInfoAsync(dbPath);
      return info.exists && 'size' in info ? info.size : 0;
    } catch (error) {
      console.error('Failed to get database size:', error);
      return 0;
    }
  }

  async clearAllData(): Promise<void> {
    if (Platform.OS === 'web') {
      console.log('Clear data not available on web');
      return;
    }
    
    try {
      console.log('Clearing all data...');
      
      // Close and reinitialize the database
      await this.db.close();
      await this.db.init();
      
      console.log('All data cleared successfully');
    } catch (error) {
      console.error('Failed to clear data:', error);
      throw error;
    }
  }
}