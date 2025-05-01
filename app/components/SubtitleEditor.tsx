'use client'

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { formatTime } from '../lib/utils';
import { Plus, Trash2, GripVertical, Clock, AlignLeft, PaintBucket, ChevronRight } from 'lucide-react';
import { addSubtitle, updateSubtitle, removeSubtitle } from '../store/videoSlice';

interface SubtitleStyle {
  fontSize?: number;
  color?: string;
  position?: 'top' | 'middle' | 'bottom';
  backgroundColor?: string;
  opacity?: number;
  textShadow?: boolean;
  fontWeight?: 'normal' | 'bold';
}

interface Subtitle {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  style: SubtitleStyle;
}

export default function SubtitleEditor() {
  const dispatch = useDispatch();
  const currentTime = useSelector((state: RootState) => state.video.timeline.currentTime);
  const subtitles = useSelector((state: RootState) => state.video.subtitles);
  const [selectedSubtitle, setSelectedSubtitle] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("text");

  const defaultStyle: SubtitleStyle = {
    fontSize: 16,
    color: '#FFFFFF',
    position: 'bottom',
    backgroundColor: '#000000',
    opacity: 0.7,
    textShadow: true,
    fontWeight: 'normal'
  };

  const handleAddSubtitle = () => {
    const newSubtitle = {
      id: crypto.randomUUID(),
      text: '',
      startTime: currentTime,
      endTime: currentTime + 3,
      style: defaultStyle
    };
    dispatch(addSubtitle(newSubtitle));
    setSelectedSubtitle(newSubtitle.id);
    setActiveTab("text"); // Switch to text tab for immediate editing
  };

  const handleUpdateSubtitle = (id: string, updates: Partial<Subtitle>) => {
    const subtitle = subtitles.find(s => s.id === id);
    if (!subtitle) return;

    // Dispatch the update with the correct payload structure
    dispatch(updateSubtitle({ id, updates }));
  };

  const handleDeleteSubtitle = (id: string) => {
    dispatch(removeSubtitle(id));
    if (selectedSubtitle === id) {
      setSelectedSubtitle(null);
    }
  };

  const selectedSubtitleData = subtitles.find(s => s.id === selectedSubtitle);

  return (
    <div className="flex flex-col h-full bg-[#121212] text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#2A2F3C]">
        <h2 className="text-lg font-semibold text-white">Subtitles</h2>
        <Button
          variant="default"
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={handleAddSubtitle}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Subtitle
        </Button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row">
        {/* Subtitle List */}
        <div className="w-full md:w-1/2 border-r border-[#2A2F3C] overflow-y-auto max-h-[300px] md:max-h-full">
          {subtitles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <p className="text-gray-400 mb-4">No subtitles added yet</p>
              <Button
                variant="outline"
                size="sm"
                className="border-dashed border-gray-600"
                onClick={handleAddSubtitle}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add your first subtitle
              </Button>
            </div>
          ) : (
            subtitles.map((subtitle) => (
              <div
                key={subtitle.id}
                className={`group flex items-start p-3 gap-2 border-b border-[#2A2F3C] cursor-pointer hover:bg-slate-800/30 transition-colors ${
                  selectedSubtitle === subtitle.id ? 'bg-blue-900/30 border-l-4 border-l-blue-500' : ''
                }`}
                onClick={() => {
                  setSelectedSubtitle(subtitle.id);
                  setActiveTab("text"); // Default to text tab when selecting
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono bg-black/30 px-2 py-0.5 rounded text-green-400">
                      {formatTime(subtitle.startTime)} - {formatTime(subtitle.endTime)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSubtitle(subtitle.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                  <p className="text-sm text-white truncate font-medium">
                    {subtitle.text || 'Empty subtitle'}
                  </p>
                </div>
                {selectedSubtitle === subtitle.id && (
                  <ChevronRight className="w-4 h-4 text-blue-500" />
                )}
              </div>
            ))
          )}
        </div>

        {/* Subtitle Editor */}
        {selectedSubtitle && selectedSubtitleData ? (
          <div className="w-full md:w-1/2 p-4 space-y-4 bg-[#1A1A1A]">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full grid grid-cols-3 mb-4">
                <TabsTrigger value="text" className="flex items-center gap-1">
                  <AlignLeft className="w-3.5 h-3.5" />
                  <span>Text</span>
                </TabsTrigger>
                <TabsTrigger value="timing" className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Timing</span>
                </TabsTrigger>
                <TabsTrigger value="style" className="flex items-center gap-1">
                  <PaintBucket className="w-3.5 h-3.5" />
                  <span>Style</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Subtitle Text</label>
                  <textarea
                    value={selectedSubtitleData.text || ''}
                    onChange={(e) => handleUpdateSubtitle(selectedSubtitle, { text: e.target.value })}
                    placeholder="Enter subtitle text here..."
                    className="w-full h-32 p-3 rounded-md bg-slate-800 border border-slate-700 text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </TabsContent>

              <TabsContent value="timing" className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-300">Start Time</label>
                  <div className="flex items-center gap-2">
                    <div className="bg-slate-800 p-2 rounded-md border border-slate-700 flex-1 font-mono text-center text-lg">
                      {formatTime(selectedSubtitleData.startTime)}
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 flex-shrink-0"
                      onClick={() => handleUpdateSubtitle(selectedSubtitle, { startTime: currentTime })}
                    >
                      Set Current
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={selectedSubtitleData.startTime}
                      onChange={(e) => handleUpdateSubtitle(selectedSubtitle, { 
                        startTime: Math.max(0, parseFloat(e.target.value) || 0) 
                      })}
                      className="bg-slate-800 border-slate-700 flex-1"
                      placeholder="Enter seconds..."
                    />
                    <span className="text-sm text-slate-400">seconds</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-300">End Time</label>
                  <div className="flex items-center gap-2">
                    <div className="bg-slate-800 p-2 rounded-md border border-slate-700 flex-1 font-mono text-center text-lg">
                      {formatTime(selectedSubtitleData.endTime)}
                    </div>
                    <Button
                      variant="default" 
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 flex-shrink-0"
                      onClick={() => handleUpdateSubtitle(selectedSubtitle, { endTime: currentTime })}
                    >
                      Set Current
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={selectedSubtitleData.endTime}
                      onChange={(e) => handleUpdateSubtitle(selectedSubtitle, { 
                        endTime: Math.max(selectedSubtitleData.startTime, parseFloat(e.target.value) || 0) 
                      })}
                      className="bg-slate-800 border-slate-700 flex-1"
                      placeholder="Enter seconds..."
                    />
                    <span className="text-sm text-slate-400">seconds</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Duration</label>
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-mono text-center bg-slate-800/50 p-2 rounded-md flex-1">
                      {formatTime(selectedSubtitleData.endTime - selectedSubtitleData.startTime)}
                    </div>
                    <Input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={(Math.round((selectedSubtitleData.endTime - selectedSubtitleData.startTime) * 10) / 10).toFixed(1)}
                      onChange={(e) => {
                        const newDuration = Math.max(0.1, parseFloat(e.target.value) || 0);
                        handleUpdateSubtitle(selectedSubtitle, { 
                          endTime: selectedSubtitleData.startTime + newDuration 
                        });
                      }}
                      className="bg-slate-800 border-slate-700 w-24"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="style" className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-300">Position</label>
                  <Select
                    value={selectedSubtitleData.style?.position || 'bottom'}
                    onValueChange={(value: 'top' | 'middle' | 'bottom') => {
                      handleUpdateSubtitle(selectedSubtitle, {
                        style: { ...selectedSubtitleData.style || {}, position: value }
                      });
                    }}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top">Top</SelectItem>
                      <SelectItem value="middle">Middle</SelectItem>
                      <SelectItem value="bottom">Bottom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-slate-300">Font Size</label>
                    <span className="text-sm bg-slate-800 px-2 py-0.5 rounded">
                      {selectedSubtitleData.style?.fontSize || 16}px
                    </span>
                  </div>
                  <Slider
                    value={[selectedSubtitleData.style?.fontSize || 16]}
                    min={12}
                    max={48}
                    step={1}
                    onValueChange={([value]) => {
                      handleUpdateSubtitle(selectedSubtitle, {
                        style: { ...selectedSubtitleData.style || {}, fontSize: value }
                      });
                    }}
                    className="py-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Text Color</label>
                    <div className="flex">
                      <Input
                        type="color"
                        value={selectedSubtitleData.style?.color || '#FFFFFF'}
                        onChange={(e) => {
                          handleUpdateSubtitle(selectedSubtitle, {
                            style: { ...selectedSubtitleData.style || {}, color: e.target.value }
                          });
                        }}
                        className="h-10 bg-transparent border-slate-700 w-full"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Font Weight</label>
                    <Select
                      value={selectedSubtitleData.style?.fontWeight || 'normal'}
                      onValueChange={(value: 'normal' | 'bold') => {
                        handleUpdateSubtitle(selectedSubtitle, {
                          style: { ...selectedSubtitleData.style || {}, fontWeight: value }
                        });
                      }}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="bold">Bold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-300">Background Color</label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="color"
                      value={selectedSubtitleData.style?.backgroundColor || '#000000'}
                      onChange={(e) => {
                        handleUpdateSubtitle(selectedSubtitle, {
                          style: { ...selectedSubtitleData.style || {}, backgroundColor: e.target.value }
                        });
                      }}
                      className="h-10 bg-transparent border-slate-700 flex-shrink-0 w-1/3"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-xs text-slate-400">Opacity</span>
                        <span className="text-xs bg-slate-800 px-1 rounded">
                          {selectedSubtitleData.style?.opacity || 0}
                        </span>
                      </div>
                      <Slider
                        value={[selectedSubtitleData.style?.opacity || 0]}
                        min={0}
                        max={1}
                        step={0.1}
                        onValueChange={([value]) => {
                          handleUpdateSubtitle(selectedSubtitle, {
                            style: { ...selectedSubtitleData.style || {}, opacity: value }
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-md bg-slate-800/30 border border-slate-700/50">
                  <span className="text-sm font-medium text-slate-300">Text Shadow</span>
                  <Switch
                    checked={selectedSubtitleData.style?.textShadow || false}
                    onCheckedChange={(checked: boolean) => {
                      handleUpdateSubtitle(selectedSubtitle, {
                        style: { ...selectedSubtitleData.style || {}, textShadow: checked }
                      });
                    }}
                  />
                </div>

                <div className="mt-4 p-3 bg-slate-800/30 rounded-md border border-slate-700/50">
                  <h3 className="text-sm font-medium text-slate-300 mb-2">Preview</h3>
                  <div 
                    className="p-4 bg-gray-900 rounded flex items-center justify-center"
                    style={{
                      backgroundColor: `${selectedSubtitleData.style?.backgroundColor || '#000000'}${Math.round((selectedSubtitleData.style?.opacity || 0) * 255).toString(16).padStart(2, '0')}`,
                    }}
                  >
                    <p 
                      style={{
                        color: selectedSubtitleData.style?.color || '#FFFFFF',
                        fontSize: `${selectedSubtitleData.style?.fontSize || 16}px`,
                        fontWeight: selectedSubtitleData.style?.fontWeight || 'normal',
                        textShadow: selectedSubtitleData.style?.textShadow ? '1px 1px 2px rgba(0,0,0,0.8)' : 'none',
                      }}
                    >
                      {selectedSubtitleData.text || 'Subtitle Preview'}
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="w-full md:w-1/2 flex items-center justify-center p-8 bg-[#1A1A1A] text-gray-500">
            <div className="text-center">
              <p className="mb-4">Select a subtitle to edit or create a new one</p>
              <Button 
                variant="outline"
                onClick={handleAddSubtitle}
                className="border-dashed"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Subtitle
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 