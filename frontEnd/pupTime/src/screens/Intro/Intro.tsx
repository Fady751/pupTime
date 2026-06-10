import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  useColorScheme,
  StatusBar,
  Easing,
} from 'react-native';
import { getColors } from '../../constants/colors';
import { Sparkles, BrainCircuit, Mic, Layers, ArrowRight, CheckCircle2 } from 'lucide-react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'The Future of Productivity',
    description: 'Experience a seamless blend of intelligent organization and stunning design. Your ultimate digital companion.',
    icon: Sparkles,
  },
  {
    id: '2',
    title: 'AI-Powered Intelligence',
    description: 'Our neural engines analyze your tasks, suggest smart routines, and optimize your schedule in real-time.',
    icon: BrainCircuit,
  },
  {
    id: '3',
    title: 'Voice Assistant Integration',
    description: 'Speak your mind. Advanced context-aware voice recognition instantly translates your words into actionable tasks.',
    icon: Mic,
  },
  {
    id: '4',
    title: 'Master Your Workflow',
    description: 'Step into an ecosystem where your daily ambitions are perfectly aligned with next-generation tools.',
    icon: Layers,
  },
];

// --- ANTI-GRAVITY PHYSICS COMPONENTS ---

const FlowingEnergy = ({ colors, physicsX, physicsY }: any) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 35000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [rotateAnim]);

  const spin1 = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const spin2 = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });

  // Inertia Parallax
  const moveX = physicsX.interpolate({ inputRange: [0, width], outputRange: [50, -50], extrapolate: 'clamp' });
  const moveY = physicsY.interpolate({ inputRange: [0, height], outputRange: [50, -50], extrapolate: 'clamp' });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: moveX }, { translateY: moveY }] }]} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: spin1 }] }]}>
        <Svg height={height * 2} width={width * 2} style={{ position: 'absolute', top: -height * 0.5, left: -width * 0.5 }}>
          <Defs>
            <RadialGradient id="energy1" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.15" />
              <Stop offset="100%" stopColor={colors.background} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={width} cy={height} r={width * 0.9} fill="url(#energy1)" />
        </Svg>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: spin2 }] }]}>
         <Svg height={height * 2} width={width * 2} style={{ position: 'absolute', top: -height * 0.5, left: -width * 0.5 }}>
          <Defs>
            <RadialGradient id="energy2" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={colors.primaryLight} stopOpacity="0.10" />
              <Stop offset="100%" stopColor={colors.background} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={width * 0.5} cy={height * 1.5} r={width * 0.7} fill="url(#energy2)" />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
};

const ParticleLayer = ({ count, sizeRange, durationRange, physicsX, physicsY, parallaxFactor, isRepel, colors }: any) => {
  const particles = useMemo(() => Array.from({ length: count }).map((_, i) => ({
    id: i,
    x: Math.random() * width,
    y: Math.random() * height * 1.5 - height * 0.25,
    size: Math.random() * (sizeRange[1] - sizeRange[0]) + sizeRange[0],
    duration: Math.random() * (durationRange[1] - durationRange[0]) + durationRange[0],
    delay: Math.random() * 4000,
    opacityBase: Math.random() * 0.4 + 0.1,
  })), []);

  const moveX = physicsX.interpolate({
    inputRange: [0, width],
    outputRange: isRepel ? [width * parallaxFactor, -width * parallaxFactor] : [-width * parallaxFactor, width * parallaxFactor],
    extrapolate: 'clamp',
  });
  
  const moveY = physicsY.interpolate({
    inputRange: [0, height],
    outputRange: isRepel ? [height * parallaxFactor, -height * parallaxFactor] : [-height * parallaxFactor, height * parallaxFactor],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: moveX }, { translateY: moveY }] }]} pointerEvents="none">
      {particles.map((p) => {
        const floatAnim = useRef(new Animated.Value(0)).current;
        const pulseAnim = useRef(new Animated.Value(p.opacityBase)).current;

        useEffect(() => {
          Animated.loop(
            Animated.sequence([
              Animated.delay(p.delay),
              Animated.timing(floatAnim, {
                toValue: -200, 
                duration: p.duration,
                easing: Easing.linear,
                useNativeDriver: true,
              })
            ])
          ).start();

          Animated.loop(
            Animated.sequence([
              Animated.timing(pulseAnim, { toValue: p.opacityBase + 0.4, duration: p.duration * 0.4, useNativeDriver: true }),
              Animated.timing(pulseAnim, { toValue: p.opacityBase, duration: p.duration * 0.6, useNativeDriver: true }),
            ])
          ).start();
        }, []);

        return (
          <Animated.View
            key={p.id}
            style={{
              position: 'absolute',
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
              backgroundColor: colors.primary,
              opacity: pulseAnim,
              transform: [{ translateY: floatAnim }],
              shadowColor: colors.primaryLight,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 1,
              shadowRadius: p.size,
              elevation: 5,
            }}
          />
        );
      })}
    </Animated.View>
  );
};

