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

    // Log configuration (mask API key)
    const maskedApiKey = this.config.apiKey 
      ? `${this.config.apiKey.substring(0, 8)}...${this.config.apiKey.substring(this.config.apiKey.length - 4)}`
      : '[NOT SET]';
    
    logger.info({
      event: 'nats_client_init',
      baseUrl: this.baseUrl,
      apiKeySet: !!this.config.apiKey,
      apiKeyPrefix: maskedApiKey,
      urlFromEnv: process.env.NATS_URL || '[NOT SET]'
    }, 'NATS client initialized');
  }

  /**
   * Fetch events from NATS since a specific timestamp using POST /api/events/query
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
      // Build request body for POST /api/events/query
      const requestBody: any = {
        filters: {},
        timeRange: {
          from: new Date(timestamp).toISOString(),
          // No 'to' specified - get all events from timestamp to now
        },
        limit: filters?.limit || 1000, // Use max limit to get as many events as possible
      };

      // Add account filter (only if accountId is valid, not 'default' or empty)
      if (filters?.accountId && filters.accountId !== 'default' && filters.accountId.trim() !== '') {
        requestBody.filters.accountIds = [filters.accountId];
      }

      // Add event types filter
      if (filters?.eventTypes && filters.eventTypes.length > 0) {
        requestBody.filters.eventTypes = filters.eventTypes;
      }

      // Make request to NATS API
      const url = `${this.baseUrl}/api/events/query`;

      logger.info({
        event: 'nats_fetch_events',
        url,
        baseUrl: this.baseUrl,
        requestBody,
        method: 'POST',
        lastUid,
        timestamp: new Date(timestamp).toISOString()
      }, `Fetching events from NATS: ${url}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response');
        logger.error({
          event: 'nats_fetch_error',
          url,
          status: response.status,
          statusText: response.statusText,
          errorText,
          baseUrl: this.baseUrl,
          requestBody
        }, `NATS API error: ${response.status} ${response.statusText}`);
        throw new Error(`NATS API error: ${response.status} ${response.statusText} - URL: ${url}`);
      }

      const data = await response.json();
      
      // New API returns { events: [], cursor: string, hasMore: boolean }
      // Map events from new API format to our Event format
      let events: Event[] = (data.events || []).map((apiEvent: any) => this.mapApiEventToEvent(apiEvent));

      // Handle pagination if hasMore is true
      // For now, we'll fetch all pages if needed (up to a reasonable limit)
      let cursor = data.cursor;
      let hasMore = data.hasMore;
      let pageCount = 1;
      const maxPages = 10; // Limit pagination to avoid infinite loops

      while (hasMore && cursor && pageCount < maxPages) {
        logger.info({
          event: 'nats_fetch_pagination',
          page: pageCount + 1,
          cursor: cursor.substring(0, 20) + '...'
        }, `Fetching next page of events (page ${pageCount + 1})`);

        const nextRequestBody = {
          ...requestBody,
          cursor
        };

        const nextResponse = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(nextRequestBody)
        });

        if (!nextResponse.ok) {
          logger.warn({
            event: 'nats_fetch_pagination_error',
            status: nextResponse.status,
            page: pageCount + 1
          }, `Failed to fetch page ${pageCount + 1}, stopping pagination`);
          break;
        }

        const nextData = await nextResponse.json();
        const nextEvents = (nextData.events || []).map((apiEvent: any) => this.mapApiEventToEvent(apiEvent));
        events = events.concat(nextEvents);
        cursor = nextData.cursor;
        hasMore = nextData.hasMore;
        pageCount++;
      }

      if (hasMore && pageCount >= maxPages) {
        logger.warn({
          event: 'nats_fetch_pagination_limit',
          totalEvents: events.length,
          pagesFetched: pageCount
        }, `Reached pagination limit (${maxPages} pages), some events may be missing`);
      }

      // Filter out events that match lastUid (already processed)
      // This handles the case where we might get the same event again
      if (lastUid && events.length > 0) {
        const lastUidIndex = events.findIndex(e => e.uid === lastUid);
        if (lastUidIndex >= 0) {
          // Remove the lastUid event and all events before it (already processed)
          events = events.slice(lastUidIndex + 1);
        }
      }

      logger.info({
        event: 'nats_events_fetched',
        count: events.length,
        pagesFetched: pageCount,
        lastUid,
        timestamp: new Date(timestamp).toISOString()
      }, `Fetched ${events.length} events from NATS (${pageCount} page(s))`);

      await logEvent('nats.events_fetched', {
        count: events.length,
        pagesFetched: pageCount,
        lastUid,
        timestamp: new Date(timestamp).toISOString(),
        filters
      });

      return events;
    } catch (error) {
      logger.error('Failed to fetch events from NATS:', error);
      await logEvent('nats.fetch_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        lastUid,
        timestamp: new Date(timestamp).toISOString(),
        filters
      });
      throw error;
    }
  }

  /**
   * Map API event format to our Event format
   * API format: { eventId, eventType, timestamp, actor: { accountId }, scope: { accountId }, source, payload, metadata }
   * Our format: { uid, eventType, timestamp, accountId, userId, source, data, metadata }
   */
  private mapApiEventToEvent(apiEvent: any): Event {
    return {
      uid: apiEvent.eventId || apiEvent.uid, // Use eventId from new API, fallback to uid for compatibility
      eventType: apiEvent.eventType,
      timestamp: apiEvent.timestamp,
      accountId: apiEvent.scope?.accountId || apiEvent.actor?.accountId || apiEvent.accountId,
      userId: apiEvent.actor?.userId || apiEvent.userId,
      source: {
        application: apiEvent.source?.application || '',
        environment: apiEvent.source?.environment || '',
        version: apiEvent.source?.version
      },
      data: apiEvent.payload || apiEvent.data || {}, // New API uses 'payload', old uses 'data'
      metadata: apiEvent.metadata || {}
    };
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