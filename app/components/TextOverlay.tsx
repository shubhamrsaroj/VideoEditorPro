'use client'

import React, { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store/store';
import { addOverlay, updateOverlay, removeOverlay, setSelectedOverlayId } from '../store/effectsSlice';
import type { TextOverlayType, OverlayType } from '../types/effects';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  Type, 
  Move, 
  Clock, 
  Palette, 
  Settings, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Bold, 
  Italic, 
  Underline,
  Trash,
  Plus,
  PanelLeft,
  RotateCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Constants for text styling options
const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72];
const FONT_FAMILIES = ['Arial', 'Times New Roman', 'Helvetica', 'Georgia', 'Courier New', 'Verdana', 'Impact', 'Tahoma'];
const FONT_WEIGHTS = ['normal', 'bold', 'lighter'];
const TEXT_ALIGNMENTS = ['left', 'center', 'right'] as const;
const ANIMATIONS = [
  { label: 'None', value: 'none' },
  { label: 'Fade In', value: 'fadeIn' },
  { label: 'Fade Out', value: 'fadeOut' },
  { label: 'Slide In Left', value: 'slideInLeft' },
  { label: 'Slide In Right', value: 'slideInRight' },
  { label: 'Slide In Top', value: 'slideInTop' },
  { label: 'Slide In Bottom', value: 'slideInBottom' },
  { label: 'Zoom In', value: 'zoomIn' },
  { label: 'Zoom Out', value: 'zoomOut' },
] as const;

type AnimationType = typeof ANIMATIONS[number]['value'];
type TextAlignmentType = typeof TEXT_ALIGNMENTS[number];

const selectTextOverlays = createSelector(
  (state: RootState) => state.effects.overlays,
  (overlays) => overlays.filter((overlay): overlay is TextOverlayType => overlay.type === 'text')
);

