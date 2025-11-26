"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventTypes = exports.applications = void 0;
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
const cuid2_1 = require("@paralleldrive/cuid2");
// Applications table
exports.applications = (0, sqlite_core_1.sqliteTable)('applications', {
    id: (0, sqlite_core_1.text)('id').primaryKey().$defaultFn(() => (0, cuid2_1.createId)()),
    label: (0, sqlite_core_1.text)('label').notNull(), // Display label (e.g., "GS Sourcing")
    value: (0, sqlite_core_1.text)('value').notNull().unique(), // Filter value (e.g., "sourcing")
    description: (0, sqlite_core_1.text)('description'), // Optional description
    isActive: (0, sqlite_core_1.integer)('is_active', { mode: 'boolean' }).default(true),
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    updatedAt: (0, sqlite_core_1.integer)('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    createdBy: (0, sqlite_core_1.text)('created_by'), // User ID who created this
});
// Event types table
exports.eventTypes = (0, sqlite_core_1.sqliteTable)('event_types', {
    id: (0, sqlite_core_1.text)('id').primaryKey().$defaultFn(() => (0, cuid2_1.createId)()),
    label: (0, sqlite_core_1.text)('label').notNull(), // Display label (e.g., "Partage de fichier")
    value: (0, sqlite_core_1.text)('value').notNull().unique(), // Filter value (e.g., "file.share")
    description: (0, sqlite_core_1.text)('description'), // Optional description
    category: (0, sqlite_core_1.text)('category'), // Optional category for grouping
    isActive: (0, sqlite_core_1.integer)('is_active', { mode: 'boolean' }).default(true),
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    updatedAt: (0, sqlite_core_1.integer)('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    createdBy: (0, sqlite_core_1.text)('created_by'), // User ID who created this
});
//# sourceMappingURL=admin.js.map