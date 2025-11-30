import { getDb } from './client';
import { emailTemplates } from './schema-pg/templates';
import * as fs from 'fs';
import * as path from 'path';

async function seed() {
  console.log('🌱 Starting database seed...');

  const db = getDb();

  // Load the saved template from SQLite
  const templateDataPath = path.join(__dirname, '../../../data/saved-template.json');

  if (!fs.existsSync(templateDataPath)) {
    console.log('⚠️  No saved template found. Skipping template seed.');
    return;
  }

  const templateData = JSON.parse(fs.readFileSync(templateDataPath, 'utf-8'));
  const template = templateData.template;

  console.log('📝 Inserting saved template: Sourcing');

  try {
    // Check if we're using PostgreSQL
    if (process.env.DATABASE_URL) {
      // Insert the template with proper date conversion for PostgreSQL
      await (db as any).insert(emailTemplates).values({
        id: template.id,
        name: template.name,
        description: template.description,
        accountId: template.accountId,
        isGlobal: template.isGlobal,
        isDefault: template.isDefault,
        subjectLiquid: template.subjectLiquid,
        bodyHtmlLiquid: template.bodyHtmlLiquid,
        bodyTextLiquid: template.bodyTextLiquid,
        previewData: JSON.stringify(template.previewData),
        createdBy: template.createdBy,
        createdAt: new Date(template.createdAt * 1000), // Convert Unix timestamp to Date
        updatedAt: new Date(template.updatedAt * 1000)  // Convert Unix timestamp to Date
      }).onConflictDoNothing();

      console.log('✅ Template inserted successfully in PostgreSQL');
    } else {
      // SQLite version (keep timestamps as is)
      const { emailTemplates: templatesTable } = await import('./schema/templates');
      await (db as any).insert(templatesTable).values({
        id: template.id,
        name: template.name,
        description: template.description,
        accountId: template.accountId,
        isGlobal: template.isGlobal ? 1 : 0,
        isDefault: template.isDefault ? 1 : 0,
        subjectLiquid: template.subjectLiquid,
        bodyHtmlLiquid: template.bodyHtmlLiquid,
        bodyTextLiquid: template.bodyTextLiquid,
        previewData: JSON.stringify(template.previewData),
        createdBy: template.createdBy,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      }).onConflictDoNothing();

      console.log('✅ Template inserted successfully in SQLite');
    }

    console.log('🎉 Seed completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed
seed().catch(console.error);