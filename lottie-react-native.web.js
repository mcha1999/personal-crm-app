// Web shim for lottie-react-native
// This is a placeholder implementation for web compatibility

import React from 'react';
import { View } from 'react-native';

// Mock the dotlottie-react module that lottie-react-native tries to import
export const DotLottieReact = () => null;

// Main LottieView component for web
export default function LottieView(props) {
  // Return an empty view on web as lottie animations are not supported
  return React.createElement(View, props);
}

export const AnimatedLottieView = LottieView;

// Export all the expected exports from lottie-react-native
export const LottieViewWeb = LottieView;