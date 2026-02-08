import { useState, useEffect } from "react";
import { api, LocalQuote, LocalQuoteStats, CreateLocalQuote, CreateLocalQuoteItem } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  FileText, Trash2, Eye, Download, Calendar, Mail, Phone, 
  User, Euro, RefreshCw, CheckCircle, XCircle, Clock, Send, Plus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateLocalQuotePDF } from "@/lib/localQuotePdfExport";

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  concept: { label: "Concept", color: "bg-gray-500", icon: <FileText className="w-3 h-3" /> },
  verzonden: { label: "Verzonden", color: "bg-blue-500", icon: <Send className="w-3 h-3" /> },
  geaccepteerd: { label: "Geaccepteerd", color: "bg-green-500", icon: <CheckCircle className="w-3 h-3" /> },
  afgewezen: { label: "Afgewezen", color: "bg-red-500", icon: <XCircle className="w-3 h-3" /> },
  verlopen: { label: "Verlopen", color: "bg-orange-500", icon: <Clock className="w-3 h-3" /> },
  overgenomen: { label: "Overgenomen", color: "bg-purple-500", icon: <CheckCircle className="w-3 h-3" /> },
};

const emptyQuoteItem: CreateLocalQuoteItem = {
  description: "",
  quantity: 1,
  unit: "stuk",
  price_per_unit: 0,
  vat_percentage: 21,
};

