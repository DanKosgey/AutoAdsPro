/**
 * Rate Limiter Utility
 * 
 * Handles:
 * - Exponential backoff with jitter
 * - Automatic retry on 429 (rate limit) errors
 * - Request throttling with configurable delay
 * - Queue management for burst requests
 */

export interface RateLimiterConfig {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  jitterFactor?: number; // 0-1, adds randomness to delays
  throttleDelayMs?: number; // Minimum delay between requests
}

export class RateLimiter {
  private maxRetries: number;
  private initialDelayMs: number;
  private maxDelayMs: number;
  private backoffMultiplier: number;
  private jitterFactor: number;
  private throttleDelayMs: number;
  private lastRequestTime: number = 0;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue: boolean = false;

  constructor(config: RateLimiterConfig = {}) {
    this.maxRetries = config.maxRetries ?? 5;
    this.initialDelayMs = config.initialDelayMs ?? 1000;
    this.maxDelayMs = config.maxDelayMs ?? 60000;
    this.backoffMultiplier = config.backoffMultiplier ?? 2;
    this.jitterFactor = config.jitterFactor ?? 0.1;
    this.throttleDelayMs = config.throttleDelayMs ?? 500; // Default: 500ms between requests
  }

  /**
   * Execute a function with rate limiting and automatic retry
   */
  async execute<T>(fn: () => Promise<T>, context?: string): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        // Enforce throttle delay
        await this.waitForThrottle();

        const result = await fn();
        this.lastRequestTime = Date.now();
        return result;
      } catch (error: any) {
        lastError = error;

        // Check if it's a rate limit error
        const isRateLimit = 
          error?.data === 429 || 
          error?.message?.includes('rate-overlimit') ||
          error?.message?.includes('429') ||
          error?.statusCode === 429;

        if (!isRateLimit || attempt === this.maxRetries) {
          // Not a rate limit error, or we're out of retries
          throw error;
        }

        // Calculate backoff delay
        const delay = this.calculateBackoffDelay(attempt);
        console.warn(
          `⏱️ Rate limited${context ? ` (${context})` : ''}. Attempt ${attempt + 1}/${this.maxRetries + 1}, ` +
          `waiting ${delay}ms before retry...`
        );

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Rate limiter exhausted retries');
  }

  /**
   * Queue a function for execution with rate limiting
   */
  async queue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await this.execute(fn);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  /**
   * Process queued requests sequentially with throttling
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) return;

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const fn = this.requestQueue.shift();
      if (fn) {
        await fn();
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Wait for throttle delay before making next request
   */
  private async waitForThrottle(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.throttleDelayMs) {
      const waitTime = this.throttleDelayMs - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  private calculateBackoffDelay(attempt: number): number {
    const exponentialDelay = Math.min(
      this.initialDelayMs * Math.pow(this.backoffMultiplier, attempt),
      this.maxDelayMs
    );

    // Add jitter to prevent thundering herd
    const jitter = exponentialDelay * this.jitterFactor * (Math.random() * 2 - 1);
    return Math.max(exponentialDelay + jitter, this.initialDelayMs);
  }

  /**
   * Get current throttle status
   */
  getStatus() {
    return {
      queueLength: this.requestQueue.length,
      isProcessingQueue: this.isProcessingQueue,
      timeSinceLastRequest: Date.now() - this.lastRequestTime,
      config: {
        maxRetries: this.maxRetries,
        throttleDelayMs: this.throttleDelayMs,
        initialDelayMs: this.initialDelayMs,
        maxDelayMs: this.maxDelayMs
      }
    };
  }
}

// Singleton instance for group metadata requests
export const groupMetadataLimiter = new RateLimiter({
  maxRetries: 5,
  initialDelayMs: 1500,
  maxDelayMs: 60000,
  backoffMultiplier: 2.5,
  jitterFactor: 0.15,
  throttleDelayMs: 800 // 800ms between group metadata requests
});

// Singleton instance for general API calls with lighter throttle
export const apiCallLimiter = new RateLimiter({
  maxRetries: 3,
  initialDelayMs: 500,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
  throttleDelayMs: 200
});
