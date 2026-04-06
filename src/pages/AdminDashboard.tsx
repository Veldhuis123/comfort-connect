import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { api, Review, QuoteRequest, ContactMessage, QuoteStats, ProductCategory } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Star, Plus, Trash2, Eye, EyeOff, Mail, Phone, Calendar, RefreshCw
} from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminDashboardOverview from "@/components/admin/AdminDashboardOverview";
import AdminSettings from "@/components/admin/AdminSettings";
import AdminCustomers from "@/components/admin/AdminCustomers";
import AdminProducts from "@/components/AdminProducts";
import AdminInstallations from "@/components/AdminInstallations";
import AdminLocalQuotes from "@/components/AdminLocalQuotes";
import AdminPricing from "@/components/AdminPricing";
import QuoteDetailDialog from "@/components/QuoteDetailDialog";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

// Lazy load new Elektra components
const GroepenkastConfigurator = lazy(() => import("@/components/admin/GroepenkastConfigurator"));
const ElektraGroepenkasten = lazy(() => import("@/components/admin/ElektraGroepenkasten"));
const ElektraQRCodes = lazy(() => import("@/components/admin/ElektraQRCodes"));
const AdminProjects = lazy(() => import("@/components/admin/AdminProjects"));

const AdminDashboard = () => {
  const { user, logout, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [stats, setStats] = useState<QuoteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("dashboard");

  const [selectedQuote, setSelectedQuote] = useState<QuoteRequest | null>(null);
  const [showQuoteDetail, setShowQuoteDetail] = useState(false);
  const [productCategory, setProductCategory] = useState<ProductCategory>('airco');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    name: "", location: "", rating: 5, review_text: "", service: "", review_date: "", is_visible: true
  });

  useEffect(() => {
    if (!authLoading && !user) navigate("/admin/login");
  }, [user, authLoading, navigate]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [reviewsData, quotesData, messagesData, statsData] = await Promise.all([
        api.getAdminReviews().catch(() => []),
        api.getQuotes().catch(() => []),
        api.getMessages().catch(() => []),
        api.getQuoteStats().catch(() => null)
      ]);
      setReviews(reviewsData);
      setQuotes(quotesData);
      setMessages(messagesData);
      setStats(statsData);
    } catch {
      setError("Kon gegevens niet laden. Controleer of de backend draait.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) fetchData(); }, [user]);

  const handleLogout = () => { logout(); navigate("/admin/login"); };

  const handleAddReview = async () => {
    try {
      await api.createReview(reviewForm);
      setShowReviewForm(false);
      setReviewForm({ name: "", location: "", rating: 5, review_text: "", service: "", review_date: "", is_visible: true });
      fetchData();
    } catch { alert("Fout bij toevoegen review"); }
  };

  const handleToggleReview = async (id: number) => {
    try { 
      await api.toggleReviewVisibility(id); 
      fetchData(); 
    } catch (err: any) { 
      console.error('Toggle review error:', err);
      alert("Fout bij wijzigen zichtbaarheid: " + (err?.message || "Onbekende fout")); 
    }
  };

  const handleDeleteReview = async (id: number) => {
    if (confirm("Weet je zeker dat je deze review wilt verwijderen?")) {
      try { await api.deleteReview(id); fetchData(); } catch { alert("Fout bij verwijderen review"); }
    }
  };

  const handleUpdateQuoteStatus = async (id: number, status: string) => {
    try { await api.updateQuoteStatus(id, status); fetchData(); } catch { alert("Fout bij wijzigen status"); }
  };

  const handleDeleteMessage = async (id: number) => {
    if (confirm("Weet je zeker dat je dit bericht wilt verwijderen?")) {
      try { await api.deleteMessage(id); fetchData(); } catch { alert("Fout bij verwijderen bericht"); }
    }
  };

  const statusColors: Record<string, string> = {
    nieuw: "bg-blue-500", in_behandeling: "bg-yellow-500", offerte_verstuurd: "bg-purple-500",
    akkoord: "bg-green-500", afgewezen: "bg-red-500", voltooid: "bg-gray-500"
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  const unreadMessages = messages.filter(m => !m.is_read).length;
  const newQuotes = quotes.filter(q => q.status === "nieuw").length;

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <AdminDashboardOverview stats={stats} quotes={quotes} reviews={reviews} messages={messages} />;

      case "customers-overview":
        return <AdminCustomers />;

      case "quotes":
        return (
          <>
            <div className="mb-6">
              <h1 className="font-heading text-2xl font-bold">Offerteaanvragen</h1>
              <p className="text-sm text-muted-foreground">Beheer alle binnengekomen offerteaanvragen</p>
            </div>
            <Card>
              <CardContent className="pt-6">
                {loading ? (
                  <p className="text-muted-foreground">Laden...</p>
                ) : quotes.length === 0 ? (
                  <p className="text-muted-foreground">Nog geen offerteaanvragen</p>
                ) : (
                  <div className="space-y-4">
                    {quotes.map((quote) => (
                      <div key={quote.id} className="border border-border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={statusColors[quote.status]}>{quote.status.replace("_", " ")}</Badge>
                              <span className="text-sm text-muted-foreground">#{quote.id}</span>
                            </div>
                            <p className="font-medium">{quote.selected_airco_brand} {quote.selected_airco_name || "Geen selectie"}</p>
                            <p className="text-sm text-muted-foreground">{quote.total_size}m² • {Number(quote.total_capacity || 0).toFixed(1)} kW</p>
                          </div>
                          <div className="text-right">
                            {quote.estimated_price && <p className="font-bold text-accent">€{Number(quote.estimated_price).toLocaleString()}</p>}
                            <p className="text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3 inline mr-1" />
                              {new Date(quote.created_at).toLocaleDateString('nl-NL')}
                            </p>
                          </div>
                        </div>
                        {(quote.customer_email || quote.customer_phone) && (
                          <div className="flex gap-4 mb-3 text-sm">
                            {quote.customer_email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{quote.customer_email}</span>}
                            {quote.customer_phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{quote.customer_phone}</span>}
                          </div>
                        )}
                        <div className="flex gap-2 flex-wrap">
                          <select value={quote.status} onChange={(e) => handleUpdateQuoteStatus(quote.id, e.target.value)} className="text-sm border rounded px-2 py-1">
                            <option value="nieuw">Nieuw</option>
                            <option value="in_behandeling">In behandeling</option>
                            <option value="offerte_verstuurd">Offerte verstuurd</option>
                            <option value="akkoord">Akkoord</option>
                            <option value="afgewezen">Afgewezen</option>
                            <option value="voltooid">Voltooid</option>
                          </select>
                          <Button size="sm" variant="outline" onClick={() => { setSelectedQuote(quote); setShowQuoteDetail(true); }}>
                            <Eye className="w-4 h-4 mr-1" />Behandelen
                          </Button>
                          <Button size="sm" variant="destructive" onClick={async () => {
                            if (confirm(`Weet je zeker dat je offerte #${quote.id} wilt verwijderen?`)) {
                              try { await api.deleteQuote(quote.id); fetchData(); } catch { alert("Fout bij verwijderen offerte"); }
                            }
                          }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <QuoteDetailDialog quote={selectedQuote} open={showQuoteDetail} onOpenChange={setShowQuoteDetail} onDeleted={fetchData} onUpdated={fetchData} />
          </>
        );

      case "local-quotes":
        return (
          <div>
            <div className="mb-6">
              <h1 className="font-heading text-2xl font-bold">Lokale Offertes</h1>
              <p className="text-sm text-muted-foreground">Maak en beheer lokale offertes</p>
            </div>
            <AdminLocalQuotes />
          </div>
        );

      case "pricing":
        return (
          <div>
            <div className="mb-6">
              <h1 className="font-heading text-2xl font-bold">Prijsbeheer</h1>
              <p className="text-sm text-muted-foreground">Beheer productprijzen en marges</p>
            </div>
            <AdminPricing />
          </div>
        );

      case "reviews":
        return (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="font-heading text-2xl font-bold">Reviews</h1>
                <p className="text-sm text-muted-foreground">Beheer klantbeoordelingen</p>
              </div>
              <Dialog open={showReviewForm} onOpenChange={setShowReviewForm}>
                <DialogTrigger asChild>
                  <Button><Plus className="w-4 h-4 mr-2" />Review Toevoegen</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nieuwe Review</DialogTitle>
                    <DialogDescription>Voeg een klantreview toe</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input placeholder="Naam klant" value={reviewForm.name} onChange={(e) => setReviewForm({ ...reviewForm, name: e.target.value })} />
                    <Input placeholder="Locatie" value={reviewForm.location} onChange={(e) => setReviewForm({ ...reviewForm, location: e.target.value })} />
                    <div className="flex gap-2">
                      {[1,2,3,4,5].map((rating) => (
                        <button key={rating} onClick={() => setReviewForm({ ...reviewForm, rating })} className="p-1">
                          <Star className={`w-6 h-6 ${rating <= reviewForm.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                        </button>
                      ))}
                    </div>
                    <Input placeholder="Service" value={reviewForm.service} onChange={(e) => setReviewForm({ ...reviewForm, service: e.target.value })} />
                    <Input placeholder="Datum" value={reviewForm.review_date} onChange={(e) => setReviewForm({ ...reviewForm, review_date: e.target.value })} />
                    <Textarea placeholder="Review tekst..." value={reviewForm.review_text} onChange={(e) => setReviewForm({ ...reviewForm, review_text: e.target.value })} rows={4} />
                    <Button onClick={handleAddReview} className="w-full">Opslaan</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Card>
              <CardContent className="pt-6">
                {loading ? <p className="text-muted-foreground">Laden...</p> : reviews.length === 0 ? <p className="text-muted-foreground">Nog geen reviews</p> : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="border border-border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{review.name}</span>
                              <span className="text-sm text-muted-foreground">• {review.location}</span>
                              {!review.is_visible && <Badge variant="secondary">Verborgen</Badge>}
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              {[...Array(review.rating)].map((_, i) => <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleToggleReview(review.id)}>
                              {review.is_visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteReview(review.id)} className="text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{review.service} • {review.review_date}</p>
                        <p className="text-sm">{review.review_text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case "messages":
        return (
          <div>
            <div className="mb-6">
              <h1 className="font-heading text-2xl font-bold">Berichten</h1>
              <p className="text-sm text-muted-foreground">Berichten via het contactformulier</p>
            </div>
            <Card>
              <CardContent className="pt-6">
                {loading ? <p className="text-muted-foreground">Laden...</p> : messages.length === 0 ? <p className="text-muted-foreground">Nog geen berichten</p> : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div key={message.id} className={`border rounded-lg p-4 ${!message.is_read ? "border-accent bg-accent/5" : "border-border"}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{message.name}</span>
                              {!message.is_read && <Badge variant="default" className="text-xs">Nieuw</Badge>}
                            </div>
                            <div className="flex gap-3 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{message.email}</span>
                              {message.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{message.phone}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{new Date(message.created_at).toLocaleDateString('nl-NL')}</span>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteMessage(message.id)} className="text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        {message.subject && <p className="font-medium text-sm mb-1">{message.subject}</p>}
                        <p className="text-sm">{message.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      // Airco section
      case "airco-products":
        return (
          <div>
            <div className="mb-6">
              <h1 className="font-heading text-2xl font-bold">Airco Producten</h1>
              <p className="text-sm text-muted-foreground">Beheer je airco productcatalogus</p>
            </div>
            <AdminProducts selectedCategory={productCategory} onCategoryChange={setProductCategory} />
          </div>
        );

      case "airco-installations":
        return (
          <div>
            <div className="mb-6">
              <h1 className="font-heading text-2xl font-bold">Airco Installaties</h1>
              <p className="text-sm text-muted-foreground">Beheer BRL 100 installaties</p>
            </div>
            <AdminInstallations />
          </div>
        );

      case "airco-calculator":
        return <AdminSettings />;

      // Elektra section
      case "elektra-groepenkasten":
        return (
          <Suspense fallback={<div className="p-8 text-muted-foreground">Laden...</div>}>
            <ElektraGroepenkasten onOpenConfigurator={(index) => {
              if (index !== undefined) {
                // Store active index for configurator
                sessionStorage.setItem("rv_gk_active_index", String(index));
              }
              setActiveSection("elektra-configurator");
            }} />
          </Suspense>
        );

      case "elektra-configurator":
        return (
          <Suspense fallback={<div className="p-8 text-muted-foreground">Laden...</div>}>
            <GroepenkastConfigurator />
          </Suspense>
        );

      case "elektra-qrcodes":
        return (
          <Suspense fallback={<div className="p-8 text-muted-foreground">Laden...</div>}>
            <ElektraQRCodes />
          </Suspense>
        );

      // Website
      case "projects":
        return (
          <Suspense fallback={<div className="p-8 text-muted-foreground">Laden...</div>}>
            <AdminProjects />
          </Suspense>
        );

      // Systeem
      case "boekhouden":
        return (
          <div>
            <div className="mb-6">
              <h1 className="font-heading text-2xl font-bold">e-Boekhouden</h1>
              <p className="text-sm text-muted-foreground">Synchroniseer producten en facturen</p>
            </div>
            <EBoekhoudenSync />
          </div>
        );

      case "wasco":
        return (
          <div>
            <div className="mb-6">
              <h1 className="font-heading text-2xl font-bold">Wasco Sync</h1>
              <p className="text-sm text-muted-foreground">Automatisch inkoopprijzen ophalen</p>
            </div>
            <WascoSync />
          </div>
        );

      case "settings":
        return <AdminSettings />;

      default:
        return <AdminDashboardOverview stats={stats} quotes={quotes} reviews={reviews} messages={messages} />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/30">
        <AdminSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          userName={user.name}
          onLogout={handleLogout}
          unreadMessages={unreadMessages}
          newQuotes={newQuotes}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-3 border-b border-border bg-background px-4 sticky top-0 z-40">
            <SidebarTrigger />
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={fetchData} className="h-8">
              <RefreshCw className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Vernieuwen</span>
            </Button>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
            {error && (
              <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-6">{error}</div>
            )}
            {renderContent()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;