const AntiGravityEnvironment = ({ colors, physicsX, physicsY }: any) => {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <FlowingEnergy colors={colors} physicsX={physicsX} physicsY={physicsY} />
      {/* Deep Far Particles (Small, slow, repel subtly) */}
      <ParticleLayer count={25} sizeRange={[2, 4]} durationRange={[12000, 22000]} physicsX={physicsX} physicsY={physicsY} parallaxFactor={0.08} isRepel={true} colors={colors} />
      {/* Mid Particles (Medium, steady, attract magnetically) */}
      <ParticleLayer count={15} sizeRange={[4, 8]} durationRange={[8000, 16000]} physicsX={physicsX} physicsY={physicsY} parallaxFactor={0.15} isRepel={false} colors={colors} />
      {/* Close Particles (Large, fast, repel aggressively) */}
      <ParticleLayer count={8} sizeRange={[8, 16]} durationRange={[5000, 10000]} physicsX={physicsX} physicsY={physicsY} parallaxFactor={0.35} isRepel={true} colors={colors} />
    </View>
  );
};

// --- UI COMPONENTS ---

const OnboardingItem = ({ item, index, scrollX, colors }: any) => {
  const Icon = item.icon;
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

  const scale = scrollX.interpolate({
    inputRange,
    outputRange: [0.8, 1, 0.8],
    extrapolate: 'clamp',
  });

  const opacity = scrollX.interpolate({
    inputRange,
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  });

  const translateY = scrollX.interpolate({
    inputRange,
    outputRange: [40, 0, 40],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.itemContainer, { width }]}>
      <Animated.View style={[styles.iconWrapper, { transform: [{ scale }] }]}>
        <View style={[styles.iconInner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Icon size={48} color={colors.primary} strokeWidth={1.5} />
        </View>
      </Animated.View>

      <Animated.View style={{ opacity, transform: [{ translateY }] }}>
        <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.description, { color: colors.secondaryText }]}>{item.description}</Text>
      </Animated.View>
    </View>
  );
};

const Paginator = ({ data, scrollX, colors }: any) => {
  return (
    <View style={styles.paginatorContainer}>
      {data.map((_: any, i: number) => {
        const inputRange = [(i - 1) * width, i * width, (i + 1) * width];

        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [8, 30, 8],
          extrapolate: 'clamp',
        });

        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.3, 1, 0.3],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={i.toString()}
            style={[styles.dot, { width: dotWidth, opacity, backgroundColor: colors.primary }]}
          />
        );
      })}
    </View>
  );
};

interface IntroScreenProps {
  onComplete: () => void;
}

export default function IntroScreen({ onComplete }: IntroScreenProps) {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  
  const scrollX = useRef(new Animated.Value(0)).current;
  
  // Physics engine values for inertia
  const physicsX = useRef(new Animated.Value(width / 2)).current;
  const physicsY = useRef(new Animated.Value(height / 2)).current;
  
  const slidesRef = useRef<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const viewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0 && viewableItems[0]) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const scrollToNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      onComplete();
    }
  };

  const handlePointerMove = (e: any) => {
    // Soft physics inertia applied to pointer movements
    Animated.spring(physicsX, {
      toValue: e.nativeEvent.x,
      friction: 8,
      tension: 40,
      useNativeDriver: false,
    }).start();
    
    Animated.spring(physicsY, {
      toValue: e.nativeEvent.y,
      friction: 8,
      tension: 40,
      useNativeDriver: false,
    }).start();
  };

  return (
    <View 
      style={[styles.container, { backgroundColor: colors.background }]}
      onPointerMove={handlePointerMove}
    >
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      <AntiGravityEnvironment colors={colors} physicsX={physicsX} physicsY={physicsY} />

      {/* Slide Content */}
      <View style={styles.carouselContainer}>
        <Animated.FlatList
          data={SLIDES}
          renderItem={({ item, index }) => <OnboardingItem item={item} index={index} scrollX={scrollX} colors={colors} />}
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          bounces={false}
          keyExtractor={(item) => item.id}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
          onViewableItemsChanged={viewableItemsChanged}
          viewabilityConfig={viewConfig}
          scrollEventThrottle={16}
          ref={slidesRef}
        />
      </View>

      <View style={styles.footer}>
        <Paginator data={SLIDES} scrollX={scrollX} colors={colors} />

        <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={scrollToNext} activeOpacity={0.8}>
          <Text style={[styles.buttonText, { color: colors.primaryText }]}>
            {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          {currentIndex === SLIDES.length - 1 ? (
            <CheckCircle2 size={20} color={colors.primaryText} style={{ marginLeft: 8 }} />
          ) : (
            <ArrowRight size={20} color={colors.primaryText} style={{ marginLeft: 8 }} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  carouselContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  itemContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconWrapper: {
    marginBottom: 24,
  },
  iconInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.9,
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: height * 0.06,
    width: '100%',
    paddingHorizontal: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paginatorContainer: {
    flexDirection: 'row',
    height: 64,
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
