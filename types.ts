export interface ImageFilters {
  brightness: number;
  contrast: number;
  saturate: number;
}

export interface Crop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type AiIntensity = 'light' | 'medium' | 'strong';

export interface HistoryState {
  image: HTMLImageElement;
  originalImage: HTMLImageElement;
  filters: ImageFilters;
  zoom: number;
  pan: { x: number; y: number };
}

export interface FaceLandmarks {
  topOfHead: { x: number; y: number };
  chin: { x: number; y: number };
}
