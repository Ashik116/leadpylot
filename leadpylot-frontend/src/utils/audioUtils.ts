/**
 * Audio Utilities
 * Handles playing notification sounds and other audio feedback
 */

import ApiService from '@/services/ApiService';
import AxiosBase from '@/services/axios/AxiosBase';
import { routeRequest } from '@/services/axios/MicroserviceRouter';
import appConfig from '@/configs/app.config';
import { getAuthToken } from '@/utils/cookies';

interface AudioOptions {
  volume?: number;
  loop?: boolean;
  preload?: boolean;
}

// Notification sound mapping based on notification types
const NOTIFICATION_SOUND_MAP: Record<string, { file: string; volume?: number }> = {
  // Offer-related notifications
  offer_created: { file: '/audio/offer.mp3', volume: 0.7 },
  
  // Payment notifications
  payment_voucher_created: { file: '/audio/payment.mp3', volume: 0.7 },
  
  // Confirmation notifications
  confirmation_created: { file: '/audio/confirmation_created.mp3', volume: 0.7 },
  
  // Netto notifications
  netto1_created: { file: '/audio/netto1.mp3', volume: 0.7 },
  netto2_created: { file: '/audio/netto2.mp3', volume: 0.7 },

  // Opening notifications
  opening_created: { file: '/audio/opening2.mp3', volume: 0.5 },

  // Lead assignments (single lead)
  lead_assigned: { file: '/audio/single Lead.mp3', volume: 0.6 },
  
  // Lead assignments (multiple leads / bulk)
  lead_assigned_multiple: { file: '/audio/multiLeads.mp3', volume: 0.6 },
  bulk_lead_transferred: { file: '/audio/Lead Trasnferred.mp3', volume: 0.6 },
  
  // Lead transfer notifications
  lead_transferred: { file: '/audio/Lead Trasnferred.mp3', volume: 0.6 },
  
  // Todo/Ticket notifications
  todo_created: { file: '/audio/notification.wav', volume: 0.7 },
  todo_assigned: { file: '/audio/notification.wav', volume: 0.7 },
  todo_completed: { file: '/audio/notification.wav', volume: 0.7 },
  todo_completed_admin: { file: '/audio/notification.wav', volume: 0.7 },
  todo_updated: { file: '/audio/notification.wav', volume: 0.5 },
  todo_agent_assignment: { file: '/audio/notification.wav', volume: 0.6 },

  // Email notifications
  email: { file: '/audio/newEmail.mp3', volume: 0.6 },
  email_received: { file: '/audio/newEmail.mp3', volume: 0.6 },
  email_system_received: { file: '/audio/newEmail.mp3', volume: 0.6 },
  email_approved: { file: '/audio/newEmail.mp3', volume: 0.6 },
  email_agent_assigned: { file: '/audio/newEmail.mp3', volume: 0.6 },
  email_comment_mention: { file: '/audio/newEmail.mp3', volume: 0.6 },
  email_comment_added: { file: '/audio/newEmail.mp3', volume: 0.6 },

  // Default fallback for everything else
  default: { file: '/audio/notification.wav', volume: 0.6 }
};

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

class AudioService {
  private audioCache = new Map<string, HTMLAudioElement>();
  private customAudioCache = new Map<string, HTMLAudioElement>(); // Cache for custom audio URLs
  private ruleAudioCache = new Map<string, string | null>(); // Cache for which rules have custom audio
  private isEnabled = true;
  private defaultVolume = 0.7;
  private initialized = false;

  /**
   * Initialize audio service
   */
  constructor() {
    // Only initialize in browser environment
    if (isBrowser) {
      this.init();
    }
  }

  /**
   * Initialize the audio service (browser only)
   */
  private async init(): Promise<void> {
    if (this.initialized || !isBrowser) {
      return;
    }

    this.initialized = true;
    // Check if user has allowed audio autoplay
    await this.checkAudioPermissions();
  }

