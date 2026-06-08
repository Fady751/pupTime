import React, { useRef } from "react";
import {
  Animated,
  Image,
  Dimensions,
  Platform,
} from "react-native";
import {
  PanGestureHandler,
  State,
  PanGestureHandlerStateChangeEvent,
} from "react-native-gesture-handler";
import createStyles from "./styles";
import useTheme from "../../Hooks/useTheme";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const BTN_SIZE = 65;

interface AiButtonProps {
  onPress?: () => void;
}

const AiButton: React.FC<AiButtonProps> = ({ onPress }) => {
  const { theme, colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  // translationX/Y track the active drag delta from the gesture handler
  const translationX = useRef(new Animated.Value(0)).current;
  const translationY = useRef(new Animated.Value(0)).current;

  // offsetX/Y track the persistent base position of the button
  const offsetX = useRef(
    new Animated.Value(SCREEN_W - BTN_SIZE - 20)
  ).current;
  const offsetY = useRef(
    new Animated.Value(SCREEN_H / 2 - BTN_SIZE / 2)
  ).current;

  const scale = useRef(new Animated.Value(1)).current;

  // Combine them for the final transform
  const translateX = Animated.add(offsetX, translationX);
  const translateY = Animated.add(offsetY, translationY);

  const lastOffset = useRef({
    x: SCREEN_W - BTN_SIZE - 20,
    y: SCREEN_H / 2 - BTN_SIZE / 2,
  });

  const onGestureEvent = Animated.event(
    [
      {
        nativeEvent: {
          translationX,
          translationY,
        },
      },
    ],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: PanGestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.state === State.BEGAN) {
      Animated.spring(scale, {
        toValue: 1.05,
        friction: 5,
        useNativeDriver: true,
      }).start();
    } else if (
      event.nativeEvent.state === State.END ||
      event.nativeEvent.state === State.CANCELLED ||
      event.nativeEvent.state === State.FAILED
    ) {
      const {
        translationX: tx,
        translationY: ty,
        velocityX,
        velocityY,
        oldState,
      } = event.nativeEvent;

      if (oldState === State.ACTIVE) {
        const currentX = lastOffset.current.x + tx;
        const currentY = lastOffset.current.y + ty;

        const predictedX = currentX + velocityX * 0.08;
        const predictedY = currentY + velocityY * 0.08;

        const finalX = Math.max(0, Math.min(predictedX, SCREEN_W - BTN_SIZE));
        const finalY = Math.max(0, Math.min(predictedY, SCREEN_H - BTN_SIZE));

        // Update the base layout to the current drop location to prevent jumping
        offsetX.setValue(currentX);
        offsetY.setValue(currentY);

        // Reset the gesture delta to 0 since the base layout now represents the current position
        translationX.setValue(0);
        translationY.setValue(0);

        // Smoothly spring to the clamped/predicted final position
        Animated.spring(offsetX, {
          toValue: finalX,
          bounciness: 12,
          speed: 14,
          useNativeDriver: true,
        }).start();

        Animated.spring(offsetY, {
          toValue: finalY,
          bounciness: 12,
          speed: 14,
          useNativeDriver: true,
        }).start();

        Animated.spring(scale, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        }).start();

        lastOffset.current.x = finalX;
        lastOffset.current.y = finalY;

        // Treat small movements as a tap
        if (Math.abs(tx) < 5 && Math.abs(ty) < 5 && onPress) {
          onPress();
        }
      } else {
        // The gesture ended but was never ACTIVE (quick tap)
        Animated.spring(scale, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        }).start();

        if (onPress) {
          onPress();
        }
      }
    }
  };

  return (
    <PanGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
    >
      <Animated.View
        style={[
          styles.container,
          {
            position: "absolute",
            left: 0,
            top: 0,
            zIndex: 100,
            transform: [{ translateX }, { translateY }, { scale }],
          },
        ]}
      >
        <Animated.View style={styles.button}>
          <Image
            source={
              theme === "dark"
                ? require("../../assets/Ai-icon-dark.png")
                : require("../../assets/Ai-icon-light.png")
            }
            style={styles.icon}
            resizeMode="cover"
          />
        </Animated.View>
      </Animated.View>
    </PanGestureHandler>
  );
};

export default AiButton;
