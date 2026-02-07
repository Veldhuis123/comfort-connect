import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { api, Review, QuoteRequest, ContactMessage, QuoteStats } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  LogOut, Star, MessageSquare, FileText, Settings, Plus, 
  Trash2, Eye, EyeOff, Check, X, Mail, Phone, Calendar,
  BarChart3, RefreshCw, Calculator, Wind, Sun, Wifi, Battery, Car, Cable, BookOpen, Package, Thermometer, Receipt, ChevronDown
} from "lucide-react";
import EBoekhoudenSync from "@/components/EBoekhoudenSync";
import AdminProducts from "@/components/AdminProducts";
import AdminInstallations from "@/components/AdminInstallations";
import AdminLocalQuotes from "@/components/AdminLocalQuotes";
import QuoteDetailDialog from "@/components/QuoteDetailDialog";
import { ProductCategory } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  CalculatorSettings, 
  defaultCalculatorSettings, 
  getCalculatorSettings, 
  saveCalculatorSettings 
} from "./Calculators";

const AdminDashboard = () => {
  const { user, logout, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [stats, setStats] = useState<QuoteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("quotes");

  // Quote detail dialog state
  const [selectedQuote, setSelectedQuote] = useState<QuoteRequest | null>(null);
  const [showQuoteDetail, setShowQuoteDetail] = useState(false);

  // Calculator settings state
  const [calculatorSettings, setCalculatorSettings] = useState<CalculatorSettings>(defaultCalculatorSettings);
  const [productCategory, setProductCategory] = useState<ProductCategory>('airco');

  // Review form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    name: "",
    location: "",
    rating: 5,
    review_text: "",
    service: "",
    review_date: "",
    is_visible: true
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/admin/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    setCalculatorSettings(getCalculatorSettings());
  }, []);

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
    } catch (err) {
      setError("Kon gegevens niet laden. Controleer of de backend draait.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  const handleAddReview = async () => {
    try {
      await api.createReview(reviewForm);
      setShowReviewForm(false);
      setReviewForm({ name: "", location: "", rating: 5, review_text: "", service: "", review_date: "", is_visible: true });
      fetchData();
    } catch (err) {
      alert("Fout bij toevoegen review");
    }
  };

  const handleToggleReview = async (id: number) => {
    try {
      await api.toggleReviewVisibility(id);
      fetchData();
    } catch (err) {
      alert("Fout bij wijzigen zichtbaarheid");
    }
  };

  const handleDeleteReview = async (id: number) => {
    if (confirm("Weet je zeker dat je deze review wilt verwijderen?")) {
      try {
        await api.deleteReview(id);
        fetchData();
      } catch (err) {
        alert("Fout bij verwijderen review");
      }
    }
  };

  const handleUpdateQuoteStatus = async (id: number, status: string) => {
    try {
      await api.updateQuoteStatus(id, status);
      fetchData();
    } catch (err) {
      alert("Fout bij wijzigen status");
    }
  };

  const handleDeleteMessage = async (id: number) => {
    if (confirm("Weet je zeker dat je dit bericht wilt verwijderen?")) {
      try {
        await api.deleteMessage(id);
        fetchData();
      } catch (err) {
        alert("Fout bij verwijderen bericht");
      }
    }
  };

  const handleUpdateCalculatorSetting = (
    key: keyof CalculatorSettings, 
    field: "enabled" | "name", 
    value: boolean | string
  ) => {
    const newSettings = {
      ...calculatorSettings,
      [key]: { ...calculatorSettings[key], [field]: value }
    };
    setCalculatorSettings(newSettings);
    saveCalculatorSettings(newSettings);
    
    // Dispatch storage event for other components
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'calculatorSettings',
      newValue: JSON.stringify(newSettings)
    }));
  };

  const statusColors: Record<string, string> = {
    nieuw: "bg-blue-500",
    in_behandeling: "bg-yellow-500",
    offerte_verstuurd: "bg-purple-500",
    akkoord: "bg-green-500",
    afgewezen: "bg-red-500",
    voltooid: "bg-gray-500"
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="font-heading text-lg sm:text-xl font-bold truncate">Admin Dashboard</h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">Welkom, {user.name}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="outline" size="sm" onClick={fetchData} className="h-8 px-2 sm:px-3">
              <RefreshCw className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Vernieuwen</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="h-8 px-2 sm:px-3">
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Uitloggen</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-8">
            <Card>
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-xl sm:text-2xl font-bold">{stats.total}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Totaal offertes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-xl sm:text-2xl font-bold">{stats.thisMonth}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Deze maand</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Star className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-xl sm:text-2xl font-bold">{reviews.length}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Reviews</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-xl sm:text-2xl font-bold">{messages.filter(m => !m.is_read).length}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Ongelezen</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
            {/* Offertes Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-xs sm:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                    activeTab === "quotes" || activeTab === "local-quotes"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <FileText className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Offertes</span>
                  <ChevronDown className="w-3 h-3 ml-1" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-popover">
                <DropdownMenuItem onClick={() => setActiveTab("quotes")} className="cursor-pointer">
                  <FileText className="w-4 h-4 mr-2" />
                  Aanvragen ({quotes.length})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("local-quotes")} className="cursor-pointer">
                  <Receipt className="w-4 h-4 mr-2" />
                  Lokale Offertes
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <TabsTrigger value="reviews" className="text-xs sm:text-sm">
              <Star className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Reviews</span> ({reviews.length})
            </TabsTrigger>
            <TabsTrigger value="messages" className="text-xs sm:text-sm">
              <MessageSquare className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Berichten</span> ({messages.length})
            </TabsTrigger>
            <TabsTrigger value="calculators" className="text-xs sm:text-sm">
              <Calculator className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Calculatoren</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="text-xs sm:text-sm">
              <Package className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Producten</span>
            </TabsTrigger>
            <TabsTrigger value="installations" className="text-xs sm:text-sm">
              <Thermometer className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Installaties</span>
            </TabsTrigger>
            <TabsTrigger value="boekhouden" className="text-xs sm:text-sm">
              <BookOpen className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">e-Boekhouden</span>
            </TabsTrigger>
          </TabsList>

          {/* Quotes Tab */}
          <TabsContent value="quotes">
            <Card>
              <CardHeader>
                <CardTitle>Offerteaanvragen</CardTitle>
                <CardDescription>Beheer alle binnengekomen offerteaanvragen</CardDescription>
              </CardHeader>
              <CardContent>
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
                              <Badge className={statusColors[quote.status]}>
                                {quote.status.replace("_", " ")}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                #{quote.id}
                              </span>
                            </div>
                            <p className="font-medium">
                              {quote.selected_airco_brand} {quote.selected_airco_name || "Geen selectie"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {quote.total_size}m² • {Number(quote.total_capacity || 0).toFixed(1)} kW
                            </p>
                          </div>
                          <div className="text-right">
                            {quote.estimated_price && (
                              <p className="font-bold text-accent">
                                €{Number(quote.estimated_price).toLocaleString()}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3 inline mr-1" />
                              {new Date(quote.created_at).toLocaleDateString('nl-NL')}
                            </p>
                          </div>
                        </div>
                        
                        {(quote.customer_email || quote.customer_phone) && (
                          <div className="flex gap-4 mb-3 text-sm">
                            {quote.customer_email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {quote.customer_email}
                              </span>
                            )}
                            {quote.customer_phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {quote.customer_phone}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2 flex-wrap">
                          <select
                            value={quote.status}
                            onChange={(e) => handleUpdateQuoteStatus(quote.id, e.target.value)}
                            className="text-sm border rounded px-2 py-1"
                          >
                            <option value="nieuw">Nieuw</option>
                            <option value="in_behandeling">In behandeling</option>
                            <option value="offerte_verstuurd">Offerte verstuurd</option>
                            <option value="akkoord">Akkoord</option>
                            <option value="afgewezen">Afgewezen</option>
                            <option value="voltooid">Voltooid</option>
                          </select>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedQuote(quote);
                              setShowQuoteDetail(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Behandelen
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={async () => {
                              if (confirm(`Weet je zeker dat je offerte #${quote.id} wilt verwijderen?`)) {
                                try {
                                  await api.deleteQuote(quote.id);
                                  fetchData();
                                } catch (err) {
                                  alert("Fout bij verwijderen offerte");
                                }
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quote Detail Dialog */}
            <QuoteDetailDialog
              quote={selectedQuote}
              open={showQuoteDetail}
              onOpenChange={setShowQuoteDetail}
              onDeleted={fetchData}
              onUpdated={fetchData}
            />
          </TabsContent>

          {/* Local Quotes Tab */}
          <TabsContent value="local-quotes">
            <AdminLocalQuotes />
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Reviews</CardTitle>
                  <CardDescription>Beheer klantbeoordelingen</CardDescription>
                </div>
                <Dialog open={showReviewForm} onOpenChange={setShowReviewForm}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Review Toevoegen
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nieuwe Review</DialogTitle>
                      <DialogDescription>Voeg een klantreview toe</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Naam klant"
                        value={reviewForm.name}
                        onChange={(e) => setReviewForm({ ...reviewForm, name: e.target.value })}
                      />
                      <Input
                        placeholder="Locatie (bijv. Utrecht)"
                        value={reviewForm.location}
                        onChange={(e) => setReviewForm({ ...reviewForm, location: e.target.value })}
                      />
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            onClick={() => setReviewForm({ ...reviewForm, rating })}
                            className="p-1"
                          >
                            <Star
                              className={`w-6 h-6 ${rating <= reviewForm.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                            />
                          </button>
                        ))}
                      </div>
                      <Input
                        placeholder="Service (bijv. Daikin Perfera)"
                        value={reviewForm.service}
                        onChange={(e) => setReviewForm({ ...reviewForm, service: e.target.value })}
                      />
                      <Input
                        placeholder="Datum (bijv. Januari 2025)"
                        value={reviewForm.review_date}
                        onChange={(e) => setReviewForm({ ...reviewForm, review_date: e.target.value })}
                      />
                      <Textarea
                        placeholder="Review tekst..."
                        value={reviewForm.review_text}
                        onChange={(e) => setReviewForm({ ...reviewForm, review_text: e.target.value })}
                        rows={4}
                      />
                      <Button onClick={handleAddReview} className="w-full">
                        Opslaan
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-muted-foreground">Laden...</p>
                ) : reviews.length === 0 ? (
                  <p className="text-muted-foreground">Nog geen reviews</p>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="border border-border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{review.name}</span>
                              <span className="text-sm text-muted-foreground">• {review.location}</span>
                              {!review.is_visible && (
                                <Badge variant="secondary">Verborgen</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              {[...Array(review.rating)].map((_, i) => (
                                <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleReview(review.id)}
                            >
                              {review.is_visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteReview(review.id)}
                              className="text-destructive"
                            >
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
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle>Contactberichten</CardTitle>
                <CardDescription>Berichten via het contactformulier</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-muted-foreground">Laden...</p>
                ) : messages.length === 0 ? (
                  <p className="text-muted-foreground">Nog geen berichten</p>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div 
                        key={message.id} 
                        className={`border rounded-lg p-4 ${!message.is_read ? "border-accent bg-accent/5" : "border-border"}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{message.name}</span>
                              {!message.is_read && (
                                <Badge variant="default" className="text-xs">Nieuw</Badge>
                              )}
                            </div>
                            <div className="flex gap-3 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {message.email}
                              </span>
                              {message.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {message.phone}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {new Date(message.created_at).toLocaleDateString('nl-NL')}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteMessage(message.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        {message.subject && (
                          <p className="font-medium text-sm mb-1">{message.subject}</p>
                        )}
                        <p className="text-sm">{message.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Calculators Tab */}
          <TabsContent value="calculators">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Calculator Instellingen
                </CardTitle>
                <CardDescription>
                  Beheer welke calculatoren zichtbaar zijn op de website
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Airco Calculator */}
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                      <Wind className="w-6 h-6 text-accent" />
                    </div>
                    <div className="flex-1">
                      <Input
                        value={calculatorSettings.airco.name}
                        onChange={(e) => handleUpdateCalculatorSetting("airco", "name", e.target.value)}
                        className="font-medium mb-1 max-w-[200px]"
                      />
                      <p className="text-sm text-muted-foreground">
                        Berekening voor airconditioning met productselectie
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {calculatorSettings.airco.enabled ? "Actief" : "Inactief"}
                    </span>
                    <Switch
                      checked={calculatorSettings.airco.enabled}
                      onCheckedChange={(checked) => handleUpdateCalculatorSetting("airco", "enabled", checked)}
                    />
                  </div>
                </div>

                {/* PV Calculator */}
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                      <Sun className="w-6 h-6 text-accent" />
                    </div>
                    <div className="flex-1">
                      <Input
                        value={calculatorSettings.pv.name}
                        onChange={(e) => handleUpdateCalculatorSetting("pv", "name", e.target.value)}
                        className="font-medium mb-1 max-w-[200px]"
                      />
                      <p className="text-sm text-muted-foreground">
                        Zonnepanelen berekening met terugverdientijd
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {calculatorSettings.pv.enabled ? "Actief" : "Inactief"}
                    </span>
                    <Switch
                      checked={calculatorSettings.pv.enabled}
                      onCheckedChange={(checked) => handleUpdateCalculatorSetting("pv", "enabled", checked)}
                    />
                  </div>
                </div>

                {/* Battery Calculator */}
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                      <Battery className="w-6 h-6 text-accent" />
                    </div>
                    <div className="flex-1">
                      <Input
                        value={calculatorSettings.battery.name}
                        onChange={(e) => handleUpdateCalculatorSetting("battery", "name", e.target.value)}
                        className="font-medium mb-1 max-w-[200px]"
                      />
                      <p className="text-sm text-muted-foreground">
                        Thuisaccu berekening met extra besparing
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {calculatorSettings.battery.enabled ? "Actief" : "Inactief"}
                    </span>
                    <Switch
                      checked={calculatorSettings.battery.enabled}
                      onCheckedChange={(checked) => handleUpdateCalculatorSetting("battery", "enabled", checked)}
                    />
                  </div>
                </div>

                {/* Charging Calculator */}
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                      <Car className="w-6 h-6 text-accent" />
                    </div>
                    <div className="flex-1">
                      <Input
                        value={calculatorSettings.charging.name}
                        onChange={(e) => handleUpdateCalculatorSetting("charging", "name", e.target.value)}
                        className="font-medium mb-1 max-w-[200px]"
                      />
                      <p className="text-sm text-muted-foreground">
                        Laadpalen met besparing t.o.v. benzine
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {calculatorSettings.charging.enabled ? "Actief" : "Inactief"}
                    </span>
                    <Switch
                      checked={calculatorSettings.charging.enabled}
                      onCheckedChange={(checked) => handleUpdateCalculatorSetting("charging", "enabled", checked)}
                    />
                  </div>
                </div>

                {/* UniFi Calculator */}
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                      <Wifi className="w-6 h-6 text-accent" />
                    </div>
                    <div className="flex-1">
                      <Input
                        value={calculatorSettings.unifi.name}
                        onChange={(e) => handleUpdateCalculatorSetting("unifi", "name", e.target.value)}
                        className="font-medium mb-1 max-w-[200px]"
                      />
                      <p className="text-sm text-muted-foreground">
                        UniFi netwerkapparatuur en camerabewaking
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {calculatorSettings.unifi.enabled ? "Actief" : "Inactief"}
                    </span>
                    <Switch
                      checked={calculatorSettings.unifi.enabled}
                      onCheckedChange={(checked) => handleUpdateCalculatorSetting("unifi", "enabled", checked)}
                    />
                  </div>
                </div>

                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    💡 <strong>Tip:</strong> Wijzigingen worden direct opgeslagen en zijn meteen zichtbaar op de website.
                    Bezoekers zien alleen de actieve calculatoren.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <AdminProducts 
              selectedCategory={productCategory} 
              onCategoryChange={setProductCategory} 
            />
          </TabsContent>

          {/* Installations Tab */}
          <TabsContent value="installations">
            <AdminInstallations />
          </TabsContent>

          {/* e-Boekhouden Tab */}
          <TabsContent value="boekhouden">
            <EBoekhoudenSync />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
