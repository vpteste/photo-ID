import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ImageFilters, Crop, HistoryState } from '../types';
import ControlPanel from './ControlPanel';
import { enhancePhotoWithAI } from '../services/geminiService';
import { DownloadIcon, FitScreenIcon, ZoomInIcon, ZoomOutIcon } from './icons';
import RequirementsGuide from './RequirementsGuide';

interface ImageEditorProps {
  imageFile: File;
  onReset: () => void;
}

const DEFAULT_FILTERS: ImageFilters = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
};

const RESIZE_HANDLE_SIZE = 10;
const MIN_CROP_DIMENSION = 50;

const PHOTO_ID_SIZE_MM = { width: 35, height: 45 };

type AiEnhanceStatus = 'idle' | 'enhancing';

const ImageEditor: React.FC<ImageEditorProps> = ({ imageFile, onReset: resetUploader }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [currentImage, setCurrentImage] = useState<HTMLImageElement | null>(null);
  const [filters, setFilters] = useState<ImageFilters>(DEFAULT_FILTERS);
  const [aiEnhanceStatus, setAiEnhanceStatus] = useState<AiEnhanceStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  
  // Photo Sheet Modal
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const sheetCanvasRef = useRef<HTMLCanvasElement>(null);
  const sheetContainerRef = useRef<HTMLDivElement>(null);
  const [photoSheetCount, setPhotoSheetCount] = useState(8);
  const [sheetZoom, setSheetZoom] = useState(1);
  const [sheetPan, setSheetPan] = useState({ x: 0, y: 0 });
  const [isSheetPanning, setIsSheetPanning] = useState(false);
  const [sheetPanStart, setSheetPanStart] = useState({ x: 0, y: 0 });


  // History state for undo/redo
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Cropping state
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState<Crop | null>(null);
  const [aspectRatio, setAspectRatio] = useState(35 / 45); // Passport aspect ratio
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [showCropGuides, setShowCropGuides] = useState(true);
  const [showBiometricGuides, setShowBiometricGuides] = useState(false);
  const [rotation, setRotation] = useState(0);
  
  // Zoom and Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  const handleFitScreen = useCallback((imageOverride?: HTMLImageElement) => {
    const canvas = canvasRef.current;
    const image = imageOverride || currentImage;
    if (!canvas || !image) return;

    const scale = Math.min(canvas.width / image.width, canvas.height / image.height);
    const newPan = {
        x: (canvas.width - image.width * scale) / 2,
        y: (canvas.height - image.height * scale) / 2
    };
    setZoom(scale);
    setPan(newPan);
    return { zoom: scale, pan: newPan };
  }, [currentImage]);

  const saveState = useCallback((newState: Omit<HistoryState, 'zoom' | 'pan'>) => {
    setHistory(currentHistory => {
        const newHistory = currentHistory.slice(0, historyIndex + 1);
        newHistory.push({ ...newState, zoom, pan });
        return newHistory;
    });
    setHistoryIndex(prevIndex => prevIndex + 1);
  }, [historyIndex, zoom, pan]);

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Set image state
        setOriginalImage(img);
        setCurrentImage(img);
        setFilters(DEFAULT_FILTERS);
        setRotation(0);

        // Calculate and set initial zoom/pan to fit screen
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        const initialPan = {
            x: (canvas.width - img.width * scale) / 2,
            y: (canvas.height - img.height * scale) / 2
        };
        setZoom(scale);
        setPan(initialPan);

        // Create initial history state
        const initialState: HistoryState = {
            image: img,
            originalImage: img,
            filters: DEFAULT_FILTERS,
            zoom: scale,
            pan: initialPan,
        };
        setHistory([initialState]);
        setHistoryIndex(0);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(imageFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageFile]);


  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !currentImage) return;

    const container = containerRef.current;
    if (!container) return;

    if (canvas.width !== container.clientWidth || canvas.height !== container.clientHeight) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the main image
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Apply rotation around the image center
    ctx.translate(currentImage.width / 2, currentImage.height / 2);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.translate(-currentImage.width / 2, -currentImage.height / 2);

    ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%)`;
    ctx.drawImage(currentImage, 0, 0, currentImage.width, currentImage.height);
    ctx.restore();
    
    if (isCropping && crop) {
      // Draw semi-transparent overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // "Cut out" the crop area by re-drawing the image inside it
      ctx.save();
      ctx.beginPath();
      ctx.rect(crop.x, crop.y, crop.width, crop.height);
      ctx.clip();
      
      ctx.save()
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);
      
      // Apply rotation around the image center again for the cutout
      ctx.translate(currentImage.width / 2, currentImage.height / 2);
      ctx.rotate(rotation * Math.PI / 180);
      ctx.translate(-currentImage.width / 2, -currentImage.height / 2);

      ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%)`;
      ctx.drawImage(currentImage, 0, 0, currentImage.width, currentImage.height);
      ctx.restore();

      ctx.restore(); // remove clip

      // Draw crop border
      ctx.strokeStyle = '#0ea5e9';
      ctx.lineWidth = 2;
      ctx.strokeRect(crop.x, crop.y, crop.width, crop.height);
      
      // Draw resize handles
      ctx.fillStyle = '#0ea5e9';
      const handleSize = RESIZE_HANDLE_SIZE;
      const halfHandle = handleSize / 2;
      ctx.fillRect(crop.x - halfHandle, crop.y - halfHandle, handleSize, handleSize); // tl
      ctx.fillRect(crop.x + crop.width - halfHandle, crop.y - halfHandle, handleSize, handleSize); // tr
      ctx.fillRect(crop.x - halfHandle, crop.y + crop.height - halfHandle, handleSize, handleSize); // bl
      ctx.fillRect(crop.x + crop.width - halfHandle, crop.y + crop.height - halfHandle, handleSize, handleSize); // br

      // Draw guides
      if(showCropGuides) {
        ctx.save();
        
        const drawGuideZone = (y_percent_start: number, y_percent_end: number, color: string, label: string) => {
          const y_start = crop.y + crop.height * y_percent_start;
          const y_end = crop.y + crop.height * y_percent_end;
          
          ctx.fillStyle = color;
          ctx.fillRect(crop.x, y_start, crop.width, y_end - y_start);
          
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);

          ctx.beginPath();
          ctx.moveTo(crop.x, y_start);
          ctx.lineTo(crop.x + crop.width, y_start);
          ctx.moveTo(crop.x, y_end);
          ctx.lineTo(crop.x + crop.width, y_end);
          ctx.stroke();
          
          ctx.fillStyle = 'rgba(255, 255, 255, 1)';
          ctx.font = 'bold 12px sans-serif';
          ctx.shadowColor = 'black';
          ctx.shadowBlur = 2;
          ctx.textAlign = 'left';
          const textY = y_start + (y_end - y_start) / 2 + 4;
          ctx.fillText(label, crop.x + 10, textY);
        };
        
        drawGuideZone(0.1, 0.2, 'rgba(0, 255, 255, 0.15)', "Haut de la tête");
        drawGuideZone(0.35, 0.5, 'rgba(0, 255, 0, 0.15)', "Yeux");
        drawGuideZone(0.8, 0.9, 'rgba(255, 255, 0, 0.15)', "Menton");
        
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.setLineDash([4, 4]);
        const centerX = crop.x + crop.width / 2;
        ctx.moveTo(centerX, crop.y);
        ctx.lineTo(centerX, crop.y + crop.height);
        ctx.stroke();
        
        ctx.restore();
      }

      if (showBiometricGuides) {
        ctx.save();

        const totalHeightMM = 45;
        const topHairMarginMM = 3;
        const headHeightMM = 34.5;

        const topHairY = crop.y + (topHairMarginMM / totalHeightMM) * crop.height;
        const chinY = topHairY + (headHeightMM / totalHeightMM) * crop.height;

        ctx.strokeStyle = 'rgba(255, 100, 100, 0.9)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);

        // Draw top hair line
        ctx.beginPath();
        ctx.moveTo(crop.x, topHairY);
        ctx.lineTo(crop.x + crop.width, topHairY);
        ctx.stroke();

        // Draw chin line
        ctx.beginPath();
        ctx.moveTo(crop.x, chinY);
        ctx.lineTo(crop.x + crop.width, chinY);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 100, 100, 1)';
        ctx.font = 'bold 12px sans-serif';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 4;
        ctx.textAlign = 'right';

        ctx.fillText("Haut des cheveux", crop.x + crop.width - 10, topHairY - 5);
        ctx.fillText("Menton", crop.x + crop.width - 10, chinY + 15);
        
        ctx.restore();
      }
    }
  }, [currentImage, filters, isCropping, crop, showCropGuides, showBiometricGuides, pan, zoom, rotation]);

  const initializeCrop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentImage) return;

    let newCropWidth, newCropHeight;
    const padding = 0.9; 

    if ((canvas.width / canvas.height) > aspectRatio) {
        newCropHeight = canvas.height * padding;
        newCropWidth = newCropHeight * aspectRatio;
    } else {
        newCropWidth = canvas.width * padding;
        newCropHeight = newCropWidth / aspectRatio;
    }

    const x = (canvas.width - newCropWidth) / 2;
    const y = (canvas.height - newCropHeight) / 2;

    setCrop({ x, y, width: newCropWidth, height: newCropHeight });
  }, [aspectRatio, currentImage]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  useEffect(() => {
    if (isCropping) {
      initializeCrop();
    } else {
      setCrop(null);
      setRotation(0);
    }
  }, [isCropping, aspectRatio, initializeCrop]);
  
  // Unified Interaction events (Pan, Zoom, Crop Resize)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getMousePos = (e: MouseEvent | TouchEvent) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const getHandleAtPos = (pos: {x: number, y: number}) => {
        if (!crop) return null;
        const { x, y, width, height } = crop;
        const handleSize = RESIZE_HANDLE_SIZE * 1.5; // Larger hit area
        if (pos.x >= x - handleSize && pos.x <= x + handleSize && pos.y >= y - handleSize && pos.y <= y + handleSize) return 'tl';
        if (pos.x >= x + width - handleSize && pos.x <= x + width + handleSize && pos.y >= y - handleSize && pos.y <= y + handleSize) return 'tr';
        if (pos.x >= x - handleSize && pos.x <= x + handleSize && pos.y >= y + height - handleSize && pos.y <= y + height + handleSize) return 'bl';
        if (pos.x >= x + width - handleSize && pos.x <= x + width + handleSize && pos.y >= y + height - handleSize && pos.y <= y + height + handleSize) return 'br';
        return null;
    }

    const handleMouseDown = (e: MouseEvent) => {
        if (e.button !== 0) return; // Only left click
        const pos = getMousePos(e);
        if (isCropping && crop) {
            const handle = getHandleAtPos(pos);
            if (handle) {
                setResizeHandle(handle);
                return;
            }
        }
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        canvas.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e: MouseEvent) => {
        const pos = getMousePos(e);
        
        if (resizeHandle && isCropping && crop) {
            let { x, y, width, height } = crop;
            const right = x + width;
            const bottom = y + height;

            let newWidth = width;
            let newHeight = height;

            switch(resizeHandle) {
                case 'br': newWidth = pos.x - x; break;
                case 'bl': newWidth = right - pos.x; x = pos.x; break;
                case 'tr': newWidth = pos.x - x; y = pos.y; break;
                case 'tl': newWidth = right - pos.x; x = pos.x; y = pos.y; break;
            }

            newHeight = newWidth / aspectRatio;
            if (resizeHandle.includes('t')) y = bottom - newHeight;

            if (newWidth >= MIN_CROP_DIMENSION && newHeight >= MIN_CROP_DIMENSION) {
                setCrop({ x, y, width: newWidth, height: newHeight });
            }

        } else if (isPanning) {
            setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
        } else { // Update cursor
            if (isCropping && crop) {
                const handle = getHandleAtPos(pos);
                if (handle) {
                    canvas.style.cursor = `${handle === 'tl' || handle === 'br' ? 'nwse-resize' : 'nesw-resize'}`;
                } else {
                    canvas.style.cursor = 'move';
                }
            } else {
                canvas.style.cursor = 'grab';
            }
        }
    };

    const handleMouseUp = () => {
        if(isPanning) setIsPanning(false);
        if(resizeHandle) setResizeHandle(null);
    };
    
    const handleMouseLeave = () => {
      if(isPanning) setIsPanning(false);
      if(resizeHandle) setResizeHandle(null);
    }

    const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        const scaleAmount = 1.1;
        const newZoom = e.deltaY > 0 ? zoom / scaleAmount : zoom * scaleAmount;
        
        const mousePos = getMousePos(e);
        const newPanX = mousePos.x - (mousePos.x - pan.x) * (newZoom / zoom);
        const newPanY = mousePos.y - (mousePos.y - pan.y) * (newZoom / zoom);

        setZoom(newZoom);
        setPan({x: newPanX, y: newPanY});
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('wheel', handleWheel);
    
    return () => {
        canvas.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mouseup', handleMouseUp);
        canvas.removeEventListener('mouseleave', handleMouseLeave);
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('wheel', handleWheel);
        canvas.style.cursor = 'default';
    };
  }, [isCropping, crop, isPanning, pan, panStart, zoom, resizeHandle, aspectRatio]);


  useEffect(() => {
    const handleResize = () => {
        if(isCropping) initializeCrop();
        else handleFitScreen();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isCropping, initializeCrop, handleFitScreen]);


  const handleFilterChange = (filter: keyof ImageFilters, value: number) => {
    setFilters((prev) => ({ ...prev, [filter]: value }));
  };
  
  const handleFilterCommit = () => {
    if (!currentImage || !originalImage) return;
    const currentState = history[historyIndex];
    if (currentState && JSON.stringify(currentState.filters) === JSON.stringify(filters)) {
      return;
    }
    saveState({ image: currentImage, originalImage, filters });
  };

  const getCanvasWithCurrentState = (includeFilters = true, fillBackground = false): HTMLCanvasElement | null => {
    const imageToProcess = currentImage;
    if (!imageToProcess) return null;

    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return null;
    
    tempCanvas.width = imageToProcess.width;
    tempCanvas.height = imageToProcess.height;

    if (fillBackground) {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    }
    
    if (includeFilters) {
      ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%)`;
    }
    
    ctx.drawImage(imageToProcess, 0, 0);
    return tempCanvas;
  }
  
  const handleAiEnhance = async () => {
    const canvas = getCanvasWithCurrentState(false); 
    if (!canvas) return;

    setAiEnhanceStatus('enhancing');
    setError(null);

    try {
        const dataUrl = canvas.toDataURL(imageFile.type);
        const base64Image = dataUrl.split(',')[1];
        
        const enhancedBase64 = await enhancePhotoWithAI(base64Image, imageFile.type, 'medium');

        const finalImage = new Image();
        finalImage.onload = () => {
            setOriginalImage(finalImage);
            setCurrentImage(finalImage);
            setFilters(DEFAULT_FILTERS);
            setIsCropping(false);
            setRotation(0);
            handleFitScreen(finalImage);
            saveState({
                image: finalImage,
                originalImage: finalImage,
                filters: DEFAULT_FILTERS,
            });
        };
        finalImage.src = `data:${imageFile.type};base64,${enhancedBase64}`;

    } catch (e) {
        setError((e as Error).message);
    } finally {
        setAiEnhanceStatus('idle');
    }
  };


  const handleDownload = () => {
    const finalCanvas = getCanvasWithCurrentState(true, true); // Fill background for JPEG
    if (!finalCanvas) return;

    const link = document.createElement('a');
    link.download = `photo-identite-${Date.now()}.jpg`;
    link.href = finalCanvas.toDataURL('image/jpeg', 1.0);
    link.click();
  };
  
  const handleResetImage = () => {
    if (originalImage) {
        setCurrentImage(originalImage);
        setFilters(DEFAULT_FILTERS);
        setError(null);
        setRotation(0);
        handleFitScreen(originalImage);
        saveState({ image: originalImage, originalImage, filters: DEFAULT_FILTERS });
    }
  };

  const handleToggleCrop = () => {
    setIsCropping(prev => !prev);
  };

  const handleApplyCrop = () => {
    if (!crop || !currentImage) return;

    const targetWidth = Math.round(crop.width / zoom);
    const targetHeight = Math.round(crop.height / zoom);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = targetWidth;
    tempCanvas.height = targetHeight;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;
    
    // Fill with white to avoid black background on rotation
    tempCtx.fillStyle = 'white';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    const sourceX = (crop.x - pan.x) / zoom;
    const sourceY = (crop.y - pan.y) / zoom;
    
    // Position the context to the center for rotation
    tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
    tempCtx.rotate(rotation * Math.PI / 180);
    tempCtx.translate(-tempCanvas.width / 2, -tempCanvas.height / 2);

    tempCtx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%)`;
    
    tempCtx.drawImage(
      currentImage, 
      sourceX, sourceY, // Top-left corner of the source rectangle
      targetWidth, targetHeight, // Size of the source rectangle
      0, 0, // Top-left corner of the destination rectangle
      targetWidth, targetHeight // Size of the destination rectangle
    );


    const croppedDataUrl = tempCanvas.toDataURL(imageFile.type);
    const croppedImage = new Image();
    croppedImage.onload = () => {
        setOriginalImage(croppedImage);
        setCurrentImage(croppedImage);
        setFilters(DEFAULT_FILTERS);
        setIsCropping(false);
        setRotation(0);
        handleFitScreen(croppedImage);
        saveState({ 
          image: croppedImage, 
          originalImage: croppedImage, 
          filters: DEFAULT_FILTERS 
        });
    };
    croppedImage.src = croppedDataUrl;
  };

  const restoreState = (index: number) => {
    const stateToRestore = history[index];
    if (stateToRestore) {
        setCurrentImage(stateToRestore.image);
        setOriginalImage(stateToRestore.originalImage);
        setFilters(stateToRestore.filters);
        setZoom(stateToRestore.zoom);
        setPan(stateToRestore.pan);
        setHistoryIndex(index);
    }
  }
  const canUndo = historyIndex > 0;
  const canRedo = history.length > 1 && historyIndex < history.length - 1;

  const handleUndo = () => canUndo && restoreState(historyIndex - 1);
  const handleRedo = () => canRedo && restoreState(historyIndex + 1);

  const mmToPx = (mm: number, dpi: number) => (mm / 25.4) * dpi;

  const drawPhotoSheet = useCallback(() => {
    const sheetCanvas = sheetCanvasRef.current;
    const finalImageCanvas = getCanvasWithCurrentState();
    if (!sheetCanvas || !finalImageCanvas) return;
    
    const DPI = 300; // Standard print quality
    const photoWidthPx = mmToPx(PHOTO_ID_SIZE_MM.width, DPI);
    const photoHeightPx = mmToPx(PHOTO_ID_SIZE_MM.height, DPI);
    const gap = mmToPx(5, DPI); // 5mm gap
    const margin = mmToPx(10, DPI); // 10mm margin

    // Arrange photos in a single horizontal row.
    const numCols = photoSheetCount;
    const numRows = 1;
    
    const totalWidth = (numCols * photoWidthPx) + ((numCols - 1) * gap) + (2 * margin);
    const totalHeight = (numRows * photoHeightPx) + ((numRows - 1) * gap) + (2 * margin);
    
    sheetCanvas.width = totalWidth;
    sheetCanvas.height = totalHeight;

    const ctx = sheetCanvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, sheetCanvas.width, sheetCanvas.height);
    
    for (let i = 0; i < photoSheetCount; i++) {
        const row = Math.floor(i / numCols);
        const col = i % numCols;

        const x = margin + col * (photoWidthPx + gap);
        const y = margin + row * (photoHeightPx + gap);
        ctx.drawImage(finalImageCanvas, x, y, photoWidthPx, photoHeightPx);
        
        ctx.strokeStyle = '#000000'; // Black border
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, photoWidthPx, photoHeightPx);
    }
  }, [getCanvasWithCurrentState, photoSheetCount]);
  
  const handleFitSheet = useCallback(() => {
    const canvas = sheetCanvasRef.current;
    const container = sheetContainerRef.current;
    if (!canvas || !container) return;

    const scale = Math.min(container.clientWidth / canvas.width, container.clientHeight / canvas.height);
    setSheetZoom(scale);
    setSheetPan({
      x: (container.clientWidth - canvas.width * scale) / 2,
      y: (container.clientHeight - canvas.height * scale) / 2,
    });
  }, []);
  
  useEffect(() => {
      if (isSheetModalOpen) {
          drawPhotoSheet();
          setTimeout(handleFitSheet, 50); // Fit after render
      }
  }, [isSheetModalOpen, drawPhotoSheet, photoSheetCount, handleFitSheet]);
  
  useEffect(() => {
    if (!isSheetModalOpen) return;

    const container = sheetContainerRef.current;
    if (!container) return;

    const getMousePos = (e: MouseEvent) => {
        const rect = container.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handleMouseDown = (e: MouseEvent) => {
        if (e.button !== 0) return;
        setIsSheetPanning(true);
        setSheetPanStart({ x: e.clientX - sheetPan.x, y: e.clientY - sheetPan.y });
        container.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (isSheetPanning) {
            setSheetPan({ x: e.clientX - sheetPanStart.x, y: e.clientY - sheetPanStart.y });
        }
    };

    const handleMouseUpOrLeave = () => {
        setIsSheetPanning(false);
        container.style.cursor = 'grab';
    };

    const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        const scaleAmount = 1.1;
        const newZoom = e.deltaY > 0 ? sheetZoom / scaleAmount : sheetZoom * scaleAmount;
        
        const mousePos = getMousePos(e);
        const newPanX = mousePos.x - (mousePos.x - sheetPan.x) * (newZoom / sheetZoom);
        const newPanY = mousePos.y - (mousePos.y - sheetPan.y) * (newZoom / sheetZoom);

        setSheetZoom(newZoom);
        setSheetPan({x: newPanX, y: newPanY});
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUpOrLeave);
    container.addEventListener('mouseleave', handleMouseUpOrLeave);
    container.addEventListener('wheel', handleWheel);

    return () => {
        container.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUpOrLeave);
        container.removeEventListener('mouseleave', handleMouseUpOrLeave);
        container.removeEventListener('wheel', handleWheel);
    };
  }, [isSheetModalOpen, isSheetPanning, sheetPan, sheetPanStart, sheetZoom]);


  const handleDownloadSheet = () => {
    const canvas = sheetCanvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `planche-photo-identite-${Date.now()}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 1.0);
    link.click();
  };

  return (
    <div className="w-full h-full flex flex-col lg:flex-row gap-8 p-4">
      <div ref={containerRef} className="flex-grow w-full lg:w-2/3 h-[50vh] lg:h-auto bg-gray-900/50 rounded-lg flex items-center justify-center p-2 border border-gray-700 overflow-hidden select-none">
          <canvas ref={canvasRef} className="max-w-full max-h-full rounded-md" />
      </div>
      <div className="w-full lg:w-1/3 flex flex-col gap-4">
        <ControlPanel
          filters={filters}
          onFilterChange={handleFilterChange}
          onFilterCommit={handleFilterCommit}
          onDownload={handleDownload}
          onReset={handleResetImage}
          isCropping={isCropping}
          onToggleCrop={handleToggleCrop}
          onApplyCrop={handleApplyCrop}
          onAspectRatioChange={setAspectRatio}
          aspectRatio={aspectRatio}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          showCropGuides={showCropGuides}
          onShowCropGuidesChange={setShowCropGuides}
          showBiometricGuides={showBiometricGuides}
          onShowBiometricGuidesChange={setShowBiometricGuides}
          onPhotoSheet={() => setIsSheetModalOpen(true)}
          onZoomIn={() => setZoom(z => z * 1.2)}
          onZoomOut={() => setZoom(z => z / 1.2)}
          onFitScreen={() => handleFitScreen()}
          rotation={rotation}
          onRotationChange={setRotation}
          aiEnhanceStatus={aiEnhanceStatus}
          onAiEnhance={handleAiEnhance}
        />
        <RequirementsGuide />
         <button
            onClick={resetUploader}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-gray-900 transition-colors"
          >
            Changer d'image
        </button>
        {error && <div className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-md text-sm">{error}</div>}
      </div>

      {isSheetModalOpen && (
         <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setIsSheetModalOpen(false)}>
          <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-4xl h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h3 className="text-xl font-semibold">Préparer la Planche Photo</h3>
              <div className="flex items-center gap-2">
                 <button onClick={() => setSheetZoom(z => z / 1.2)} className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"><ZoomOutIcon className="w-5 h-5" /></button>
                 <button onClick={handleFitSheet} className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"><FitScreenIcon className="w-5 h-5" /></button>
                 <button onClick={() => setSheetZoom(z => z * 1.2)} className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"><ZoomInIcon className="w-5 h-5" /></button>
                 <button onClick={() => setIsSheetModalOpen(false)} className="text-gray-400 hover:text-white text-3xl ml-4">&times;</button>
              </div>
            </div>
            <div className="flex-grow flex flex-col lg:flex-row gap-4 overflow-hidden">
              <div ref={sheetContainerRef} className="flex-grow bg-gray-900 p-2 rounded-md border border-gray-700 overflow-hidden cursor-grab active:cursor-grabbing">
                <canvas ref={sheetCanvasRef} style={{ transform: `translate(${sheetPan.x}px, ${sheetPan.y}px) scale(${sheetZoom})`, transformOrigin: 'top left' }} />
              </div>
               <div className="flex flex-col gap-4 lg:w-64 flex-shrink-0">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Nombre de photos</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setPhotoSheetCount(4)}
                        className={`px-3 py-2 text-sm rounded-md transition-colors ${photoSheetCount === 4 ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
                      >
                        4 Photos
                      </button>
                      <button
                        onClick={() => setPhotoSheetCount(8)}
                        className={`px-3 py-2 text-sm rounded-md transition-colors ${photoSheetCount === 8 ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
                      >
                        8 Photos
                      </button>
                    </div>
                  </div>
                   <button
                    onClick={handleDownloadSheet}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-900 transition-colors mt-auto"
                  >
                    <DownloadIcon className="w-5 h-5" />
                    Télécharger la Planche
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageEditor;
