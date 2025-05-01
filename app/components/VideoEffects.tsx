'use client'

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateFilters, updateTransform, setSpeed } from '../store/effectsSlice';
import type { RootState } from '../store/store';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

export default function VideoEffects() {
  const dispatch = useDispatch();
  const { filters, transform, speed } = useSelector((state: RootState) => state.effects);

  const handleFilterChange = (type: keyof typeof filters, value: number) => {
    dispatch(updateFilters({ [type]: value }));
  };

  const handleSpeedChange = (value: number[]) => {
    dispatch(setSpeed(value[0]));
  };

  const handleRotationChange = (value: number[]) => {
    dispatch(updateTransform({ rotation: value[0] }));
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <Label>Brightness</Label>
        <Slider
          value={[filters.brightness]}
          onValueChange={(value) => handleFilterChange('brightness', value[0])}
          min={0}
          max={200}
          step={1}
        />
      </div>

      <div>
        <Label>Contrast</Label>
        <Slider
          value={[filters.contrast]}
          onValueChange={(value) => handleFilterChange('contrast', value[0])}
          min={0}
          max={200}
          step={1}
        />
      </div>

      <div>
        <Label>Saturation</Label>
        <Slider
          value={[filters.saturation]}
          onValueChange={(value) => handleFilterChange('saturation', value[0])}
          min={0}
          max={200}
          step={1}
        />
      </div>

      <div>
        <Label>Blur</Label>
        <Slider
          value={[filters.blur]}
          onValueChange={(value) => handleFilterChange('blur', value[0])}
          min={0}
          max={20}
          step={0.1}
        />
      </div>

      <div>
        <Label>Speed</Label>
        <Slider
          value={[speed]}
          onValueChange={handleSpeedChange}
          min={0.25}
          max={2}
          step={0.25}
        />
      </div>

      <div>
        <Label>Rotation</Label>
        <Slider
          value={[transform.rotation]}
          onValueChange={handleRotationChange}
          min={0}
          max={360}
          step={90}
        />
      </div>
    </div>
  );
} 