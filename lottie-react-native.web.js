// Web shim for lottie-react-native
// This is a placeholder implementation for web compatibility

import React from 'react';
import { View } from 'react-native';

export default function LottieView(props) {
  // Return an empty view on web as lottie animations are not supported
  return React.createElement(View, props);
}

export const AnimatedLottieView = LottieView;