import type { StorybookConfig } from '@storybook/react-vite'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

/**
 * Resolves the absolute path of a package — required in monorepo setups
 * where node_modules may not be adjacent to the config file.
 */
function getAbsolutePath(value: string) {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)))
}

const config: StorybookConfig = {
  stories: [
    '../src/**/*.stories.@(ts|tsx)',
  ],
  addons: [getAbsolutePath('@storybook/addon-docs')],
  framework: getAbsolutePath('@storybook/react-vite') as '@storybook/react-vite',
  viteFinal(config) {
    const base = process.env.STORYBOOK_BASE_PATH
    if (base) {
      config.base = base.endsWith('/') ? base : `${base}/`
    }
    return config
  },
}

export default config
