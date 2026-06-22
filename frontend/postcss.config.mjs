import { dirname } from "path";
import { fileURLToPath } from "url";

// Must be the app folder that contains node_modules (frontend/user). If this is wrong, Next/Turbopack
// resolves `@import "tailwindcss"` from …/new-carmen/frontend → ../node_modules = …/new-carmen/node_modules (missing).
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
