export const FEATURES = {
  useAppleOnDeviceLLM: false, // Feature flag for Apple's on-device LLM
} as const;

export type FeatureFlags = typeof FEATURES;