# Rate Limiting Fix for WhatsApp Group Sync

## Problem

The application was experiencing **HTTP 429 (Rate Limit)** errors when syncing WhatsApp groups, particularly during the following scenarios:

1. **Multiple simultaneous group updates** - The `groups.update` event fires for multiple groups at once, and the app was trying to fetch metadata for all of them without throttling
2. **Batch metadata fetch** - The `/groups` endpoint used `Promise.all()` to fetch metadata for all groups simultaneously
3. **No retry strategy** - Rate-limited requests were not being retried with exponential backoff

### Error Pattern from Logs
```
Failed to fetch metadata for 120363336961058808@g.us: Error: rate-overlimit
  data: 429,
  message: 'An internal server error occurred'
```

---

## Solution

### 1. **Rate Limiter Utility** (`src/utils/rateLimiter.ts`)

A robust rate limiting system with:

- **Exponential backoff with jitter** - Prevents thundering herd problem
- **Automatic retry on 429 errors** - Up to 5 retries by default
- **Request throttling** - Enforces minimum delay between requests (800ms for group metadata)
- **Queue management** - Sequential processing of batched requests

#### Configuration
```typescript
// Group metadata limiter (more conservative)
groupMetadataLimiter = new RateLimiter({
  maxRetries: 5,
  initialDelayMs: 1500,        // Start with 1.5s delay
  maxDelayMs: 60000,           // Max 60s between retries
  backoffMultiplier: 2.5,      // Exponential growth
  jitterFactor: 0.15,          // ±15% randomness
  throttleDelayMs: 800         // 800ms between requests
});
```

#### Backoff Formula
```
delay = min(initialDelay * (backoffMultiplier ^ attempt) + jitter, maxDelay)
```

Example progression:
- Attempt 1: ~1.5s
- Attempt 2: ~3.75s (with multiplier 2.5)
- Attempt 3: ~9.4s
- Attempt 4: ~23.5s
- Attempt 5: ~60s (capped)

### 2. **Updated Group Metadata Fetch**

#### In `getGroupMetadata()` method
```typescript
public async getGroupMetadata(jid: string) {
  if (!this.sock) return null;
  try {
    return await groupMetadataLimiter.execute(
      () => this.sock!.groupMetadata(jid),
      `getGroupMetadata(${jid})`  // Context for logging
    );
  } catch (error) {
    console.error(`Failed to fetch metadata for ${jid}:`, error);
    return null;
  }
}
```

#### In `groups.update` Event Handler
```typescript
this.sock.ev.on('groups.update', async (updates) => {
  const { groupService } = await import('../services/groupService');
  
  for (const update of updates) {
    try {
      const metadata = await groupMetadataLimiter.execute(
        () => this.sock!.groupMetadata(update.id!),
        `groups.update(${update.id})`
      );
      await groupService.syncGroup(update.id!, metadata);
    } catch (e) {
      const isRateLimit = (e as any)?.data === 429;
      if (isRateLimit) {
        console.warn(`⏱️ Rate limited while syncing group ${update.id}`);
      } else {
        console.error(`Failed to sync updated group ${update.id}:`, e);
      }
    }
  }
});
```

### 3. **Fixed Batch Metadata Fetch** (`/groups` endpoint)

**Before** (Problem: `Promise.all()` sends all requests simultaneously):
```typescript
const groups = await Promise.all(groupJids.map(async (jid: string) => {
  const metadata = await whatsappClient['sock']?.groupMetadata(jid);
  // ... process
}));
```

**After** (Solution: Sequential processing with rate limiting):
```typescript
const groups = [];
for (const jid of groupJids) {
  try {
    const metadata = await groupMetadataLimiter.execute(
      () => whatsappClient['sock']?.groupMetadata(jid),
      `groups-endpoint(${jid})`
    );
    groups.push({
      id: jid,
      name: metadata?.subject || 'Unknown Group',
      participants: metadata?.participants?.length || 0,
      // ...
    });
  } catch (error) {
    // Handle gracefully
    groups.push({
      id: jid,
      name: 'Unknown Group (Load Error)',
      participants: 0,
    });
  }
}
```

