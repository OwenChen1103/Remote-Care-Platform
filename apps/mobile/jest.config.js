module.exports = {
  transform: {
    '^.+\\.(ts|tsx)$': ['babel-jest', { presets: ['babel-preset-expo'] }],
  },
  testPathIgnorePatterns: ['/node_modules/', '/.expo/'],
  moduleNameMapper: {
    '^@remote-care/shared$': '<rootDir>/../../packages/shared/dist/index.js',
  },
  testEnvironment: 'node',
};
