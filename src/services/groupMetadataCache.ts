/**
 * Group Metadata Cache Service
 * 
 * Multi-level caching strategy:
 * 1. In-memory cache (fast, session-scoped)
 * 2. Database cache (persistent)
 * 3. API fetch (fallback with TTL check)
 */

import { db } from '../database';
import { groups } from '../database/schema';
import { eq } from 'drizzle-orm';

export interface CachedGroupMetadata {
  jid: string;
  subject: string;
  description?: string;
  totalMembers: number;
  adminsCount: number;
  updatedAt: Date;
  cached: boolean; // True if from cache, false if fresh from API
}

export interface CacheEntry {
  data: CachedGroupMetadata;
  timestamp: number;
}

export class GroupMetadataCache {
  private inMemoryCache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour default TTL
  private readonly DB_CACHE_TTL_MS: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(cacheTtlHours: number = 1) {
    this.DB_CACHE_TTL_MS = cacheTtlHours * 60 * 60 * 1000;
    this.startCleanupInterval();
  }

  /**
   * Get group metadata with multi-level caching
   * 
   * Priority:
   * 1. In-memory cache (if fresh)
   * 2. Database cache (if not stale)
   * 3. Returns null (caller should fetch from API)
   */
  async getOrNull(jid: string): Promise<CachedGroupMetadata | null> {
    const now = Date.now();

    // Level 1: Check in-memory cache
    const inMemory = this.inMemoryCache.get(jid);
    if (inMemory && now - inMemory.timestamp < this.CACHE_TTL_MS) {
      console.log(`✅ Cache HIT (memory): ${jid} - age: ${Math.round((now - inMemory.timestamp) / 1000)}s`);
      return inMemory.data;
    }

    // Level 2: Check database cache
    try {
      const dbCache = await db.query.groups.findFirst({
        where: eq(groups.jid, jid)
      });

      if (dbCache && dbCache.updatedAt) {
        const cacheAge = now - dbCache.updatedAt.getTime();
        
        if (cacheAge < this.DB_CACHE_TTL_MS) {
          console.log(`✅ Cache HIT (database): ${jid} - age: ${Math.round(cacheAge / 1000)}s`);
          
          const result: CachedGroupMetadata = {
            jid: dbCache.jid,
            subject: dbCache.subject || 'Unknown',
            description: dbCache.description || undefined,
            totalMembers: dbCache.totalMembers || 0,
            adminsCount: dbCache.adminsCount || 0,
            updatedAt: dbCache.updatedAt,
            cached: true
          };

          // Populate in-memory cache for next access
          this.inMemoryCache.set(jid, { data: result, timestamp: now });
          return result;
        } else {
          console.log(`⏱️ Cache STALE (database): ${jid} - age: ${Math.round(cacheAge / 1000)}s (TTL: ${this.DB_CACHE_TTL_MS / 1000}s)`);
        }
      } else {
        console.log(`❌ Cache MISS (database): ${jid} - not in DB`);
      }
    } catch (error) {
      console.error(`⚠️ Cache query error for ${jid}:`, error);
    }

    // Level 3: Return null - caller should fetch from API
    return null;
  }

  /**
   * Set cached metadata (from API fetch)
   */
  setFromApi(jid: string, metadata: any): CachedGroupMetadata {
    const now = Date.now();
    
    const result: CachedGroupMetadata = {
      jid: jid,
      subject: metadata.subject || 'Unknown',
      description: metadata.desc,
      totalMembers: metadata.participants?.length || 0,
      adminsCount: metadata.participants?.filter((p: any) => p.admin)?.length || 0,
      updatedAt: new Date(),
      cached: false
    };

    // Store in in-memory cache
    this.inMemoryCache.set(jid, { data: result, timestamp: now });
    
    console.log(`💾 Cached (memory + DB): ${jid}`);
    return result;
  }

  /**
   * Invalidate a specific cache entry
   */
  invalidate(jid: string): void {
    this.inMemoryCache.delete(jid);
    console.log(`🗑️ Invalidated cache: ${jid}`);
  }

  /**
   * Invalidate all cache entries
   */
  invalidateAll(): void {
    this.inMemoryCache.clear();
    console.log(`🗑️ Cleared all in-memory cache`);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let freshCount = 0;
    let staleCount = 0;

    for (const [_, cached] of this.inMemoryCache) {
      if (now - cached.timestamp < this.CACHE_TTL_MS) {
        freshCount++;
      } else {
        staleCount++;
      }
    }

    return {
      inMemoryCacheSize: this.inMemoryCache.size,
      freshEntries: freshCount,
      staleEntries: staleCount,
      cacheTtlMs: this.CACHE_TTL_MS,
      dbCacheTtlMs: this.DB_CACHE_TTL_MS
    };
  }

  /**
   * Start periodic cleanup of stale in-memory entries
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let cleaned = 0;

      for (const [jid, cached] of this.inMemoryCache) {
        if (now - cached.timestamp > this.CACHE_TTL_MS) {
          this.inMemoryCache.delete(jid);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        console.log(`🧹 Cache cleanup: removed ${cleaned} stale entries`);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Shutdown cleanup interval
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('🛑 Cache cleanup shutdown');
    }
  }
}

// Singleton instance with 1 hour TTL
export const groupMetadataCacheService = new GroupMetadataCache(1);
