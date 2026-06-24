import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface InboxConversationItemProps {
  item: any;
  currentUserId: string | null;
  onPress: (id: string) => void;
}

const InboxConversationItemComponent = ({ item, currentUserId, onPress }: InboxConversationItemProps) => {
  const isUnread = item.unreadCount > 0;
  const sentByMe = item.lastMsgSenderId === currentUserId;

  return (
    <Pressable
      onPress={() => onPress(item.id)}
      style={[styles.row, isUnread && styles.rowUnread]}
    >
      <Image source={{ uri: item.photoUrl }} style={styles.avatar} contentFit="cover" transition={200} cachePolicy="memory-disk" />
      
      {isUnread && <View style={styles.unreadDot} />}

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={[styles.name, isUnread && styles.nameUnread]}>{item.name}{item.age ? `, ${item.age}` : ''}</Text>
          <Text style={[styles.time, isUnread && styles.timeUnread]}>{item.time}</Text>
        </View>
        <View style={styles.messageRow}>
          {sentByMe && (
            <MaterialCommunityIcons 
              name={item.lastMsgIsRead ? "check-all" : "check"} 
              size={16} 
              color={item.lastMsgIsRead ? "#49C788" : "#888"} 
              style={{ marginRight: 4 }} 
            />
          )}
          <Text
            numberOfLines={1}
            style={[styles.lastMessage, isUnread && styles.lastMessageUnread]}
          >
            {item.lastMessage}
          </Text>
        </View>
      </View>

      {isUnread && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
        </View>
      )}
    </Pressable>
  );
};

export const InboxConversationItem = memo(InboxConversationItemComponent, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.lastMessage === nextProps.item.lastMessage &&
    prevProps.item.unreadCount === nextProps.item.unreadCount &&
    prevProps.item.lastMsgIsRead === nextProps.item.lastMsgIsRead
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.02)',
  },
  rowUnread: {
    backgroundColor: 'rgba(73, 199, 136, 0.02)',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#222',
  },
  unreadDot: {
    position: 'absolute',
    left: 62,
    top: 16,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#49C788',
    borderWidth: 2.5,
    borderColor: '#000',
    zIndex: 10,
  },
  content: {
    flex: 1,
    marginLeft: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ccc',
  },
  nameUnread: {
    color: '#fff',
    fontWeight: '800',
  },
  time: {
    fontSize: 12,
    color: '#666',
  },
  timeUnread: {
    color: '#49C788',
    fontWeight: '600',
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  lastMessageUnread: {
    color: '#e0e0e0',
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: '#49C788',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadBadgeText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '800',
  },
});
