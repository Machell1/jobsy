import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/apps', '<rootDir>/packages'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
    '**/*.test.ts',
    '**/*.test.tsx',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/.next/',
    '\\.integration\\.test\\.ts$',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/apps/web/src/$1',
    '^@jobsy/types(.*)$': '<rootDir>/packages/types/src$1',
    '^@jobsy/utils(.*)$': '<rootDir>/packages/utils/src$1',
    '^@jobsy/config(.*)$': '<rootDir>/packages/config/src$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'apps/web/tsconfig.json',
      },
    ],
  },
  collectCoverageFrom: [
    'apps/**/src/**/*.{ts,tsx}',
    'packages/**/src/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
  coverageThresholds: {
    global: {
      branches: 60,
      functions: 60,
      lines: 70,
      statements: 70,
    },
    './apps/**/src/**/*service*.ts': {
      lines: 80,
      branches: 70,
      functions: 80,
      statements: 80,
    },
    './packages/**/src/**/*service*.ts': {
      lines: 80,
      branches: 70,
      functions: 80,
      statements: 80,
    },
  },
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'clover'],
  verbose: true,
};

export default config;
