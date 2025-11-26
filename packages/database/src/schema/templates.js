"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailTemplates = void 0;
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
const drizzle_orm_1 = require("drizzle-orm");
// Email templates for digests
exports.emailTemplates = (0, sqlite_core_1.sqliteTable)('email_templates', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    name: (0, sqlite_core_1.text)('name').notNull(),
    description: (0, sqlite_core_1.text)('description'),
    // Template ownership
    accountId: (0, sqlite_core_1.text)('account_id'), // null = global template
    isGlobal: (0, sqlite_core_1.integer)('is_global', { mode: 'boolean' }).default(false).notNull(),
    isDefault: (0, sqlite_core_1.integer)('is_default', { mode: 'boolean' }).default(false).notNull(),
    // Liquid templates
    subjectLiquid: (0, sqlite_core_1.text)('subject_liquid').notNull(),
    bodyHtmlLiquid: (0, sqlite_core_1.text)('body_html_liquid').notNull(),
    bodyTextLiquid: (0, sqlite_core_1.text)('body_text_liquid'),
    // Preview data for testing
    previewData: (0, sqlite_core_1.text)('preview_data'), // JSON with example events
    // Metadata
    createdBy: (0, sqlite_core_1.text)('created_by').notNull(),
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).notNull().default((0, drizzle_orm_1.sql) `(unixepoch())`),
    updatedAt: (0, sqlite_core_1.integer)('updated_at', { mode: 'timestamp' }).notNull().default((0, drizzle_orm_1.sql) `(unixepoch())`)
}, (table) => ({
    accountIdx: (0, sqlite_core_1.index)('idx_email_templates_account').on(table.accountId),
    globalIdx: (0, sqlite_core_1.index)('idx_email_templates_global').on(table.isGlobal)
}));
//# sourceMappingURL=templates.js.map