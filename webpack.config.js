const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  
  // Add alias for lottie-react-native and its dependencies on web
  config.resolve.alias = {
    ...config.resolve.alias,
    'lottie-react-native': './lottie-react-native.web.js',
    '@lottiefiles/dotlottie-react': './dotlottie-react.web.js',
  };
  
  return config;
};