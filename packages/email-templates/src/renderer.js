"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailRenderer = void 0;
const liquidjs_1 = require("liquidjs");
const html_to_text_1 = require("html-to-text");
class EmailRenderer {
    liquid;
    constructor() {
        this.liquid = new liquidjs_1.Liquid({
            cache: process.env.NODE_ENV === 'production',
            strictFilters: true,
            strictVariables: false,
            lenientIf: true
        });
        // Register custom filters
        this.registerCustomFilters();
    }
    registerCustomFilters() {
        // Format date filter
        this.liquid.registerFilter('formatDate', (date, format) => {
            const d = new Date(date);
            if (isNaN(d.getTime()))
                return date;
            // Default format: DD/MM/YYYY à HH:MM
            if (!format || format === 'default') {
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const year = d.getFullYear();
                const hours = String(d.getHours()).padStart(2, '0');
                const minutes = String(d.getMinutes()).padStart(2, '0');
                return `${day}/${month}/${year} à ${hours}:${minutes}`;
            }
            // Custom format support
            return d.toLocaleString('fr-FR');
        });
        // Date filter for LiquidJS compatibility (supports %Y format)
        this.liquid.registerFilter('date', (date, format) => {
            const d = date instanceof Date ? date : new Date(date);
            if (isNaN(d.getTime()))
                return date;
            if (!format)
                return d.toLocaleDateString('fr-FR');
            // Support %Y format for year
            if (format.includes('%Y')) {
                return format.replace('%Y', String(d.getFullYear()));
            }
            // Support other common formats
            if (format.includes('%m')) {
                format = format.replace('%m', String(d.getMonth() + 1).padStart(2, '0'));
            }
            if (format.includes('%d')) {
                format = format.replace('%d', String(d.getDate()).padStart(2, '0'));
            }
            return format;
        });
        // Format file size filter
        this.liquid.registerFilter('fileSize', (bytes) => {
            if (!bytes || bytes === 0)
                return '0 B';
            const units = ['B', 'KB', 'MB', 'GB', 'TB'];
            const k = 1024;
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`;
        });
        // Truncate text filter
        this.liquid.registerFilter('truncate', (str, length = 50) => {
            if (!str || str.length <= length)
                return str;
            return str.substring(0, length) + '...';
        });
        // Group by filter
        this.liquid.registerFilter('groupBy', (array, key) => {
            if (!Array.isArray(array))
                return [];
            const groups = {};
            array.forEach(item => {
                const value = this.getNestedProperty(item, key);
                const groupKey = String(value || 'undefined');
                if (!groups[groupKey]) {
                    groups[groupKey] = [];
                }
                groups[groupKey].push(item);
            });
            return Object.entries(groups).map(([key, items]) => ({
                key,
                items
            }));
        });
        // Count filter
        this.liquid.registerFilter('count', (array) => {
            return Array.isArray(array) ? array.length : 0;
        });
        // Sort by date filter
        this.liquid.registerFilter('sortByDate', (array, key = 'timestamp', order = 'desc') => {
            if (!Array.isArray(array))
                return [];
            return [...array].sort((a, b) => {
                const dateA = new Date(this.getNestedProperty(a, key));
                const dateB = new Date(this.getNestedProperty(b, key));
                if (order === 'desc') {
                    return dateB.getTime() - dateA.getTime();
                }
                return dateA.getTime() - dateB.getTime();
            });
        });
        // Unique filter
        this.liquid.registerFilter('unique', (array, key) => {
            if (!Array.isArray(array))
                return [];
            if (!key) {
                return [...new Set(array)];
            }
            const seen = new Set();
            return array.filter(item => {
                const value = this.getNestedProperty(item, key);
                if (seen.has(value)) {
                    return false;
                }
                seen.add(value);
                return true;
            });
        });
    }
    getNestedProperty(obj, path) {
        return path.split('.').reduce((current, part) => current?.[part], obj);
    }
    async render(template, context) {
        try {
            // Render subject
            const subject = await this.liquid.parseAndRender(template.subjectLiquid, context);
            // Render HTML body
            const bodyHtml = await this.liquid.parseAndRender(template.bodyHtmlLiquid, context);
            // Render or generate text body
            let bodyText;
            if (template.bodyTextLiquid) {
                bodyText = await this.liquid.parseAndRender(template.bodyTextLiquid, context);
            }
            else {
                // Auto-convert HTML to text
                bodyText = this.htmlToText(bodyHtml);
            }
            return {
                subject: subject.trim(),
                bodyHtml,
                bodyText: bodyText.trim()
            };
        }
        catch (error) {
            throw new Error(`Template rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async renderSubject(subjectTemplate, context) {
        const result = await this.liquid.parseAndRender(subjectTemplate, context);
        return result.trim();
    }
    async renderHtml(htmlTemplate, context) {
        return await this.liquid.parseAndRender(htmlTemplate, context);
    }
    htmlToText(html) {
        return (0, html_to_text_1.convert)(html, {
            wordwrap: 130,
            selectors: [
                { selector: 'a', options: { ignoreHref: true } },
                { selector: 'img', format: 'skip' },
                { selector: 'h1', options: { uppercase: false } },
                { selector: 'h2', options: { uppercase: false } },
                { selector: 'h3', options: { uppercase: false } }
            ]
        });
    }
    // Validate template syntax
    async validateTemplate(template) {
        try {
            await this.liquid.parse(template);
            return { valid: true };
        }
        catch (error) {
            return {
                valid: false,
                error: error instanceof Error ? error.message : 'Invalid template syntax'
            };
        }
    }
    // Validate all template fields (subject, HTML, text)
    async validateAllTemplates(subjectLiquid, bodyHtmlLiquid, bodyTextLiquid) {
        const errors = {};
        // Validate subject
        const subjectValidation = await this.validateTemplate(subjectLiquid);
        if (!subjectValidation.valid) {
            errors.subject = subjectValidation.error;
        }
        // Validate HTML body
        const htmlValidation = await this.validateTemplate(bodyHtmlLiquid);
        if (!htmlValidation.valid) {
            errors.html = htmlValidation.error;
        }
        // Validate text body (if provided)
        if (bodyTextLiquid) {
            const textValidation = await this.validateTemplate(bodyTextLiquid);
            if (!textValidation.valid) {
                errors.text = textValidation.error;
            }
        }
        return {
            valid: Object.keys(errors).length === 0,
            errors: Object.keys(errors).length > 0 ? errors : undefined
        };
    }
}
exports.EmailRenderer = EmailRenderer;
//# sourceMappingURL=renderer.js.map