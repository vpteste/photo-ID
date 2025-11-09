import React from 'react';
import { DocumentCheckIcon } from './icons';

const RequirementItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between items-center py-2 border-b border-gray-700/50 last:border-b-0">
    <p className="text-sm text-gray-400">{label}</p>
    <p className="text-sm font-medium text-gray-200 text-right">{value}</p>
  </div>
);

const RequirementsGuide: React.FC = () => {
  return (
    <div className="w-full bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 shadow-lg">
      <div className="flex items-center gap-3 mb-4 border-b border-gray-700 pb-3">
        <DocumentCheckIcon className="w-6 h-6 text-blue-400" />
        <h3 className="text-lg font-semibold">Exigences (Visa Côte d'Ivoire)</h3>
      </div>
      <div className="space-y-1">
        <RequirementItem label="Pays" value="Côte d’Ivoire" />
        <RequirementItem label="Type de document" value="Visa" />
        <RequirementItem label="Taille" value="35mm Larg. x 45mm Haut." />
        <RequirementItem label="Hauteur tête" value="34.5mm" />
        <RequirementItem label="Marge (haut)" value="3mm" />
        <RequirementItem label="Fond" value="Blanc, uniforme" />
        <RequirementItem label="Résolution" value="600 DPI" />
        <RequirementItem label="Imprimable" value="Oui" />
      </div>
    </div>
  );
};

export default RequirementsGuide;
