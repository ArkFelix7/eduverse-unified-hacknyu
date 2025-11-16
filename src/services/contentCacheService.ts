import { supabase } from '../lib/supabase';
import type { GeneratedContent } from '../types';

export interface CachedContentMetadata {
  id: string;
  user_id: string;
  source_hash: string;
  source_title: string;
  cache_key: string;
  content_types: string[];
  last_accessed: string;
  access_count: number;
  cache_size?: number;
  created_at: string;
  expires_at: string;
}

export interface ContentCacheConfig {
  enableLocalCache: boolean;
  enableDatabaseCache: boolean;
  localCacheSize: number;
  dbCacheExpiry: number; // days
}

export class ContentCacheService {
  private localCache: Map<string, { content: any; timestamp: number }> = new Map();
  private config: ContentCacheConfig = {
    enableLocalCache: true,
    enableDatabaseCache: true,
    localCacheSize: 50,
    dbCacheExpiry: 7
  };

  // Generate a consistent hash for source content
  private generateSourceHash(sourceText: string, sourceTitle: string): string {
    let hash = 0;
    const str = sourceTitle + sourceText.substring(0, 2000);
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  // Generate cache key for specific content type
  private generateCacheKey(sourceHash: string, contentType: string): string {
    return `${sourceHash}_${contentType}`;
  }

  // Check if content exists in database cache
  async hasValidDatabaseCache(
    userId: string,
    sourceText: string,
    sourceTitle: string,
    contentType: keyof GeneratedContent
  ): Promise<boolean> {
    try {
      const sourceHash = this.generateSourceHash(sourceText, sourceTitle);
      
      const { data, error } = await supabase
        .from('learning_materials')
        .select('id, created_at, last_accessed')
        .eq('content_hash', sourceHash)
        .eq('type', contentType)
        .eq('project_id', await this.getCurrentProjectId(userId))
        .gte('created_at', new Date(Date.now() - this.config.dbCacheExpiry * 24 * 60 * 60 * 1000).toISOString())
        .single();

      if (error || !data) return false;
      
      // Update access tracking
      await this.updateCacheAccess(data.id);
      return true;
    } catch (error) {
      console.error('Error checking database cache:', error);
      return false;
    }
  }

  // Get cached content from database
  async getCachedContent(
    userId: string,
    sourceText: string,
    sourceTitle: string,
    contentType: keyof GeneratedContent
  ): Promise<any | null> {
    try {
      // Check local cache first
      if (this.config.enableLocalCache) {
        const localCacheKey = this.generateCacheKey(
          this.generateSourceHash(sourceText, sourceTitle),
          contentType
        );
        const localCached = this.localCache.get(localCacheKey);
        
        if (localCached && Date.now() - localCached.timestamp < 30 * 60 * 1000) { // 30 min local cache
          return localCached.content;
        }
      }

      // Check database cache
      if (this.config.enableDatabaseCache) {
        const sourceHash = this.generateSourceHash(sourceText, sourceTitle);
        const projectId = await this.getCurrentProjectId(userId);
        
        const { data, error } = await supabase
          .from('learning_materials')
          .select('content, id')
          .eq('content_hash', sourceHash)
          .eq('type', contentType)
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error || !data) return null;

        // Update access tracking
        await this.updateCacheAccess(data.id);

        // Store in local cache
        if (this.config.enableLocalCache) {
          const localCacheKey = this.generateCacheKey(sourceHash, contentType);
          this.localCache.set(localCacheKey, {
            content: data.content,
            timestamp: Date.now()
          });
          this.cleanupLocalCache();
        }

        return data.content;
      }

      return null;
    } catch (error) {
      console.error('Error getting cached content:', error);
      return null;
    }
  }

