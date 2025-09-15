import React, { useEffect, useRef, useCallback } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import { theme } from '@/constants/theme';

interface ConfettiPiece {
  x: Animated.Value;
  y: Animated.Value;
  rotation: Animated.Value;
  opacity: Animated.Value;
  color: string;
  size: number;
}

interface ConfettiAnimationProps {
  isVisible: boolean;
  onComplete?: () => void;
}

export const ConfettiAnimation: React.FC<ConfettiAnimationProps> = ({ 
  isVisible, 
  onComplete 
}) => {
  const confettiPieces = useRef<ConfettiPiece[]>([]);
  const { width, height } = Dimensions.get('window');
  
  const handleComplete = useCallback(() => {
    if (onComplete) {
      onComplete();
    }
  }, [onComplete]);

  useEffect(() => {
    if (isVisible) {
      const colors = [
        theme.colors.primary,
        theme.colors.secondary,
        theme.colors.accent,
        '#FFD700',
        '#FF6B6B',
        '#4ECDC4',
      ];
      
      // Create confetti pieces
      const pieces: ConfettiPiece[] = [];
      for (let i = 0; i < 30; i++) {
        pieces.push({
          x: new Animated.Value(Math.random() * width),
          y: new Animated.Value(-50),
          rotation: new Animated.Value(0),
          opacity: new Animated.Value(1),
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 10 + 5,
        });
      }
      confettiPieces.current = pieces;

      // Animate each piece
      const animations = pieces.map((piece) => {
        return Animated.parallel([
          Animated.timing(piece.y, {
            toValue: height + 50,
            duration: 2000 + Math.random() * 1000,
            useNativeDriver: true,
          }),
          Animated.timing(piece.x, {
            toValue: (piece.x as any)._value + (Math.random() - 0.5) * 200,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.loop(
            Animated.timing(piece.rotation, {
              toValue: 360,
              duration: 1500,
              useNativeDriver: true,
            })
          ),
          Animated.sequence([
            Animated.timing(piece.opacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(piece.opacity, {
              toValue: 0,
              duration: 300,
              delay: 1700,
              useNativeDriver: true,
            }),
          ]),
        ]);
      });

      Animated.parallel(animations).start(handleComplete);
    }
  }, [isVisible, handleComplete, width, height]);

  if (!isVisible) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {confettiPieces.current.map((piece, index) => {
        const key = `confetti-${index}-${piece.color}-${piece.size}`;
        return (
        <Animated.View
          key={key}
          style={[
            styles.confettiPiece,
            {
              backgroundColor: piece.color,
              width: piece.size,
              height: piece.size,
              transform: [
                { translateX: piece.x },
                { translateY: piece.y },
                {
                  rotate: piece.rotation.interpolate({
                    inputRange: [0, 360],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
              opacity: piece.opacity,
            },
          ]}
        />);
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  confettiPiece: {
    position: 'absolute',
    borderRadius: 2,
  },
});