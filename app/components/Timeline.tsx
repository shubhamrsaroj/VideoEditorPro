'use client'
import {toast} from '@/hooks/use-toast';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import WaveSurfer from 'wavesurfer.js';
import type { WaveSurferOptions } from 'wavesurfer.js';
import { motion, AnimatePresence, Reorder, HTMLMotionProps } from 'framer-motion';
import { RootState } from '../store/store';
import { setTrimPoints, saveTrimmedSegment, removeTrimmedSegment, updateCurrentTime, reorderSegments, setCurrentVideo } from '../store/videoSlice';
import { updateMediaItem, removeMediaItem, setSelectedMediaId, addMediaItem } from '../store/effectsSlice';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { formatTime } from '../lib/utils';
import { cn } from '@/lib/utils';
import { MediaTrackItem } from '../types/effects';
import { ChevronRight, ChevronLeft, Trash2, Plus, Scissors, Combine } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Toast } from '@/components/ui/toast';
import { v4 as uuidv4 } from 'uuid';


const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  console.log(`${type.toUpperCase()}: ${message}`);
};

const FRAME_DURATION = 1/30; // Assuming 30fps

// Add these type definitions at the top of the file after the imports
interface ThumbnailBatch {
  time: number;
  data: string;
}

interface VisibleRange {
  start: number;
  end: number;
}

interface ThumbnailCache {
  [key: string]: {
    data: string;
    lastUsed: number;
  };
}

// Add these interfaces
interface Marker {
  id: string;
  time: number;
  type: 'scene' | 'cut' | 'transition';
  label?: string;
}

interface Scene {
  id: string;
  startTime: number;
  endTime: number;
  label: string;
  color?: string;
}

interface TrackProps {
  track: {
    id: string;
    duration: number;
    items: MediaTrackItem[];
  };
  type: 'video' | 'audio' | 'image';
  trackIndex: number;
  onDrop: (item: MediaTrackItem, trackIndex: number) => void;
  selectedItem?: string | null;
  onSelect?: (id: string) => void;
}

interface Track {
  id: string;
  type: 'video' | 'audio' | 'image';
  items: MediaTrackItem[];
  duration: number;
  name: string;
}

const TRACK_HEIGHT = 80;
const PIXELS_PER_SECOND = 50; // This controls how wide each second appears in the timeline

// Add the MediaItemProps interface that was removed
interface MediaItemProps {
  item: MediaTrackItem;
  isSelected: boolean;
  onSelect: () => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  style: React.CSSProperties;
}

