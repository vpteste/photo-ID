import React from 'react';
import { ImageFilters } from '../types';
import { SparklesIcon, DownloadIcon, ResetIcon, CropIcon, UndoIcon, RedoIcon, LayoutIcon, ZoomInIcon, ZoomOutIcon, FitScreenIcon } from './icons';

type AiEnhanceStatus = 'idle' | 'enhancing';

interface ControlPanelProps {
  filters: ImageFilters;
  onFilterChange: (filter: keyof ImageFilters, value: number) => void;
  onFilterCommit: () => void;
  onDownload: () => void;
  onReset: () => void;
  isCropping: boolean;
  onToggleCrop: () => void;
  onApplyCrop: () => void;
  onAspectRatioChange: (aspectRatio: number) => void;
  aspectRatio: number;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  showCropGuides: boolean;
  onShowCropGuidesChange: (show: boolean) => void;
  showBiometricGuides: boolean;
  onShowBiometricGuidesChange: (show: boolean) => void;
  onPhotoSheet: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitScreen: () => void;
  rotation: number;
  onRotationChange: (angle: number) => void;
  aiEnhanceStatus: AiEnhanceStatus;
  onAiEnhance: () => void;
}

const Slider: React.FC<{label: string, value: number, min: number, max: number, step: number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, onMouseUp?: () => void, onTouchEnd?: () => void}> = ({ label, ...props }) => (
    <div>
        <label htmlFor={label} className="block text-sm font-medium text-gray-400">{label}</label>
        <input
            id={label}
            type="range"
            {...props}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-lg accent-blue-500"
        />
    </div>
);

