import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Interaction } from '@/models/Interaction';
import { Person } from '@/models/Person';
import { Place } from '@/models/Place';
import { MessageCircle, Phone, Mail, Users, MapPin, Clock } from 'lucide-react-native';

interface InteractionItemProps {
  interaction: Interaction;
  person: Person;
  place?: Place;
}

export const InteractionItem: React.FC<InteractionItemProps> = ({ interaction, person, place }) => {
  const getIcon = () => {
    switch (interaction.type) {
      case 'message': return <MessageCircle size={20} color="#4ECDC4" />;
      case 'call': return <Phone size={20} color="#45B7D1" />;
      case 'email': return <Mail size={20} color="#95A5A6" />;
      case 'meeting': return <Users size={20} color="#FF6B6B" />;
      default: return <MessageCircle size={20} color="#95A5A6" />;
    }
  };

  const formatTime = () => {
    const now = new Date();
    const date = new Date(interaction.date);
    const hours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        {getIcon()}
      </View>
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.personName}>
            {person.firstName} {person.lastName}
          </Text>
          <Text style={styles.time}>{formatTime()}</Text>
        </View>
        
        <Text style={styles.type}>
          {interaction.type.charAt(0).toUpperCase() + interaction.type.slice(1)}
          {interaction.duration && ` • ${interaction.duration} min`}
        </Text>
        
        {place && (
          <View style={styles.placeRow}>
            <MapPin size={12} color="#95A5A6" />
            <Text style={styles.place}>{place.name}</Text>
          </View>
        )}
        
        {interaction.notes && (
          <Text style={styles.notes}>{interaction.notes}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F3F7',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  personName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  time: {
    fontSize: 12,
    color: '#95A5A6',
  },
  type: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  place: {
    fontSize: 12,
    color: '#95A5A6',
  },
  notes: {
    fontSize: 13,
    color: '#95A5A6',
    marginTop: 6,
    fontStyle: 'italic',
  },
});