export default function Timeline() {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const dispatch = useDispatch();
  
  const { currentVideo } = useSelector((state: RootState) => state.video);
  const { currentTime, trimStart, trimEnd } = useSelector((state: RootState) => state.video.timeline);
  const trimmedSegments = useSelector((state: RootState) => state.video.trimmedSegments);
  const mediaItems = useSelector((state: RootState) => state.effects.mediaItems);

  // Group media items by type
  const mediaByType = mediaItems.reduce((acc, item) => {
    if (!acc[item.type]) {
      acc[item.type] = [];
    }
    acc[item.type].push(item);
    return acc;
  }, {} as Record<'video' | 'audio' | 'image', MediaTrackItem[]>);

  const [isDraggingTrim, setIsDraggingTrim] = useState<'start' | 'end' | null>(null);
  const [localTrimStart, setLocalTrimStart] = useState(0);
  const [localTrimEnd, setLocalTrimEnd] = useState(0);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewPosition, setPreviewPosition] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isWaveformReady, setIsWaveformReady] = useState(false);
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [draggingItem, setDraggingItem] = useState<MediaTrackItem | null>(null);

  // Constants
  const BUFFER_TIME = 30; // 30 seconds buffer on each side

  // Add visibleTimeRange state
  const [visibleTimeRange, setVisibleTimeRange] = useState<{ start: number; end: number }>({ start: 0, end: 60 });

  // Replace thumbnail states with marker states
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [selectedScene, setSelectedScene] = useState<string | null>(null);
  const [isDraggingMarker, setIsDraggingMarker] = useState(false);

  // Add thumbnail states
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [splitPoint, setSplitPoint] = useState<number | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Add selectedTrackType state
  const [selectedTrackType, setSelectedTrackType] = useState<'video' | 'audio' | 'image'>('video');

  // Update the tracks to include the items property
  const [tracks, setTracks] = useState<Track[]>([
    { id: 'video-track-1', type: 'video', items: [], duration: 60, name: 'Video 1' },
    { id: 'audio-track-1', type: 'audio', items: [], duration: 60, name: 'Audio 1' },
    { id: 'image-track-1', type: 'image', items: [], duration: 60, name: 'Image 1' },
  ]);

  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  // Mock function to handle media item updates
  const handleUpdateItem = (itemId: string, updates: Partial<MediaTrackItem>) => {
    setTracks(prevTracks => 
      prevTracks.map(track => ({
        ...track,
        items: track.items.map(item => 
          item.id === itemId ? { ...item, ...updates } : item
        )
      }))
    );
    showToast('Updated media item', 'success');
  };

  // Handle dropping media onto tracks
  const handleTrackDrop = (item: MediaTrackItem, trackIndex: number) => {
    console.log('Timeline: Handling track drop for item:', item, 'to track:', trackIndex);
    
    // First, ensure the item is properly created in the store
    dispatch(addMediaItem({
      ...item,
      track: trackIndex // Ensure track index is set correctly
    }));
    
    // Force a re-render by updating tracks
    setTracks(prevTracks => 
      prevTracks.map(track => {
        // If this is the target track, add the item
        if (track.type === item.type) {
          console.log(`Adding item to ${track.type} track`);
          return {
            ...track,
            items: [...track.items, item],
            duration: Math.max(track.duration, item.startTime + item.duration)
          };
        }
        return track;
      })
    );
    
    showToast(`Added ${item.type} to track ${trackIndex + 1}`, 'success');
  };

  // Add this new function to handle item reordering
  const handleItemDrag = (item: MediaTrackItem, newStartTime: number, newTrackIndex: number) => {
    dispatch(updateMediaItem({
      itemId: item.id,
      updates: {
        track: newTrackIndex,
        startTime: newStartTime
      }
    }));
  };

  const handleAddTrack = () => {
    // Get unique id for new track based on type and current count
    const newTrackId = `${selectedTrackType}-track-${
      tracks.filter(t => t.type === selectedTrackType).length + 1
    }`;
    
    const newTrack: Track = {
      id: newTrackId,
      type: selectedTrackType,
      items: [],
      duration: 60,
      name: `${selectedTrackType.charAt(0).toUpperCase() + selectedTrackType.slice(1)} ${
        tracks.filter(t => t.type === selectedTrackType).length + 1
      }`
    };
    
    setTracks([...tracks, newTrack]);
  };

  // Mock delete function
  const handleDelete = () => {
    if (!selectedItem) return;
    
    setTracks(prevTracks => 
      prevTracks.map(track => ({
        ...track,
        items: track.items.filter(item => item.id !== selectedItem)
      }))
    );
    setSelectedItem(null);
    showToast('Removed media item', 'success');
  };

  // Synchronize tracks with media items
  useEffect(() => {
    console.log("Synchronizing tracks with media items:", mediaItems);
    
    // Group media items by track type
    const itemsByType = mediaItems.reduce((acc, item) => {
      const trackType = item.type === 'video' || item.type === 'audio' || item.type === 'image' 
        ? item.type 
        : 'video'; // Default to video
      
      if (!acc[trackType]) {
        acc[trackType] = [];
      }
      
      acc[trackType].push(item);
      return acc;
    }, {} as Record<'video' | 'audio' | 'image', MediaTrackItem[]>);
    
    // Update each track with its corresponding items
    const updatedTracks = tracks.map(track => {
      const trackItems = itemsByType[track.type] || [];
      const maxDuration = trackItems.length > 0
        ? Math.max(...trackItems.map(item => item.startTime + item.duration), 60)
        : 60; // Default minimum duration
      
      return {
        ...track,
        items: trackItems,
        duration: maxDuration
      };
    });
    
    // Check if tracks have changed
    const currentTracksJSON = JSON.stringify(tracks.map(t => ({
      id: t.id,
      type: t.type,
      duration: t.duration,
      itemCount: t.items.length,
    })));
    
    const newTracksJSON = JSON.stringify(updatedTracks.map(t => ({
      id: t.id,
      type: t.type,
      duration: t.duration,
      itemCount: t.items.length,
    })));
    
    // Only update if there's an actual change (to avoid infinite loops)
    if (currentTracksJSON !== newTracksJSON) {
      console.log("Updating tracks with new media items:", updatedTracks);
      setTracks(updatedTracks);
    }
  }, [mediaItems]);

  // Distribute media items to tracks based on their type
  const updateTracks = () => {
    setTracks(tracks.map(track => ({
      ...track,
      items: mediaItems.filter(item => item.type === track.type)
    })));
  };

  // Handle scroll events for zooming
  const handleScroll = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = Math.sign(e.deltaY) * 10;
      const newZoom = Math.max(1, Math.min(200, zoomLevel - delta));
      setZoomLevel(newZoom);
      
      if (wavesurferRef.current) {
        wavesurferRef.current.zoom(newZoom);
      }
    }
  }, [zoomLevel]);

  // Initialize stable video element
  useEffect(() => {
    if (!videoElement && currentVideo.url) {
      const video = document.createElement('video');
      
      const handleError = (e: ErrorEvent) => {
        console.error('Video error:', e);
      };

      const handleLoadedMetadata = () => {
        video.duration && dispatch(setCurrentVideo({ 
          url: currentVideo.url, 
          duration: video.duration 
        }));
        setVideoElement(video);
        videoRef.current = video;
      };

      video.addEventListener('error', handleError);
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      
      // Set attributes before setting src to prevent race conditions
      video.style.display = 'none';
      video.preload = 'auto'; // Changed from 'metadata' to 'auto'
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.playsInline = true; // Add playsinline for better mobile support
      document.body.appendChild(video);
      
      // Load video
      const loadVideo = async () => {
        try {
          video.src = currentVideo.url;
          await video.load(); // Explicitly load the video
        } catch (error) {
          console.error('Error loading video:', error);
        }
      };
      
      loadVideo();

      return () => {
        video.removeEventListener('error', handleError);
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.pause();
        video.src = '';
        URL.revokeObjectURL(video.src);
        video.remove();
        setVideoElement(null);
        videoRef.current = null;
      };
    }
  }, [currentVideo.url, dispatch]);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!videoElement || !waveformRef.current) return;

    const initWaveform = async () => {
      try {
        if (wavesurferRef.current) {
          wavesurferRef.current.destroy();
        }

        const wavesurferOptions: WaveSurferOptions = {
          container: waveformRef.current!,
          waveColor: '#4a9eff',
          progressColor: '#2563eb',
          cursorColor: '#ffffff',
          barWidth: 2,
          barGap: 1,
          barRadius: 2,
          height: 48,
          normalize: true,
          backend: 'WebAudio',
          mediaControls: false,
          fillParent: true,
          minPxPerSec: 10,
          interact: true,
          hideScrollbar: false
        };

        const wavesurfer = WaveSurfer.create(wavesurferOptions);
        wavesurfer.load(currentVideo.url);
        wavesurferRef.current = wavesurfer;

        wavesurfer.on('ready', () => {
          setIsWaveformReady(true);
          handleZoom(zoomLevel);
        });

        wavesurfer.on('interaction', (progress: number) => {
          const time = progress * currentVideo.duration;
          if (videoRef.current) {
            videoRef.current.currentTime = time;
          }
          dispatch(updateCurrentTime(time));
        });

        return () => {
          wavesurfer.destroy();
        };
      } catch (error) {
        console.error('Error initializing waveform:', error);
      }
    };

    initWaveform();
  }, [currentVideo.url]);

  const handleZoom = useCallback((level: number) => {
    if (!wavesurferRef.current || !isWaveformReady) return;

    const minPxPerSec = 10;
    const maxPxPerSec = 200;
    const pxPerSec = minPxPerSec + (maxPxPerSec - minPxPerSec) * (level / 100);
    
    wavesurferRef.current.zoom(pxPerSec);
    
    // Update visible time range based on zoom level
    const containerWidth = timelineRef.current?.clientWidth || 0;
    const visibleDuration = containerWidth / pxPerSec;
    const currentCenter = currentTime;
    
    const start = Math.max(0, currentCenter - visibleDuration / 2);
    const end = Math.min(currentVideo.duration, currentCenter + visibleDuration / 2);
    
    setVisibleTimeRange({ start, end });
  }, [isWaveformReady, currentTime, currentVideo.duration]);

  // Update the effect that handles visible range changes
  useEffect(() => {
    if (!currentVideo.url || !currentVideo.duration) return;

    const handleScroll = () => {
      if (!timelineRef.current) return;
      
      const { scrollLeft, scrollWidth, clientWidth } = timelineRef.current;
      const viewportRatio = clientWidth / scrollWidth;
      const visibleStartTime = (scrollLeft / scrollWidth) * currentVideo.duration;
      const visibleDuration = viewportRatio * currentVideo.duration;

      setVisibleTimeRange({
        start: Math.max(0, visibleStartTime - BUFFER_TIME),
        end: Math.min(currentVideo.duration, visibleStartTime + visibleDuration + BUFFER_TIME)
      });
    };

    const timelineElement = timelineRef.current;
    if (timelineElement) {
      timelineElement.addEventListener('scroll', handleScroll);
      // Initial calculation
      handleScroll();
    }

    return () => {
      if (timelineElement) {
        timelineElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, [currentVideo.url, currentVideo.duration]);

  // Enhanced trim drag handling
  const handleTrimDragStart = (type: 'start' | 'end') => {
    setIsDraggingTrim(type);
    if (wavesurferRef.current) {
      wavesurferRef.current.pause();
    }
  };

  const handleTrimDrag = useCallback((e: MouseEvent) => {
    if (!isDraggingTrim || !timelineRef.current || !currentVideo.duration) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    const time = position * currentVideo.duration;

    if (isDraggingTrim === 'start') {
      setLocalTrimStart(Math.max(0, Math.min(time, localTrimEnd - 1)));
    } else {
      setLocalTrimEnd(Math.min(currentVideo.duration, Math.max(time, localTrimStart + 1)));
    }
  }, [isDraggingTrim, localTrimEnd, localTrimStart, currentVideo.duration]);

  const handleTrimDragEnd = () => {
    setIsDraggingTrim(null);
    dispatch(setTrimPoints({ start: localTrimStart, end: localTrimEnd }));
  };

  // Add mouse event listeners for trim dragging
  useEffect(() => {
    if (isDraggingTrim) {
      window.addEventListener('mousemove', handleTrimDrag);
      window.addEventListener('mouseup', handleTrimDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleTrimDrag);
      window.removeEventListener('mouseup', handleTrimDragEnd);
    };
  }, [isDraggingTrim, handleTrimDrag]);

  // Enhanced timeline click handling
  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (!timelineRef.current || !currentVideo.duration) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;
    const newTime = clickPosition * currentVideo.duration;
    
    // Only update if click is within trim points
    if (newTime >= localTrimStart && newTime <= localTrimEnd) {
      dispatch(updateCurrentTime(newTime));
      if (wavesurferRef.current) {
        wavesurferRef.current.seekTo(clickPosition);
      }
    }
  }, [currentVideo.duration, dispatch, localTrimStart, localTrimEnd]);

  // Handle keyboard shortcuts
  const seekToFrame = useCallback((direction: 'prev' | 'next') => {
    if (!videoElement || !currentVideo.duration) return;
    
    const currentFrame = Math.round(currentTime / FRAME_DURATION);
    const newFrame = direction === 'prev' ? currentFrame - 1 : currentFrame + 1;
    const newTime = newFrame * FRAME_DURATION;
    
    if (newTime >= 0 && newTime <= currentVideo.duration) {
      videoElement.currentTime = newTime;
      dispatch(updateCurrentTime(newTime));
      if (wavesurferRef.current) {
        wavesurferRef.current.seekTo(newTime / currentVideo.duration);
      }
    }
  }, [currentTime, currentVideo.duration, dispatch, videoElement]);

  // Update keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentVideo.url) return;

      // Prevent shortcuts when typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch(e.key.toLowerCase()) {
        case ' ': // Play/Pause
          e.preventDefault();
          setIsPreviewMode(prev => !prev);
          break;
        case 'k': // Alternative Play/Pause
          e.preventDefault();
          setIsPreviewMode(prev => !prev);
          break;
        case 'j': // Jump backward
          e.preventDefault();
          if (videoElement) {
            const newTime = Math.max(0, currentTime - 10);
            videoElement.currentTime = newTime;
            dispatch(updateCurrentTime(newTime));
          }
          break;
        case 'l': // Jump forward
          e.preventDefault();
          if (videoElement) {
            const newTime = Math.min(currentVideo.duration, currentTime + 10);
            videoElement.currentTime = newTime;
            dispatch(updateCurrentTime(newTime));
          }
          break;
        case 's': // Split at current time
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleSplit();
          }
          break;
        case 'm': // Merge selected items
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleMerge();
          }
          break;
        case 'delete':
        case 'backspace':
          e.preventDefault();
          handleDelete();
          break;
        // Add number key shortcuts for zoom levels
        case '1':
          setScale(0.5); // 2x zoom in
          break;
        case '2':
          setScale(1); // Normal zoom
          break;
        case '3':
          setScale(2); // 2x zoom out
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentVideo.url, currentTime, videoElement, selectedItems]);

  // Preview mode logic
  useEffect(() => {
    let animationFrame: number;
    
    if (isPreviewMode) {
      const startPreview = () => {
        setPreviewPosition(localTrimStart);
        const animate = () => {
          setPreviewPosition(prev => {
            if (prev >= localTrimEnd) {
              setIsPreviewMode(false);
              return localTrimStart;
            }
            return prev + FRAME_DURATION;
          });
          animationFrame = requestAnimationFrame(animate);
        };
        animationFrame = requestAnimationFrame(animate);
      };
      startPreview();
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isPreviewMode, localTrimStart, localTrimEnd]);

  // Animation variants
  const segmentVariants = {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.8, opacity: 0 },
    hover: { scale: 1.05 },
    drag: { scale: 1.1, zIndex: 1 }
  };

  // Add frame number display
  const currentFrame = Math.round(currentTime / FRAME_DURATION);
  const totalFrames = Math.round(currentVideo.duration / FRAME_DURATION);

  // Add marker creation function
  const addMarker = useCallback((time: number, type: 'scene' | 'cut' | 'transition' = 'scene') => {
    const newMarker: Marker = {
      id: `marker-${Date.now()}`,
      time,
      type,
      label: `Marker ${markers.length + 1}`
    };
    setMarkers(prev => [...prev, newMarker].sort((a, b) => a.time - b.time));
  }, [markers]);

  // Add scene creation function
  const createScene = useCallback((startTime: number, endTime: number) => {
    const newScene: Scene = {
      id: `scene-${Date.now()}`,
      startTime,
      endTime,
      label: `Scene ${scenes.length + 1}`,
      color: `hsl(${Math.random() * 360}, 70%, 50%)`
    };
    setScenes(prev => [...prev, newScene].sort((a, b) => a.startTime - b.startTime));
  }, [scenes]);

  // Handle marker drag
  const handleMarkerDrag = useCallback((e: MouseEvent) => {
    if (!isDraggingMarker || !timelineRef.current || !selectedMarker) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    const time = position * currentVideo.duration;

    setMarkers(prev => prev.map(marker => 
      marker.id === selectedMarker 
        ? { ...marker, time: Math.max(0, Math.min(time, currentVideo.duration)) }
        : marker
    ));
  }, [isDraggingMarker, selectedMarker, currentVideo.duration]);

  // Add marker drag event listeners
  useEffect(() => {
    if (isDraggingMarker) {
      window.addEventListener('mousemove', handleMarkerDrag);
      window.addEventListener('mouseup', () => setIsDraggingMarker(false));
    }
    return () => {
      window.removeEventListener('mousemove', handleMarkerDrag);
      window.removeEventListener('mouseup', () => setIsDraggingMarker(false));
    };
  }, [isDraggingMarker, handleMarkerDrag]);

  // Render markers component
  const TimelineMarkers = React.memo(() => (
    <div className="relative h-8 bg-gray-800/30">
      {markers.map(marker => (
        <div
          key={marker.id}
          className={cn(
            "absolute top-0 bottom-0 w-0.5 cursor-move",
            marker.type === 'scene' ? "bg-blue-500" : 
            marker.type === 'cut' ? "bg-red-500" : "bg-yellow-500",
            selectedMarker === marker.id && "shadow-lg scale-125"
          )}
          style={{ 
            left: `${(marker.time / currentVideo.duration) * 100}%`,
            transform: 'translateX(-50%)'
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            setSelectedMarker(marker.id);
            setIsDraggingMarker(true);
          }}
        >
          <div className="absolute bottom-full mb-1 transform -translate-x-1/2 text-xs text-gray-300 whitespace-nowrap">
            {marker.label}
          </div>
        </div>
      ))}
    </div>
  ));

  // Render scenes component
  const TimelineScenes = React.memo(() => (
    <div className="relative h-12 bg-gray-800/30">
      {scenes.map(scene => (
        <div
          key={scene.id}
          className={cn(
            "absolute top-1 bottom-1 rounded",
            selectedScene === scene.id ? "ring-2 ring-white" : "hover:ring-2 ring-white/50"
          )}
          style={{
            left: `${(scene.startTime / currentVideo.duration) * 100}%`,
            width: `${((scene.endTime - scene.startTime) / currentVideo.duration) * 100}%`,
            backgroundColor: scene.color + '40' // Add transparency
          }}
          onClick={() => setSelectedScene(scene.id)}
        >
          <div className="absolute top-1/2 left-2 transform -translate-y-1/2 text-xs text-white font-medium truncate">
            {scene.label}
          </div>
        </div>
      ))}
    </div>
  ));

  // Add canvas initialization for thumbnail generation
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 120;
    canvas.style.display = 'none';
    document.body.appendChild(canvas);
    canvasRef.current = canvas;
    
    return () => {
      if (canvasRef.current) {
        document.body.removeChild(canvasRef.current);
        canvasRef.current = null;
      }
    };
  }, []);

  // Add thumbnail generation function
  const generateVideoThumbnail = useCallback(async (videoUrl: string, itemId: string) => {
    if (thumbnails[itemId]) return;
    
    try {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.src = videoUrl;
      video.muted = true;
      
      const thumbnailUrl = await new Promise<string>((resolve, reject) => {
        video.onloadeddata = () => {
          video.currentTime = 0.1;
        };
        
        video.onseeked = () => {
          if (!canvasRef.current) {
            reject(new Error('Canvas not available'));
            return;
          }
          
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          try {
            const videoAspect = video.videoWidth / video.videoHeight;
            let drawWidth = canvas.width;
            let drawHeight = canvas.height;
            
            if (videoAspect > 1) {
              drawHeight = canvas.width / videoAspect;
            } else {
              drawWidth = canvas.height * videoAspect;
            }
            
            const x = (canvas.width - drawWidth) / 2;
            const y = (canvas.height - drawHeight) / 2;
            
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.drawImage(video, x, y, drawWidth, drawHeight);
            
            const thumbnailData = canvas.toDataURL('image/jpeg', 0.8);
            resolve(thumbnailData);
          } catch (e) {
            reject(e);
          } finally {
            video.pause();
            video.src = '';
            video.load();
          }
        };
        
        video.onerror = () => {
          reject(new Error('Failed to load video'));
        };
        
        video.load();
      });
      
      setThumbnails(prev => ({
        ...prev,
        [itemId]: thumbnailUrl
      }));
      
      console.log(`Generated thumbnail for video ${itemId}`);
    } catch (error) {
      console.error('Error generating video thumbnail:', error);
    }
  }, [thumbnails]);

  // Generate thumbnails for media items
  useEffect(() => {
    mediaItems.forEach(item => {
      if (item.type === 'video' && !thumbnails[item.id]) {
        generateVideoThumbnail(item.content, item.id);
      }
    });
  }, [mediaItems, generateVideoThumbnail]);

  // Add states and functions for item trimming
  const [isTrimmingItem, setIsTrimmingItem] = useState<{ id: string, edge: 'start' | 'end' } | null>(null);

  const handleItemTrimStart = (itemId: string, edge: 'start' | 'end', e: React.MouseEvent) => {
    e.stopPropagation();
    setIsTrimmingItem({ id: itemId, edge });
  };

  const handleItemTrimMove = useCallback((e: MouseEvent) => {
    if (!isTrimmingItem || !timelineRef.current) return;
    
    const item = mediaItems.find(item => item.id === isTrimmingItem.id);
    if (!item) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const pixelsPerSecond = PIXELS_PER_SECOND * scale;
    const mouseTime = (e.clientX - rect.left) / pixelsPerSecond;
    
    if (isTrimmingItem.edge === 'start') {
      // Update start time, making sure it doesn't exceed the end time
      const newStartTime = Math.max(0, Math.min(mouseTime, item.startTime + item.duration - 1));
      const newDuration = (item.startTime + item.duration) - newStartTime;
      
      dispatch(updateMediaItem({
        itemId: item.id,
        updates: {
          startTime: newStartTime,
          duration: newDuration
        }
      }));
    } else {
      // Update duration, making sure it doesn't go below minimum (1 second)
      const newDuration = Math.max(1, mouseTime - item.startTime);
      
      dispatch(updateMediaItem({
        itemId: item.id,
        updates: {
          duration: newDuration
        }
      }));
    }
  }, [isTrimmingItem, mediaItems, dispatch, PIXELS_PER_SECOND, scale]);

  const handleItemTrimEnd = useCallback(() => {
    setIsTrimmingItem(null);
  }, []);

  // Add mouse event listeners for item trimming
  useEffect(() => {
    if (isTrimmingItem) {
      window.addEventListener('mousemove', handleItemTrimMove);
      window.addEventListener('mouseup', handleItemTrimEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleItemTrimMove);
      window.removeEventListener('mouseup', handleItemTrimEnd);
    };
  }, [isTrimmingItem, handleItemTrimMove, handleItemTrimEnd]);

  // Update the MediaItem component to use thumbnails and add trim handles
  const MediaItem: React.FC<MediaItemProps> = ({ item, isSelected, onSelect, onDragStart, style }) => {
    // Calculate playback progress
    const progress = Math.min(1, Math.max(0, 
      (currentTime - item.startTime) / item.duration
    ));
    const isPlaying = currentTime >= item.startTime && currentTime <= (item.startTime + item.duration);
    
    return (
      <div
        className={cn(
          "absolute h-14 bg-opacity-75 flex flex-col rounded-md overflow-hidden cursor-pointer transition-all",
          isSelected 
            ? "ring-2 ring-blue-500 shadow-lg z-20" 
            : "hover:ring-1 hover:ring-white/50 z-10",
          item.type === 'video' 
            ? "bg-blue-800" 
            : item.type === 'audio' 
            ? "bg-red-800" 
            : "bg-green-800"
        )}
        style={{ 
          ...style,
          top: '4px',  // Position from top rather than bottom
        }}
        onClick={() => onSelect()}
        draggable={true}
        onDragStart={onDragStart}
      >
        <div className="px-2 py-0.5 text-xs font-medium text-white/90 bg-black/30 truncate flex justify-between">
          <span>{item.name || (item.type.charAt(0).toUpperCase() + item.type.slice(1))}</span>
          <span className="text-xs opacity-75">{formatTime(item.duration)}</span>
        </div>
        <div className="flex-1 flex items-center justify-center overflow-hidden relative">
          {item.type === 'video' && (
            <div className="absolute inset-0 flex items-center justify-center">
              {thumbnails[item.id] ? (
                <img 
                  src={thumbnails[item.id]} 
                  alt={item.name || 'Video'} 
                  className="h-full w-full object-cover opacity-80" 
                />
              ) : (
                <img 
                  src={item.content} 
                  alt={item.name || 'Video'} 
                  className="h-full w-full object-cover opacity-50" 
                />
              )}
            </div>
          )}
          {item.type === 'audio' && (
            <div className="absolute inset-0 flex items-center justify-center w-full h-full px-2">
              {loadingWaveforms[item.id] ? (
                <div className="text-xs text-white/80 animate-pulse flex items-center justify-center">
                  <svg className="animate-spin h-3 w-3 mr-1 text-white/80" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading audio...
                </div>
              ) : audioWaveforms[item.id] ? (
                <div className="relative w-full h-full">
                  {/* Background waveform */}
                  <svg width="100%" height="100%" viewBox="0 0 100 30" preserveAspectRatio="none" className="opacity-60">
                    {audioWaveforms[item.id].map((point: number, i: number) => {
                      const x = i;
                      const height = Math.max(3, point * 25); // Scale to fit SVG height
                      const y = (30 - height) / 2;
                      return (
                        <rect 
                          key={i} 
                          x={x} 
                          y={y} 
                          width="0.8" 
                          height={height} 
                          fill="rgba(255, 255, 255, 0.7)" 
                        />
                      );
                    })}
                  </svg>
                  
                  {/* Progress overlay */}
                  {isPlaying && (
                    <div 
                      className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent pointer-events-none"
                      style={{ width: `${progress * 100}%` }}
                    />
                  )}
                </div>
              ) : (
                <svg width="100%" height="20" viewBox="0 0 100 20">
                  <path
                    d="M0,10 Q5,5 10,10 T20,10 T30,10 T40,10 T50,10 T60,10 T70,10 T80,10 T90,10 T100,10"
                    fill="none"
                    stroke="white"
                    strokeOpacity="0.5"
                    strokeWidth="1"
                  />
                </svg>
              )}
            </div>
          )}
          {item.type === 'image' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <img src={item.content} alt={item.name || 'Image'} className="h-full w-full object-cover" />
            </div>
          )}
        </div>
        
        {/* Trim handles */}
        {isSelected && (
          <>
            <div 
              className="absolute left-0 top-0 bottom-0 w-3 cursor-w-resize bg-blue-500/30 hover:bg-blue-500/60 z-30"
              onMouseDown={(e) => handleItemTrimStart(item.id, 'start', e)}
            >
              <div className="h-full w-1 bg-blue-500 ml-0.5"></div>
            </div>
            
            <div 
              className="absolute right-0 top-0 bottom-0 w-3 cursor-e-resize bg-blue-500/30 hover:bg-blue-500/60 z-30"
              onMouseDown={(e) => handleItemTrimStart(item.id, 'end', e)}
            >
              <div className="h-full w-1 bg-blue-500 ml-1.5"></div>
            </div>
          </>
        )}
      </div>
    );
  };

  const Track: React.FC<TrackProps> = ({ track, type, trackIndex, onDrop, selectedItem, onSelect }) => {
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [dropIndicator, setDropIndicator] = useState<number | null>(null);
    const trackRef = useRef<HTMLDivElement>(null);

    // Log when track content changes
    useEffect(() => {
      console.log(`Track ${trackIndex} (${type}) items updated:`, track.items);
    }, [track.items, trackIndex, type]);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, item: MediaTrackItem) => {
      // Set both formats for better compatibility
      e.dataTransfer.setData('application/json', JSON.stringify(item));
      e.dataTransfer.setData('text/plain', JSON.stringify(item));
      e.dataTransfer.effectAllowed = 'move';
      console.log('Track: Drag started with item:', item);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      
      setIsDraggingOver(true);
      e.dataTransfer.dropEffect = 'move';
      
      // Show drop position indicator
      if (trackRef.current) {
        const rect = trackRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        setDropIndicator(x);
      }
    };

    const handleDragLeave = () => {
      setIsDraggingOver(false);
      setDropIndicator(null);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      console.log(`Drop event on track ${trackIndex} (${type})`);
      setIsDraggingOver(false);
      setDropIndicator(null);
      
      try {
        // Get data from different possible formats
        let itemData;
        let rawData;
        
        // Try to get data from the drag event
        if (e.dataTransfer.types.includes('application/json')) {
          rawData = e.dataTransfer.getData('application/json');
        } else {
          rawData = e.dataTransfer.getData('text/plain');
        }
        
        // Try to parse the data
        try {
          itemData = JSON.parse(rawData);
          console.log("Parsed drop data:", itemData);
        } catch (err) {
          console.error("Failed to parse drop data:", rawData);
          showToast("Invalid media format", "error");
          return;
        }
        
        // Validate the item data
        if (!itemData || (!itemData.type && !itemData.content && !itemData.url)) {
          console.error("Invalid drop data structure:", itemData);
          showToast("Invalid media item", "error");
          return;
        }
        
        // Calculate drop position
        if (trackRef.current) {
          const rect = trackRef.current.getBoundingClientRect();
          const dropX = e.clientX - rect.left;
          const pixelsPerSecond = PIXELS_PER_SECOND * scale;
          const dropTimeSeconds = dropX / pixelsPerSecond;
          
          // Handle both MediaLibrary items and Timeline items
          const newItem: MediaTrackItem = {
            id: crypto.randomUUID(),
            type: itemData.type,
            // Handle different source formats
            content: itemData.content || itemData.url,
            name: itemData.name || `New ${itemData.type}`,
            startTime: Math.max(0, dropTimeSeconds),
            duration: itemData.duration || 5, // Default to 5 seconds
            track: trackIndex
          };

          console.log("Created new item for timeline:", newItem);
          
          // Add the item to the track
          onDrop(newItem, trackIndex);
        }
      } catch (err) {
        console.error("Error handling drop:", err);
        showToast("Failed to add media item", "error");
      }
    };

    return (
      <div 
        ref={trackRef}
        className={cn(
          "relative h-24 border-b border-gray-700/50 transition-colors",
          isDraggingOver ? "bg-gray-800/50" : "hover:bg-gray-800/20"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-track-index={trackIndex}
        data-track-type={type}
      >
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gray-900/50 border-r border-gray-700/50 flex items-center justify-center">
          <span className="text-xs font-medium text-gray-400">
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </span>
        </div>
        <div className="absolute left-12 right-0 h-full">
          {/* Debug info for empty tracks */}
          {track.items.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500 pointer-events-none">
              <span className="text-xs">Drop {type} items here</span>
            </div>
          )}
          
          {/* Render media items */}
          {track.items.length > 0 && track.items.map((item) => {
            // Use currentVideo duration to ensure consistent scale
            const maxDuration = Math.max(currentVideo.duration || 60, 60);
            
            // Calculate positions as percentage of timeline width
            const leftPos = (item.startTime / maxDuration) * 100;
            const itemWidth = Math.max(5, (item.duration / maxDuration) * 100); // Minimum 5% width
            
            console.log(`Rendering item ${item.id} in track ${trackIndex}: left=${leftPos}%, width=${itemWidth}%, startTime=${item.startTime}, duration=${item.duration}`);
            
            return (
              <MediaItem
                key={item.id}
                item={item}
                isSelected={selectedItem === item.id}
                onSelect={() => onSelect?.(item.id)}
                onDragStart={(e) => handleDragStart(e, item)}
                style={{
                  left: `${leftPos}%`,
                  width: `${itemWidth}%`,
                  minWidth: '60px',
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.1)' // Debug outline for visibility
                }}
              />
            );
          })}
          
          {dropIndicator !== null && (
            <div
              className="absolute h-full w-0.5 bg-indigo-500 z-20"
              style={{
                left: dropIndicator,
                boxShadow: '0 0 8px rgba(99, 102, 241, 0.5)'
              }}
            />
          )}
        </div>
      </div>
    );
  };

  // Improve time ruler visibility
  const renderTimeRuler = () => {
    const duration = 300; // 5 minutes in seconds
    const markers = [];
    const step = 5; // 5 second intervals

    for (let time = 0; time <= duration; time += step) {
      const position = (time / duration) * 100;
      const isMajorMarker = time % 30 === 0; // Major marker every 30 seconds
      
      markers.push(
        <div
          key={time}
          className={cn(
            "absolute border-l transition-colors",
            isMajorMarker ? "h-4 border-gray-500" : "h-2 border-gray-600"
          )}
          style={{ left: `${position}%` }}
        >
          {isMajorMarker && (
            <span className="absolute top-4 left-1 text-xs font-medium text-gray-400">
              {formatTime(time)}
            </span>
          )}
        </div>
      );
    }

    return (
      <div className="h-8 relative border-b border-gray-700/50 mb-2 ml-12">
        {markers}
      </div>
    );
  };

  // Playhead
  const renderPlayhead = () => {
    const position = (currentTime / scale) * 100;
    return (
      <div
        className="absolute top-0 bottom-0 w-px bg-red-500 z-10"
        style={{ left: `${position}%` }}
      >
        <div className="w-3 h-3 bg-red-500 rounded-full -translate-x-1/2" />
      </div>
    );
  };

  const getTimeScale = () => PIXELS_PER_SECOND * scale;

  // Add split functionality
  const handleSplit = () => {
    if (!selectedItems.length) return;

    selectedItems.forEach(itemId => {
      const item = mediaItems.find(i => i.id === itemId);
      if (!item) return;

      if (currentTime > item.startTime && currentTime < item.startTime + item.duration) {
        // Create two new items from the split
        const firstHalf: MediaTrackItem = {
          ...item,
          id: crypto.randomUUID(),
          duration: currentTime - item.startTime
        };

        const secondHalf: MediaTrackItem = {
          ...item,
          id: crypto.randomUUID(),
          startTime: currentTime,
          duration: (item.startTime + item.duration) - currentTime
        };

        // Remove original and add new items
        dispatch(removeMediaItem(item.id));
        dispatch(updateMediaItem({
          itemId: firstHalf.id,
          updates: {
            startTime: firstHalf.startTime,
            duration: firstHalf.duration,
            track: item.track
          }
        }));
        dispatch(updateMediaItem({
          itemId: secondHalf.id,
          updates: {
            startTime: secondHalf.startTime,
            duration: secondHalf.duration,
            track: item.track
          }
        }));
      }
    });
  };

  // Add merge functionality
  const handleMerge = () => {
    if (selectedItems.length < 2) return;

    // Sort selected items by start time
    const itemsToMerge = selectedItems
      .map(id => mediaItems.find(i => i.id === id))
      .filter((item): item is MediaTrackItem => !!item)
      .sort((a, b) => a.startTime - b.startTime);

    // Check if items are adjacent and of the same type
    const canMerge = itemsToMerge.every((item, i) => {
      if (i === 0) return true;
      const prevItem = itemsToMerge[i - 1];
      return (
        item.type === prevItem.type &&
        Math.abs((prevItem.startTime + prevItem.duration) - item.startTime) < 0.1
      );
    });

    if (!canMerge) {
      showToast("Can only merge adjacent items of the same type", "error");
      return;
    }

    // Create merged item
    const mergedItem: MediaTrackItem = {
      ...itemsToMerge[0],
      id: crypto.randomUUID(),
      duration: itemsToMerge.reduce((total, item) => total + item.duration, 0)
    };

    // Remove original items and add merged item
    itemsToMerge.forEach(item => dispatch(removeMediaItem(item.id)));
    dispatch(updateMediaItem({
      itemId: mergedItem.id,
      updates: {
        startTime: mergedItem.startTime,
        duration: mergedItem.duration,
        track: mergedItem.track
      }
    }));
  };

  // Add these states near the beginning of the component, with the other state declarations
  const [audioWaveforms, setAudioWaveforms] = useState<Record<string, number[]>>({});
  const [loadingWaveforms, setLoadingWaveforms] = useState<Record<string, boolean>>({});

  // Update the audio waveform generation function with typed parameters
  const generateAudioWaveform = useCallback(async (audioUrl: string, itemId: string) => {
    if (audioWaveforms[itemId] || loadingWaveforms[itemId]) return;
    
    // Set loading state
    setLoadingWaveforms(prev => ({
      ...prev,
      [itemId]: true
    }));
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Get the audio data
      const channelData = audioBuffer.getChannelData(0); // Get the first channel
      
      // Reduce the data to a manageable size (100 data points)
      const dataPoints = 100;
      const blockSize = Math.floor(channelData.length / dataPoints);
      const waveformData: number[] = [];
      
      for (let i = 0; i < dataPoints; i++) {
        let blockStart = blockSize * i;
        let sum = 0;
        
        // Find the max value in this block
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(channelData[blockStart + j]);
        }
        
        // Get the average
        waveformData.push(sum / blockSize);
      }
      
      // Normalize to 0-1.0 range
      const max = Math.max(...waveformData, 0.01); // Avoid division by zero
      const normalizedData = waveformData.map(point => point / max);
      
      setAudioWaveforms(prev => ({
        ...prev,
        [itemId]: normalizedData
      }));
      
      console.log(`Generated waveform for audio ${itemId}`);
    } catch (error) {
      console.error('Error generating audio waveform:', error);
    } finally {
      // Clear loading state
      setLoadingWaveforms(prev => ({
        ...prev,
        [itemId]: false
      }));
    }
  }, [audioWaveforms, loadingWaveforms]);

  // Generate waveforms for audio items
  useEffect(() => {
    mediaItems.forEach(item => {
      if (item.type === 'audio' && !audioWaveforms[item.id]) {
        generateAudioWaveform(item.content, item.id);
      }
    });
  }, [mediaItems, generateAudioWaveform]);

  // Render the timeline
  if (!currentVideo.url) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-400">Upload a video to see timeline</p>
      </div>
    );
  }

  // Log what's being rendered to the timeline
  console.log("Timeline rendering with tracks:", tracks);
  console.log("Current mediaItems from Redux:", mediaItems);

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white border-t border-gray-700 relative">
      <div className="sticky top-0 z-10 p-2 flex space-x-2 bg-gray-800 border-b border-gray-700">
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddTrack}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-1" /> Add Track
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSplit}
          disabled={!selectedItem || isPreviewMode}
          className={cn(
            "bg-gray-700 hover:bg-gray-600 text-white",
            (!selectedItem || isPreviewMode) && "opacity-50 cursor-not-allowed"
          )}
        >
          <Scissors className="h-4 w-4 mr-1" /> Split
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleMerge}
          disabled={selectedItems.length < 2 || isPreviewMode}
          className={cn(
            "bg-gray-700 hover:bg-gray-600 text-white",
            (selectedItems.length < 2 || isPreviewMode) && "opacity-50 cursor-not-allowed"
          )}
        >
          <Combine className="h-4 w-4 mr-1" /> Merge
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          disabled={!selectedItem || isPreviewMode}
          className={cn(
            "bg-gray-700 hover:bg-gray-600 text-white",
            (!selectedItem || isPreviewMode) && "opacity-50 cursor-not-allowed"
          )}
        >
          <Trash2 className="h-4 w-4 mr-1" /> Delete
        </Button>
      </div>
      
      <div className="relative flex-grow overflow-auto">
        {renderTimeRuler()}
        {renderPlayhead()}
        
        <div className="relative">
          {tracks.map((track, index) => (
            <div key={track.id} className="flex">
              <div className="w-24 py-2 px-3 bg-gray-800 border-r border-gray-700 flex items-center text-xs whitespace-nowrap">
                {track.type.charAt(0).toUpperCase() + track.type.slice(1)}
              </div>
              <div className="flex-grow">
                <Track
                  track={track}
                  type={track.type}
                  trackIndex={index}
                  onDrop={handleTrackDrop}
                  selectedItem={selectedItem}
                  onSelect={setSelectedItem}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="p-2 border-t border-gray-700 bg-gray-800 text-xs text-gray-400">
        {formatTime(currentTime)} / {formatTime(currentVideo?.duration || 0)}
      </div>
    </div>
  );
} 
