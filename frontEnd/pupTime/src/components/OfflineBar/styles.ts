import { StyleSheet } from 'react-native';
export const styles = StyleSheet.create({
  offlineBanner: {
    // position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ef444477',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  offlineText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});