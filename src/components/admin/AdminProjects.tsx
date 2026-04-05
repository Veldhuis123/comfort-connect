import { useState, useEffect, useRef } from "react";
import { api, Project } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, Trash2, Eye, EyeOff, Pencil, Upload, X, Image as ImageIcon, MapPin, Calendar
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const categoryLabels: Record<string, string> = {
  airco: "Airconditioning",
  warmtepomp: "Warmtepomp",
  elektra: "Elektra",
  zonnepanelen: "Zonnepanelen",
  overig: "Overig",
};

const AdminProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", category: "airco", location: "", completion_date: "", is_visible: true, sort_order: 0
  });
  const [uploading, setUploading] = useState(false);
  const [formFiles, setFormFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formFileInputRef = useRef<HTMLInputElement>(null);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminProjects();
      setProjects(data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchProjects(); }, []);

  const resetForm = () => {
    setForm({ title: "", description: "", category: "airco", location: "", completion_date: "", is_visible: true, sort_order: 0 });
    setEditingProject(null);
    setFormFiles([]);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setForm({
      title: project.title,
      description: project.description || "",
      category: project.category,
      location: project.location || "",
      completion_date: project.completion_date ? project.completion_date.split('T')[0] : "",
      is_visible: project.is_visible,
      sort_order: project.sort_order,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      let projectId: number;
      if (editingProject) {
        await api.updateProject(editingProject.id, { ...form, photos: editingProject.photos });
        projectId = editingProject.id;
      } else {
        const result = await api.createProject(form);
        projectId = result.id;
      }
      // Upload selected photos
      for (const file of formFiles) {
        await api.uploadProjectImage(projectId, file);
      }
      setShowForm(false);
      resetForm();
      fetchProjects();
    } catch { alert("Fout bij opslaan project"); }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Weet je zeker dat je dit project wilt verwijderen?")) {
      try { await api.deleteProject(id); fetchProjects(); } catch { alert("Fout bij verwijderen"); }
    }
  };

  const handleToggle = async (id: number) => {
    try { await api.toggleProjectVisibility(id); fetchProjects(); } catch { alert("Fout bij wijzigen zichtbaarheid"); }
  };

  const handleUploadImage = async (projectId: number) => {
    if (!fileInputRef.current?.files?.length) return;
    setUploading(true);
    try {
      const file = fileInputRef.current.files[0];
      await api.uploadProjectImage(projectId, file);
      fetchProjects();
    } catch { alert("Fout bij uploaden foto"); }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemovePhoto = async (project: Project, photoIndex: number) => {
    const photos = [...(project.photos || [])];
    photos.splice(photoIndex, 1);
    try {
      await api.updateProject(project.id, { ...project, photos });
      fetchProjects();
    } catch { alert("Fout bij verwijderen foto"); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold">Projecten</h1>
          <p className="text-sm text-muted-foreground">Beheer je portfolio met afgeronde projecten</p>
        </div>
        <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Project Toevoegen</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingProject ? "Project Bewerken" : "Nieuw Project"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Titel" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Textarea placeholder="Beschrijving..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input placeholder="Locatie (bijv. Almere)" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              <Input type="date" value={form.completion_date} onChange={(e) => setForm({ ...form, completion_date: e.target.value })} />
              <Input type="number" placeholder="Sorteervolgorde" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
              <Button onClick={handleSave} className="w-full">{editingProject ? "Bijwerken" : "Opslaan"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={() => {
        const projectId = fileInputRef.current?.dataset.projectId;
        if (projectId) handleUploadImage(parseInt(projectId));
      }} />

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <p className="text-muted-foreground">Laden...</p>
          ) : projects.length === 0 ? (
            <p className="text-muted-foreground">Nog geen projecten toegevoegd</p>
          ) : (
            <div className="space-y-4">
              {projects.map((project) => {
                const photos: string[] = typeof project.photos === 'string' ? JSON.parse(project.photos) : (project.photos || []);
                return (
                  <div key={project.id} className="border border-border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">{project.title}</span>
                          <Badge variant="secondary">{categoryLabels[project.category] || project.category}</Badge>
                          {!project.is_visible && <Badge variant="outline">Verborgen</Badge>}
                        </div>
                        {project.description && <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>}
                        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                          {project.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{project.location}</span>}
                          {project.completion_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(project.completion_date).toLocaleDateString('nl-NL')}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(project)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleToggle(project.id)}>
                          {project.is_visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => {
                          if (fileInputRef.current) {
                            fileInputRef.current.dataset.projectId = String(project.id);
                            fileInputRef.current.click();
                          }
                        }} disabled={uploading}>
                          <Upload className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(project.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Photo thumbnails */}
                    {photos.length > 0 && (
                      <div className="flex gap-2 flex-wrap mt-2">
                        {photos.map((photo, i) => (
                          <div key={i} className="relative w-20 h-20 rounded-md overflow-hidden border border-border group">
                            <img src={photo} alt={`Project foto ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                            <button
                              onClick={() => handleRemovePhoto(project, i)}
                              className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {photos.length === 0 && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <ImageIcon className="w-3 h-3" />
                        Nog geen foto's
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminProjects;
