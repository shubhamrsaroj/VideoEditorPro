'use client'

import React, { useRef, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { updateCurrentTime } from '../store/videoSlice';
import { updateOverlay, setSelectedOverlayId } from '../store/effectsSlice';
import { 
  Play, Pause, Volume2, VolumeX, SkipBack, SkipForward,
  RotateCcw, RotateCw, Maximize2, Settings
} from 'lucide-react';
import { formatTime } from '../lib/utils';
import { cn } from '../lib/utils';

const FRAME_DURATION = 1/30; // Assuming 30fps

export default function VideoPreview() {
  const dispatch = useDispatch();
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Track drag state for overlays
  const [dragState, setDragState] = useState({
    isDragging: false,
    overlayId: null as string | null,
    offsetX: 0,
    offsetY: 0
  });

  const currentVideo = useSelector((state: RootState) => state.video.currentVideo);
  const mediaItems = useSelector((state: RootState) => state.effects.mediaItems);
  const overlays = useSelector((state: RootState) => state.effects.overlays);
  const subtitles = useSelector((state: RootState) => state.video.subtitles);

  // Debug logging for overlays and subtitles
  useEffect(() => {
    console.log('Current overlays:', overlays);
    console.log('Current subtitles:', subtitles);
    console.log('Current time:', currentTime);
  }, [overlays, subtitles, currentTime]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
      videoRef.current.playbackRate = playbackRate;
    }
  }, [volume, isMuted, playbackRate]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);
      dispatch(updateCurrentTime(time));
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !progressRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const time = percent * (videoRef.current.duration || 0);
    
    videoRef.current.currentTime = time;
    setCurrentTime(time);
    dispatch(updateCurrentTime(time));
  };

  const handleFrameStep = (direction: 'forward' | 'backward') => {
    if (!videoRef.current) return;
    
    const newTime = currentTime + (direction === 'forward' ? FRAME_DURATION : -FRAME_DURATION);
    if (newTime >= 0 && newTime <= (videoRef.current.duration || 0)) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      dispatch(updateCurrentTime(newTime));
    }
  };

  const handleSkip = (seconds: number) => {
    if (!videoRef.current) return;
    
    const newTime = Math.max(0, Math.min(currentTime + seconds, videoRef.current.duration || 0));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    dispatch(updateCurrentTime(newTime));
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Handle overlay drag start
  const handleOverlayDragStart = (e: React.MouseEvent, overlayId: string) => {
    console.log('Starting drag for overlay:', overlayId);
    e.preventDefault();
    e.stopPropagation();
    
    // Select the overlay when starting to drag
    dispatch(setSelectedOverlayId(overlayId));
    
    // Get target element and calculate offset
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    
    console.log('Mouse position:', e.clientX, e.clientY);
    console.log('Target position:', rect.left, rect.top);
    
    // Highlight the element being dragged
    target.style.outline = '2px solid #3b82f6';
    target.style.outlineOffset = '2px';
    
    setDragState({
      isDragging: true,
      overlayId,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top
    });
    
    // Add event listeners for dragging
    document.addEventListener('mousemove', handleOverlayDragMove);
    document.addEventListener('mouseup', handleOverlayDragEnd);
  };
  
  // Handle overlay drag move
  const handleOverlayDragMove = (e: MouseEvent) => {
    if (!dragState.isDragging || !dragState.overlayId || !containerRef.current) {
      console.log('Drag move aborted:', { isDragging: dragState.isDragging, overlayId: dragState.overlayId, containerRef: !!containerRef.current });
      return;
    }
    
    console.log('Moving overlay:', dragState.overlayId);
    console.log('Mouse position:', e.clientX, e.clientY);
    
    const containerRect = containerRef.current.getBoundingClientRect();
    
    // Calculate new position as percentage
    const x = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    const y = ((e.clientY - containerRect.top) / containerRect.height) * 100;
    
    // Clamp values between 0 and 100
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));
    
    console.log('New position:', clampedX, clampedY);
    
    // Update overlay position
    const overlay = overlays.find(o => o.id === dragState.overlayId);
    if (overlay) {
      const updates = { ...overlay, position: { x: clampedX, y: clampedY } };
      dispatch(updateOverlay({ id: dragState.overlayId, updates }));
    }
  };
  
  // Handle overlay drag end
  const handleOverlayDragEnd = () => {
    console.log('Ending drag for overlay:', dragState.overlayId);
    
    // Remove highlight from any elements
    const overlayElements = document.querySelectorAll('[data-overlay-id]');
    overlayElements.forEach(el => {
      (el as HTMLElement).style.outline = '';
      (el as HTMLElement).style.outlineOffset = '';
    });
    
    setDragState({
      isDragging: false,
      overlayId: null,
      offsetX: 0,
      offsetY: 0
    });
    
    // Remove event listeners
    document.removeEventListener('mousemove', handleOverlayDragMove);
    document.removeEventListener('mouseup', handleOverlayDragEnd);
  };
  
  // Clean up event listeners
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleOverlayDragMove);
      document.removeEventListener('mouseup', handleOverlayDragEnd);
    };
  }, []);

  // Render active overlays
  const renderOverlays = () => {
    console.log('Rendering overlays:', overlays);
    return overlays.map(overlay => {
      console.log('Checking overlay:', overlay.id, 'at time:', currentTime);
      console.log('Overlay timing:', overlay.timing);
      
      if (currentTime < overlay.timing.startTime || 
          currentTime > overlay.timing.startTime + overlay.timing.duration) {
        console.log('Overlay not visible due to timing:', overlay.id);
        return null;
      }

      const style = {
        position: 'absolute',
        left: `${overlay.position.x}%`,
        top: `${overlay.position.y}%`,
        cursor: 'move',
        pointerEvents: 'auto', // Ensure clicks are captured
        zIndex: 10, // Ensure overlay is above other elements
        ...overlay.type === 'text' 
          ? {
              fontSize: `${overlay.style.fontSize}px`,
              color: overlay.style.color,
              opacity: overlay.style.opacity,
              fontFamily: overlay.style.fontFamily,
              fontWeight: overlay.style.fontWeight,
              backgroundColor: overlay.style.backgroundColor || 'transparent',
              padding: overlay.style.padding || '0px',
              textAlign: overlay.style.textAlign || 'center',
              textShadow: overlay.style.textShadow ? '1px 1px 2px rgba(0,0,0,0.8)' : 'none',
              transform: `translate(-50%, -50%) rotate(${overlay.style.rotation}deg)`,
            }
          : {
              // For images, use fixed width with scale factor
              maxWidth: '40%',
              width: 'auto',
              opacity: overlay.style.opacity,
              transform: `translate(-50%, -50%) scale(${overlay.style.scale}) rotate(${overlay.style.rotation}deg)`,
              border: overlay.style.border?.width 
                ? `${overlay.style.border.width}px ${overlay.style.border.style} ${overlay.style.border.color}` 
                : 'none',
              borderRadius: overlay.style.border?.radius ? `${overlay.style.border.radius}px` : '0',
              filter: overlay.style.filter 
                ? `brightness(${overlay.style.filter.brightness}%) contrast(${overlay.style.filter.contrast}%) saturate(${overlay.style.filter.saturation}%) blur(${overlay.style.filter.blur}px)`
                : 'none',
              boxShadow: overlay.style.shadow?.blur
                ? `${overlay.style.shadow.offsetX}px ${overlay.style.shadow.offsetY}px ${overlay.style.shadow.blur}px ${overlay.style.shadow.color}`
                : 'none',
            }
      };

      return (
        <div 
          key={overlay.id} 
          style={style as React.CSSProperties}
          onMouseDown={(e) => {
            console.log('Mouse down on overlay:', overlay.id);
            handleOverlayDragStart(e, overlay.id);
          }}
          onClick={(e) => {
            console.log('Click on overlay:', overlay.id);
            e.stopPropagation();
            dispatch(setSelectedOverlayId(overlay.id));
          }}
          className={cn(
            "overlay-item", // Add a class for easier debugging
            "ring-offset-2 hover:ring-2 hover:ring-blue-300",
            dragState.overlayId === overlay.id ? "ring-2 ring-blue-500" : ""
          )}
          data-overlay-id={overlay.id}
          data-overlay-type={overlay.type}
        >
          {overlay.type === 'text' ? (
            <span>{overlay.content}</span>
          ) : (
            <img 
              src={overlay.content} 
              alt="" 
              style={{ 
                maxWidth: '100%',
                height: 'auto',
                objectFit: 'contain',
                pointerEvents: 'none', // Let the parent div handle events
              }} 
              draggable="false"
              onDragStart={(e) => e.preventDefault()} // Prevent native drag
            />
          )}
        </div>
      );
    });
  };

  // Render active subtitles
  const renderSubtitles = () => {
    // Filter subtitles that should be visible at the current time
    const visibleSubtitles = subtitles.filter(subtitle => 
      currentTime >= subtitle.startTime && currentTime <= subtitle.endTime
    );

    if (visibleSubtitles.length === 0) return null;

    return (
      <div className="absolute inset-x-0 bottom-16 flex flex-col items-center justify-center pointer-events-none z-10">
        {visibleSubtitles.map(subtitle => {
          // Default style values if not provided
          const fontSize = subtitle.style?.fontSize || 16;
          const color = subtitle.style?.color || '#FFFFFF';
          const position = subtitle.style?.position || 'bottom';
          const backgroundColor = subtitle.style?.backgroundColor || 'rgba(0,0,0,0)';
          const opacity = subtitle.style?.opacity || 1;
          const textShadow = subtitle.style?.textShadow ? '2px 2px 4px rgba(0,0,0,0.8)' : 'none';
          const fontWeight = subtitle.style?.fontWeight || 'normal';
          
          // Calculate vertical position based on preference
          let verticalPosition = {};
          if (position === 'top') {
            verticalPosition = { top: '10%', bottom: 'auto' };
          } else if (position === 'middle') {
            verticalPosition = { top: '50%', transform: 'translateY(-50%)' };
          } else {
            verticalPosition = { bottom: '10%', top: 'auto' };
          }
          
          return (
            <div 
              key={subtitle.id}
              className="px-4 py-2 rounded max-w-[80%] text-center mb-2"
              style={{
                fontSize: `${fontSize}px`,
                color: color,
                backgroundColor: backgroundColor,
                opacity: opacity,
                textShadow: textShadow,
                fontWeight: fontWeight,
                ...verticalPosition
              }}
            >
              {subtitle.text}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div ref={containerRef} className="relative w-full h-full group">
      {/* Video */}
      <video
        ref={videoRef}
        src={currentVideo.url}
        className="w-full h-full bg-black"
        onTimeUpdate={handleTimeUpdate}
      />

      {/* Overlays */}
      <div 
        className="absolute inset-0 pointer-events-none"
        onDragOver={(e) => e.preventDefault()}
      >
        {renderOverlays()}
      </div>

      {/* Subtitles */}
      {renderSubtitles()}

      {/* Controls */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Progress bar */}
        <div 
          ref={progressRef}
          className="relative h-1 bg-gray-600 cursor-pointer"
          onClick={handleProgressClick}
        >
          <div 
            className="absolute h-full bg-blue-500"
            style={{ width: `${((currentTime || 0) / (videoRef.current?.duration || 1)) * 100}%` }}
          />
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between">
            {/* Left controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePlayPause}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white" />
                )}
              </button>

              <button
                onClick={() => handleSkip(-10)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <RotateCcw className="w-4 h-4 text-white" />
              </button>

              <button
                onClick={() => handleFrameStep('backward')}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <SkipBack className="w-4 h-4 text-white" />
              </button>

              <button
                onClick={() => handleFrameStep('forward')}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <SkipForward className="w-4 h-4 text-white" />
              </button>

              <button
                onClick={() => handleSkip(10)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <RotateCw className="w-4 h-4 text-white" />
              </button>

              <div className="flex items-center gap-2 ml-2">
                <button
                  onClick={handleMuteToggle}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  {isMuted ? (
                    <VolumeX className="w-5 h-5 text-white" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-white" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1"
                />
              </div>
            </div>

            {/* Center - Time display */}
            <div className="absolute left-1/2 transform -translate-x-1/2 text-white text-sm">
              {formatTime(currentTime)} / {formatTime(videoRef.current?.duration || 0)}
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <Settings className="w-5 h-5 text-white" />
                </button>
                
                {showSettings && (
                  <div className="absolute bottom-full right-0 mb-2 bg-gray-800 rounded-lg shadow-lg p-2 min-w-[150px]">
                    <div className="text-sm text-white mb-2">Playback Speed</div>
                    <select
                      value={playbackRate}
                      onChange={(e) => setPlaybackRate(Number(e.target.value))}
                      className="w-full bg-gray-700 text-white rounded px-2 py-1 text-sm"
                    >
                      <option value={0.5}>0.5x</option>
                      <option value={1}>1x</option>
                      <option value={1.5}>1.5x</option>
                      <option value={2}>2x</option>
                    </select>
                  </div>
                )}
              </div>

              <button
                onClick={toggleFullscreen}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <Maximize2 className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 