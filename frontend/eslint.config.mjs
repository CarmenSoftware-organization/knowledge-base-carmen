// Next.js 16 ships native ESLint flat configs (no FlatCompat needed).
import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  ...coreWebVitals,
  ...typescript,
  {
    // Brownfield adoption: lint was not previously wired up, so the existing
    // codebase trips several strict rules. Downgrade the noisiest to "warn" so
    // `npm run lint` passes (issues stay visible). Tighten to "error" and fix
    // incrementally over time.
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react/display-name": "warn",
      // eslint-plugin-react-hooks v6 (bundled with Next 16) adds aggressive
      // React-Compiler rules that flag common existing patterns:
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
    },
  },
];

export default eslintConfig;
