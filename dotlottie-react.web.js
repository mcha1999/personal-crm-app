// Web shim for @lottiefiles/dotlottie-react
// This module is imported by lottie-react-native but not needed for our web implementation



// Mock DotLottieReact component
export const DotLottieReact = () => null;

// Mock useLottie hook
export const useLottie = () => ({
  container: null,
  play: () => {},
  pause: () => {},
  stop: () => {},
  setSpeed: () => {},
  setDirection: () => {},
  setLooping: () => {},
  goToAndPlay: () => {},
  goToAndStop: () => {},
  destroy: () => {},
});

// Default export
export default DotLottieReact;