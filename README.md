# Video Editor Web App

A modern, browser-based video editing tool built with Next.js, React, and TypeScript. This application allows users to create professional-quality videos by combining multiple media elements, adding text and image overlays, managing audio tracks, and exporting their edited creations.

![Video Editor Screenshot](screenshots/main-interface.png)

## ✨ Features

### 🎬 Media Management
- **Video Upload**: Drag-and-drop or file selection for video uploads
- **Image Library**: Upload and manage images for overlays
- **Media Browser**: Easily browse and select from uploaded media assets

### ⏱️ Editing Tools
- **Timeline-based Editing**: Intuitive timeline interface for precise control
- **Text Overlays**: Add customizable text with various fonts, sizes, colors, and animations
- **Image Overlays**: Position, resize, and style images over your videos
- **Position Controls**: Precise X/Y positioning for all overlay elements
- **Transformation Tools**: Scale, rotate, and adjust opacity of media elements

### 🎭 Styling Options
- **Text Styling**: Font selection, size control, color picker, and alignment options
- **Image Effects**: Apply filters, borders, and transformations to images
- **Animation Controls**: Add entrance and exit animations to elements

### 🔍 Preview
- **Real-time Preview**: See your edits instantly in the preview window
- **Timeline Scrubbing**: Navigate through your video with frame accuracy
- **Playback Controls**: Play, pause, and navigate with standard video controls

### 💾 Export Options
- **Video Export**: Export your creation as MP4 video
- **Quality Settings**: Control resolution and quality of exports

## 🚀 Getting Started

### Prerequisites
- Node.js 16.8 or later
- npm or yarn package manager

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/video-editor.git
   cd video-editor
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to start using the application.

## 📖 Usage Guide

### Basic Workflow

1. **Upload Media**: Use the Media tab to upload your video and image files
2. **Add Overlays**: Select the Text or Image tab to add overlays to your video
3. **Position Elements**: Use the Position tab to precisely place your elements
4. **Style Elements**: Customize your elements with the Transform and Filters tabs
5. **Set Timing**: Adjust when elements appear and disappear with the Timing tab
6. **Preview**: Use the video preview to see how your project looks
7. **Export**: When you're satisfied, export your final video

### Creating Text Overlays

![Text Overlay Editor](screenshots/text-overlay.png)

1. Click the "Text" tab in the sidebar
2. Click "Add Text" to create a new text element
3. Type your desired text
4. Use the Transform, Position, Style, and Timing tabs to customize your text
5. Drag the text directly in the preview to position it

### Adding Image Overlays

![Image Overlay Editor](screenshots/image-overlay.png)

1. Click the "Image" tab in the sidebar
2. Upload an image or select one from your library
3. Use the Transform, Position, Filters, and Timing tabs to customize your image
4. Drag the image directly in the preview to position it

### Timeline Editing

![Timeline Interface](screenshots/timeline.png)

1. Use the timeline at the bottom to navigate your video
2. Drag elements on the timeline to adjust their start and end times
3. Use the playback controls to preview your video

## 🛠️ Tech Stack

- **Frontend Framework**: Next.js 14 with App Router
- **UI Library**: React 18
- **Type System**: TypeScript
- **State Management**: Redux Toolkit
- **Styling**: Tailwind CSS
- **Media Playback**: React Player
- **File Handling**: React Dropzone
- **Drag and Drop**: React Beautiful DnD

## 🗂️ Project Structure

```
video-editor/
├── app/
│   ├── components/
│   │   ├── MediaLibrary.tsx     # Media asset management
│   │   ├── VideoPreview.tsx     # Preview window with overlay rendering
│   │   ├── Timeline.tsx         # Timeline editor component
│   │   ├── TextOverlay.tsx      # Text overlay editor
│   │   ├── ImageOverlay.tsx     # Image overlay editor
│   │   └── ui/                  # Shared UI components
│   ├── store/
│   │   ├── store.ts             # Redux store configuration
│   │   ├── videoSlice.ts        # Video state management
│   │   └── effectsSlice.ts      # Overlay and effects state management
│   ├── types/                   # TypeScript type definitions
│   ├── lib/                     # Utility functions
│   └── page.tsx                 # Main application page
├── public/                      # Static assets
└── package.json                 # Project dependencies
```

## 🧩 Component Overview

- **MediaLibrary**: Manages the upload and selection of media assets
- **VideoPreview**: Renders the video with all overlays and provides playback controls
- **Timeline**: Provides a timeline interface for navigating and editing the video
- **TextOverlay**: Editor for adding and customizing text overlays
- **ImageOverlay**: Editor for adding and customizing image overlays

## 🔄 State Management

The application uses Redux Toolkit for state management with the following main slices:

- **videoSlice**: Manages the current video, playback state, and timeline information
- **effectsSlice**: Manages all overlay elements including text, images, and their properties

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- [Next.js](https://nextjs.org/)
- [React](https://reactjs.org/)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Lucide Icons](https://lucide.dev/)
