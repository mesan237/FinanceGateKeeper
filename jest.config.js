/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^lucide-react-native/icons/[a-z0-9-]+$': '<rootDir>/__mocks__/lucide-icon.js',
    'react-native-chart-kit': '<rootDir>/__mocks__/react-native-chart-kit.js',
  },
  testPathIgnorePatterns: ['/node_modules/', '/\\.expo/', '/dist/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg))',
  ],
};
