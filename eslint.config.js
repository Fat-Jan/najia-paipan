// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import configPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    // 全局忽略：构建产物、依赖、自动生成声明、legacy Python 旧码
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      'apps/web/auto-imports.d.ts',
      'apps/web/components.d.ts',
      '**/*.d.ts',
      'legacy/**',
      '**/coverage/**',
    ],
  },

  // JS 推荐基线
  eslint.configs.recommended,

  // TypeScript 推荐基线（非类型检查版，避免要求 type-aware program）
  ...tseslint.configs.recommended,

  // Vue 推荐基线（flat config）
  ...pluginVue.configs['flat/recommended'],

  // TS/TSX：交给 TypeScript 自己做未声明标识符检查，关掉 ESLint 的 no-undef
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.vue'],
    rules: {
      'no-undef': 'off',
    },
  },

  // Web 前端：浏览器全局
  {
    files: ['apps/web/**/*.{ts,tsx,vue}'],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },

  // Server / 脚本 / 测试：Node 全局
  {
    files: ['apps/server/**/*.{ts,mjs}', 'packages/**/*.{ts,mjs}', '**/*.config.{ts,js,mjs}'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // .vue 文件用 vue-eslint-parser，内部 <script> 交给 ts 解析
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
  },

  // 务实基线：放宽几条最容易刷屏的规则为 warn
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'vue/multi-word-component-names': 'off',
    },
  },

  // 关掉与 Prettier 冲突的格式类规则（必须放最后）
  configPrettier,
);
