import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Save, Plus, Trash2 } from "lucide-react";

const seniorityOptions = [
  { value: "junior", label: "Junior" },
  { value: "medior", label: "Medior" },
  { value: "senior", label: "Senior" },
  { value: "specialista", label: "Specialista" }
];

const countryOptions = [
  "Česká republika",
  "Slovensko",
  "Polsko",
  "Německo",
  "Rakousko",
  "Maďarsko",
  "Itálie",
  "Francie",
  "Jiná země"
];

// Helper function to merge duplicate seniorities
const mergeDuplicateWorkers = (workers) => {
  if (!workers || workers.length === 0) return [];
  
  const merged = {};
  workers.forEach(worker => {
    if (merged[worker.seniority]) {
      merged[worker.seniority].count += worker.count;
    } else {
      merged[worker.seniority] = { ...worker };
    }
  });
  
  return Object.values(merged);
};

export default function ProjectForm({ project, onSubmit, onCancel }) {
  // Merge duplicates when initializing the form
  const initialRequiredWorkers = project?.required_workers ? 
    mergeDuplicateWorkers(project.required_workers) : [];

  const [formData, setFormData] = useState(project || {
    project_number: "",
    name: "",
    location: "",
    country: "Česká republika",
    start_date: "",
    end_date: "",
    priority: "medium",
    status: "preparing",
    required_workers: initialRequiredWorkers,
    required_vehicles: 0,
    budget: "",
    description: "",
  });

  const [customCountry, setCustomCountry] = useState(
    project?.country && !countryOptions.includes(project.country) ? project.country : ""
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Merge any duplicate workers before submitting (safety net)
    const mergedWorkers = mergeDuplicateWorkers(formData.required_workers);
    
    onSubmit({
      ...formData,
      country: formData.country === "Jiná země" && customCountry ? customCountry : formData.country,
      required_workers: mergedWorkers,
      budget: formData.budget ? parseFloat(formData.budget) : undefined,
      required_vehicles: formData.required_vehicles ? parseInt(formData.required_vehicles, 10) : 0,
    });
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleWorkerChange = (index, field, value) => {
    const newWorkers = [...formData.required_workers];
    newWorkers[index] = { ...newWorkers[index], [field]: field === 'count' ? parseInt(value, 10) || 0 : value };
    setFormData(prev => ({ ...prev, required_workers: newWorkers }));
  };
  
  const addWorkerRequirement = () => {
    // Find a seniority that's not already used
    const usedSeniorities = new Set(formData.required_workers.map(w => w.seniority));
    const availableSeniority = seniorityOptions.find(option => !usedSeniorities.has(option.value));
    
    if (availableSeniority) {
      setFormData(prev => ({
        ...prev,
        required_workers: [...(prev.required_workers || []), { seniority: availableSeniority.value, count: 1 }]
      }));
    }
  };

  const removeWorkerRequirement = (index) => {
    setFormData(prev => ({
      ...prev,
      required_workers: prev.required_workers.filter((_, i) => i !== index)
    }));
  };

  // Get available seniority options (exclude already used ones)
  const getAvailableSeniorityOptions = (currentIndex) => {
    const usedSeniorities = new Set(
      formData.required_workers
        .filter((_, index) => index !== currentIndex)
        .map(w => w.seniority)
    );
    return seniorityOptions.filter(option => !usedSeniorities.has(option.value));
  };

  // Check if we can add more worker requirements
  const canAddMoreWorkers = formData.required_workers.length < seniorityOptions.length;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-1 max-h-[80vh] overflow-y-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="project_number">Číslo projektu *</Label>
          <Input 
            id="project_number" 
            value={formData.project_number} 
            onChange={(e) => handleChange("project_number", e.target.value)} 
            required 
            placeholder="např. 25169"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Název projektu *</Label>
          <Input id="name" value={formData.name} onChange={(e) => handleChange("name", e.target.value)} required />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="location">Adresa *</Label>
          <Input id="location" value={formData.location} onChange={(e) => handleChange("location", e.target.value)} required placeholder="např. Cosenza, Itálie" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">Země *</Label>
          <Select value={formData.country} onValueChange={(value) => handleChange("country", value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {countryOptions.map(country => (
                <SelectItem key={country} value={country}>{country}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {formData.country === "Jiná země" && (
            <Input 
              placeholder="Zadejte název země" 
              value={customCountry}
              onChange={(e) => setCustomCountry(e.target.value)}
              className="mt-2"
            />
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_date">Datum zahájení *</Label>
          <Input id="start_date" type="date" value={formData.start_date} onChange={(e) => handleChange("start_date", e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_date">Datum ukončení *</Label>
          <Input id="end_date" type="date" value={formData.end_date} onChange={(e) => handleChange("end_date", e.target.value)} required />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="priority">Priorita</Label>
          <Select value={formData.priority} onValueChange={(value) => handleChange("priority", value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Nízká</SelectItem>
              <SelectItem value="medium">Střední</SelectItem>
              <SelectItem value="high">Vysoká</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Stav</Label>
          <Select value={formData.status} onValueChange={(value) => handleChange("status", value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="preparing">Připravuje se</SelectItem>
              <SelectItem value="in_progress">Běží</SelectItem>
              <SelectItem value="completed">Dokončeno</SelectItem>
              <SelectItem value="paused">Pozastaveno</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="budget">Rozpočet (Kč)</Label>
          <Input id="budget" type="number" value={formData.budget} onChange={(e) => handleChange("budget", e.target.value)} placeholder="např. 150000" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="required_vehicles">Požadovaný počet vozidel</Label>
          <Input 
            id="required_vehicles" 
            type="number" 
            value={formData.required_vehicles} 
            onChange={(e) => handleChange("required_vehicles", parseInt(e.target.value, 10) || 0)} 
            min="0" 
          />
        </div>
      </div>
      <div>
        <Label>Požadovaní pracovníci</Label>
        <div className="space-y-2 mt-2">
          {formData.required_workers?.map((worker, index) => {
            const availableOptions = getAvailableSeniorityOptions(index);
            const currentOption = seniorityOptions.find(opt => opt.value === worker.seniority);
            
            return (
              <div key={index} className="flex items-center gap-2">
                <Select 
                  value={worker.seniority || 'placeholder'} 
                  onValueChange={(v) => v !== 'placeholder' && handleWorkerChange(index, "seniority", v)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {!worker.seniority && <SelectItem value="placeholder" disabled>Vyberte senioritu</SelectItem>}
                    {availableOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                    {/* Always show current selection even if it would be filtered out */}
                    {currentOption && !availableOptions.find(opt => opt.value === worker.seniority) && (
                      <SelectItem value={worker.seniority}>
                        {currentOption.label}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <Input 
                  type="number" 
                  value={worker.count} 
                  onChange={(e) => handleWorkerChange(index, "count", e.target.value)} 
                  className="w-20" 
                  min="1"
                  max="50"
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeWorkerRequirement(index)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            );
          })}
          {canAddMoreWorkers && (
            <Button type="button" variant="outline" size="sm" onClick={addWorkerRequirement}>
              <Plus className="w-4 h-4 mr-2" /> Přidat požadavek
            </Button>
          )}
          {!canAddMoreWorkers && formData.required_workers.length > 0 && (
            <p className="text-sm text-slate-500">Všechny úrovně seniority jsou již použity.</p>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Poznámka</Label>
        <Textarea id="description" value={formData.description} onChange={(e) => handleChange("description", e.target.value)} rows={3} />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Zrušit</Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
          <Save className="w-4 h-4 mr-2" />
          {project ? "Uložit změny" : "Vytvořit projekt"}
        </Button>
      </div>
    </form>
  );
}