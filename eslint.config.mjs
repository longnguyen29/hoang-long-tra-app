import next from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  { ignores: [".next/**", "out/**", "build/**"] },
  {
    files: ["**/*.{js,jsx,mjs}"],
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { "@next/next": next, "react-hooks": reactHooks },
    rules: {
      ...next.configs.recommended.rules,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];
