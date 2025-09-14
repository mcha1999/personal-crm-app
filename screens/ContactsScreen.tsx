import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PersonRepository } from '@/repositories/PersonRepository';
import { PersonCard } from '@/components/PersonCard';
import { Person } from '@/models/Person';
import { PersonScore } from '@/models/PersonScore';
import { mockPersonScores } from '@/repositories/mockData';
import { Search } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export const ContactsScreen: React.FC = () => {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [filteredPeople, setFilteredPeople] = useState<Person[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [scoresMap, setScoresMap] = useState<Map<string, PersonScore>>(new Map());

  const personRepo = new PersonRepository();

  const loadData = async () => {
    const allPeople = await personRepo.getAllPeople();
    const scores = new Map(mockPersonScores.map(s => [s.personId, s]));
    
    // Sort by relationship score
    const sortedPeople = allPeople.sort((a, b) => {
      const scoreA = scores.get(a.id)?.relationshipScore || 0;
      const scoreB = scores.get(b.id)?.relationshipScore || 0;
      return scoreB - scoreA;
    });

    setPeople(sortedPeople);
    setFilteredPeople(sortedPeople);
    setScoresMap(scores);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPeople(people);
    } else {
      const filtered = people.filter(person => {
        const query = searchQuery.toLowerCase();
        return (
          person.firstName.toLowerCase().includes(query) ||
          person.lastName.toLowerCase().includes(query) ||
          person.nickname?.toLowerCase().includes(query) ||
          person.tags.some(tag => tag.toLowerCase().includes(query))
        );
      });
      setFilteredPeople(filtered);
    }
  }, [searchQuery, people]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const renderPerson = ({ item }: { item: Person }) => (
    <PersonCard
      person={item}
      score={scoresMap.get(item.id)}
      onPress={() => router.push(`/contact/${item.id}`)}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Contacts</Text>
        <View style={styles.searchContainer}>
          <Search size={20} color="#95A5A6" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or tag..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#95A5A6"
          />
        </View>
      </View>

      <FlatList
        data={filteredPeople}
        renderItem={renderPerson}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No contacts found' : 'No contacts yet'}
            </Text>
          </View>
        }
      />
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
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2C3E50',
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#95A5A6',
  },
});