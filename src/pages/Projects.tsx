import { useState, useEffect } from "react";
import { api, Project, getUploadUrl } from "@/lib/api";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar } from "lucide-react";

const categoryLabels: Record<string, string> = {
  airco: "Airconditioning",
  warmtepomp: "Warmtepomp",
  elektra: "Elektra",
  zonnepanelen: "Zonnepanelen",
  overig: "Overig",
};

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("alle");

  useEffect(() => {
    api.getPublicProjects()
      .then(setProjects)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const categories = ["alle", ...new Set(projects.map(p => p.category))];
  const filtered = filter === "alle" ? projects : projects.filter(p => p.category === filter);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
              Onze Projecten
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Bekijk een selectie van onze recent uitgevoerde installaties en projecten.
            </p>
          </div>

          {/* Category filter */}
          {categories.length > 2 && (
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    filter === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {cat === "alle" ? "Alle" : categoryLabels[cat] || cat}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-16">Nog geen projecten beschikbaar.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(project => {
                const photos: string[] = typeof project.photos === 'string' ? JSON.parse(project.photos) : (project.photos || []);
                const mainPhoto = photos[0];
                return (
                  <article key={project.id} className="group rounded-xl overflow-hidden border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
                    {/* Image */}
                    <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                      {mainPhoto ? (
                        <img
                          src={getUploadUrl(mainPhoto)}
                          alt={project.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <span className="text-sm">Geen afbeelding</span>
                        </div>
                      )}
                      <Badge className="absolute top-3 left-3 bg-primary/90 text-primary-foreground">
                        {categoryLabels[project.category] || project.category}
                      </Badge>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <h2 className="font-heading font-bold text-lg text-foreground mb-2">{project.title}</h2>
                      {project.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{project.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {project.location && (
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{project.location}</span>
                        )}
                        {project.completion_date && (
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(project.completion_date).toLocaleDateString('nl-NL')}</span>
                        )}
                      </div>

                      {/* Additional photos */}
                      {photos.length > 1 && (
                        <div className="flex gap-1.5 mt-3">
                          {photos.slice(1, 4).map((photo, i) => (
                            <div key={i} className="w-12 h-12 rounded-md overflow-hidden border border-border">
                              <img src={getUploadUrl(photo)} alt="" className="w-full h-full object-cover" loading="lazy" />
                            </div>
                          ))}
                          {photos.length > 4 && (
                            <div className="w-12 h-12 rounded-md border border-border flex items-center justify-center bg-muted text-xs text-muted-foreground">
                              +{photos.length - 4}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Projects;
