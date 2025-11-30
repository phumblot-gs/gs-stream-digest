// Wrapper to load TypeScript worker using dynamic import with tsx
// tsx is already loaded by the parent process, so we can just import the .ts file directly
export { default } from './process-digest.js';
