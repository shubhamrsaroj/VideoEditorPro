import React, { useState, useRef, useEffect, MutableRefObject } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Upload, X, Trash2, Video, Music, FileImage } from 'lucide-react';
import { addMediaItem } from '../store/effectsSlice';
import { RootState } from '../store/store';
import { MediaTrackItem } from '../types/effects';
import { cn } from '../lib/utils';
import { toast } from '../hooks/use-toast';
import NextImage from 'next/image';

export interface MediaItem {
  id: string;
  type: 'video' | 'audio' | 'image';
  name: string;
  url: string;
  thumbnailUrl?: string;
  duration?: number;
}

export default function MediaLibrary({ items = [], onUpload, onDelete }: {
  items: MediaItem[];
  onUpload: (files: FileList) => void;
  onDelete: (id: string) => void;
}) {
  const dispatch = useDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaItems = useSelector((state: RootState) => state.effects.mediaItems);
  const [isDragging, setIsDragging] = useState(false);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

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

  useEffect(() => {
    const generateVideoThumbnail = async (videoUrl: string, itemId: string) => {
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
    };
    
    items.forEach(item => {
      if (item.type === 'video' && !thumbnails[item.id]) {
        generateVideoThumbnail(item.url, item.id);
      }
    });
  }, [items, thumbnails]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, item: MediaItem) => {
    const trackItem = {
      id: item.id,
      type: item.type,
      content: item.url,
      name: item.name,
      duration: item.duration || 5,
      startTime: 0,
      track: 0
    };
    
    const itemJson = JSON.stringify(trackItem);
    e.dataTransfer.setData('application/json', itemJson);
    e.dataTransfer.setData('text/plain', itemJson);
    
    e.dataTransfer.effectAllowed = 'copyMove';
    
    e.dataTransfer.setData('application/x-media-item-id', item.id);
    e.dataTransfer.setData('application/x-media-item-type', item.type);
    
    if (item.type === 'image' || item.type === 'video') {
      const img = new Image();
      img.src = thumbnails[item.id] || item.url;
      e.dataTransfer.setDragImage(img, 20, 20);
    }
    
    e.currentTarget.classList.add('opacity-50');
    
    console.log('MediaLibrary: Started dragging item:', trackItem);
    
    setTimeout(() => {
      if (e.currentTarget) {
        e.currentTarget.classList.remove('opacity-50');
      }
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.currentTarget) {
      e.currentTarget.classList.remove('opacity-50');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
    }
  };

  const handleFiles = async (files: File[]) => {
    const fileList = new DataTransfer();
    
    for (const file of files) {
      const type = file.type.startsWith('video/') ? 'video' :
                  file.type.startsWith('audio/') ? 'audio' :
                  file.type.startsWith('image/') ? 'image' : null;
      
      if (!type) continue;

      const url = URL.createObjectURL(file);
      let duration = 0;
      let thumbnailUrl = '';

      if (type === 'video' || type === 'audio') {
        const media = document.createElement(type);
        media.src = url;
        await new Promise<void>((resolve) => {
          media.onloadedmetadata = () => {
            duration = media.duration;
            resolve();
          };
          setTimeout(() => resolve(), 3000);
        });
        
        if (type === 'video') {
          try {
            const video = document.createElement('video');
            video.crossOrigin = 'anonymous';
            video.src = url;
            video.muted = true;
            
            thumbnailUrl = await new Promise<string>((resolve, reject) => {
              const handleError = () => {
                reject(new Error(`Failed to load video for thumbnail`));
              };
              
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
              
              video.onerror = handleError;
              
              setTimeout(() => {
                if (!thumbnailUrl) {
                  reject(new Error('Timeout generating thumbnail'));
                }
              }, 5000);
              
              video.load();
            });
            
            console.log('Generated thumbnail for new video');
          } catch (error) {
            console.error('Error generating thumbnail during upload:', error);
          }
        }
      }

      const id = crypto.randomUUID();

      const newItem: MediaItem = {
        id,
        type,
        name: file.name,
        url,
        thumbnailUrl,
        duration: duration || undefined
      };

      const newTrackItem: MediaTrackItem = {
        id: newItem.id,
        type,
        content: url,
        startTime: 0,
        duration: duration || 5,
        track: 0,
        name: file.name
      };

      if (thumbnailUrl) {
        setThumbnails(prev => ({
          ...prev,
          [id]: thumbnailUrl
        }));
      }

      dispatch(addMediaItem(newTrackItem));
      fileList.items.add(file);
    }

    if (fileList.files.length > 0) {
      onUpload(fileList.files);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const groupedItems = (items || []).reduce((acc: { [key: string]: MediaItem[] }, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {});

  const renderIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="w-5 h-5 text-blue-500" />;
      case 'audio':
        return <Music className="w-5 h-5 text-purple-500" />;
      case 'image':
        return <FileImage className="w-5 h-5 text-green-500" />;
      default:
        return <div className="w-5 h-5 bg-gray-500 rounded" />;
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col bg-gray-900/50 border-r border-gray-800">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        multiple
        accept="video/*,audio/*,image/*"
      />
      <div 
        className={cn(
          "border-2 border-dashed rounded-md p-4 mb-4 text-center transition-colors",
          isDragging 
            ? "border-blue-500 bg-blue-500/10" 
            : "border-gray-500/30 hover:border-gray-500/50"
        )}
        onClick={handleUploadClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload className="w-6 h-6 mx-auto text-gray-400" />
        <p className="mt-2 text-sm text-gray-500">
          Drop files here or{" "}
          <button
            type="button"
            className="text-blue-500 hover:text-blue-600"
            onClick={() => fileInputRef.current?.click()}
          >
            browse
          </button>
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {Object.entries(groupedItems).map(([type, items]) => (
          <div key={type} className="mb-4">
            <h3 className="px-4 py-2 text-sm font-medium text-gray-400 bg-gray-800/30">
              {type.charAt(0).toUpperCase() + type.slice(1)}s
            </h3>
            <div className="space-y-1 p-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-grab"
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  onDragEnd={handleDragEnd}
                  data-item-id={item.id}
                  data-item-type={item.type}
                >
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-900 rounded overflow-hidden flex-shrink-0 mr-3">
                    {item.type === 'image' ? (
                      <div className="relative w-full h-full">
                        <NextImage
                          src={item.url}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : item.type === 'video' ? (
                      <div className="relative w-full h-full">
                        <NextImage
                          src={thumbnails[item.id] || '/file.svg'}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute bottom-0 right-0 bg-black/70 text-white text-xs px-1 rounded">
                          {formatDuration(item.duration)}
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {renderIcon(item.type)}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                      {item.duration && ` • ${formatDuration(item.duration)}`}
                    </p>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item.id);
                    }}
                    className="ml-2 p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 