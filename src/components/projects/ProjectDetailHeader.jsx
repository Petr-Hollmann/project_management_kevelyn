
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Users, DollarSign, Car, FileText } from 'lucide-react'; // Added FileText import
import { format } from 'date-fns';
import { Progress } from '@/components/ui/progress';

const statusColors = { preparing: "bg-gray-100 text-gray-800", in_progress: "bg-blue-100 text-blue-800", completed: "bg-green-100 text-green-800", paused: "bg-orange-100 text-orange-800" };
const statusLabels = { preparing: "Připravuje se", in_progress: "Běží", completed: "Dokončeno", paused: "Pozastaveno" };
const priorityColors = { low: "bg-gray-100 text-gray-800", medium: "bg-blue-100 text-blue-800", high: "bg-red-100 text-red-800" };
const priorityLabels = { low: "Nízká", medium: "Střední", high: "Vysoká" };

// Helper function to format description with clickable URLs
const formatDescription = (description) => {
  if (!description) return null;

  // Regex pro detekci URL
  // It captures the URL itself, so we can use it to split and then identify the URL parts
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = description.split(urlRegex);

  return parts.map((part, index) => {
    // Pokud je to URL
    if (part && part.match(urlRegex)) { // Ensure part is not empty before matching
      // Zjistíme, zda je to Google Maps odkaz
      const isGoogleMaps = part.includes('google.com/maps') || part.includes('goo.gl/maps');
      const linkText = isGoogleMaps ? '📍 Zobrazit trasu na mapě' : '🔗 Odkaz';
      
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 hover:underline font-medium inline-flex items-center gap-1"
        >
          {linkText}
        </a>
      );
    }
    // Normální text - zachováme zalomení řádků
    // Use whitespace-pre-wrap to preserve newlines and spaces in text parts
    return <span key={index} className="whitespace-pre-wrap">{part}</span>;
  });
};

export default function ProjectDetailHeader({ project, isInstaller = false, totalCosts, onEdit, onDelete, onShare }) {
  const totalRequiredWorkers = project.required_workers?.reduce((sum, req) => sum + req.count, 0) || 0;
  
  return (
    <Card className="mb-6"> {/* Updated class from shadow-md to mb-6 */}
      <CardHeader>
        <div className="flex items-start justify-between"> {/* Updated class from flex-col md:flex-row justify-between items-start */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge className={statusColors[project.status]}>{statusLabels[project.status]}</Badge>
              <Badge variant="outline" className={priorityColors[project.priority]}>{priorityLabels[project.priority]}</Badge>
            </div>
            <CardTitle className="text-2xl md:text-3xl font-bold text-slate-900">{project.name}</CardTitle>
          </div>
          {/* Action buttons (onEdit, onDelete, onShare) would typically go here if implemented in UI */}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6 text-sm text-slate-600"> {/* Updated grid classes and added mb-6 */}
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-1 text-slate-400" />
            <div>
              <p className="font-medium text-slate-700">Lokalita</p>
              <p>{project.location}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 mt-1 text-slate-400" />
            <div>
              <p className="font-medium text-slate-700">Termín</p>
              <p>{format(new Date(project.start_date), "d.M.yy")} - {format(new Date(project.end_date), "d.M.yy")}</p>
            </div>
          </div>
          {!isInstaller && (
            <>
              <div className="flex items-start gap-2">
                <Users className="w-4 h-4 mt-1 text-slate-400" />
                <div>
                  <p className="font-medium text-slate-700">Požadovaní pracovníci</p>
                  <p>{totalRequiredWorkers} ({project.required_workers?.map(r => `${r.count}x ${r.seniority}`).join(', ') || 'N/A'})</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Car className="w-4 h-4 mt-1 text-slate-400" />
                <div>
                  <p className="font-medium text-slate-700">Požadovaná vozidla</p>
                  <p>{project.required_vehicles || 0}</p>
                </div>
              </div>
            </>
          )}
          {!isInstaller && project.budget && (
            <div className="flex items-start gap-2">
              <DollarSign className="w-4 h-4 mt-1 text-slate-400" />
              <div className="flex-1">
                <p className="font-medium text-slate-700">Rozpočet</p>
                <p>{project.budget.toLocaleString('cs-CZ')} {project.budget_currency || 'CZK'}</p>
                {totalCosts !== undefined && project.budget > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Náklady: {totalCosts.toLocaleString('cs-CZ')} {project.budget_currency || 'CZK'}</span>
                      <span>{Math.round((totalCosts / project.budget) * 100)} %</span>
                    </div>
                    <Progress
                      value={Math.min((totalCosts / project.budget) * 100, 100)}
                      className={
                        totalCosts > project.budget
                          ? '[&>div]:bg-red-500'
                          : totalCosts / project.budget > 0.8
                          ? '[&>div]:bg-orange-400'
                          : '[&>div]:bg-green-500'
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {project.description && (
          <div className="border-t pt-4"> {/* Removed mt-4 */}
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" /> {/* Added FileText icon */}
              Popis projektu
            </h3>
            <div className="text-slate-600 break-words"> {/* Changed p to div and added break-words */}
              {formatDescription(project.description)} {/* Applied formatDescription */}
            </div>
          </div>
        )}

        {/* Placeholder for action buttons from outline, if they were meant to be here */}
        {/* For example:
        <div className="mt-6 flex justify-end gap-2">
          {onEdit && <Button variant="outline" onClick={onEdit}>Upravit</Button>}
          {onDelete && <Button variant="destructive" onClick={onDelete}>Smazat</Button>}
          {onShare && <Button onClick={onShare}>Sdílet</Button>}
        </div>
        */}
      </CardContent>
    </Card>
  );
}