  // Save content to cache
  async setCachedContent(
    userId: string,
    projectId: string,
    sourceId: string,
    sourceText: string,
    sourceTitle: string,
    contentType: keyof GeneratedContent,
    content: any
  ): Promise<void> {
    try {
      const sourceHash = this.generateSourceHash(sourceText, sourceTitle);

      // Save to database cache
      if (this.config.enableDatabaseCache) {
        // Check if content already exists
        const { data: existing } = await supabase
          .from('learning_materials')
          .select('id')
          .eq('content_hash', sourceHash)
          .eq('type', contentType)
          .eq('project_id', projectId)
          .eq('source_id', sourceId)
          .single();

        if (existing) {
          // Update existing
          await supabase
            .from('learning_materials')
            .update({
              content,
              last_accessed: new Date().toISOString(),
              access_count: await this.getAccessCount(existing.id) + 1
            })
            .eq('id', existing.id);
        } else {
          // Create new
          await supabase
            .from('learning_materials')
            .insert({
              project_id: projectId,
              source_id: sourceId,
              type: contentType,
              content,
              content_hash: sourceHash,
              generated_from_text: sourceText.substring(0, 500),
              last_accessed: new Date().toISOString(),
              access_count: 1
            });
        }

        // Update cache metadata
        await this.updateCacheMetadata(userId, sourceHash, sourceTitle, contentType);
      }

      // Save to local cache
      if (this.config.enableLocalCache) {
        const cacheKey = this.generateCacheKey(sourceHash, contentType);
        this.localCache.set(cacheKey, {
          content,
          timestamp: Date.now()
        });
        this.cleanupLocalCache();
      }
    } catch (error) {
      console.error('Error setting cached content:', error);
    }
  }

  // Get all cached content for a source
  async getAllCachedContent(
    sourceId: string,
    projectId: string
  ): Promise<GeneratedContent> {
    try {
      const { data, error } = await supabase
        .from('learning_materials')
        .select('type, content')
        .eq('source_id', sourceId)
        .eq('project_id', projectId);

      if (error || !data) return {};

      const result: GeneratedContent = {};
      data.forEach(item => {
        (result as any)[item.type] = item.content;
      });

      return result;
    } catch (error) {
      console.error('Error getting all cached content:', error);
      return {};
    }
  }

  // Clear specific content type from cache
  async clearCachedContent(
    sourceId: string,
    projectId: string,
    contentType: keyof GeneratedContent
  ): Promise<void> {
    try {
      // Clear from database
      await supabase
        .from('learning_materials')
        .delete()
        .eq('source_id', sourceId)
        .eq('project_id', projectId)
        .eq('type', contentType);

      // Clear from local cache
      const sourceData = await this.getSourceData(sourceId);
      if (sourceData) {
        const sourceHash = this.generateSourceHash(sourceData.content, sourceData.title);
        const cacheKey = this.generateCacheKey(sourceHash, contentType);
        this.localCache.delete(cacheKey);
      }
    } catch (error) {
      console.error('Error clearing cached content:', error);
    }
  }

  // Get cache status for a source
  async getCacheStatus(
    sourceId: string,
    projectId: string
  ): Promise<Record<string, boolean>> {
    try {
      const { data, error } = await supabase
        .from('learning_materials')
        .select('type')
        .eq('source_id', sourceId)
        .eq('project_id', projectId);

      if (error || !data) return {};

      const status: Record<string, boolean> = {};
      const contentTypes = ['Summary', 'Flashcards', 'Quiz', 'Deep Dive', 'PPT Mode'];
      
      contentTypes.forEach(type => {
        const dbType = type.toLowerCase().replace(' ', '_');
        status[type] = data.some(item => item.type === dbType);
      });

      return status;
    } catch (error) {
      console.error('Error getting cache status:', error);
      return {};
    }
  }

  // Get content generation suggestions
  async getGenerationSuggestions(
    sourceId: string,
    projectId: string
  ): Promise<{ suggested: string[]; cached: string[] }> {
    const cacheStatus = await this.getCacheStatus(sourceId, projectId);
    const allTypes = ['Summary', 'Flashcards', 'Quiz', 'Deep Dive', 'PPT Mode'];
    
    const cached = allTypes.filter(type => cacheStatus[type]);
    const suggested = allTypes.filter(type => !cacheStatus[type]);

    return { suggested, cached };
  }

