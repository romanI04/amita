/**
 * VoiceDNACache - Two-tier caching system for voice profiles
 * Optimizes performance and reduces database calls
 */

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface VoiceDNA {
  id: string;
  user_id: string;
  dna_vector: number[];
  feature_stats: FeatureStats;
  confidence: number;
  samples_analyzed: number;
  created_at: string;
  updated_at: string;
}

export interface FeatureStats {
  lexical: {
    vocabulary_size: number;
    avg_word_length: number;
    unique_word_ratio: number;
  };
  syntactic: {
    avg_sentence_length: number;
    sentence_complexity: number;
    passive_voice_ratio: number;
  };
  stylistic: {
    formality_score: number;
    punctuation_diversity: number;
    paragraph_consistency: number;
  };
  cognitive: {
    readability_score: number;
    coherence_score: number;
    authenticity_markers: number;
  };
}

interface CacheEntry {
  data: VoiceDNA;
  timestamp: number;
  accessCount: number;
}

export class VoiceDNACache {
  private memoryCache: Map<string, CacheEntry>;
  private readonly maxMemorySize = 100; // Maximum entries in memory
  private readonly ttl = 5 * 60 * 1000; // 5 minutes TTL
  private supabase: SupabaseClient;
  
  // Singleton instance
  private static instance: VoiceDNACache;

  private constructor() {
    this.memoryCache = new Map();
    this.supabase = createClient();
    
    // Periodic cleanup of expired entries
    setInterval(() => this.cleanupExpiredEntries(), 60 * 1000); // Every minute
  }

  static getInstance(): VoiceDNACache {
    if (!VoiceDNACache.instance) {
      VoiceDNACache.instance = new VoiceDNACache();
    }
    return VoiceDNACache.instance;
  }

  /**
   * Get voice DNA with two-tier caching
   */
  async getVoiceDNA(userId: string): Promise<VoiceDNA | null> {
    // Check L1 cache (memory)
    const cachedEntry = this.memoryCache.get(userId);
    if (cachedEntry && this.isValidEntry(cachedEntry)) {
      cachedEntry.accessCount++;
      return cachedEntry.data;
    }

    // Check L2 cache (database)
    try {
      const { data, error } = await this.supabase
        .from('voice_dna')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching voice DNA:', error);
        return null;
      }

      if (data) {
        // Add to memory cache
        this.addToMemoryCache(userId, data);
        return data;
      }
    } catch (error) {
      console.error('Error accessing voice DNA:', error);
    }

