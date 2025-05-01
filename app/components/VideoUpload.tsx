'use client'

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Progress } from "../components/ui/progress";
import { toast } from "../hooks/use-toast";
import { cn } from "../lib/utils";

interface VideoUploadProps {
  onVideoUpload: (file: File) => void;
}

export default function VideoUpload({ onVideoUpload }: VideoUploadProps) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);


// it is used to simulate that i am uploading , 
  const simulateUpload = (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    
    const duration = 2000;
    const interval = 100;
    const steps = duration / interval;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const progress = Math.min((currentStep / steps) * 100, 100);
      setUploadProgress(progress);

      if (currentStep >= steps) {
        clearInterval(timer);
        setIsUploading(false);
        onVideoUpload(file);
        toast({
          title: "Video uploaded successfully",
          description: `${file.name} has been uploaded and is ready for editing.`,
        });
      }
    }, interval);
  };

  //on drop will check it is a video file or not 

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.type.startsWith('video/')) {
      simulateUpload(file);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload a video file (MP4, WebM, MOV, etc.)",
        variant: "destructive",
      });
    }
  }, [onVideoUpload]);


// just understand that  getRootProps, getInputProps, isDragActive that 
//by using this you dont have to manually write all events just 3 words magical
//getRootProps make it clickable for all when i upload 
//getInputProps is like input taking like input type =file
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.webm', '.mov', '.avi']
    },
    multiple: false
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ease-in-out group hover:border-blue-400 dark:hover:border-blue-500",
          isDragActive ? "border-blue-500 bg-blue-50/50 dark:bg-blue-500/10" : "border-gray-200 dark:border-gray-800",
          isUploading ? "pointer-events-none opacity-50" : "hover:bg-gray-50/50 dark:hover:bg-gray-800/50"
        )}
      >
        <input {...getInputProps()} />
        <div className="space-y-2">
          <div className={cn(
            "w-12 h-12 mx-auto rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110",
            isDragActive ? "bg-blue-100 dark:bg-blue-900/30" : "bg-gray-100 dark:bg-gray-800"
          )}>
            <svg
              className={cn(
                "w-6 h-6 transition-colors duration-200",
                isDragActive ? "text-blue-500" : "text-gray-400 dark:text-gray-500 group-hover:text-blue-500"
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          
          {isDragActive ? (
            <div className="space-y-1">
              <p className="text-blue-500 text-sm font-medium animate-pulse">
                Drop your video here...
              </p>
              <p className="text-blue-400 text-xs">
                Release to upload
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-gray-700 dark:text-gray-300 text-sm font-medium group-hover:text-blue-500 transition-colors">
                Drop video or click to browse
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-xs">
                Supports MP4, WebM, MOV, AVI
              </p>
            </div>
          )}
        </div>
      </div>

      {isUploading && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <Progress value={uploadProgress} className="h-2" />
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">
              Uploading...
            </span>
            <span className="text-gray-700 dark:text-gray-300 font-medium">
              {Math.round(uploadProgress)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
} 