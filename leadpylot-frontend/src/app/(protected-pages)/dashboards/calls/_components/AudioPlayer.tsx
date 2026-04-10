'use client';

import { useState, useRef, useEffect } from 'react';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import appConfig from '@/configs/app.config';

interface AudioPlayerProps {
  src: string;
  title?: string;
  onError?: (error: string) => void;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  title = 'Audio Recording',
  onError,
  onLoadStart,
  onLoadEnd,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Construct the full URL inside useEffect
    // Fix double slash issue by ensuring apiPrefix doesn't end with / when src starts with /
    const cleanApiPrefix = appConfig.apiPrefix.endsWith('/') ? appConfig.apiPrefix.slice(0, -1) : appConfig.apiPrefix;
    const currentFullAudioUrl = src.startsWith('http') ? src : `${cleanApiPrefix}${src}`;

    const handleLoadStart = () => {
      console.log('🎵 Audio Load Start:', currentFullAudioUrl);
      setIsLoading(true);
      setHasError(false);
      onLoadStart?.();
    };

    const handleLoadedData = () => {
      console.log('🎵 Audio Loaded Successfully:', {
        url: currentFullAudioUrl,
        duration: audio.duration,
        networkState: audio.networkState,
        readyState: audio.readyState
      });
      setIsLoading(false);
      setDuration(audio.duration);
      onLoadEnd?.();
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handleError = (event: Event) => {
      console.error('🎵 Audio Load Error:', {
        url: currentFullAudioUrl,
        error: event,
        audioError: audio.error,
        networkState: audio.networkState,
        readyState: audio.readyState,
        audioErrorCode: audio.error?.code,
        audioErrorMessage: audio.error?.message
      });
      setIsLoading(false);
      setHasError(true);
      const errorMsg = `Failed to load audio file: ${audio.error?.message || 'Unknown error'}`;
      onError?.(errorMsg);
    };

    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [src, onError, onLoadStart, onLoadEnd]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio || hasError) {
      console.log('🎵 Play blocked:', { hasAudio: !!audio, hasError });
      return;
    }

    const currentFullAudioUrl = src.startsWith('http') ? src : `${appConfig.apiPrefix}${src}`;

    try {
      if (isPlaying) {
        console.log('🎵 Pausing audio');
        audio.pause();
        setIsPlaying(false);
      } else {
        console.log('🎵 Attempting to play audio:', currentFullAudioUrl);
        await audio.play();
        console.log('🎵 Audio play started successfully');
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('🎵 Play Error:', {
        error,
        url: currentFullAudioUrl,
        networkState: audio.networkState,
        readyState: audio.readyState
      });
      setHasError(true);
      onError?.(error instanceof Error ? error.message : 'Failed to play audio');
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = (parseFloat(e.target.value) / 100) * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    const newVolume = parseFloat(e.target.value) / 100;
    
    if (audio) {
      audio.volume = newVolume;
    }
    setVolume(newVolume);
  };

  const handlePlaybackRateChange = (rate: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = rate;
    }
    setPlaybackRate(rate);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (hasError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center text-red-600">
          <ApolloIcon name="alert-circle" className="mr-2" />
          <span>Unable to load audio recording</span>
        </div>
      </div>
    );
  }

  // Construct the full URL if it's a relative path
  // Fix double slash issue by ensuring apiPrefix doesn't end with / when src starts with /
  const cleanApiPrefix = appConfig.apiPrefix.endsWith('/') ? appConfig.apiPrefix.slice(0, -1) : appConfig.apiPrefix;
  const fullAudioUrl = src.startsWith('http') ? src : `${cleanApiPrefix}${src}`;

  // Debug logging
  console.log('🎵 AudioPlayer Debug Info:', {
    originalSrc: src,
    apiPrefix: appConfig.apiPrefix,
    fullAudioUrl: fullAudioUrl,
    isRelativePath: !src.startsWith('http'),
    envApiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL
  });

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <audio ref={audioRef} src={fullAudioUrl} preload="metadata" />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="bg-blue-500 text-white p-2 rounded-full mr-3">
            <ApolloIcon name="play-circle" className="text-lg" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">{title}</h4>
            <p className="text-sm text-gray-500">Call Recording</p>
          </div>
        </div>
        
        {/* Playback Rate Controls */}
        <div className="flex items-center gap-1">
          {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
            <Button
              key={rate}
              size="xs"
              variant={playbackRate === rate ? "default" : "secondary"}
              onClick={() => handlePlaybackRateChange(rate)}
              disabled={isLoading}
            >
              {rate}x
            </Button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4">
        {/* Play/Pause and Progress */}
        <div className="flex items-center gap-4">
          <Button
            size="sm"
            onClick={togglePlayPause}
            disabled={isLoading}
            icon={
              isLoading ? (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              ) : (
                <ApolloIcon name={isPlaying ? "pause" : "play"} />
              )
            }
          >
            {isLoading ? 'Loading...' : isPlaying ? 'Pause' : 'Play'}
          </Button>

          <div className="flex-1 flex items-center gap-3">
            <span className="text-sm text-gray-500 min-w-[40px]">
              {formatTime(currentTime)}
            </span>
            
            <div className="flex-1 relative">
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={handleSeek}
                disabled={isLoading || duration === 0}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div 
                className="absolute top-0 h-2 bg-blue-500 rounded-lg pointer-events-none"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            <span className="text-sm text-gray-500 min-w-[40px]">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-3">
          <ApolloIcon name="volume" className="text-gray-400" />
          <div className="flex-1 max-w-[150px]">
            <input
              type="range"
              min="0"
              max="100"
              value={volume * 100}
              onChange={handleVolumeChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <span className="text-sm text-gray-500 min-w-[30px]">
            {Math.round(volume * 100)}%
          </span>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
};
