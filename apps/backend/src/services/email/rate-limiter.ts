import pLimit from 'p-limit';
import { logger } from '../../utils/logger';

/**
 * Rate limiter for Resend API
 * Limits to 2 requests per second (with safety margin: 1.8 req/s)
 * Implements retry with exponential backoff for 429 errors
 */
export class ResendRateLimiter {
  private limit: ReturnType<typeof pLimit>;
  private lastRequestTime: number = 0;
  private readonly maxRetries: number = 3;
  private readonly baseDelayMs: number = 1000; // 1 second base delay
  private readonly minIntervalMs: number; // Minimum time between requests

  constructor() {
    // Limit to 1.8 requests per second (safety margin below 2 req/s limit)
    // This means one request every ~556ms
    const requestsPerSecond = 1.8;
    this.minIntervalMs = Math.ceil(1000 / requestsPerSecond);
    
    // p-limit controls concurrency - use 1 to ensure sequential processing
    this.limit = pLimit(1);
    
    logger.info('[ResendRateLimiter] Initialized', {
      requestsPerSecond,
      minIntervalMs: this.minIntervalMs,
      maxRetries: this.maxRetries,
    });
  }

  /**
   * Execute a function with rate limiting and retry logic
   */
  async execute<T>(
    fn: () => Promise<T>,
    context?: { recipient?: string; attempt?: number }
  ): Promise<T> {
    return this.limit(async () => {
      // Add delay between requests to respect rate limit
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      if (timeSinceLastRequest < this.minIntervalMs) {
        const delayNeeded = this.minIntervalMs - timeSinceLastRequest;
        await new Promise(resolve => setTimeout(resolve, delayNeeded));
      }
      
      this.lastRequestTime = Date.now();

      let lastError: Error | null = null;
      
      for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
        try {
          const result = await fn();
          
          // Check if result is a Resend response with an error
          // Resend returns { data?: {...}, error?: {...} }
          if (result && typeof result === 'object' && 'error' in result && result.error) {
            const resendError = result.error as any;
            const statusCode = resendError.statusCode as number | undefined;
            const errorName = resendError.name || '';
            
            // Check if it's a 429 error (rate limit)
            const isRateLimit = statusCode === 429 || errorName === 'rate_limit_exceeded';
            
            if (isRateLimit && attempt < this.maxRetries) {
              // Calculate exponential backoff delay
              const delayMs = this.baseDelayMs * Math.pow(2, attempt);
              
              logger.warn('[ResendRateLimiter] Rate limit hit, retrying with backoff', {
                attempt: attempt + 1,
                maxRetries: this.maxRetries,
                delayMs,
                recipient: context?.recipient,
                statusCode,
              });
              
              // Wait before retry
              await new Promise(resolve => setTimeout(resolve, delayMs));
              continue; // Retry
            }
            
            // If it's a rate limit error but we've exhausted retries, throw
            if (isRateLimit) {
              lastError = new Error(`Rate limit dépassé après ${attempt + 1} tentatives: ${resendError.message || 'Trop de requêtes.'}`);
              logger.error('[ResendRateLimiter] Max retries exceeded for rate limit', {
                attempts: attempt + 1,
                recipient: context?.recipient,
              });
              throw lastError;
            }
            
            // For other errors, throw immediately
            lastError = new Error(resendError.message || 'Erreur Resend');
            throw lastError;
          }
          
          // Log successful retry if it wasn't the first attempt
          if (attempt > 0) {
            logger.info('[ResendRateLimiter] Retry successful', {
              attempt,
              recipient: context?.recipient,
            });
          }
          
          return result;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          const errorMessage = lastError.message;
          
          // Check if it's a 429 error (rate limit) from error message
          const isRateLimit = errorMessage.includes('429') || 
                             errorMessage.includes('rate_limit_exceeded') ||
                             errorMessage.includes('Rate limit');
          
          // Only retry on rate limit errors
          if (!isRateLimit || attempt >= this.maxRetries) {
            if (isRateLimit && attempt >= this.maxRetries) {
              logger.error('[ResendRateLimiter] Max retries exceeded for rate limit', {
                attempts: attempt + 1,
                recipient: context?.recipient,
              });
            }
            throw lastError;
          }
          
          // Calculate exponential backoff delay
          const delayMs = this.baseDelayMs * Math.pow(2, attempt);
          
          logger.warn('[ResendRateLimiter] Rate limit hit, retrying with backoff', {
            attempt: attempt + 1,
            maxRetries: this.maxRetries,
            delayMs,
            recipient: context?.recipient,
          });
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
      
      // Should never reach here, but TypeScript needs it
      throw lastError || new Error('Unknown error in rate limiter');
    });
  }

  /**
   * Get current queue size (for monitoring)
   */
  getQueueSize(): number {
    // p-limit doesn't expose queue size directly, but we can estimate
    // Since we use concurrency of 1, the queue is typically empty or has 1 item
    return 0; // Simplified - p-limit doesn't expose this
  }
}

// Singleton instance
let rateLimiterInstance: ResendRateLimiter | null = null;

/**
 * Get the singleton ResendRateLimiter instance
 */
export function getResendRateLimiter(): ResendRateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new ResendRateLimiter();
  }
  return rateLimiterInstance;
}

