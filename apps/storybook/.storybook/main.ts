import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  addons: ['@storybook/addon-essentials'],
  stories: ['../../packages/*/src/**/*.stories.tsx'],
}

export default config