  // Clean up expired cache entries
  async cleanupExpiredCache(): Promise<number> {
    try {
      const { data: deletedMetadata } = await supabase.rpc('cleanup_expired_cache');
      
      // Also clean up learning materials older than expiry
      const expiryDate = new Date(Date.now() - this.config.dbCacheExpiry * 24 * 60 * 60 * 1000);
      const { count } = await supabase
        .from('learning_materials')
        .delete()
        .lt('created_at', expiryDate.toISOString());

      return (deletedMetadata || 0) + (count || 0);
    } catch (error) {
      console.error('Error cleaning up expired cache:', error);
      return 0;
    }
  }

  // Get cache statistics
  async getCacheStatistics(userId: string): Promise<{
    totalCachedItems: number;
    totalCacheSize: number;
    recentlyAccessed: number;
    oldestItem?: string;
    newestItem?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('learning_materials')
        .select('created_at, last_accessed, content')
        .eq('project_id', await this.getCurrentProjectId(userId))
        .order('created_at', { ascending: false });

      if (error || !data) {
        return {
          totalCachedItems: 0,
          totalCacheSize: 0,
          recentlyAccessed: 0
        };
      }

      const recentThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      const recentlyAccessed = data.filter(item => 
        new Date(item.last_accessed) > recentThreshold
      ).length;

      const totalSize = data.reduce((sum, item) => {
        return sum + JSON.stringify(item.content).length;
      }, 0);

      return {
        totalCachedItems: data.length,
        totalCacheSize: totalSize,
        recentlyAccessed,
        oldestItem: data.length > 0 ? data[data.length - 1].created_at : undefined,
        newestItem: data.length > 0 ? data[0].created_at : undefined
      };
    } catch (error) {
      console.error('Error getting cache statistics:', error);
      return {
        totalCachedItems: 0,
        totalCacheSize: 0,
        recentlyAccessed: 0
      };
    }
  }

  // Private helper methods
  private async getCurrentProjectId(userId: string): Promise<string> {
    // This would typically come from the current context/store
    // For now, return the most recent project
    const { data, error } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      throw new Error('No active project found');
    }

    return data.id;
  }

  private async getSourceData(sourceId: string): Promise<{content: any; title: any} | null> {
    const { data, error } = await supabase
      .from('content_sources')
      .select('content, title')
      .eq('id', sourceId)
      .single();

    return error ? null : data;
  }

  private async updateCacheAccess(materialId: string): Promise<void> {
    await supabase
      .from('learning_materials')
      .update({ last_accessed: new Date().toISOString() })
      .eq('id', materialId);
  }

  private async getAccessCount(materialId: string): Promise<number> {
    const { data } = await supabase
      .from('learning_materials')
      .select('access_count')
      .eq('id', materialId)
      .single();

    return data?.access_count || 0;
  }

  private async updateCacheMetadata(
    userId: string,
    sourceHash: string,
    sourceTitle: string,
    contentType: string
  ): Promise<void> {
    const { data: existing } = await supabase
      .from('content_cache_metadata')
      .select('content_types, access_count')
      .eq('user_id', userId)
      .eq('source_hash', sourceHash)
      .single();

    if (existing) {
      const contentTypes = Array.from(new Set([...existing.content_types, contentType]));
      await supabase
        .from('content_cache_metadata')
        .update({
          content_types: contentTypes,
          last_accessed: new Date().toISOString(),
          access_count: existing.access_count + 1,
          expires_at: new Date(Date.now() + this.config.dbCacheExpiry * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('user_id', userId)
        .eq('source_hash', sourceHash);
    } else {
      await supabase
        .from('content_cache_metadata')
        .insert({
          user_id: userId,
          source_hash: sourceHash,
          source_title: sourceTitle,
          cache_key: this.generateCacheKey(sourceHash, contentType),
          content_types: [contentType],
          last_accessed: new Date().toISOString(),
          access_count: 1,
          expires_at: new Date(Date.now() + this.config.dbCacheExpiry * 24 * 60 * 60 * 1000).toISOString()
        });
    }
  }

  private cleanupLocalCache(): void {
    if (this.localCache.size <= this.config.localCacheSize) return;

    // Remove oldest entries
    const entries = Array.from(this.localCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toRemove = entries.slice(0, entries.length - this.config.localCacheSize);
    toRemove.forEach(([key]) => {
      this.localCache.delete(key);
    });
  }
}

// Singleton instance
export const contentCacheService = new ContentCacheService();
export default contentCacheService;