  /**
   * Check if audio can be played (user interaction required for autoplay policy)
   */
  private async checkAudioPermissions(): Promise<void> {
    if (!isBrowser) {
      return;
    }

    try {
      // Create a silent audio element to test autoplay capability
      const testAudio = new Audio();
      testAudio.volume = 0;
      testAudio.muted = true;

      const playPromise = testAudio.play();
      if (playPromise !== undefined) {
        await playPromise;
        testAudio.pause();
      }
    } catch {
      // Autoplay is blocked until user interaction - this is expected browser behavior
      // No need to log as this is normal
    }
  }

  /**
   * Ensure service is initialized before use
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized && isBrowser) {
      await this.init();
    }
  }

  /**
   * Preload an audio file into cache
   */
  public async preloadAudio(name: string, src: string, options: AudioOptions = {}): Promise<void> {
    if (!isBrowser) {
      return;
    }

    await this.ensureInitialized();

    if (this.audioCache.has(name)) {
      return; // Already cached
    }

    const audio = new Audio();
    audio.src = src;
    audio.volume = options.volume ?? this.defaultVolume;
    audio.loop = options.loop ?? false;

    if (options.preload !== false) {
      audio.preload = 'auto';
    }

    // Handle loading events
    audio.addEventListener('canplaythrough', () => {
      // Audio successfully preloaded
    });

    audio.addEventListener('error', () => {
      // Silently fail - audio file might not exist or network error
      // The service will still work, just without this specific sound
    });

    this.audioCache.set(name, audio);
  }

  /**
   * Play an audio file from cache, or load from path if not cached (ensures sound plays for agents/users when preload did not run).
   */
  public async playAudio(name: string, options: AudioOptions & { src?: string } = {}): Promise<void> {
    if (!isBrowser || !this.isEnabled) {
      return;
    }

    await this.ensureInitialized();

    try {
      let audio = this.audioCache.get(name);

      // If not in cache (e.g. preload never ran for this user/session), load on demand when src is provided
      if (!audio && options.src) {
        await this.preloadAudio(name, options.src, {
          volume: options.volume ?? this.defaultVolume,
          loop: options.loop ?? false,
          preload: true,
        });
        audio = this.audioCache.get(name);
      }

      if (!audio) {
        return;
      }

      // Clone the audio element to allow overlapping sounds
      const audioClone = audio.cloneNode() as HTMLAudioElement;
      audioClone.volume = options.volume ?? audio.volume;
      audioClone.loop = options.loop ?? false;

      // Reset to beginning if already playing
      audioClone.currentTime = 0;

      const playPromise = audioClone.play();
      if (playPromise !== undefined) {
        await playPromise;
      }

      // Clean up after playing (unless looping)
      if (!audioClone.loop) {
        audioClone.addEventListener('ended', () => {
          audioClone.remove();
        });
      }
    } catch {
      // Silently fail - audio might be blocked by browser autoplay policy
      // This is expected behavior and doesn't need logging
    }
  }

  /**
   * Play custom audio from a URL (API endpoint)
   * Fetches audio with authentication and creates a blob URL
   * Enhanced with better error handling and timeout
   */
  private async playCustomAudioFromUrl(url: string, volume?: number, forceRefresh: boolean = false): Promise<void> {
    if (!isBrowser || !this.isEnabled) {
      return;
    }

    await this.ensureInitialized();

    try {
      // If forcing refresh, add timestamp to URL to bypass cache
      const cacheBustedUrl = forceRefresh 
        ? `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`
        : url;
      
      // Check cache first (but skip if forcing refresh)
      let audio = forceRefresh ? undefined : this.customAudioCache.get(url);
      
      if (!audio) {
        // Create timeout promise (8 seconds for audio fetch)
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Audio fetch timeout')), 8000);
        });

        // Fetch audio as blob with authentication
        const fetchPromise = (async () => {
          const config = routeRequest({
            url: cacheBustedUrl,
            method: 'get',
            responseType: 'blob',
            baseURL: appConfig.apiPrefix,
          } as any);

          // Add auth token
          const token = getAuthToken();
          if (token) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
          }
          
          // Note: Cache busting is handled via URL query parameters (_t timestamp)
          // Backend already sends no-cache headers, so we don't need to add them here
          // Adding custom headers causes CORS issues

          const response = await AxiosBase.request(config);
          return response.data;
        })();

