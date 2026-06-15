import globals from "globals";

// Config mínima: só queremos `no-undef` como rede de segurança do refactor.
export default [
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      "no-undef": "error",
    },
  },
];
