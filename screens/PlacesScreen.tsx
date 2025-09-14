import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PlaceRepository } from '@/repositories/PlaceRepository';
import { Place } from '@/models/Place';
import { MapPin, Coffee, Utensils, Home, Building2, Trees, MoreHorizontal } from 'lucide-react-native';

export const PlacesScreen: React.FC = () => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Place['category'] | 'all'>('all');

  const placeRepo = new PlaceRepository();

  const loadData = async () => {
    const allPlaces = await placeRepo.getAllPlaces();
    setPlaces(allPlaces);
  };

  useEffect(() => {
    loadData();
  }, []);

  const getCategoryIcon = (category: Place['category']) => {
    switch (category) {
      case 'cafe': return <Coffee size={20} color="white" />;
      case 'restaurant': return <Utensils size={20} color="white" />;
      case 'home': return <Home size={20} color="white" />;
      case 'office': return <Building2 size={20} color="white" />;
      case 'park': return <Trees size={20} color="white" />;
      default: return <MapPin size={20} color="white" />;
    }
  };

  const getCategoryColor = (category: Place['category']) => {
    switch (category) {
      case 'cafe': return '#8B4513';
      case 'restaurant': return '#FF6B6B';
      case 'home': return '#4ECDC4';
      case 'office': return '#45B7D1';
      case 'park': return '#27AE60';
      default: return '#95A5A6';
    }
  };

  const categories: Array<{ key: Place['category'] | 'all'; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'restaurant', label: 'Restaurants' },
    { key: 'cafe', label: 'Cafes' },
    { key: 'park', label: 'Parks' },
    { key: 'office', label: 'Offices' },
    { key: 'home', label: 'Homes' },
  ];

  const filteredPlaces = selectedCategory === 'all' 
    ? places 
    : places.filter(p => p.category === selectedCategory);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Places</Text>
        <Text style={styles.subtitle}>Where you meet and connect</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat.key}
            style={[
              styles.filterChip,
              selectedCategory === cat.key && styles.filterChipActive
            ]}
            onPress={() => setSelectedCategory(cat.key)}
          >
            <Text style={[
              styles.filterText,
              selectedCategory === cat.key && styles.filterTextActive
            ]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.placesList}>
        {filteredPlaces.map(place => (
          <TouchableOpacity key={place.id} style={styles.placeCard} activeOpacity={0.7}>
            <View style={[styles.iconContainer, { backgroundColor: getCategoryColor(place.category) }]}>
              {getCategoryIcon(place.category)}
            </View>
            <View style={styles.placeInfo}>
              <Text style={styles.placeName}>{place.name}</Text>
              {place.address && (
                <Text style={styles.placeAddress}>{place.address}</Text>
              )}
              {place.notes && (
                <Text style={styles.placeNotes}>{place.notes}</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
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
    flexDirection: 'row',
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
});