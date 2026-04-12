import { useState, useEffect, useRef, useCallback } from "react";
import { api, Project } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, Trash2, Eye, EyeOff, Pencil, Upload, X, Image as ImageIcon, MapPin, Calendar
} from "lucide-react";

// Compress image before upload (prevents mobile crashes with huge photos)
const compressImage = (file: File, maxWidth = 1920, quality = 0.8): Promise<File> =>
  new Promise((resolve) => {
    // Skip non-image or already small files
    if (!file.type.startsWith('image/') || file.size < 500_000) {
      resolve(file);
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) { resolve(file); return; }
          resolve(new File([blob], file.name, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        quality,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
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

  // Store preview URLs separately so we can revoke them
  const [formPreviews, setFormPreviews] = useState<string[]>([]);

  const resetForm = () => {
    setForm({ title: "", description: "", category: "airco", location: "", completion_date: "", is_visible: true, sort_order: 0 });
    setEditingProject(null);
    // Clean up object URLs to prevent memory leaks
    formPreviews.forEach(u => URL.revokeObjectURL(u));
    setFormPreviews([]);
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
    setUploading(true);
    try {
      let projectId: number;
      if (editingProject) {
        await api.updateProject(editingProject.id, { ...form, photos: editingProject.photos });
        projectId = editingProject.id;
      } else {
        const result = await api.createProject(form);
        projectId = result.id;
      }

      const failedUploads: string[] = [];
      for (const file of formFiles) {
        try {
          const compressed = await compressImage(file);
          await api.uploadProjectImage(projectId, compressed);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Onbekende uploadfout';
          console.error('Photo upload failed:', file.name, message);
          failedUploads.push(`${file.name}: ${message}`);
        }
      }

      setShowForm(false);
      resetForm();
      fetchProjects();

      if (failedUploads.length > 0) {
        alert(`Project opgeslagen, maar deze upload(s) mislukten:\n\n${failedUploads.join('\n')}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Onbekende fout';
      console.error('Save project error:', message);
      alert(`Fout bij opslaan project: ${message}`);
    } finally {
      setUploading(false);
    }
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
      const raw = fileInputRef.current.files[0];
      const file = await compressImage(raw);
      await api.uploadProjectImage(projectId, file);
      fetchProjects();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Onbekende uploadfout';
      alert(`Fout bij uploaden foto: ${message}`);
    }
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
              
              {/* Photo upload in form */}
              <div>
                <label className="text-sm font-medium mb-2 block">Foto's</label>
                <input
                  ref={formFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    if (!e.target.files) return;
                    const raw = Array.from(e.target.files);
                    // Compress all images to prevent mobile crashes
                    const compressed = await Promise.all(raw.map(f => compressImage(f)));
                    const newPreviews = compressed.map(f => URL.createObjectURL(f));
                    setFormFiles(prev => [...prev, ...compressed]);
                    setFormPreviews(prev => [...prev, ...newPreviews]);
                    // Reset input so same file can be re-selected
                    if (formFileInputRef.current) formFileInputRef.current.value = '';
                  }}
                />
                <Button type="button" variant="outline" className="w-full" onClick={() => formFileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" />Foto's selecteren
                </Button>
                {formFiles.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {formFiles.map((file, i) => (
                      <div key={i} className="relative">
                        <img src={formPreviews[i]} alt="" className="w-16 h-16 rounded object-cover border border-border" />
                        <button
                          onClick={() => {
                            URL.revokeObjectURL(formPreviews[i]);
                            setFormFiles(prev => prev.filter((_, idx) => idx !== i));
                            setFormPreviews(prev => prev.filter((_, idx) => idx !== i));
                          }}
                          className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button onClick={handleSave} className="w-full" disabled={uploading}>
                {uploading ? "Uploaden..." : editingProject ? "Bijwerken" : "Opslaan"}
              </Button>
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
