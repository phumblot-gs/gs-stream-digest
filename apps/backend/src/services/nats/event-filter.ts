import type { Event, EventFilters } from '@gs-digest/shared';
import { logger } from '../../utils/logger';

export class EventFilter {
  /**
   * Filter events based on criteria
   */
  static filterEvents(events: Event[], filters: EventFilters): Event[] {
    if (!filters || Object.keys(filters).length === 0) {
      return events;
    }

    return events.filter(event => {
      // Filter by account IDs
      if (filters.accountIds && filters.accountIds.length > 0) {
        if (!filters.accountIds.includes(event.accountId)) {
          return false;
        }
      }

      // Filter by event types
      if (filters.eventTypes && filters.eventTypes.length > 0) {
        if (!filters.eventTypes.includes(event.eventType)) {
          return false;
        }
      }

      // Filter by source applications
      if (filters.sourceApplications && filters.sourceApplications.length > 0) {
        if (!filters.sourceApplications.includes(event.source.application)) {
          return false;
        }
      }

      // Filter by source environments
      if (filters.sourceEnvironments && filters.sourceEnvironments.length > 0) {
        if (!filters.sourceEnvironments.includes(event.source.environment)) {
          return false;
        }
      }

      // Filter by user IDs
      if (filters.userIds && filters.userIds.length > 0) {
        if (!event.userId || !filters.userIds.includes(event.userId)) {
          return false;
        }
      }

      // Filter by max age
      if (filters.maxAgeHours) {
        const eventTime = new Date(event.timestamp).getTime();
        const maxAge = Date.now() - (filters.maxAgeHours * 60 * 60 * 1000);
        if (eventTime < maxAge) {
          return false;
        }
      }

      // Filter by data field filters (JSONPath-like)
      if (filters.dataFilters && filters.dataFilters.length > 0) {
        for (const dataFilter of filters.dataFilters) {
          const value = this.getNestedValue(event.data, dataFilter.path);

          switch (dataFilter.operator) {
            case 'equals':
              if (value !== dataFilter.value) return false;
              break;
            case 'not_equals':
              if (value === dataFilter.value) return false;
              break;
            case 'contains':
              if (typeof value !== 'string' || !value.includes(dataFilter.value)) return false;
              break;
            case 'not_contains':
              if (typeof value === 'string' && value.includes(dataFilter.value)) return false;
              break;
            case 'exists':
              if (value === undefined) return false;
              break;
            case 'not_exists':
              if (value !== undefined) return false;
              break;
          }
        }
      }

      return true;
    });
  }

  /**
   * Get nested value from object using path
   * Supports paths like "file.name" or "sharedWith[0].email"
   */
  private static getNestedValue(obj: any, path: string): any {
    // Remove $ prefix if present (JSONPath style)
    path = path.replace(/^\$\./, '');

    const parts = path.split(/[\.\[\]]+/).filter(Boolean);
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }

      // Handle array index
      if (/^\d+$/.test(part)) {
        current = current[parseInt(part, 10)];
      } else {
        current = current[part];
      }
    }

    return current;
  }

  /**
   * Group events by a specific field
   */
  static groupEvents(events: Event[], groupBy: string): Map<string, Event[]> {
    const groups = new Map<string, Event[]>();

    for (const event of events) {
      const key = this.getGroupKey(event, groupBy);
      const group = groups.get(key) || [];
      group.push(event);
      groups.set(key, group);
    }

    return groups;
  }

  /**
   * Get grouping key from event
   */
  private static getGroupKey(event: Event, groupBy: string): string {
    switch (groupBy) {
      case 'eventType':
        return event.eventType;
      case 'accountId':
        return event.accountId;
      case 'userId':
        return event.userId || 'unknown';
      case 'source.application':
        return event.source.application;
      case 'source.environment':
        return event.source.environment;
      case 'date':
        return new Date(event.timestamp).toISOString().split('T')[0];
      default:
        // Try to get nested value
        const value = this.getNestedValue(event, groupBy);
        return String(value || 'unknown');
    }
  }

  /**
   * Sort events
   */
  static sortEvents(events: Event[], sortBy: string = 'timestamp', order: 'asc' | 'desc' = 'desc'): Event[] {
    return [...events].sort((a, b) => {
      const aValue = this.getSortValue(a, sortBy);
      const bValue = this.getSortValue(b, sortBy);

      if (aValue < bValue) {
        return order === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return order === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  private static getSortValue(event: Event, sortBy: string): any {
    switch (sortBy) {
      case 'timestamp':
        return new Date(event.timestamp).getTime();
      case 'eventType':
        return event.eventType;
      case 'accountId':
        return event.accountId;
      default:
        return this.getNestedValue(event, sortBy);
    }
  }

  /**
   * Get summary statistics for events
   */
  static getEventStats(events: Event[]) {
    const stats = {
      total: events.length,
      byType: new Map<string, number>(),
      byAccount: new Map<string, number>(),
      byApplication: new Map<string, number>(),
      timeRange: {
        earliest: null as Date | null,
        latest: null as Date | null
      }
    };

    for (const event of events) {
      // Count by type
      const typeCount = stats.byType.get(event.eventType) || 0;
      stats.byType.set(event.eventType, typeCount + 1);

      // Count by account
      const accountCount = stats.byAccount.get(event.accountId) || 0;
      stats.byAccount.set(event.accountId, accountCount + 1);

      // Count by application
      const appCount = stats.byApplication.get(event.source.application) || 0;
      stats.byApplication.set(event.source.application, appCount + 1);

      // Track time range
      const eventTime = new Date(event.timestamp);
      if (!stats.timeRange.earliest || eventTime < stats.timeRange.earliest) {
        stats.timeRange.earliest = eventTime;
      }
      if (!stats.timeRange.latest || eventTime > stats.timeRange.latest) {
        stats.timeRange.latest = eventTime;
      }
    }

    return stats;
  }
}