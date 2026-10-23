/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        target: 'ES2022',
        module: 'commonjs',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true
      }
    }]
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node']
};
