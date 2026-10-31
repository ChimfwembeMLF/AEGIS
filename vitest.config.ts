import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts', 'tests/contract/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'verify',
          include: ['tests/verify/*.verify.test.ts'],
        },
      },
    ],
  },
});