const AdminLocalQuotes = () => {
  const { toast } = useToast();
  const [quotes, setQuotes] = useState<LocalQuote[]>([]);
  const [stats, setStats] = useState<LocalQuoteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
  // Detail dialog
  const [selectedQuote, setSelectedQuote] = useState<LocalQuote | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  
  // New quote dialog
  const [showNewQuoteDialog, setShowNewQuoteDialog] = useState(false);
  const [newQuoteForm, setNewQuoteForm] = useState<CreateLocalQuote>({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    customer_address: "",
    customer_note: "",
    internal_note: "",
    items: [{ ...emptyQuoteItem }],
  });
  const [creatingQuote, setCreatingQuote] = useState(false);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const status = filterStatus === "all" ? undefined : filterStatus;
      const response = await api.getLocalQuotes(status);
      setQuotes(response.quotes);
      setStats(response.stats);
    } catch (error) {
      toast({
        title: "Fout",
        description: "Kon offertes niet laden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, [filterStatus]);

  const handleViewQuote = async (id: number) => {
    setDetailLoading(true);
    setShowDetail(true);
    try {
      const quote = await api.getLocalQuote(id);
      setSelectedQuote(quote);
    } catch (error) {
      toast({
        title: "Fout",
        description: "Kon offerte niet laden",
        variant: "destructive",
      });
      setShowDetail(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await api.updateLocalQuoteStatus(id, newStatus);
      toast({
        title: "Succes",
        description: "Status bijgewerkt",
      });
      fetchQuotes();
      if (selectedQuote?.id === id) {
        setSelectedQuote({ ...selectedQuote, status: newStatus as LocalQuote["status"] });
      }
    } catch (error) {
      toast({
        title: "Fout",
        description: "Kon status niet bijwerken",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Weet je zeker dat je deze offerte wilt verwijderen?")) return;
    
    try {
      await api.deleteLocalQuote(id);
      toast({
        title: "Succes",
        description: "Offerte verwijderd",
      });
      setShowDetail(false);
      fetchQuotes();
    } catch (error) {
      toast({
        title: "Fout",
        description: "Kon offerte niet verwijderen",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = (quote: LocalQuote) => {
    generateLocalQuotePDF(quote);
    toast({
      title: "PDF Gedownload",
      description: `Offerte ${quote.quote_number} is gedownload`,
    });
  };

  // New quote handlers
  const handleOpenNewQuote = () => {
    setNewQuoteForm({
      customer_name: "",
      customer_email: "",
      customer_phone: "",
      customer_address: "",
      customer_note: "",
      internal_note: "",
      items: [{ ...emptyQuoteItem }],
    });
    setShowNewQuoteDialog(true);
  };

  const handleAddItem = () => {
    setNewQuoteForm((prev) => ({
      ...prev,
      items: [...(prev.items || []), { ...emptyQuoteItem }],
    }));
  };

  const handleRemoveItem = (index: number) => {
    setNewQuoteForm((prev) => ({
      ...prev,
      items: (prev.items || []).filter((_, i) => i !== index),
    }));
  };

  const handleItemChange = (index: number, field: keyof CreateLocalQuoteItem, value: string | number) => {
    setNewQuoteForm((prev) => ({
      ...prev,
      items: (prev.items || []).map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let vat = 0;
    (newQuoteForm.items || []).forEach((item) => {
      const lineTotal = (item.quantity || 1) * (item.price_per_unit || 0);
      subtotal += lineTotal;
      vat += lineTotal * ((item.vat_percentage || 21) / 100);
    });
    return { subtotal, vat, total: subtotal + vat };
  };

  const handleCreateQuote = async () => {
    if (!newQuoteForm.customer_name?.trim()) {
      toast({ title: "Fout", description: "Klantnaam is verplicht", variant: "destructive" });
      return;
    }
    
    setCreatingQuote(true);
    try {
      const result = await api.createLocalQuote(newQuoteForm);
      toast({ title: "Succes", description: `Offerte ${result.quote_number} aangemaakt` });
      setShowNewQuoteDialog(false);
      fetchQuotes();
    } catch (error) {
      toast({ title: "Fout", description: "Kon offerte niet aanmaken", variant: "destructive" });
    } finally {
      setCreatingQuote(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("nl-NL");
  };

  const formatCurrency = (amount: number | string | null) => {
    if (amount === null) return "€0,00";
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return `€${num.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Totaal</p>
              </div>
            </CardContent>
          </Card>
          {Object.entries(statusConfig).map(([key, config]) => (
            <Card key={key}>
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">{stats.byStatus[key] || 0}</p>
                  <p className="text-xs text-muted-foreground">{config.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Lokale Offertes</CardTitle>
              <CardDescription>Beheer je lokaal opgeslagen offertes</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleOpenNewQuote}>
                <Plus className="w-4 h-4 mr-2" />
                Nieuwe offerte
              </Button>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle statussen</SelectItem>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={fetchQuotes}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Laden...</p>
          ) : quotes.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Geen offertes gevonden</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nummer</TableHead>
                    <TableHead>Klant</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Vervalt</TableHead>
                    <TableHead className="text-right">Totaal incl.</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-mono text-sm">
                        {quote.quote_number || `#${quote.id}`}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{quote.customer_name}</p>
                          {quote.customer_email && (
                            <p className="text-xs text-muted-foreground">{quote.customer_email}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(quote.quote_date)}</TableCell>
                      <TableCell>{formatDate(quote.expiration_date)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(quote.total_incl)}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusConfig[quote.status]?.color} text-white`}>
                          {statusConfig[quote.status]?.label || quote.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewQuote(quote.id)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleExportPDF(quote)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(quote.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Offerte {selectedQuote?.quote_number || `#${selectedQuote?.id}`}
            </DialogTitle>
            <DialogDescription>
              Bekijk en beheer de offerte details
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="py-8 text-center text-muted-foreground">Laden...</div>
          ) : selectedQuote ? (
            <div className="space-y-6">
              {/* Status & Actions */}
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Select
                    value={selectedQuote.status}
                    onValueChange={(value) => handleStatusChange(selectedQuote.id, value)}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleExportPDF(selectedQuote)}>
                    <Download className="w-4 h-4 mr-2" />
                    PDF
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDelete(selectedQuote.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Verwijderen
                  </Button>
                </div>
              </div>

              {/* Customer Info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Klantgegevens</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedQuote.customer_name}</span>
                  </div>
                  {selectedQuote.customer_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <a href={`mailto:${selectedQuote.customer_email}`} className="text-primary hover:underline">
                        {selectedQuote.customer_email}
                      </a>
                    </div>
                  )}
                  {selectedQuote.customer_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <a href={`tel:${selectedQuote.customer_phone}`} className="text-primary hover:underline">
                        {selectedQuote.customer_phone}
                      </a>
                    </div>
                  )}
                  {selectedQuote.customer_address && (
                    <div className="flex items-start gap-2 col-span-2">
                      <span className="text-muted-foreground text-sm">Adres:</span>
                      <span className="text-sm">{selectedQuote.customer_address}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Dates */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Offertedatum</p>
                  <p className="font-medium">{formatDate(selectedQuote.quote_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vervaldatum</p>
                  <p className="font-medium">{formatDate(selectedQuote.expiration_date)}</p>
                </div>
                {selectedQuote.sent_at && (
                  <div>
                    <p className="text-xs text-muted-foreground">Verzonden</p>
                    <p className="font-medium">{formatDate(selectedQuote.sent_at)}</p>
                  </div>
                )}
                {selectedQuote.accepted_at && (
                  <div>
                    <p className="text-xs text-muted-foreground">Geaccepteerd</p>
                    <p className="font-medium">{formatDate(selectedQuote.accepted_at)}</p>
                  </div>
                )}
              </div>

              {/* Line Items */}
              {selectedQuote.items && selectedQuote.items.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Productregels</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Omschrijving</TableHead>
                          <TableHead className="text-right">Aantal</TableHead>
                          <TableHead className="text-right">Prijs</TableHead>
                          <TableHead className="text-right">BTW</TableHead>
                          <TableHead className="text-right">Totaal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedQuote.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                <p>{item.description}</p>
                                {item.product_code && (
                                  <p className="text-xs text-muted-foreground">{item.product_code}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {item.quantity} {item.unit}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.price_per_unit)}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.vat_percentage}%
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(item.line_total_incl)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Totals */}
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotaal excl. BTW</span>
                      <span>{formatCurrency(selectedQuote.subtotal_excl)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">BTW</span>
                      <span>{formatCurrency(selectedQuote.vat_amount)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Totaal incl. BTW</span>
                      <span>{formatCurrency(selectedQuote.total_incl)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              {(selectedQuote.customer_note || selectedQuote.internal_note) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {selectedQuote.customer_note && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Notitie voor klant</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm whitespace-pre-wrap">{selectedQuote.customer_note}</p>
                      </CardContent>
                    </Card>
                  )}
                  {selectedQuote.internal_note && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Interne notitie</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm whitespace-pre-wrap">{selectedQuote.internal_note}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* New Quote Dialog */}
      <Dialog open={showNewQuoteDialog} onOpenChange={setShowNewQuoteDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nieuwe Offerte Aanmaken</DialogTitle>
            <DialogDescription>
              Maak handmatig een nieuwe offerte aan
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Customer Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Klantnaam *</Label>
                <Input
                  value={newQuoteForm.customer_name}
                  onChange={(e) => setNewQuoteForm((prev) => ({ ...prev, customer_name: e.target.value }))}
                  placeholder="Naam van de klant"
                />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={newQuoteForm.customer_email || ""}
                  onChange={(e) => setNewQuoteForm((prev) => ({ ...prev, customer_email: e.target.value }))}
                  placeholder="klant@email.nl"
                />
              </div>
              <div>
                <Label>Telefoon</Label>
                <Input
                  value={newQuoteForm.customer_phone || ""}
                  onChange={(e) => setNewQuoteForm((prev) => ({ ...prev, customer_phone: e.target.value }))}
                  placeholder="06-12345678"
                />
              </div>
              <div>
                <Label>Adres</Label>
                <Input
                  value={newQuoteForm.customer_address || ""}
                  onChange={(e) => setNewQuoteForm((prev) => ({ ...prev, customer_address: e.target.value }))}
                  placeholder="Straat 1, 1234 AB Plaats"
                />
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Productregels</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                  <Plus className="w-4 h-4 mr-1" /> Regel toevoegen
                </Button>
              </div>
              
              <div className="space-y-3">
                {(newQuoteForm.items || []).map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg">
                    <div className="col-span-12 sm:col-span-5">
                      <Label className="text-xs">Omschrijving</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => handleItemChange(index, "description", e.target.value)}
                        placeholder="Product of dienst"
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <Label className="text-xs">Aantal</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity || 1}
                        onChange={(e) => handleItemChange(index, "quantity", parseFloat(e.target.value) || 1)}
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <Label className="text-xs">Prijs excl.</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.price_per_unit || 0}
                        onChange={(e) => handleItemChange(index, "price_per_unit", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-2">
                      <Label className="text-xs">BTW %</Label>
                      <Select
                        value={String(item.vat_percentage || 21)}
                        onValueChange={(v) => handleItemChange(index, "vat_percentage", parseInt(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="21">21%</SelectItem>
                          <SelectItem value="9">9%</SelectItem>
                          <SelectItem value="0">0%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(index)}
                        disabled={(newQuoteForm.items || []).length <= 1}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="space-y-1 text-right">
                  <div className="flex justify-end gap-8">
                    <span className="text-muted-foreground">Subtotaal excl. BTW:</span>
                    <span className="font-medium w-24">{formatCurrency(calculateTotals().subtotal)}</span>
                  </div>
                  <div className="flex justify-end gap-8">
                    <span className="text-muted-foreground">BTW:</span>
                    <span className="font-medium w-24">{formatCurrency(calculateTotals().vat)}</span>
                  </div>
                  <div className="flex justify-end gap-8 text-lg font-bold border-t pt-2 mt-2">
                    <span>Totaal incl. BTW:</span>
                    <span className="w-24">{formatCurrency(calculateTotals().total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Notitie voor klant</Label>
                <Textarea
                  value={newQuoteForm.customer_note || ""}
                  onChange={(e) => setNewQuoteForm((prev) => ({ ...prev, customer_note: e.target.value }))}
                  placeholder="Wordt getoond op de offerte..."
                  rows={3}
                />
              </div>
              <div>
                <Label>Interne notitie</Label>
                <Textarea
                  value={newQuoteForm.internal_note || ""}
                  onChange={(e) => setNewQuoteForm((prev) => ({ ...prev, internal_note: e.target.value }))}
                  placeholder="Alleen zichtbaar voor admin..."
                  rows={3}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowNewQuoteDialog(false)}>
                Annuleren
              </Button>
              <Button onClick={handleCreateQuote} disabled={creatingQuote}>
                {creatingQuote ? "Aanmaken..." : "Offerte aanmaken"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLocalQuotes;
