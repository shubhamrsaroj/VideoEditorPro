'use client'

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import VideoUpload from "@/components/VideoUpload";
import Timeline from "@/components/Timeline";
import { TextOverlay } from "@/components/TextOverlay";
import ImageOverlay from "@/components/ImageOverlay";
import VideoPreview from "@/components/VideoPreview";
import AudioControls from "@/components/AudioControls";
import SubtitleEditor from "@/components/SubtitleEditor";
import VideoEffects from "@/components/VideoEffects";
import MediaLibrary, { MediaItem } from "@/components/MediaLibrary";
import { cn } from "@/lib/utils";
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentVideo } from './store/videoSlice';
import { addMediaItem, removeMediaItem } from './store/effectsSlice';
import { RootState } from './store/store';
import { 
  Film, 
  Text, 
  Image, 
  Sliders, 
  Music, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Download, 
  Settings, 
  HelpCircle, 
  Menu, 
  Maximize2, 
  Minimize2, 
  Undo, 
  Redo,
  Share2,
  Clock,
  Play,
  MessageSquare,
  Loader
} from 'lucide-react';

type MediaType = 'video' | 'audio' | 'image';

export default function Home() {
  const dispatch = useDispatch();
  const mediaItems = useSelector((state: RootState) => state.effects.mediaItems);
  const [activeDrag, setActiveDrag] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("media");
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState<boolean>(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState<boolean>(false);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState<boolean>(false);
  const [projectName, setProjectName] = useState<string>("Untitled Project");
  const [lastSaved, setLastSaved] = useState<string>("Not saved yet");
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);

  // Debug redux state
  useEffect(() => {
    console.log("Redux state updated - mediaItems:", mediaItems);
  }, [mediaItems]);

  // Simulate automatic saving
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setLastSaved(`Last saved at ${now.toLocaleTimeString()}`);
    }, 120000); // Auto-save every 2 minutes
    
    return () => clearInterval(interval);
  }, []);

  const handleVideoUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    dispatch(setCurrentVideo({ url, duration: 0 }));
    
    // Update project name based on file
    if (file.name) {
      const baseName = file.name.split('.').slice(0, -1).join('.');
      setProjectName(baseName || "Untitled Project");
    }
  };

  const handleMediaUpload = async (files: FileList) => {
    // Convert FileList to array to properly iterate
    const fileArray = Array.from(files);
    
    console.log("Handling media upload for files:", fileArray);
    
    for (const file of fileArray) {
      const type = file.type.startsWith('video/') ? 'video' as MediaType :
                  file.type.startsWith('audio/') ? 'audio' as MediaType :
                  file.type.startsWith('image/') ? 'image' as MediaType : null;
      
      if (!type) continue;

      const url = URL.createObjectURL(file);
      let duration = 0;

      if (type === 'video' || type === 'audio') {
        const media = document.createElement(type);
        media.src = url;
        try {
          duration = await new Promise<number>((resolve, reject) => {
            media.onloadedmetadata = () => resolve(media.duration);
            media.onerror = (e) => reject(new Error(`Failed to load ${type} metadata: ${e}`));
            // Set a timeout in case metadata loading hangs
            setTimeout(() => reject(new Error('Metadata load timeout')), 5000);
          });
        } catch (error) {
          console.error(`Error loading ${type} metadata:`, error);
          duration = 5; // Default duration if metadata couldn't be loaded
        }
      }

      const newItem = {
        id: crypto.randomUUID(),
        type,
        content: url,
        name: file.name,
        startTime: 0,
        duration: duration || 5, // Default 5s duration for images
        track: 0
      };

      console.log("Adding media item to Redux:", newItem);
      dispatch(addMediaItem(newItem));
      
      // Auto-switch to the tab related to the uploaded content type
      if (type === 'video' && activeTab !== 'media') {
        setActiveTab('media');
      } else if (type === 'image') {
        setActiveTab('image');
      } else if (type === 'audio') {
        setActiveTab('audio');
      }
    }
    
    // Update last saved time
    const now = new Date();
    setLastSaved(`Last saved at ${now.toLocaleTimeString()}`);
  };

  const handleMediaDelete = (id: string) => {
    console.log("Deleting media item:", id);
    dispatch(removeMediaItem(id));
    
    // Update last saved time
    const now = new Date();
    setLastSaved(`Last saved at ${now.toLocaleTimeString()}`);
  };

  // Handle drag start on the document to track when drags are happening
  useEffect(() => {
    const handleDragStart = () => {
      console.log("Drag operation started");
      setActiveDrag(true);
    };
    
    const handleDragEnd = () => {
      console.log("Drag operation ended");
      setActiveDrag(false);
    };
    
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragend', handleDragEnd);
    
    return () => {
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('dragend', handleDragEnd);
    };
  }, []);

  const renderTabIcon = (value: string) => {
    switch (value) {
      case 'media':
        return <Film className="h-4 w-4 mr-2" />;
      case 'text':
        return <Text className="h-4 w-4 mr-2" />;
      case 'image':
        return <Image className="h-4 w-4 mr-2" />;
      case 'subtitle':
        return <MessageSquare className="h-4 w-4 mr-2" />;
      case 'effects':
        return <Sliders className="h-4 w-4 mr-2" />;
      case 'audio':
        return <Music className="h-4 w-4 mr-2" />;
      default:
        return null;
    }
  };

  const handleExport = () => {
    if (isExporting) return; // Prevent multiple export clicks
    
    setIsExporting(true);
    setExportProgress(0);
    
    // Simulate export with progress updates
    const totalSteps = 10;
    let currentStep = 0;
    
    const exportInterval = setInterval(() => {
      currentStep++;
      const progress = Math.round((currentStep / totalSteps) * 100);
      setExportProgress(progress);
      
      if (currentStep >= totalSteps) {
        clearInterval(exportInterval);
        
        // Simulate final processing
        setTimeout(() => {
          setIsExporting(false);
          setExportProgress(0);
          alert("Export completed! Your video is ready for download.");
        }, 500);
      }
    }, 500); // Update progress every 500ms
  };

  return (
    <main className="flex flex-col h-screen bg-[#0A0A0A] text-white overflow-hidden">
      {/* Export Overlay - shown when exporting */}
      {isExporting && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
          <div className="bg-[#1A1A1A] p-6 rounded-lg shadow-lg w-full max-w-md">
            <div className="flex flex-col items-center text-center">
              <Loader className="h-12 w-12 text-blue-500 animate-spin mb-4" />
              <h3 className="text-xl font-medium mb-2">Exporting Video</h3>
              <p className="text-gray-400 mb-4">Please wait while we render your masterpiece...</p>
              
              <div className="w-full bg-gray-800 rounded-full h-4 mb-2">
                <div 
                  className="bg-blue-600 h-4 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${exportProgress}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between w-full text-sm text-gray-400">
                <span>Processing...</span>
                <span>{exportProgress}%</span>
              </div>
              
              {exportProgress > 50 && (
                <p className="mt-4 text-sm text-blue-400">Almost there! Finalizing your video...</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top Navigation */}
      <nav className="h-14 border-b border-[#1A1A1A] bg-[#111111] px-4 flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white mr-2 md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
          
          <h1 className="text-xl font-semibold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent hidden sm:block">
            VideoCraft Pro
          </h1>
          
          <div className="ml-6 flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-full text-gray-400 hover:text-white">
              <Undo className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-full text-gray-400 hover:text-white">
              <Redo className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="ml-6 flex items-center gap-3 text-sm">
            <h2 className="font-medium text-white truncate max-w-[150px] md:max-w-[250px]">{projectName}</h2>
            <div className="text-xs text-gray-400 flex items-center gap-1 border border-gray-800 rounded-full px-2 py-0.5">
              <Clock className="h-3 w-3" />
              <span className="hidden md:inline">{lastSaved}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 mr-2">
            <Button variant="outline" size="sm" className="h-8 gap-1 text-gray-300">
              <Share2 className="h-3.5 w-3.5" />
              <span>Share</span>
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1 text-gray-300">
              <Save className="h-3.5 w-3.5" />
              <span>Save</span>
            </Button>
          </div>
          
          <div className="relative">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 rounded-full text-gray-400 hover:text-white mr-2"
              onClick={() => alert('Settings menu would open here')}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
          
          <Button 
            onClick={handleExport} 
            size="sm" 
            className={`${isExporting ? 'bg-gray-700' : 'bg-blue-600 hover:bg-blue-700'} transition-colors h-8 gap-1`}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <Loader className="h-3.5 w-3.5 animate-spin" />
                <span className="hidden sm:inline">Exporting...</span>
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export</span>
              </>
            )}
          </Button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex flex-1 h-[calc(100%-3.5rem)] overflow-hidden">
        {/* Left Sidebar - Media Library */}
        <div 
          className={cn(
            "border-r border-[#1A1A1A] bg-[#111111] transition-all duration-300 ease-in-out",
            isLeftPanelCollapsed ? "w-12" : "w-64 md:w-72"
          )}
        >
          <div className="flex items-center justify-between h-10 px-4 border-b border-[#1A1A1A]">
            {!isLeftPanelCollapsed && (
              <h2 className="text-sm font-medium text-gray-400 truncate">Media Library</h2>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-gray-500 hover:text-white"
              onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
            >
              {isLeftPanelCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {!isLeftPanelCollapsed && (
            <div className="p-3 h-[calc(100%-2.5rem)] overflow-hidden">
              <MediaLibrary 
                items={mediaItems.map(item => ({
                  id: item.id,
                  type: item.type,
                  name: item.name || '',
                  url: item.content,
                  duration: item.duration
                }))}
                onUpload={handleMediaUpload}
                onDelete={handleMediaDelete}
              />
            </div>
          )}
        </div>

        {/* Center Content */}
        <div className="flex-1 flex flex-col">
          {/* Video Preview */}
          <div 
            className={cn(
              "bg-[#0D0D0D] p-3 transition-all duration-300 ease-in-out relative flex flex-col",
              isTimelineExpanded ? "h-[30%]" : "h-[60%]"
            )}
          >
            <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm"
                onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
              >
                {isTimelineExpanded ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
              </Button>
            </div>
            
            <div className="h-full flex items-center justify-center">
              <VideoPreview />
            </div>
          </div>

          {/* Timeline */}
          <div 
            className={cn(
              "border-t border-[#1A1A1A] bg-[#111111] transition-all duration-300 ease-in-out",
              isTimelineExpanded ? "h-[70%]" : "h-[40%]"
            )}
          >
            <div className="h-10 border-b border-[#1A1A1A] bg-[#0D0D0D] flex items-center px-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-white">
                  <Play className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs text-gray-400">00:00:00 / 00:00:00</span>
              </div>
              
              <div className="ml-auto flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 rounded-full text-gray-400 hover:text-white"
                  onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
                >
                  {isTimelineExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
            
            <div className="h-[calc(100%-2.5rem)] p-2">
              <Timeline />
            </div>
          </div>
        </div>

        {/* Right Sidebar - Properties */}
        <div 
          className={cn(
            "border-l border-[#1A1A1A] bg-[#111111] transition-all duration-300 ease-in-out",
            isRightPanelCollapsed ? "w-12" : "w-80 md:w-96"
          )}
        >
          {isRightPanelCollapsed ? (
            <div className="h-full flex flex-col items-center py-4 gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-gray-500 hover:text-white"
                onClick={() => setIsRightPanelCollapsed(false)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              {["media", "text", "image", "subtitle", "effects", "audio"].map((tab) => (
                <Button
                  key={tab}
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-10 w-10 rounded-full mb-1", 
                    activeTab === tab 
                      ? "bg-blue-600 text-white" 
                      : "text-gray-500 hover:text-white hover:bg-[#1A1A1A]"
                  )}
                  onClick={() => {
                    setActiveTab(tab);
                    setIsRightPanelCollapsed(false);
                  }}
                >
                  {renderTabIcon(tab)}
                </Button>
              ))}
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <div className="flex items-center h-10 px-2 border-b border-[#1A1A1A] justify-between">
                <TabsList className="h-8 bg-[#0D0D0D] p-0.5 rounded-md grid grid-cols-6 gap-1">
                  <TabsTrigger 
                    value="media" 
                    className="flex items-center justify-center h-7 data-[state=active]:bg-blue-600 rounded-sm px-2 text-xs gap-1"
                  >
                    <Film className="h-3 w-3" />
                    <span className="hidden md:inline">Media</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="text" 
                    className="flex items-center justify-center h-7 data-[state=active]:bg-blue-600 rounded-sm px-2 text-xs gap-1"
                  >
                    <Text className="h-3 w-3" />
                    <span className="hidden md:inline">Text</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="image" 
                    className="flex items-center justify-center h-7 data-[state=active]:bg-blue-600 rounded-sm px-2 text-xs gap-1"
                  >
                    <Image className="h-3 w-3" />
                    <span className="hidden md:inline">Image</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="subtitle" 
                    className="flex items-center justify-center h-7 data-[state=active]:bg-blue-600 rounded-sm px-2 text-xs gap-1"
                  >
                    <MessageSquare className="h-3 w-3" />
                    <span className="hidden md:inline">Subtitle</span>
                  </TabsTrigger>
              
                  <TabsTrigger 
                    value="audio" 
                    className="flex items-center justify-center h-7 data-[state=active]:bg-blue-600 rounded-sm px-2 text-xs gap-1"
                  >
                    <Music className="h-3 w-3" />
                    <span className="hidden md:inline">Audio</span>
                  </TabsTrigger>
                  
                </TabsList>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-gray-500 hover:text-white"
                  onClick={() => setIsRightPanelCollapsed(true)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1 flex flex-col overflow-hidden">
                <TabsContent value="media" className="p-3 h-full overflow-y-auto m-0">
                  <VideoUpload onVideoUpload={handleVideoUpload} />
                </TabsContent>
                <TabsContent value="text" className="p-0 h-full overflow-y-auto m-0">
                  <TextOverlay />
                </TabsContent>
                <TabsContent value="image" className="p-0 h-full overflow-y-auto m-0">
                  <ImageOverlay />
                </TabsContent>
                <TabsContent value="subtitle" className="p-3 h-full overflow-y-auto m-0">
                  <SubtitleEditor />
                </TabsContent>
                <TabsContent value="effects" className="p-3 h-full overflow-y-auto m-0">
                  <VideoEffects />
                </TabsContent>
                <TabsContent value="audio" className="p-3 h-full overflow-y-auto m-0">
                  <AudioControls />
                </TabsContent>
              </div>
            </Tabs>
          )}
        </div>
      </div>
      
      {/* Help Button */}
      
      
      {/* Show current Redux state for debugging */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-0 left-0 bg-black/80 p-2 text-xs text-gray-400 max-w-xs">
          Media items: {mediaItems.length}
        </div>
      )}
    </main>
  );
} 