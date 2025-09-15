import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { PersonRepository } from '@/repositories/PersonRepository';
import { PersonCard } from '@/components/PersonCard';
import { Person } from '@/models/Person';
import { PersonScore } from '@/models/PersonScore';
import { mockPersonScores } from '@/repositories/mockData';
import { Search } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { GradientHeader } from '@/components/GradientHeader';
import { EmptyState } from '@/components/EmptyState';
import { theme } from '@/constants/theme';

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
    <View style={styles.container}>
      <GradientHeader
        title="Contacts"
        subtitle={`${filteredPeople.length} ${filteredPeople.length === 1 ? 'person' : 'people'}`}
        colors={[theme.colors.primary, theme.colors.secondary]}
      />
      
      <View style={styles.searchContainer}>
        <Search size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or tag..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={theme.colors.textLight}
        />
      </View>

      <FlashList
        data={filteredPeople}
        renderItem={renderPerson}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        estimatedItemSize={120}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title={searchQuery ? 'No contacts found' : 'No contacts yet'}
            subtitle={searchQuery ? 'Try a different search term' : 'Start adding people to stay connected'}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    paddingHorizontal: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.md,
    height: 48,
    ...theme.shadows.sm,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.text,
  },
  listContent: {
    paddingVertical: theme.spacing.sm,
  },
});