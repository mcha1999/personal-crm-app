import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PlaceWithStats } from '@/models/Place';
import { PlaceDAO } from '@/database/PlaceDAO';
import { useDatabase } from '@/contexts/DatabaseContext';
import { MapPin, Coffee, Utensils, Home, Building2, Trees, Users, Calendar, TrendingUp } from 'lucide-react-native';

export const PlacesScreen: React.FC = () => {
  const [places, setPlaces] = useState<PlaceWithStats[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'frequent'>('frequent');
  const { database } = useDatabase();

  const loadData = useCallback(async () => {
    if (!database?.isAvailable()) return;
    
    try {
      const placeDAO = new PlaceDAO();
      const frequentPlaces = await placeDAO.getFrequentPlaces(20);
      setPlaces(frequentPlaces);
    } catch (error) {
      console.error('Failed to load places:', error);
    }
  }, [database]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getCategoryIcon = (category: PlaceWithStats['category']) => {
    switch (category) {
      case 'cafe': return <Coffee size={20} color="white" />;
      case 'restaurant': return <Utensils size={20} color="white" />;
      case 'home': return <Home size={20} color="white" />;
      case 'office': return <Building2 size={20} color="white" />;
      case 'park': return <Trees size={20} color="white" />;
      default: return <MapPin size={20} color="white" />;
    }
  };

  const getCategoryColor = (category: PlaceWithStats['category']) => {
    switch (category) {
      case 'cafe': return '#8B4513';
      case 'restaurant': return '#FF6B6B';
      case 'home': return '#4ECDC4';
      case 'office': return '#45B7D1';
      case 'park': return '#27AE60';
      default: return '#95A5A6';
    }
  };

  const categories: { key: 'all' | 'frequent'; label: string; icon: any }[] = [
    { key: 'frequent', label: 'Most Visited', icon: TrendingUp },
    { key: 'all', label: 'All Places', icon: MapPin },
  ];

  const filteredPlaces = places;

  const formatLastVisit = (date: Date) => {
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Places</Text>
        <Text style={styles.subtitle}>Your frequent meeting spots</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{places.length}</Text>
            <Text style={styles.statLabel}>Venues</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{places.reduce((sum, p) => sum + p.visitCount, 0)}</Text>
            <Text style={styles.statLabel}>Total Visits</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{places.reduce((sum, p) => sum + p.peopleCount, 0)}</Text>
            <Text style={styles.statLabel}>People Met</Text>
          </View>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        {categories.map(cat => {
          const IconComponent = cat.icon;
          return (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.filterChip,
                selectedCategory === cat.key && styles.filterChipActive
              ]}
              onPress={() => setSelectedCategory(cat.key)}
            >
              <IconComponent 
                size={16} 
                color={selectedCategory === cat.key ? 'white' : '#7F8C8D'} 
                style={styles.filterIcon}
              />
              <Text style={[
                styles.filterText,
                selectedCategory === cat.key && styles.filterTextActive
              ]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView style={styles.placesList}>
        {filteredPlaces.length > 0 ? (
          filteredPlaces.map((place, index) => (
            <TouchableOpacity key={place.id} style={styles.placeCard} activeOpacity={0.7}>
              <View style={styles.placeHeader}>
                <View style={[styles.iconContainer, { backgroundColor: getCategoryColor(place.category) }]}>
                  {getCategoryIcon(place.category)}
                </View>
                <View style={styles.placeInfo}>
                  <Text style={styles.placeName}>{place.name}</Text>
                  {place.address && (
                    <Text style={styles.placeAddress}>{place.address}</Text>
                  )}
                </View>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
              </View>
              
              <View style={styles.placeStats}>
                <View style={styles.statRow}>
                  <View style={styles.statItem}>
                    <Calendar size={14} color="#45B7D1" />
                    <Text style={styles.statText}>{place.visitCount} visits</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Users size={14} color="#27AE60" />
                    <Text style={styles.statText}>{place.peopleCount} people</Text>
                  </View>
                </View>
                
                {place.recentPeople.length > 0 && (
                  <View style={styles.peopleRow}>
                    <Text style={styles.peopleLabel}>Recent:</Text>
                    <Text style={styles.peopleText}>
                      {place.recentPeople.join(', ')}
                      {place.peopleCount > place.recentPeople.length && 
                        ` +${place.peopleCount - place.recentPeople.length} more`
                      }
                    </Text>
                  </View>
                )}
                
                <Text style={styles.lastVisit}>
                  Last visit: {formatLastVisit(place.lastVisit)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <MapPin size={48} color="#95A5A6" />
            <Text style={styles.emptyTitle}>No places yet</Text>
            <Text style={styles.emptySubtitle}>Places will appear here as you add interactions with locations</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F3F7',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    maxHeight: 60,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F3F7',
    marginHorizontal: 4,
    height: 36,
  },
  filterChipActive: {
    backgroundColor: '#45B7D1',
  },
  filterText: {
    fontSize: 14,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  filterTextActive: {
    color: 'white',
  },
  placesList: {
    flex: 1,
    paddingTop: 8,
  },
  placeCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  placeAddress: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  placeNotes: {
    fontSize: 13,
    color: '#95A5A6',
    fontStyle: 'italic',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F3F7',
  },
  statItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#45B7D1',
  },
  statLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 2,
  },
  filterIcon: {
    marginRight: 6,
  },
  placeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rankBadge: {
    backgroundColor: '#E8F4F8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#45B7D1',
  },
  placeStats: {
    gap: 8,
  },
  statRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statText: {
    fontSize: 12,
    color: '#7F8C8D',
    marginLeft: 4,
  },
  peopleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  peopleLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#7F8C8D',
  },
  peopleText: {
    fontSize: 12,
    color: '#95A5A6',
    flex: 1,
  },
  lastVisit: {
    fontSize: 11,
    color: '#BDC3C7',
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#7F8C8D',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#95A5A6',
    textAlign: 'center',
    lineHeight: 20,
  },
});