---

## How Rate Limiting Works

### When a 429 Error Occurs

1. **Detection** - Catches error with `data: 429` or message containing "rate-overlimit"
2. **Retry Decision** - Checks if retries remain and error is retryable
3. **Backoff Wait** - Calculates exponential backoff delay with jitter
4. **Logging** - Warns with retry count and wait time
5. **Retry** - Makes the request again after waiting

Example console output:
```
⏱️ Rate limited (groups.update(120363404437416535@g.us)). Attempt 2/6, waiting 3845ms before retry...
✅ Group metadata fetched successfully after retry
```

### Request Throttling

Even successful requests are throttled to prevent hitting rate limits:
- Default: 800ms between group metadata requests
- Prevents: Consecutive requests from overwhelming the API

---

## Expected Improvements

✅ **Reduced 429 Errors** - Automatic retry with exponential backoff  
✅ **Graceful Degradation** - Request throttling prevents overload  
✅ **Better Logging** - Clear visibility into rate limiting events  
✅ **Improved UX** - Groups load slower but reliably instead of failing  
✅ **Production Ready** - Jitter prevents synchronized retry storms  

---

## Testing the Fix

### Test 1: Verify Rate Limiter Logic
```bash
npm test -- rateLimiter.test.ts
```

### Test 2: Monitor Group Syncing
Watch for these positive signs in logs:
```
📊 Scaling workers: 4 → 3 (Low queue depth)
⏱️ Rate limited (groups.update(...)). Attempt 1/6, waiting 1523ms before retry...
✅ Synced 43 members for Group Name
```

### Test 3: Check /groups Endpoint
- Start app: `npm run dev`
- Call: `GET /groups`
- Observe: Groups load sequentially with 800ms spacing
- No 429 errors should appear

---

## Configuration Options

To adjust rate limiting behavior, modify `src/utils/rateLimiter.ts`:

```typescript
export const groupMetadataLimiter = new RateLimiter({
  maxRetries: 5,              // ↑ More retries = longer patience
  initialDelayMs: 1500,       // ↑ Longer delay = less aggressive
  maxDelayMs: 60000,          // ↑ Max cap on backoff
  backoffMultiplier: 2.5,     // ↑ Faster growth = exponential escalation
  jitterFactor: 0.15,         // ↑ More randomness = less coordinated retries
  throttleDelayMs: 800        // ↑ Larger spacing = fewer requests/sec
});
```

### Recommended Tuning

**For High Load (many groups)**:
```typescript
throttleDelayMs: 1200,      // Increase to 1.2s spacing
maxDelayMs: 120000,         // Allow up to 2 minutes backoff
backoffMultiplier: 3        // More aggressive exponential growth
```

**For Low Load (few groups)**:
```typescript
throttleDelayMs: 300,       // Decrease to 300ms spacing
initialDelayMs: 500,        // Start smaller
backoffMultiplier: 1.5      // Gentler growth
```

---

## Monitoring

Check rate limiter status at runtime:
```typescript
import { groupMetadataLimiter } from './utils/rateLimiter';

const status = groupMetadataLimiter.getStatus();
console.log(status);
// Output:
// {
//   queueLength: 0,
//   isProcessingQueue: false,
//   timeSinceLastRequest: 523,
//   config: { /* ... */ }
// }
```

---

## Related Files Modified

- `src/utils/rateLimiter.ts` - **NEW**: Rate limiter implementation
- `src/core/whatsapp.ts` - Updated: `getGroupMetadata()` and `groups.update` handler
- `src/index.ts` - Updated: `/groups` endpoint batch fetch

---

## Future Enhancements

- [ ] Metrics tracking for rate limit events
- [ ] Dynamic rate limit adjustment based on 429 frequency
- [ ] Per-JID rate limiting history
- [ ] Dashboard monitoring for rate limit events
- [ ] Alternative retry strategies (circuit breaker pattern)