export function TextOverlay() {
  const dispatch = useDispatch();
  const textOverlays = useSelector(selectTextOverlays);
  const selectedOverlayId = useSelector((state: RootState) => state.effects.selectedOverlayId);
  const selectedOverlay = textOverlays.find(o => o.id === selectedOverlayId);
  const [dragState, setDragState] = useState<{ isDragging: boolean; offsetX: number; offsetY: number }>({
    isDragging: false,
    offsetX: 0,
    offsetY: 0
  });

  // Reference to the preview area for calculating positions
  const previewAreaRef = useRef<HTMLDivElement>(null);
  
  const handleAddOverlay = () => {
    const newOverlay: TextOverlayType = {
      id: `text-${Date.now()}`,
      type: 'text',
      content: 'New Text',
      position: { x: 50, y: 50 },
      timing: {
        startTime: 0,
        duration: 5
      },
      style: {
        fontSize: 24,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        color: '#ffffff',
        opacity: 1,
        rotation: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: '8px',
        textAlign: 'center',
        textShadow: true,
        animation: {
          type: 'none',
          duration: 1
        }
      }
    };
    dispatch(addOverlay(newOverlay));
    dispatch(setSelectedOverlayId(newOverlay.id));
  };

  const handleUpdateOverlay = (id: string, updates: Partial<TextOverlayType>) => {
    dispatch(updateOverlay({ id, updates }));
  };

  const handleRemoveOverlay = (id: string) => {
    dispatch(removeOverlay(id));
    if (selectedOverlayId === id) {
      dispatch(setSelectedOverlayId(null));
    }
  };

  const handleSelectOverlay = (id: string) => {
    dispatch(setSelectedOverlayId(id));
  };

  // Handle drag start for overlays in the preview area
  const handleDragStart = (e: React.MouseEvent, overlay: TextOverlayType) => {
    e.preventDefault();
    if (!previewAreaRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const previewRect = previewAreaRef.current.getBoundingClientRect();
    
    setDragState({
      isDragging: true,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top
    });
    
    handleSelectOverlay(overlay.id);
    
    // Add mouse move and mouse up event listeners
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  };
  
  // Handle drag move
  const handleDragMove = (e: MouseEvent) => {
    if (!dragState.isDragging || !selectedOverlay || !previewAreaRef.current) return;
    
    const previewRect = previewAreaRef.current.getBoundingClientRect();
    
    // Calculate new position as percentage of preview area
    const x = Math.max(0, Math.min(100, ((e.clientX - previewRect.left - dragState.offsetX) / previewRect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - previewRect.top - dragState.offsetY) / previewRect.height) * 100));
    
    handleUpdateOverlay(selectedOverlay.id, {
      position: { x, y }
    });
  };
  
  // Handle drag end
  const handleDragEnd = () => {
    setDragState({
      isDragging: false,
      offsetX: 0,
      offsetY: 0
    });
    
    // Remove event listeners
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
  };

  // Clean up event listeners when component unmounts
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-medium flex items-center">
          <Type className="w-5 h-5 mr-2" />
          Text Overlays
        </h2>
        <Button onClick={handleAddOverlay} size="sm" className="flex items-center">
          <Plus className="w-4 h-4 mr-1" />
          Add Text
        </Button>
      </div>

      {/* Preview Area */}
      <div 
        ref={previewAreaRef}
        className="relative bg-black/20 rounded-lg overflow-hidden mb-4 flex-1 min-h-[200px]"
        style={{ aspectRatio: '16/9' }}
      >
        {textOverlays.map((overlay) => (
          <div
            key={overlay.id}
            className={cn(
              "absolute cursor-move select-none",
              selectedOverlayId === overlay.id && "ring-2 ring-blue-500"
            )}
            style={{
              left: `${overlay.position.x}%`,
              top: `${overlay.position.y}%`,
              transform: `translate(-50%, -50%) rotate(${overlay.style.rotation}deg)`,
              fontSize: `${overlay.style.fontSize}px`,
              fontFamily: overlay.style.fontFamily,
              fontWeight: overlay.style.fontWeight,
              color: overlay.style.color,
              opacity: overlay.style.opacity,
              backgroundColor: overlay.style.backgroundColor || 'transparent',
              padding: overlay.style.padding || '0px',
              textAlign: overlay.style.textAlign || 'center',
              textShadow: overlay.style.textShadow ? '1px 1px 2px rgba(0,0,0,0.8)' : 'none',
            }}
            onMouseDown={(e) => handleDragStart(e, overlay)}
            onClick={() => handleSelectOverlay(overlay.id)}
          >
            {overlay.content}
          </div>
        ))}
      </div>

      {/* Overlay List */}
      <div className="mb-4 bg-slate-900/50 p-3 rounded-md">
        <h3 className="text-sm font-medium mb-2 text-slate-300">Text Elements</h3>
        {textOverlays.length === 0 ? (
          <div className="text-sm text-slate-500 italic">No text overlays added yet.</div>
        ) : (
          <div className="space-y-2 overflow-y-auto" style={{ maxHeight: "200px" }}>
            {textOverlays.map((overlay) => (
              <div
                key={overlay.id}
                className={cn(
                  "p-2 rounded-md flex justify-between items-center text-sm",
                  selectedOverlayId === overlay.id 
                    ? "bg-blue-500/20 border border-blue-500/50" 
                    : "bg-slate-800 border border-slate-700 hover:border-slate-600"
                )}
                onClick={() => handleSelectOverlay(overlay.id)}
              >
                <span className="font-medium truncate max-w-[180px]">
                  {overlay.content || "Text"}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-400 hover:text-red-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveOverlay(overlay.id);
                  }}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Properties Panel */}
      {selectedOverlay ? (
        <div className="bg-slate-900/50 rounded-md overflow-hidden flex-1 flex flex-col max-h-[500px]">
          <Tabs defaultValue="text" className="w-full flex flex-col h-full">
            <TabsList className="w-full grid grid-cols-4 bg-slate-800/50 p-0 shrink-0">
              <TabsTrigger value="text" className="flex items-center py-2">
                <Type className="w-4 h-4 mr-1" />
                <span>Text</span>
              </TabsTrigger>
              <TabsTrigger value="style" className="flex items-center py-2">
                <Palette className="w-4 h-4 mr-1" />
                <span>Style</span>
              </TabsTrigger>
              <TabsTrigger value="position" className="flex items-center py-2">
                <Move className="w-4 h-4 mr-1" />
                <span>Position</span>
              </TabsTrigger>
              <TabsTrigger value="timing" className="flex items-center py-2">
                <Clock className="w-4 h-4 mr-1" />
                <span>Timing</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto p-4">
              {/* Text Content Tab */}
              <TabsContent value="text" className="m-0 space-y-3 h-full overflow-y-auto">
                <div>
                  <Label className="text-xs text-slate-400">Text Content</Label>
                  <Input
                    value={selectedOverlay.content}
                    onChange={(e) => handleUpdateOverlay(selectedOverlay.id, { content: e.target.value })}
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-400">Font Family</Label>
                    <Select
                      value={selectedOverlay.style.fontFamily}
                      onValueChange={(value) => handleUpdateOverlay(selectedOverlay.id, {
                        style: { ...selectedOverlay.style, fontFamily: value }
                      })}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_FAMILIES.map((font) => (
                          <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                            {font}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400">Font Size</Label>
                    <Select
                      value={selectedOverlay.style.fontSize.toString()}
                      onValueChange={(value) => handleUpdateOverlay(selectedOverlay.id, {
                        style: { ...selectedOverlay.style, fontSize: parseInt(value) }
                      })}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_SIZES.map((size) => (
                          <SelectItem key={size} value={size.toString()}>
                            {size}px
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <div className="flex flex-col items-center">
                    <Button
                      variant={selectedOverlay.style.fontWeight === 'bold' ? 'default' : 'outline'}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleUpdateOverlay(selectedOverlay.id, {
                        style: { 
                          ...selectedOverlay.style, 
                          fontWeight: selectedOverlay.style.fontWeight === 'bold' ? 'normal' : 'bold' 
                        }
                      })}
                    >
                      <Bold className="h-4 w-4" />
                    </Button>
                    <span className="text-xs mt-1 text-slate-400">Bold</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleUpdateOverlay(selectedOverlay.id, {
                        style: { 
                          ...selectedOverlay.style, 
                          textShadow: !selectedOverlay.style.textShadow 
                        }
                      })}
                    >
                      <Underline className="h-4 w-4" />
                    </Button>
                    <span className="text-xs mt-1 text-slate-400">Shadow</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <Button
                      variant={selectedOverlay.style.textAlign === 'left' ? 'default' : 'outline'}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleUpdateOverlay(selectedOverlay.id, {
                        style: { ...selectedOverlay.style, textAlign: 'left' as TextAlignmentType }
                      })}
                    >
                      <AlignLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs mt-1 text-slate-400">Left</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <Button
                      variant={selectedOverlay.style.textAlign === 'center' ? 'default' : 'outline'}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleUpdateOverlay(selectedOverlay.id, {
                        style: { ...selectedOverlay.style, textAlign: 'center' as TextAlignmentType }
                      })}
                    >
                      <AlignCenter className="h-4 w-4" />
                    </Button>
                    <span className="text-xs mt-1 text-slate-400">Center</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <Button
                      variant={selectedOverlay.style.textAlign === 'right' ? 'default' : 'outline'}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleUpdateOverlay(selectedOverlay.id, {
                        style: { ...selectedOverlay.style, textAlign: 'right' as TextAlignmentType }
                      })}
                    >
                      <AlignRight className="h-4 w-4" />
                    </Button>
                    <span className="text-xs mt-1 text-slate-400">Right</span>
                  </div>
                </div>
              </TabsContent>

              {/* Style Tab */}
              <TabsContent value="style" className="m-0 space-y-3 h-full overflow-y-auto">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-xs text-slate-400">Text Color</Label>
                    <div 
                      className="w-5 h-5 rounded-full border border-slate-600" 
                      style={{ backgroundColor: selectedOverlay.style.color }}
                    />
                  </div>
                  <Input
                    type="color"
                    value={selectedOverlay.style.color}
                    onChange={(e) => handleUpdateOverlay(selectedOverlay.id, {
                      style: { ...selectedOverlay.style, color: e.target.value }
                    })}
                    className="bg-slate-800 border-slate-700 h-8"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-xs text-slate-400">Background Color</Label>
                    <div 
                      className="w-5 h-5 rounded-full border border-slate-600" 
                      style={{ backgroundColor: selectedOverlay.style.backgroundColor || 'transparent' }}
                    />
                  </div>
                  <Input
                    type="color"
                    value={selectedOverlay.style.backgroundColor?.replace(/rgba?\(.*\)/, '#000000') || '#000000'}
                    onChange={(e) => {
                      const hex = e.target.value;
                      // Convert hex to rgba with configurable opacity
                      const r = parseInt(hex.slice(1, 3), 16);
                      const g = parseInt(hex.slice(3, 5), 16);
                      const b = parseInt(hex.slice(5, 7), 16);
                      const rgba = `rgba(${r},${g},${b},0.5)`;
                      
                      handleUpdateOverlay(selectedOverlay.id, {
                        style: { ...selectedOverlay.style, backgroundColor: rgba }
                      });
                    }}
                    className="bg-slate-800 border-slate-700 h-8"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <Label className="text-xs text-slate-400">Opacity</Label>
                    <span className="text-xs text-slate-400">{Math.round(selectedOverlay.style.opacity * 100)}%</span>
                  </div>
                  <Slider
                    min={0}
                    max={1}
                    step={0.01}
                    value={[selectedOverlay.style.opacity]}
                    onValueChange={([value]) => handleUpdateOverlay(selectedOverlay.id, {
                      style: { ...selectedOverlay.style, opacity: value }
                    })}
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-xs text-slate-400">Text Shadow</Label>
                    <Switch
                      checked={selectedOverlay.style.textShadow || false}
                      onCheckedChange={(checked) => handleUpdateOverlay(selectedOverlay.id, {
                        style: { ...selectedOverlay.style, textShadow: checked }
                      })}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Animation</Label>
                  <Select
                    value={selectedOverlay.style.animation?.type || 'none'}
                    onValueChange={(value) => handleUpdateOverlay(selectedOverlay.id, {
                      style: { 
                        ...selectedOverlay.style, 
                        animation: { 
                          type: value as AnimationType,
                          duration: selectedOverlay.style.animation?.duration || 1
                        } 
                      }
                    })}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ANIMATIONS.map((animation) => (
                        <SelectItem key={animation.value} value={animation.value}>
                          {animation.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              {/* Position Tab */}
              <TabsContent value="position" className="m-0 space-y-3 h-full overflow-y-auto">
                <div>
                  <div className="flex justify-between mb-1">
                    <Label className="text-xs text-slate-400">X Position</Label>
                    <span className="text-xs text-slate-400">{Math.round(selectedOverlay.position.x)}%</span>
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[selectedOverlay.position.x]}
                    onValueChange={([value]) => handleUpdateOverlay(selectedOverlay.id, {
                      position: { ...selectedOverlay.position, x: value }
                    })}
                    className="mb-3"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <Label className="text-xs text-slate-400">Y Position</Label>
                    <span className="text-xs text-slate-400">{Math.round(selectedOverlay.position.y)}%</span>
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[selectedOverlay.position.y]}
                    onValueChange={([value]) => handleUpdateOverlay(selectedOverlay.id, {
                      position: { ...selectedOverlay.position, y: value }
                    })}
                    className="mb-3"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <Label className="text-xs text-slate-400">Rotation</Label>
                    <span className="text-xs text-slate-400">{Math.round(selectedOverlay.style.rotation || 0)}°</span>
                  </div>
                  <Slider
                    min={-180}
                    max={180}
                    step={1}
                    value={[selectedOverlay.style.rotation || 0]}
                    onValueChange={([value]) => handleUpdateOverlay(selectedOverlay.id, {
                      style: { ...selectedOverlay.style, rotation: value }
                    })}
                  />
                </div>
                <div className="pt-2">
                  <p className="text-xs text-slate-400 italic mb-2">Tip: You can also drag text directly in the preview area.</p>
                </div>
              </TabsContent>

              {/* Timing Tab */}
              <TabsContent value="timing" className="m-0 space-y-3 h-full overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-400">Start Time (seconds)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      value={selectedOverlay.timing.startTime}
                      onChange={(e) => handleUpdateOverlay(selectedOverlay.id, {
                        timing: { ...selectedOverlay.timing, startTime: parseFloat(e.target.value) }
                      })}
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400">Duration (seconds)</Label>
                    <Input
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={selectedOverlay.timing.duration}
                      onChange={(e) => handleUpdateOverlay(selectedOverlay.id, {
                        timing: { ...selectedOverlay.timing, duration: parseFloat(e.target.value) }
                      })}
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                </div>
                
                {selectedOverlay.style.animation?.type && selectedOverlay.style.animation.type !== 'none' && (
                  <div>
                    <Label className="text-xs text-slate-400">Animation Duration (seconds)</Label>
                    <Input
                      type="number"
                      min={0.1}
                      max={5}
                      step={0.1}
                      value={selectedOverlay.style.animation?.duration || 1}
                      onChange={(e) => handleUpdateOverlay(selectedOverlay.id, {
                        style: { 
                          ...selectedOverlay.style, 
                          animation: { 
                            ...selectedOverlay.style.animation!,
                            duration: parseFloat(e.target.value) 
                          } 
                        }
                      })}
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      ) : (
        <div className="flex-1 bg-slate-900/50 rounded-md flex items-center justify-center p-8 text-center">
          <div>
            <Type className="mx-auto h-10 w-10 text-slate-500 mb-3" />
            <h3 className="text-lg font-medium mb-1">No Text Selected</h3>
            <p className="text-sm text-slate-400 mb-4">Select a text element or create a new one to edit.</p>
            <Button onClick={handleAddOverlay} variant="outline">
              <Plus className="w-4 h-4 mr-1" />
              Add Text
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 