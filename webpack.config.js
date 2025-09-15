const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  
  // Add alias for lottie-react-native on web
  config.resolve.alias = {
    ...config.resolve.alias,
    'lottie-react-native': './lottie-react-native.web.js',
    '@lottiefiles/dotlottie-react': './lottie-react-native.web.js',
  };
  
  return config;
};