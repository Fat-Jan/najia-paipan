import pluginVue from 'eslint-plugin-vue'
import vueTsEslintConfig from '@vue/eslint-config-typescript'

export default [
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },

  {
    name: 'app/files-to-ignore',
    ignores: ['**/*.md'],
  },

  ...pluginVue.configs['flat/essential'],
  ...vueTsEslintConfig({
    rules: {
      '@typescript-eslint/no-unused-vars': 'error',
    },
  }),
]