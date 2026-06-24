import { dirname } from "path";
import { fileURLToPath } from "url";

// Pin base to the app folder that contains node_modules (frontend/). Otherwise Next/Turbopack
// resolves `@import "tailwindcss"` from the repo-root node_modules (missing).
const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    "@tailwindcss/postcss": {
      base: __dirname,
    },
  },
};

export default config;