    return null;
  }

  /**
   * Save or update voice DNA
   */
  async saveVoiceDNA(voiceDNA: Omit<VoiceDNA, 'id' | 'created_at' | 'updated_at'>): Promise<VoiceDNA | null> {
    try {
      const { data, error } = await this.supabase
        .from('voice_dna')
        .upsert({
          ...voiceDNA,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving voice DNA:', error);
        return null;
      }

      if (data) {
        // Update memory cache
        this.addToMemoryCache(voiceDNA.user_id, data);
        return data;
      }
    } catch (error) {
      console.error('Error saving voice DNA:', error);
    }

    return null;
  }

  /**
   * Update voice DNA incrementally with new features
   */
  async updateVoiceDNA(
    userId: string,
    newFeatures: number[],
    newStats?: Partial<FeatureStats>
  ): Promise<VoiceDNA | null> {
    const existing = await this.getVoiceDNA(userId);
    
    if (!existing) {
      // Create new voice DNA
      return this.saveVoiceDNA({
        user_id: userId,
        dna_vector: newFeatures,
        feature_stats: this.createDefaultStats(newStats),
        confidence: 0.5,
        samples_analyzed: 1
      });
    }

    // Exponentially weighted average update
    const alpha = 0.1; // Learning rate
    const updatedVector = this.updateVector(existing.dna_vector, newFeatures, alpha);
    const updatedStats = this.mergeStats(existing.feature_stats, newStats);
    const updatedConfidence = Math.min(1, existing.confidence + 0.05); // Gradually increase confidence

    return this.saveVoiceDNA({
      user_id: userId,
      dna_vector: updatedVector,
      feature_stats: updatedStats,
      confidence: updatedConfidence,
      samples_analyzed: existing.samples_analyzed + 1
    });
  }

  /**
   * Calculate similarity between two voice DNAs
   */
  calculateSimilarity(dna1: VoiceDNA, dna2: VoiceDNA): number {
    return this.cosineSimilarity(dna1.dna_vector, dna2.dna_vector);
  }

  /**
   * Find similar voice profiles (for detecting multiple accounts, etc.)
   */
  async findSimilarProfiles(
    userId: string,
    threshold: number = 0.85
  ): Promise<Array<{ user_id: string; similarity: number }>> {
    const userDNA = await this.getVoiceDNA(userId);
    if (!userDNA) return [];

    try {
      // Fetch all voice DNAs (in production, use vector similarity search)
      const { data: allDNAs, error } = await this.supabase
        .from('voice_dna')
        .select('user_id, dna_vector')
        .neq('user_id', userId);

      if (error || !allDNAs) return [];

      const similarities = allDNAs
        .map(dna => ({
          user_id: dna.user_id,
          similarity: this.cosineSimilarity(userDNA.dna_vector, dna.dna_vector)
        }))
        .filter(item => item.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity);

      return similarities;
    } catch (error) {
      console.error('Error finding similar profiles:', error);
      return [];
    }
  }

  /**
   * Batch get voice DNAs for multiple users
   */
  async batchGetVoiceDNA(userIds: string[]): Promise<Map<string, VoiceDNA>> {
    const result = new Map<string, VoiceDNA>();
    const uncachedIds: string[] = [];

    // Check memory cache first
    for (const userId of userIds) {
      const cached = this.memoryCache.get(userId);
      if (cached && this.isValidEntry(cached)) {
        cached.accessCount++;
        result.set(userId, cached.data);
      } else {
        uncachedIds.push(userId);
      }
    }

    // Fetch uncached from database
    if (uncachedIds.length > 0) {
      try {
        const { data, error } = await this.supabase
          .from('voice_dna')
          .select('*')
          .in('user_id', uncachedIds);

        if (!error && data) {
          data.forEach(dna => {
            this.addToMemoryCache(dna.user_id, dna);
            result.set(dna.user_id, dna);
          });
        }
      } catch (error) {
        console.error('Error batch fetching voice DNAs:', error);
      }
    }

    return result;
  }

  /**
   * Clear cache for a specific user
   */
  invalidateUser(userId: string): void {
    this.memoryCache.delete(userId);
  }

  /**
   * Clear entire cache
   */
  clearCache(): void {
    this.memoryCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    memorySize: number;
    hitRate: number;
    avgAccessCount: number;
  } {
    const entries = Array.from(this.memoryCache.values());
    const totalAccess = entries.reduce((sum, entry) => sum + entry.accessCount, 0);
    
    return {
      memorySize: this.memoryCache.size,
      hitRate: entries.length > 0 ? totalAccess / (totalAccess + entries.length) : 0,
      avgAccessCount: entries.length > 0 ? totalAccess / entries.length : 0
    };
  }

  // Private helper methods

  private addToMemoryCache(userId: string, data: VoiceDNA): void {
    // Implement LRU eviction if cache is full
    if (this.memoryCache.size >= this.maxMemorySize) {
      this.evictLeastRecentlyUsed();
    }

    this.memoryCache.set(userId, {
      data,
      timestamp: Date.now(),
      accessCount: 1
    });
  }

  private evictLeastRecentlyUsed(): void {
    let lruKey: string | null = null;
    let lruTimestamp = Infinity;

    this.memoryCache.forEach((entry, key) => {
      if (entry.timestamp < lruTimestamp) {
        lruTimestamp = entry.timestamp;
        lruKey = key;
      }
    });

    if (lruKey) {
      this.memoryCache.delete(lruKey);
    }
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.memoryCache.forEach((entry, key) => {
      if (now - entry.timestamp > this.ttl) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.memoryCache.delete(key));
  }

  private isValidEntry(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < this.ttl;
  }

  private updateVector(existing: number[], newVector: number[], alpha: number): number[] {
    if (existing.length !== newVector.length) {
      console.warn('Vector length mismatch, using new vector');
      return newVector;
    }

    return existing.map((val, i) => val * (1 - alpha) + newVector[i] * alpha);
  }

  private createDefaultStats(partial?: Partial<FeatureStats>): FeatureStats {
    return {
      lexical: {
        vocabulary_size: 0,
        avg_word_length: 0,
        unique_word_ratio: 0,
        ...partial?.lexical
      },
      syntactic: {
        avg_sentence_length: 0,
        sentence_complexity: 0,
        passive_voice_ratio: 0,
        ...partial?.syntactic
      },
      stylistic: {
        formality_score: 0.5,
        punctuation_diversity: 0,
        paragraph_consistency: 0,
        ...partial?.stylistic
      },
      cognitive: {
        readability_score: 0,
        coherence_score: 0,
        authenticity_markers: 0,
        ...partial?.cognitive
      }
    };
  }

  private mergeStats(existing: FeatureStats, updates?: Partial<FeatureStats>): FeatureStats {
    if (!updates) return existing;

    return {
      lexical: { ...existing.lexical, ...updates.lexical },
      syntactic: { ...existing.syntactic, ...updates.syntactic },
      stylistic: { ...existing.stylistic, ...updates.stylistic },
      cognitive: { ...existing.cognitive, ...updates.cognitive }
    };
  }

  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      console.warn('Vector length mismatch in similarity calculation');
      return 0;
    }

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      magnitude1 += vec1[i] * vec1[i];
      magnitude2 += vec2[i] * vec2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }
}

// Export singleton instance getter
export const voiceDNACache = VoiceDNACache.getInstance();