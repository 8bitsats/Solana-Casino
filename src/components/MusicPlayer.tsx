import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Volume2, VolumeX, Play, Pause } from 'lucide-react';

const formatTime = (time: number): string => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const MusicPlayer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [showVolume, setShowVolume] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const songUrl = "https://pijwxpffitdbhzosxukk.supabase.co/storage/v1/object/public/beats/Decentralized%20Dreams%20(Remastered)%20(1).mp3";

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      
      const audio = audioRef.current;
      const updateTime = () => setCurrentTime(audio.currentTime);
      const updateDuration = () => setDuration(audio.duration);
      
      audio.addEventListener('timeupdate', updateTime);
      audio.addEventListener('loadedmetadata', updateDuration);
      
      return () => {
        audio.removeEventListener('timeupdate', updateTime);
        audio.removeEventListener('loadedmetadata', updateDuration);
      };
    }
  }, [volume]);

  const togglePlay = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  // Add keyboard shortcut for play/pause
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only trigger if no input elements are focused
      if (document.activeElement?.tagName !== 'INPUT' && e.code === 'Space') {
        e.preventDefault(); // Prevent page scroll
        togglePlay();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [togglePlay]);

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 flex items-center space-x-4 bg-[var(--card)] p-3 rounded-lg border border-[var(--border)] shadow-lg">
      <audio ref={audioRef} src={songUrl} loop onEnded={() => setIsPlaying(false)} />
      <button
        onClick={togglePlay}
        aria-label={`${isPlaying ? "Pause" : "Play"} (Space)`}
        className="p-2 hover:bg-[var(--accent)]/10 rounded-full transition-colors"
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 text-[var(--accent)]" />
        ) : (
          <Play className="w-5 h-5 text-[var(--accent)]" />
        )}
      </button>
      <div 
        className="relative"
        onMouseEnter={() => setShowVolume(true)}
        onMouseLeave={() => setShowVolume(false)}
      >
        <button
          onClick={toggleMute}
          aria-label={isMuted ? "Unmute" : "Mute"}
          className="p-2 hover:bg-[var(--accent)]/10 rounded-full transition-colors"
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5 text-[var(--accent)]" />
          ) : (
            <Volume2 className="w-5 h-5 text-[var(--accent)]" />
          )}
        </button>
        {showVolume && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-[var(--card)] rounded-lg border border-[var(--border)] shadow-lg">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => {
                const newVolume = parseFloat(e.target.value);
                setVolume(newVolume);
                if (audioRef.current) {
                  audioRef.current.volume = newVolume;
                }
              }}
              aria-label="Volume"
              className="h-24 -rotate-90 appearance-none bg-[var(--border)] rounded-lg cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--accent)] hover:[&::-webkit-slider-thumb]:bg-[var(--accent)]/80"
            />
          </div>
        )}
      </div>
      <div className="flex flex-col min-w-[200px]">
        <div className="text-sm font-medium mb-1">Decentralized Dreams</div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-[var(--text-secondary)]">{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            aria-label="Song progress"
            className="flex-1 h-1 bg-[var(--border)] rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--accent)] hover:[&::-webkit-slider-thumb]:bg-[var(--accent)]/80"
          />
          <span className="text-xs text-[var(--text-secondary)]">{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};

export default MusicPlayer;
