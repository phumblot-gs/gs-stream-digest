import { readFileSync } from 'fs';
import { join } from 'path';
import type { DigestTemplate } from '@gs-digest/shared';

// Load template files
function loadTemplate(name: string): {
  subject: string;
  html: string;
  text?: string;
} {
  const templatesDir = join(__dirname, 'templates');

  return {
    subject: readFileSync(join(templatesDir, `${name}.liquid.subject`), 'utf-8'),
    html: readFileSync(join(templatesDir, `${name}.liquid.html`), 'utf-8'),
    text: readFileSync(join(templatesDir, `${name}.liquid.text`), 'utf-8')
  };
}

// Default template configurations
export const defaultTemplates: Omit<DigestTemplate, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>[] = [
  {
    name: 'File Share Digest',
    description: 'Email digest for file sharing events',
    accountId: null,
    isGlobal: true,
    isDefault: true,
    ...(() => {
      const template = loadTemplate('file-share');
      return {
        subjectLiquid: template.subject,
        bodyHtmlLiquid: template.html,
        bodyTextLiquid: template.text
      };
    })(),
    previewData: {
      events: [
        {
          uid: 'evt_1234567890',
          timestamp: new Date().toISOString(),
          eventType: 'file.share',
          accountId: 'acc_123',
          userId: 'usr_456',
          source: {
            application: 'gs-sourcing',
            environment: 'production',
            version: '1.0.0'
          },
          data: {
            file: {
              id: 'file_789',
              name: 'Q4_2024_Report.pdf',
              size: 2457600,
              mimeType: 'application/pdf'
            },
            sharedBy: {
              id: 'usr_456',
              name: 'Marie Dupont',
              email: 'marie.dupont@example.com'
            },
            sharedWith: [
              {
                id: 'usr_789',
                name: 'Jean Martin',
                email: 'jean.martin@example.com',
                type: 'user'
              },
              {
                id: 'grp_123',
                name: 'Marketing Team',
                email: 'marketing@example.com',
                type: 'group'
              }
            ],
            permissions: ['view', 'download'],
            message: 'Voici le rapport Q4 2024 pour votre revue.',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          }
        },
        {
          uid: 'evt_1234567891',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          eventType: 'file.share',
          accountId: 'acc_123',
          userId: 'usr_111',
          source: {
            application: 'gs-sourcing',
            environment: 'production',
            version: '1.0.0'
          },
          data: {
            file: {
              id: 'file_790',
              name: 'Product_Images_2024.zip',
              size: 15728640,
              mimeType: 'application/zip'
            },
            sharedBy: {
              id: 'usr_111',
              name: 'Pierre Leroy',
              email: 'pierre.leroy@example.com'
            },
            sharedWith: [
              {
                id: 'usr_789',
                name: 'Jean Martin',
                email: 'jean.martin@example.com',
                type: 'user'
              }
            ],
            permissions: ['view', 'download', 'share'],
            message: 'Les nouvelles images produits sont disponibles.'
          }
        }
      ],
      eventsCount: 2,
      digest: {
        name: 'Daily File Share Digest',
        description: 'Daily summary of files shared with you'
      },
      now: new Date(),
      accountId: 'acc_123'
    }
  }
];

// Get default template by name
export function getDefaultTemplate(name: string): typeof defaultTemplates[0] | undefined {
  return defaultTemplates.find(t => t.name === name);
}

// Get all default templates
export function getAllDefaultTemplates(): typeof defaultTemplates {
  return defaultTemplates;
}