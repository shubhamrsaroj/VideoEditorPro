'use client'

import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useDropzone } from 'react-dropzone';
import { RootState } from '../store/store';
import { setBackgroundMusic, updateAudioSettings } from '../store/videoSlice';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function AudioControls() {
  const dispatch = useDispatch();
  const { backgroundMusic, isMuted, volume } = useSelector((state: RootState) => state.video.audio);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.type.startsWith('audio/')) {
      const url = URL.createObjectURL(file);
      dispatch(setBackgroundMusic({ url }));
    }
  }, [dispatch]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.ogg']
    },
    multiple: false
  });

  const handleVolumeChange = (value: number[]) => {
    dispatch(updateAudioSettings({ volume: value[0] }));
  };

  const handleMuteToggle = (checked: boolean) => {
    dispatch(updateAudioSettings({ isMuted: checked }));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Audio Settings</h3>
        
        {/* Volume Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-gray-700 dark:text-gray-300">Volume</Label>
            <span className="text-xs text-gray-500">{Math.round(volume * 100)}%</span>
          </div>
          <Slider
            value={[volume]}
            min={0}
            max={1}
            step={0.01}
            onValueChange={handleVolumeChange}
            disabled={isMuted}
            className="w-full"
          />
        </div>

        {/* Mute Toggle */}
        <div className="flex items-center space-x-2">
          <Switch
            checked={isMuted}
            onCheckedChange={handleMuteToggle}
          />
          <Label className="text-sm text-gray-700 dark:text-gray-300">Mute Audio</Label>
        </div>
      </div>

      {/* Background Music */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Background Music</h3>
        
        <div {...getRootProps()} className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 transition-colors">
          <input {...getInputProps()} />
          {backgroundMusic ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-700 dark:text-gray-300">Music added!</p>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch(setBackgroundMusic({ url: '' }));
                }}
              >
                Remove Music
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {isDragActive ? 'Drop music here...' : 'Drop music or click to browse'}
              </p>
              <p className="text-xs text-gray-500">Supports MP3, WAV, OGG</p>
            </div>
          )}
        </div>

        {backgroundMusic && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-gray-700 dark:text-gray-300">Music Volume</Label>
              <span className="text-xs text-gray-500">
                {Math.round((backgroundMusic.volume || 1) * 100)}%
              </span>
            </div>
            <Slider
              value={[backgroundMusic.volume || 1]}
              min={0}
              max={1}
              step={0.01}
              onValueChange={(value) => dispatch(setBackgroundMusic({
                ...backgroundMusic,
                volume: value[0]
              }))}
              className="w-full"
            />
          </div>
        )}
      </div>
    </div>
  );
} 