        const blob = await Promise.race([fetchPromise, timeoutPromise]);
        
        // Create blob URL
        const blobUrl = URL.createObjectURL(blob);
        
        // Create audio element from blob URL
        audio = new Audio(blobUrl);
        audio.volume = volume ?? this.defaultVolume;
        audio.preload = 'auto';
        
        // Clean up blob URL when audio is done
        audio.addEventListener('ended', () => {
          URL.revokeObjectURL(blobUrl);
        }, { once: true });
        
        // Cache it for future use (use original URL as key, not cache-busted URL)
        this.customAudioCache.set(url, audio);
        
        // Wait for audio to be ready with timeout
        await Promise.race([
          new Promise<void>((resolve) => {
            audio!.addEventListener('canplaythrough', () => resolve(), { once: true });
            // If already loaded, resolve immediately
            if (audio!.readyState >= 3) {
              resolve();
            }
          }),
          new Promise<never>((_, reject) => {
            audio!.addEventListener('error', (e) => {
              reject(new Error('Failed to load audio: ' + (e.target as HTMLAudioElement).error?.message || 'Unknown error'));
            }, { once: true });
            // Timeout after 5 seconds
            setTimeout(() => reject(new Error('Audio load timeout')), 5000);
          }),
        ]);
      }

      // Clone the audio element to allow overlapping sounds
      const audioClone = audio.cloneNode() as HTMLAudioElement;
      audioClone.volume = volume ?? audio.volume;
      audioClone.currentTime = 0;

      const playPromise = audioClone.play();
      if (playPromise !== undefined) {
        await playPromise;
      }

      // Clean up after playing
      audioClone.addEventListener('ended', () => {
        audioClone.remove();
      }, { once: true });
    } catch (error: any) {
      // Enhanced error handling
      if (isBrowser && (window as any).__DEV__) {
        console.warn('Failed to play custom audio, falling back to default:', {
          url,
          error: error.message || error,
          errorType: error.name,
        });
      }
      throw error; // Re-throw to trigger fallback
    }
  }

  /**
   * Normalize notification type to eventType format expected by backend
   * Handles special cases and ensures consistent mapping
   */
  private normalizeNotificationTypeToEventType(notificationType: string): string {
    // Most notification types match directly (e.g., lead_assigned -> lead_assigned)
    // Handle special cases where frontend type differs from backend eventType
    
    const typeMapping: Record<string, string> = {
      // Email notifications - backend uses 'email' as eventType
      email_received: 'email',
      email_system_received: 'email',
      email_comment_mention: 'email',
      email_comment_added: 'email',
      // Todo notifications - admin variant shares same rule as agent variant
      todo_completed_admin: 'todo_completed',
    };

    // Return mapped type if exists, otherwise return original
    return typeMapping[notificationType] || notificationType;
  }

  /**
   * Check if a notification rule has custom audio
   * Enhanced with better error handling and timeout
   */
  private async checkRuleHasCustomAudio(eventType: string, projectId?: string): Promise<string | null> {
    // Normalize eventType to match backend format
    const normalizedEventType = this.normalizeNotificationTypeToEventType(eventType);
    
    // Check cache first
    const cacheKey = `${normalizedEventType}:${projectId || 'global'}`;
    if (this.ruleAudioCache.has(cacheKey)) {
      const cached = this.ruleAudioCache.get(cacheKey);
      if (isBrowser && (window as any).__DEV__) {
        console.debug('🎵 Audio cache hit', {
          eventType,
          normalizedEventType,
          projectId: projectId || 'global',
          cacheKey,
          cached: cached ? 'has audio' : 'no audio',
        });
      }
      return cached || null;
    }

    if (isBrowser && (window as any).__DEV__) {
      console.debug('🎵 Checking custom audio for rule', {
        eventType,
        normalizedEventType,
        projectId: projectId || 'global',
        cacheKey,
        cacheMiss: true,
      });
    }

    try {
      // Create a timeout promise (5 seconds)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Audio check timeout')), 5000);
      });

      // Fetch rule by event type with timeout
      const apiUrl = `/notification-rules/by-event/${normalizedEventType}`;
      const apiParams = projectId ? { projectId } : undefined;
      
      if (isBrowser && (window as any).__DEV__) {
        console.debug('🎵 API request starting', {
          url: apiUrl,
          params: apiParams,
          eventType,
          normalizedEventType,
        });
      }

      const fetchPromise = ApiService.fetchDataWithAxios<{ success: boolean; data: { _id: string; audio?: any } }>({
        url: apiUrl,
        method: 'get',
        params: apiParams,
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (isBrowser && (window as any).__DEV__) {
        console.debug('🎵 API response received', {
          success: response.success,
          hasData: !!response.data,
          hasAudio: !!response.data?.audio,
          eventType,
          normalizedEventType,
          projectId: projectId || 'global',
          ruleId: response.data?._id,
          audioId: response.data?.audio?._id || response.data?.audio?.id,
        });
      }

      if (response.success && response.data?.audio) {
        // Rule has custom audio - return the stream URL with audio document ID for cache busting
        const audioDocId = response.data.audio._id || response.data.audio.id;
        // Include audio document ID in URL to ensure fresh audio when audio is updated
        const audioUrl = `/notification-audio/${response.data._id}/stream${audioDocId ? `?v=${audioDocId}` : ''}`;
        this.ruleAudioCache.set(cacheKey, audioUrl);
        
        if (isBrowser && (window as any).__DEV__) {
          console.debug('✅ Custom audio found for rule', {
            eventType,
            normalizedEventType,
            projectId: projectId || 'global',
            audioUrl,
            audioDocId,
            cacheKey,
          });
        }
        
        return audioUrl;
      }

      // No custom audio - cache null to avoid repeated API calls
      this.ruleAudioCache.set(cacheKey, null);
      
      if (isBrowser && (window as any).__DEV__) {
        console.debug('ℹ️ No custom audio found for rule', {
          eventType,
          normalizedEventType,
          projectId: projectId || 'global',
          cacheKey,
          reason: response.success ? 'rule has no audio' : 'API returned success=false',
        });
      }
      
      return null;
    } catch (error: any) {
      // Handle different error types
      const errorStatus = error.response?.status;
      const errorMessage = error.message || String(error);
      const errorCode = error.code;
      
      if (isBrowser && (window as any).__DEV__) {
        console.warn('❌ Error checking custom audio for rule', {
          eventType,
          normalizedEventType,
          projectId: projectId || 'global',
          cacheKey,
          errorStatus,
          errorMessage,
          errorCode,
          errorType: error.constructor?.name || typeof error,
          fullError: error,
        });
      }

      if (errorStatus === 404) {
        // Rule not found - this is expected, cache null
        this.ruleAudioCache.set(cacheKey, null);
        if (isBrowser && (window as any).__DEV__) {
          console.debug('ℹ️ No rule found for eventType (404)', {
            eventType,
            normalizedEventType,
            projectId: projectId || 'global',
          });
        }
        return null;
      }

      // Network error, timeout, or other error - log but don't break
      // Cache null to prevent repeated failed requests (will retry after cache clear)
      // Don't cache on network errors to allow retry on next notification
      if (errorMessage === 'Audio check timeout' || errorCode === 'ECONNABORTED') {
        // Timeout - don't cache, allow retry
        if (isBrowser && (window as any).__DEV__) {
          console.warn('⏱️ Audio check timeout - will retry on next notification', {
            eventType,
            normalizedEventType,
            projectId: projectId || 'global',
          });
        }
        return null;
      }

      // Other errors - cache null to prevent spam
      this.ruleAudioCache.set(cacheKey, null);
      return null;
    }
  }

  /**
   * Play notification sound based on notification type
   * First checks for custom audio from notification rules, then falls back to default mapping
   * Enhanced with better error handling and volume fallback
   * 
   * @param volume - Volume level (0-1)
   * @param notificationType - The notification event type
   * @param projectId - Optional project ID for project-specific rules
   * @param audioRuleId - Optional rule ID from backend (skips API lookup, uses direct stream)
   * @param useRuleAudioOnly - If true, only play rule audio (skip default if rule audio fails)
   */
  public async playNotification(
    volume?: number,
    notificationType?: string,
    projectId?: string,
    audioRuleId?: string,
    useRuleAudioOnly?: boolean,
  ): Promise<void> {
    if (!notificationType) {
      // No type specified, use default
      const soundConfig = NOTIFICATION_SOUND_MAP.default;
      const soundName = soundConfig.file.split('/').pop()?.split('.')[0] || 'notification';
      const finalVolume = volume ?? soundConfig.volume ?? this.defaultVolume;
      await this.playAudio(soundName, { volume: finalVolume });
      return;
    }

    // Normalize notification type to eventType
    const normalizedType = this.normalizeNotificationTypeToEventType(notificationType);
    const soundConfig = NOTIFICATION_SOUND_MAP[notificationType] || NOTIFICATION_SOUND_MAP.default;
    const finalVolume = volume ?? soundConfig.volume ?? this.defaultVolume;

    // Debug logging
    if (isBrowser && (window as any).__DEV__) {
      console.debug('🎵 Playing notification sound', {
        notificationType,
        normalizedType,
        projectId: projectId || 'global',
        audioRuleId: audioRuleId || 'none',
        useRuleAudioOnly: !!useRuleAudioOnly,
        volume: finalVolume,
      });
    }

    // ── Fast path: backend already told us which rule has audio ──
    if (audioRuleId) {
      const directAudioUrl = `/notification-audio/${audioRuleId}/stream`;
      if (isBrowser && (window as any).__DEV__) {
        console.debug('🎵 Using audioRuleId from backend (direct stream)', {
          audioRuleId,
          directAudioUrl,
          useRuleAudioOnly,
        });
      }
      try {
        await this.playCustomAudioFromUrl(directAudioUrl, finalVolume, true);
        if (isBrowser && (window as any).__DEV__) {
          console.debug('✅ Rule audio played successfully (direct)', { audioRuleId });
        }
        return; // Custom audio played – done
      } catch (directError) {
        if (isBrowser && (window as any).__DEV__) {
          console.warn('❌ Direct rule audio failed', {
            audioRuleId,
            error: directError instanceof Error ? directError.message : directError,
            willFallback: !useRuleAudioOnly,
          });
        }
        // If backend said "only rule audio", don't fall through to default
        if (useRuleAudioOnly) return;
        // Otherwise fall through to API lookup / default
      }
    }

    // ── Normal path: check API for custom audio ──
    try {
      if (isBrowser && (window as any).__DEV__) {
        console.debug('🎵 Checking API for custom audio', {
          notificationType,
          normalizedType,
          projectId: projectId || 'global',
        });
      }
      
      const customAudioUrl = await this.checkRuleHasCustomAudio(normalizedType, projectId);
      
      if (customAudioUrl) {
        if (isBrowser && (window as any).__DEV__) {
          console.debug('✅ Custom audio found via API, playing', {
            notificationType,
            normalizedType,
            audioUrl: customAudioUrl,
            volume: finalVolume,
            projectId: projectId || 'global',
          });
        }
        
        try {
          await this.playCustomAudioFromUrl(customAudioUrl, finalVolume, true);
          if (isBrowser && (window as any).__DEV__) {
            console.debug('✅ Custom audio played successfully', {
              notificationType,
              normalizedType,
              projectId: projectId || 'global',
            });
          }
          return; // Successfully played custom audio – skip default
        } catch (customError) {
          if (isBrowser && (window as any).__DEV__) {
            console.warn('❌ Custom audio playback failed, falling back to default', {
              notificationType,
              normalizedType,
              projectId: projectId || 'global',
              audioUrl: customAudioUrl,
              error: customError instanceof Error ? customError.message : customError,
            });
          }
          // Fall through to default sound
        }
      } else {
        if (isBrowser && (window as any).__DEV__) {
          console.debug('ℹ️ No custom audio found, using default sound', {
            notificationType,
            normalizedType,
            projectId: projectId || 'global',
          });
        }
      }
    } catch (error) {
      if (isBrowser && (window as any).__DEV__) {
        console.warn('❌ Custom audio check failed, using default', {
          notificationType,
          normalizedType,
          projectId: projectId || 'global',
          error: error instanceof Error ? error.message : error,
        });
      }
    }

    // ── Fallback: play default sound from NOTIFICATION_SOUND_MAP ──
    // Pass src so that if preload never ran (e.g. for some agents), we load and play on demand
    const soundName = soundConfig.file.split('/').pop()?.split('.')[0] || 'notification';
    await this.playAudio(soundName, { volume: finalVolume, src: soundConfig.file });
  }

  /**
   * Play email notification sound
   */
  public async playEmailNotification(volume?: number): Promise<void> {
    await this.playNotification(volume, 'email');
  }

  /**
   * Play notification for specific type
   */
  public async playNotificationByType(notificationType: string, volume?: number): Promise<void> {
    await this.playNotification(volume, notificationType);
  }

  /**
   * Preload all notification sounds
   */
  public async preloadNotificationSounds(): Promise<void> {
    const uniqueSounds = new Set<string>();

    // Collect all unique sound files
    Object.values(NOTIFICATION_SOUND_MAP).forEach(config => {
      uniqueSounds.add(config.file);
    });

    // Preload each unique sound
    for (const soundFile of uniqueSounds) {
      const soundName = soundFile.split('/').pop()?.split('.')[0] || 'notification';
      await this.preloadAudio(soundName, soundFile, {
        volume: 0.6,
        preload: true,
      });
    }
  }

  /**
   * Stop all playing audio
   */
  public stopAll(): void {
    if (!isBrowser) {
      return;
    }

    this.audioCache.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
  }

  /**
   * Enable/disable audio
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Check if audio is enabled
   */
  public isAudioEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Set default volume (0-1)
   */
  public setDefaultVolume(volume: number): void {
    this.defaultVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Get cached audio element
   */
  public getAudio(name: string): HTMLAudioElement | undefined {
    return this.audioCache.get(name);
  }

  /**
   * Clear audio cache
   */
  public clearCache(): void {
    this.stopAll();
    this.audioCache.clear();
    this.customAudioCache.clear();
    this.ruleAudioCache.clear();
  }

  /**
   * Clear rule audio cache (useful when rules are updated)
   */
  public clearRuleCache(): void {
    // Clear rule audio URL cache
    this.ruleAudioCache.clear();
    
    // Clear cached audio elements and revoke blob URLs
    this.customAudioCache.forEach((audio, url) => {
      try {
        // Stop playing
        audio.pause();
        audio.src = '';
        // Revoke blob URL if it's a blob URL
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      } catch (error) {
        // Ignore errors during cleanup
      }
    });
    this.customAudioCache.clear();
  }
}

// Create singleton instance
const audioService = new AudioService();

// Export utilities
export { audioService };

export default audioService;

/**
 * Preload notification sounds - call this after user is authenticated
 * This should be called from a component that checks authentication status
 */
export const preloadNotificationSounds = () => {
  if (isBrowser) {
    audioService.preloadNotificationSounds().catch(() => {
      // Silently fail - audio files might not exist or network error
    });
  }
};
