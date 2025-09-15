// Web shim for lottie-react-native
// This is a placeholder implementation for web compatibility

import React from 'react';
import { View } from 'react-native';

// Main LottieView component for web
function LottieView(props) {
  // Return an empty view on web as lottie animations are not supported
  return React.createElement(View, {
    style: props.style,
    testID: props.testID,
  });
}

// Export default
export default LottieView;

// Named exports that lottie-react-native provides
export { LottieView };
export const AnimatedLottieView = LottieView;