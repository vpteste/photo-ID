import React, { useState } from 'react';
import ImageUploader from './components/ImageUploader';
import ImageEditor from './components/ImageEditor';
import { GithubIcon } from './components/icons';

const App: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleImageUpload = (file: File) => {
    setImageFile(file);
  };

  const handleReset = () => {
    setImageFile(null);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4">
      <header className="w-full max-w-5xl mx-auto p-4 flex justify-center items-center">
        <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">
          Éditeur de Photo d'Identité
        </h1>
      </header>
      <main className="flex-grow w-full max-w-5xl mx-auto flex flex-col items-center justify-start pt-8">
        {!imageFile ? (
          <ImageUploader onImageUpload={handleImageUpload} />
        ) : (
          <ImageEditor imageFile={imageFile} onReset={handleReset} />
        )}
      </main>
      <footer className="w-full max-w-5xl mx-auto p-4 text-center text-gray-500 text-sm">
        <p>Développé PAR E-COM SERVICES</p>
      </footer>
    </div>
  );
};

export default App;