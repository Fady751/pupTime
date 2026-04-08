import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

export type PresenceStatus = 'online' | 'offline';

type AvatarBadgeProps = {
  label: string;
  imageUrl?: string;
  size?: number;
  status?: PresenceStatus;
  seed?: number;
};

const colorPalette = ['#2563EB', '#0EA5E9', '#14B8A6', '#7C3AED', '#F97316', '#059669'];

const getInitials = (label: string): string => {
  const parts = label
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word.charAt(0).toUpperCase());

  if (!parts.length) {
    return '?';
  }

  return parts.join('');
};

const AvatarBadge: React.FC<AvatarBadgeProps> = ({
  label,
  imageUrl,
  size = 46,
  status,
  seed = 0,
}) => {
  const backgroundColor = colorPalette[Math.abs(seed) % colorPalette.length];
  const dotSize = Math.max(9, Math.floor(size * 0.27));
  const statusStyle = status === 'online' ? styles.statusDotOnline : styles.statusDotOffline;

  return (
    <View style={styles.wrapper}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={[
            styles.image,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor,
            },
          ]}
        >
          <Text style={[styles.initials, { fontSize: Math.max(12, Math.floor(size * 0.33)) }]}>
            {getInitials(label)}
          </Text>
        </View>
      )}

      {status && (
        <View
          style={[
            styles.statusDot,
            statusStyle,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    resizeMode: 'cover',
  },
  initials: {
    color: '#F8FAFC',
    fontWeight: '800',
  },
  statusDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  statusDotOnline: {
    backgroundColor: '#22C55E',
  },
  statusDotOffline: {
    backgroundColor: '#94A3B8',
  },
});

export default AvatarBadge;