const LoadingSpinner: React.FC = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const ControlPanel: React.FC<ControlPanelProps> = ({
  filters,
  onFilterChange,
  onFilterCommit,
  onDownload,
  onReset,
  isCropping,
  onToggleCrop,
  onApplyCrop,
  onAspectRatioChange,
  aspectRatio,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  showCropGuides,
  onShowCropGuidesChange,
  showBiometricGuides,
  onShowBiometricGuidesChange,
  onPhotoSheet,
  onZoomIn,
  onZoomOut,
  onFitScreen,
  rotation,
  onRotationChange,
  aiEnhanceStatus,
  onAiEnhance,
}) => {
  const isEnhancing = aiEnhanceStatus !== 'idle';
  const anyLoading = isEnhancing;

  const getEnhanceButtonText = () => {
    switch (aiEnhanceStatus) {
      case 'enhancing':
        return "Retouche IA en cours...";
      case 'idle':
      default:
        return "Retouche IA";
    }
  };


  return (
    <div className="w-full bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 shadow-lg">
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-center">Panneau de Contrôle</h3>
        
        <div className="flex justify-center items-center gap-2 border-b border-gray-700 pb-4">
            <button onClick={onZoomOut} disabled={isCropping || anyLoading} className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 transition-colors">
                <ZoomOutIcon className="w-5 h-5" />
            </button>
            <button onClick={onFitScreen} disabled={isCropping || anyLoading} className="px-3 py-2 text-sm rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50 transition-colors">
                Ajuster
            </button>
            <button onClick={onZoomIn} disabled={isCropping || anyLoading} className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 transition-colors">
                <ZoomInIcon className="w-5 h-5" />
            </button>
        </div>

        <fieldset
          disabled={isCropping || anyLoading}
          className="space-y-4 transition-opacity duration-300"
          style={{opacity: isCropping || anyLoading ? 0.5 : 1}}
        >
          <Slider
            label="Luminosité"
            value={filters.brightness}
            onChange={(e) => onFilterChange('brightness', parseFloat(e.target.value))}
            onMouseUp={onFilterCommit} onTouchEnd={onFilterCommit}
            min={0} max={200} step={1}
          />
          <Slider
            label="Contraste"
            value={filters.contrast}
            onChange={(e) => onFilterChange('contrast', parseFloat(e.target.value))}
             onMouseUp={onFilterCommit} onTouchEnd={onFilterCommit}
            min={0} max={200} step={1}
          />
          <Slider
            label="Saturation"
            value={filters.saturate}
            onChange={(e) => onFilterChange('saturate', parseFloat(e.target.value))}
             onMouseUp={onFilterCommit} onTouchEnd={onFilterCommit}
            min={0} max={200} step={1}
          />
        </fieldset>

        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isCropping ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
           <div className="border-t border-gray-700 pt-4 mt-4 space-y-4">
            <h4 className="text-md font-semibold text-center">Options de Recadrage</h4>
             <Slider
                label={`Rotation: ${rotation.toFixed(1)}°`}
                value={rotation}
                onChange={(e) => onRotationChange(parseFloat(e.target.value))}
                min={-10} max={10} step={0.1}
             />
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Format</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onAspectRatioChange(35 / 45)}
                  className={`px-3 py-2 text-sm rounded-md transition-colors ${aspectRatio === (35 / 45) ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
                >ID / Passeport (35:45)</button>
                <button
                  onClick={() => onAspectRatioChange(1)}
                  className={`px-3 py-2 text-sm rounded-md transition-colors ${aspectRatio === 1 ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
                >Carré (1:1)</button>
              </div>
            </div>
             <div className="flex flex-col items-center justify-center pt-2 space-y-2">
              <div className="flex items-center">
                <input
                  id="show-guides"
                  type="checkbox"
                  checked={showCropGuides}
                  onChange={(e) => onShowCropGuidesChange(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
                />
                <label htmlFor="show-guides" className="ml-2 block text-sm text-gray-300">
                  Afficher les guides
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="show-bio-guides"
                  type="checkbox"
                  checked={showBiometricGuides}
                  onChange={(e) => onShowBiometricGuidesChange(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
                />
                <label htmlFor="show-bio-guides" className="ml-2 block text-sm text-gray-300">
                  Guides biométriques (Visa Côte d'Ivoire)
                </label>
              </div>
            </div>
            <button
              onClick={onApplyCrop}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-900 transition-colors"
            >
              <CropIcon className="w-5 h-5"/>
              Appliquer le recadrage
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-700">
           <button
            onClick={onUndo}
            disabled={!canUndo || anyLoading}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 focus:ring-offset-gray-900 transition-colors disabled:opacity-50"
          >
            <UndoIcon className="w-5 h-5"/>
            Annuler
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo || anyLoading}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 focus:ring-offset-gray-900 transition-colors disabled:opacity-50"
          >
            <RedoIcon className="w-5 h-5"/>
            Rétablir
          </button>
          <button
            onClick={onReset}
            disabled={anyLoading || isCropping}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 focus:ring-offset-gray-900 transition-colors disabled:opacity-50"
          >
            <ResetIcon className="w-5 h-5"/>
            Réinitialiser
          </button>
          
          <button
            onClick={onToggleCrop}
            disabled={anyLoading}
            className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors disabled:opacity-50 ${isCropping ? 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500' : 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500'}`}
          >
            <CropIcon className="w-5 h-5"/>
            {isCropping ? "Annuler" : "Recadrer"}
          </button>

          <div className="col-span-2 flex flex-col gap-4">
              <div className="border-t border-gray-700 pt-4 space-y-3">
                  <h4 className="text-md font-semibold text-center">Actions IA</h4>
                  <button
                    onClick={onAiEnhance}
                    disabled={anyLoading || isCropping}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-teal-400 rounded-md hover:from-blue-600 hover:to-teal-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isEnhancing ? <LoadingSpinner/> : <SparklesIcon className="w-5 h-5"/>}
                    {getEnhanceButtonText()}
                  </button>
              </div>
              
               <div className="grid grid-cols-2 gap-3 border-t border-gray-700 pt-4">
                 <button
                    onClick={onPhotoSheet}
                    disabled={anyLoading || isCropping}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-gray-900 transition-colors disabled:opacity-50"
                  >
                    <LayoutIcon className="w-5 h-5" />
                    Planche Photo
                  </button>
                  <button
                    onClick={onDownload}
                    disabled={anyLoading || isCropping}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-900 transition-colors disabled:opacity-50"
                  >
                    <DownloadIcon className="w-5 h-5" />
                    Télécharger
                  </button>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
