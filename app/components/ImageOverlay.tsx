'use client'

import React, { useState, ChangeEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageOverlayType, ImageStyle } from '../types/effects';
import { addOverlay, updateOverlay, removeOverlay, setSelectedOverlayId } from '@/store/effectsSlice';
import { createSelector } from '@reduxjs/toolkit';
import { nanoid } from 'nanoid';
import { Plus, Image as ImageIcon, X, Move, Sliders, Square, Clock, Upload, Trash2, RotateCw } from 'lucide-react';

const DEFAULT_STYLE: ImageStyle = {
  scale: 1,
  opacity: 1,
  rotation: 0,
  filter: {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0
  },
  border: {
    width: 0,
    style: 'solid',
    color: '#000000',
    radius: 0
  },
  shadow: {
    offsetX: 0,
    offsetY: 0,
    x: 0,
    y: 0,
    blur: 0,
    color: '#000000'
  }
};

const selectImageOverlays = createSelector(
  (state: RootState) => state.effects.overlays,
  (overlays) => overlays.filter((overlay): overlay is ImageOverlayType => overlay.type === 'image')
);

export default function ImageOverlay() {
  const dispatch = useDispatch();
  const imageOverlays = useSelector(selectImageOverlays);
  const selectedOverlayId = useSelector((state: RootState) => state.effects.selectedOverlayId);
  const selectedOverlay = imageOverlays.find(o => o.id === selectedOverlayId);
  const [isDragging, setIsDragging] = useState(false);

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      const newOverlay: ImageOverlayType = {
        id: nanoid(),
        type: 'image',
        content,
        position: { x: 50, y: 50 },
        timing: {
          startTime: 0,
          duration: 5
        },
        style: DEFAULT_STYLE
      };
      dispatch(addOverlay(newOverlay));
      dispatch(setSelectedOverlayId(newOverlay.id));
    };
    reader.readAsDataURL(file);
  };

  const handleStyleChange = (id: string, path: string[], value: number | string) => {
    const overlay = imageOverlays.find(o => o.id === id);
    if (!overlay) return;

    const updates = { ...overlay };
    let current: any = updates;
    
    for (let i = 0; i < path.length - 1; i++) {
      current[path[i]] = { ...current[path[i]] };
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = value;
    dispatch(updateOverlay({ id, updates }));
  };

  return (
    <div className="flex h-full">
      {/* Left side - Image gallery */}
      <div className="w-1/3 border-r border-gray-700 flex flex-col">
        {/* Upload area */}
        <div className="p-4 border-b border-gray-700">
          <h3 className="font-medium mb-2">Image Overlays</h3>
          
          <label className="border-2 border-dashed border-gray-600 rounded-md p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-800 transition-colors">
            <Upload className="h-8 w-8 mb-2 text-blue-500" />
            <p className="text-sm">Drop image here or click</p>
            <p className="text-xs text-gray-400">Supports: JPG, PNG, GIF</p>
            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
          </label>
        </div>
        
        {/* Gallery */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-3">
            {imageOverlays.map(overlay => (
              <div 
                key={overlay.id} 
                className={`
                  border rounded-md overflow-hidden cursor-pointer
                  ${selectedOverlayId === overlay.id ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-700'}
                `}
                onClick={() => dispatch(setSelectedOverlayId(overlay.id))}
              >
                <div className="aspect-square relative">
                  <img 
                    src={overlay.content} 
                    alt="" 
                    className="w-full h-full object-cover"
                  />
                  <button
                    className="absolute top-1 right-1 bg-red-500 p-1 rounded-full opacity-0 hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch(removeOverlay(overlay.id));
                    }}
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Right side - Settings */}
      <div className="flex-1 flex flex-col overflow-hidden bg-black/20 rounded-lg">
        {selectedOverlay ? (
          <>
            <div className="border-b border-gray-700 p-4 bg-gray-900/30 rounded-t-md">
              <div className="flex items-center mb-4">
                <div className="h-12 w-12 border border-gray-700 rounded-md overflow-hidden mr-3 bg-gray-800">
                  <img 
                    src={selectedOverlay.content} 
                    alt="" 
                    className="h-full w-full object-cover" 
                  />
                </div>
                <div>
                  <h3 className="font-medium text-gray-100">Edit Image</h3>
                  <p className="text-xs text-gray-400">Adjust properties below</p>
                </div>
              </div>
              
              <Tabs defaultValue="transform">
                <TabsList className="grid w-full grid-cols-4 bg-slate-800/50 p-0 rounded-md mb-4">
                  <TabsTrigger value="transform" className="py-1.5 px-1 flex items-center justify-center gap-1 text-xs">
                    <Sliders className="w-3 h-3" />
                    <span>Transform</span>
                  </TabsTrigger>
                  <TabsTrigger value="position" className="py-1.5 px-1 flex items-center justify-center gap-1 text-xs">
                    <Move className="w-3 h-3" />
                    <span>Position</span>
                  </TabsTrigger>
                  <TabsTrigger value="filters" className="py-1.5 px-1 flex items-center justify-center gap-1 text-xs">
                    <Square className="w-3 h-3" />
                    <span>Filters</span>
                  </TabsTrigger>
                  <TabsTrigger value="timing" className="py-1.5 px-1 flex items-center justify-center gap-1 text-xs">
                    <Clock className="w-3 h-3" />
                    <span>Timing</span>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="transform" className="mt-0 space-y-4 px-1">
                  <div>
                    <Label className="text-sm text-gray-300 mb-2 block">Scale</Label>
                    <div className="mt-2">
                      <Slider
                        value={[selectedOverlay.style.scale * 100]}
                        onValueChange={(value) => handleStyleChange(selectedOverlay.id, ['style', 'scale'], value[0] / 100)}
                        min={10}
                        max={200}
                        step={1}
                      />
                      <div className="text-right text-sm text-gray-400 mt-1">
                        {Math.round(selectedOverlay.style.scale * 100)}%
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-gray-300 mb-2 block">Opacity</Label>
                    <div className="mt-2">
                      <Slider
                        value={[selectedOverlay.style.opacity * 100]}
                        onValueChange={(value) => handleStyleChange(selectedOverlay.id, ['style', 'opacity'], value[0] / 100)}
                        min={0}
                        max={100}
                        step={1}
                      />
                      <div className="text-right text-sm text-gray-400 mt-1">
                        {Math.round(selectedOverlay.style.opacity * 100)}%
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="position" className="mt-0 space-y-4 px-1">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Move className="h-4 w-4 text-gray-400" />
                      <Label className="text-sm text-gray-300">X Position</Label>
                      <span className="text-sm text-gray-400 ml-auto">{Math.round(selectedOverlay.position.x)}%</span>
                    </div>
                    <Slider
                      min={0}
                      max={100}
                      step={1}
                      value={[selectedOverlay.position.x]}
                      onValueChange={(value) => {
                        const updates = { ...selectedOverlay };
                        updates.position = { ...updates.position, x: value[0] };
                        dispatch(updateOverlay({ id: selectedOverlay.id, updates }));
                      }}
                      className="mb-3"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Move className="h-4 w-4 text-gray-400" />
                      <Label className="text-sm text-gray-300">Y Position</Label>
                      <span className="text-sm text-gray-400 ml-auto">{Math.round(selectedOverlay.position.y)}%</span>
                    </div>
                    <Slider
                      min={0}
                      max={100}
                      step={1}
                      value={[selectedOverlay.position.y]}
                      onValueChange={(value) => {
                        const updates = { ...selectedOverlay };
                        updates.position = { ...updates.position, y: value[0] };
                        dispatch(updateOverlay({ id: selectedOverlay.id, updates }));
                      }}
                      className="mb-3"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <RotateCw className="h-4 w-4 text-gray-400" />
                      <Label className="text-sm text-gray-300">Rotation</Label>
                      <span className="text-sm text-gray-400 ml-auto">{selectedOverlay.style.rotation}°</span>
                    </div>
                    <Slider
                      min={-180}
                      max={180}
                      step={1}
                      value={[selectedOverlay.style.rotation]}
                      onValueChange={(value) => handleStyleChange(selectedOverlay.id, ['style', 'rotation'], value[0])}
                    />
                  </div>
                  <div className="pt-2">
                    <p className="text-xs text-gray-400 italic mb-2">Tip: You can also drag images directly in the video preview.</p>
                  </div>
                </TabsContent>
                
                <TabsContent value="filters" className="mt-0 space-y-4 px-1">
                  {Object.entries(selectedOverlay.style.filter).map(([key, value]) => (
                    <div key={key}>
                      <Label className="text-sm text-gray-300 mb-2 block">{key.charAt(0).toUpperCase() + key.slice(1)}</Label>
                      <div className="mt-2">
                        <Slider
                          value={[value]}
                          onValueChange={(val) => handleStyleChange(selectedOverlay.id, ['style', 'filter', key], val[0])}
                          min={0}
                          max={key === 'blur' ? 20 : 200}
                          step={key === 'blur' ? 0.1 : 1}
                        />
                        <div className="text-right text-sm text-gray-400 mt-1">
                          {key === 'blur' ? value.toFixed(1) : Math.round(value)}
                        </div>
                      </div>
                    </div>
                  ))}
                </TabsContent>
                
                <TabsContent value="timing" className="mt-0 space-y-4 px-1">
                  <div>
                    <Label className="text-sm text-gray-300 mb-2 block">Start Time (seconds)</Label>
                    <div className="mt-2">
                      <Slider
                        value={[selectedOverlay.timing.startTime]}
                        onValueChange={(value) => {
                          const updates = { ...selectedOverlay };
                          updates.timing = { ...updates.timing, startTime: value[0] };
                          dispatch(updateOverlay({ id: selectedOverlay.id, updates }));
                        }}
                        min={0}
                        max={30}
                        step={0.1}
                      />
                      <div className="text-right text-sm text-gray-400 mt-1">
                        {selectedOverlay.timing.startTime.toFixed(1)}s
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-gray-300 mb-2 block">Duration (seconds)</Label>
                    <div className="mt-2">
                      <Slider
                        value={[selectedOverlay.timing.duration]}
                        onValueChange={(value) => {
                          const updates = { ...selectedOverlay };
                          updates.timing = { ...updates.timing, duration: value[0] };
                          dispatch(updateOverlay({ id: selectedOverlay.id, updates }));
                        }}
                        min={0.1}
                        max={60}
                        step={0.1}
                      />
                      <div className="text-right text-sm text-gray-400 mt-1">
                        {selectedOverlay.timing.duration.toFixed(1)}s
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center h-full p-8 text-center">
            <div className="max-w-xs">
              <div className="mx-auto mb-4 p-4 bg-gray-800/50 rounded-full inline-block">
                <ImageIcon className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium mb-2 text-gray-200">No Image Selected</h3>
              <p className="text-sm text-gray-400 mb-4">
                Select an image from the library or upload a new one to start editing
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 