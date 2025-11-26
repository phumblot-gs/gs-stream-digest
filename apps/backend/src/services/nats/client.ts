import { logger } from '../../utils/logger';
import { logEvent } from '../../utils/axiom';
import type { Event } from '@gs-digest/shared';

interface NATSConfig {
  url: string;
  apiKey: string;
}

export class NATSEventClient {
  private config: NATSConfig;
  private baseUrl: string;

  constructor(config?: NATSConfig) {
    this.config = config || {
      url: process.env.NATS_URL!,
      apiKey: process.env.NATS_API_KEY!
    };

    // Remove trailing slash from URL
    this.baseUrl = this.config.url.replace(/\/$/, '');
  }

  /**
   * Fetch events from NATS since a specific UID and timestamp
   */
  async fetchEventsSince(
    lastUid: string | null,
    timestamp: number,
    filters?: {
      accountId?: string;
      eventTypes?: string[];
      limit?: number;
    }
  ): Promise<Event[]> {
    try {
      // Build query parameters
      const params = new URLSearchParams();

      // Use default UID if not provided
      params.append('since_uid', lastUid || '000000-00000-0000000');
      params.append('since_timestamp', timestamp.toString());

      if (filters?.accountId) {
        params.append('account_id', filters.accountId);
      }

      if (filters?.eventTypes && filters.eventTypes.length > 0) {
        params.append('event_types', filters.eventTypes.join(','));
      }

      if (filters?.limit) {
        params.append('limit', filters.limit.toString());
      }

      // Make request to NATS API
      const url = `${this.baseUrl}/api/events?${params.toString()}`;

      logger.debug(`Fetching events from NATS: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`NATS API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      let events: Event[] = data.events || data || [];

      // Filter out the first event if it matches lastUid (already processed)
      if (events.length > 0 && events[0].uid === lastUid) {
        events = events.slice(1);
      }

      logger.info(`Fetched ${events.length} events from NATS`);
      await logEvent('nats.events_fetched', {
        count: events.length,
        lastUid,
        timestamp,
        filters
      });

      return events;
    } catch (error) {
      logger.error('Failed to fetch events from NATS:', error);
      await logEvent('nats.fetch_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        lastUid,
        timestamp,
        filters
      });
      throw error;
    }
  }

  /**
   * Fetch a single event by UID
   */
  async fetchEvent(uid: string): Promise<Event | null> {
    try {
      const url = `${this.baseUrl}/api/events/${uid}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`NATS API error: ${response.status} ${response.statusText}`);
      }

      const event = await response.json();
      return event;
    } catch (error) {
      logger.error(`Failed to fetch event ${uid} from NATS:`, error);
      throw error;
    }
  }

  /**
   * Test connection to NATS API
   */
  async testConnection(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/api/health`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      });

      const isHealthy = response.ok;

      if (isHealthy) {
        logger.info('NATS connection test successful');
      } else {
        logger.warn(`NATS connection test failed: ${response.status}`);
      }

      return isHealthy;
    } catch (error) {
      logger.error('NATS connection test error:', error);
      return false;
    }
  }

  /**
   * Emit an event back to NATS (for digest.sent events)
   */
  async emitEvent(event: Partial<Event>): Promise<void> {
    try {
      const url = `${this.baseUrl}/api/events`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });

      if (!response.ok) {
        throw new Error(`Failed to emit event: ${response.status} ${response.statusText}`);
      }

      logger.debug(`Emitted event to NATS: ${event.eventType}`);
      await logEvent('nats.event_emitted', {
        eventType: event.eventType,
        accountId: event.accountId
      });
    } catch (error) {
      logger.error('Failed to emit event to NATS:', error);
      throw error;
    }
  }
}