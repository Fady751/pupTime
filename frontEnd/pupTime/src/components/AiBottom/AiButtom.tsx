import React, { useEffect, useRef } from "react";
import {
  Animated,
  PanResponder,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";
import styles from "./styles";
import useTheme from "../../Hooks/useTheme";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const BTN_SIZE = 65;
const INIT_X = SCREEN_W - BTN_SIZE - 20;
const INIT_Y = SCREEN_H - 200;

interface AiButtonProps {
  onPress?: () => void;
}

const AiButton: React.FC<AiButtonProps> = ({ onPress }) => {
  const { theme } = useTheme();
  const pan = useRef(new Animated.ValueXY({ x: INIT_X, y: INIT_Y })).current;
  const scale = useRef(new Animated.Value(1)).current;

  // Track current position in a plain ref so we never touch ._value
  const posRef = useRef({ x: INIT_X, y: INIT_Y });

  useEffect(() => {
    const id = pan.addListener((value) => {
      posRef.current = value;
    });
    return () => pan.removeListener(id);
  }, [pan]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4,

      onPanResponderGrant: () => {
        // Remember current offset so the button doesn't jump
        pan.setOffset(posRef.current);
        pan.setValue({ x: 0, y: 0 });

        // Scale-up animation on grab
        Animated.spring(scale, {
          toValue: 1.15,
          useNativeDriver: false,
        }).start();
      },

      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false },
      ),

      onPanResponderRelease: (_, gesture) => {
        pan.flattenOffset();

        // Scale back down
        Animated.spring(scale, {
          toValue: 1,
          friction: 4,
          useNativeDriver: false,
        }).start();

        // Snap to nearest horizontal edge
        const currentX = posRef.current.x;
        const snapX =
          currentX + BTN_SIZE / 2 < SCREEN_W / 2
            ? 10
            : SCREEN_W - BTN_SIZE - 10;

        // Clamp Y within screen bounds
        const currentY = posRef.current.y;
        const clampedY = Math.min(
          Math.max(currentY, 50),
          SCREEN_H - BTN_SIZE - 90,
        );

        Animated.spring(pan, {
          toValue: { x: snapX, y: clampedY },
          friction: 6,
          tension: 60,
          useNativeDriver: false,
        }).start();

        // If barely moved, treat as a tap
        if (Math.abs(gesture.dx) < 5 && Math.abs(gesture.dy) < 5) {
          onPress?.();
        }
      },
    }),
  ).current;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { scale },
          ],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.button}
        onPress={onPress}
      >
        <Image
          source={theme === "dark" ? require("../../assets/Ai-icon-dark.png") : require("../../assets/Ai-icon-light.png")}
          style={styles.icon}
          resizeMode="cover"
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

export default AiButton;
