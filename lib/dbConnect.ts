/**
 * Compatibility shim: imports may use `@/lib/dbConnect`.
 * Canonical module: `@/lib/db` (default export = connectDB).
 */
export { default, closeDB } from './db';
