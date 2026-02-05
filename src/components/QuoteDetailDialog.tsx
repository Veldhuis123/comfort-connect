import { useState, useEffect } from "react";
import { 
  Trash2, Mail, Phone, Calendar, Image, FileText, 
  Send, X, Loader2, MapPin, Ruler, Thermometer, Package, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api, QuoteRequest, QuotePhoto, API_URL, apiRequest } from "@/lib/api";

interface QuoteDetailDialogProps {
  quote: QuoteRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
  onUpdated: () => void;
}

interface Relatie {
  id: string;
  code: string;
  bedrijf: string;
  contactpersoon: string;
  email: string;
  telefoon: string;
}

interface ProductRegel {
  omschrijving: string;
  code: string;
  aantal: number;
  eenheid: string;
  prijsPerEenheid: number;
}

const statusColors: Record<string, string> = {
  nieuw: "bg-blue-500 text-white",
  in_behandeling: "bg-yellow-500 text-white",
  offerte_verstuurd: "bg-purple-500 text-white",
  akkoord: "bg-green-500 text-white",
  afgewezen: "bg-red-500 text-white",
  voltooid: "bg-gray-500 text-white",
};

const QuoteDetailDialog = ({ 
  quote, 
  open, 
  onOpenChange, 
  onDeleted,
  onUpdated 
}: QuoteDetailDialogProps) => {
  const { toast } = useToast();
  const [photos, setPhotos] = useState<QuotePhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showOfferteDialog, setShowOfferteDialog] = useState(false);
  const [relaties, setRelaties] = useState<Relatie[]>([]);
  const [selectedRelatieId, setSelectedRelatieId] = useState<string>("");
  const [productRegels, setProductRegels] = useState<ProductRegel[]>([]);
  const [notitieKlant, setNotitieKlant] = useState("");
  const [isCreatingOfferte, setIsCreatingOfferte] = useState(false);
  const [loadingRelaties, setLoadingRelaties] = useState(false);

  // Fetch quote details with photos when opened
  useEffect(() => {
    if (open && quote) {
      fetchQuoteDetails();
    }
  }, [open, quote]);

  // Initialize product regels when opening offerte dialog
  useEffect(() => {
    if (showOfferteDialog && quote) {
      initializeProductRegels();
    }
  }, [showOfferteDialog, quote]);

  const fetchQuoteDetails = async () => {
    if (!quote) return;
    setLoadingPhotos(true);
    try {
      const details = await api.getQuote(quote.id);
      setPhotos(details.photos || []);
    } catch (error) {
      console.error('Failed to fetch quote details:', error);
    } finally {
      setLoadingPhotos(false);
    }
  };

  const initializeProductRegels = () => {
    if (!quote) return;
    
    const regels: ProductRegel[] = [];
    
    // Add airco unit
    if (quote.selected_airco_name) {
      regels.push({
        omschrijving: `Airco ${quote.selected_airco_brand || ''} ${quote.selected_airco_name}`,
        code: quote.selected_airco_id || '',
        aantal: 1,
        eenheid: 'stuk',
        prijsPerEenheid: Number(quote.estimated_price || 0) * 0.6 // Estimate airco is 60% of total
      });
    }
    
    // Add pipe/leiding
    if (quote.pipe_length) {
      regels.push({
        omschrijving: `Koelleiding ${quote.pipe_color || 'wit'}`,
        code: 'LEIDING',
        aantal: Number(quote.pipe_length),
        eenheid: 'meter',
        prijsPerEenheid: 25 // €25 per meter estimate
      });
    }
    
    // Add goot (pipe cover)
    regels.push({
      omschrijving: 'Leidinggoot',
      code: 'GOOT',
      aantal: quote.pipe_length ? Number(quote.pipe_length) : 5,
      eenheid: 'meter',
      prijsPerEenheid: 15 // €15 per meter estimate
    });
    
    // Add installation labor
    regels.push({
      omschrijving: 'Installatiewerkzaamheden',
      code: 'INSTALL',
      aantal: 1,
      eenheid: 'stuk',
      prijsPerEenheid: 350 // €350 flat rate estimate
    });
    
    setProductRegels(regels);
    setNotitieKlant(quote.additional_notes || '');
  };

  const fetchRelaties = async () => {
    setLoadingRelaties(true);
    try {
      const data = await apiRequest<Relatie[]>('/eboekhouden/relaties');
      setRelaties(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch relaties:', error);
      toast({
        title: "Fout",
        description: "Kon klanten niet ophalen uit e-Boekhouden",
        variant: "destructive",
      });
    } finally {
      setLoadingRelaties(false);
    }
  };

  const handleDelete = async () => {
    if (!quote) return;
    setIsDeleting(true);
    try {
      await api.deleteQuote(quote.id);
      toast({
        title: "Offerte verwijderd",
        description: `Offerte #${quote.id} is verwijderd`,
      });
      setShowDeleteConfirm(false);
      onOpenChange(false);
      onDeleted();
    } catch (error) {
      toast({
        title: "Fout",
        description: "Kon offerte niet verwijderen",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenOfferteDialog = () => {
    setShowOfferteDialog(true);
    fetchRelaties();
  };

  const handleAddRegel = () => {
    setProductRegels([...productRegels, {
      omschrijving: '',
      code: '',
      aantal: 1,
      eenheid: 'stuk',
      prijsPerEenheid: 0
    }]);
  };

  const handleRemoveRegel = (index: number) => {
    setProductRegels(productRegels.filter((_, i) => i !== index));
  };

  const handleRegelChange = (index: number, field: keyof ProductRegel, value: string | number) => {
    const newRegels = [...productRegels];
    newRegels[index] = { ...newRegels[index], [field]: value };
    setProductRegels(newRegels);
  };

  const calculateTotaal = () => {
    return productRegels.reduce((sum, r) => sum + (r.aantal * r.prijsPerEenheid), 0);
  };

  const handleCreateOfferte = async () => {
    if (!quote || !selectedRelatieId) {
      toast({
        title: "Selecteer een klant",
        description: "Kies een klant uit e-Boekhouden of maak eerst een nieuwe aan",
        variant: "destructive",
      });
      return;
    }

    if (productRegels.length === 0 || productRegels.every(r => !r.omschrijving)) {
      toast({
        title: "Voeg productregels toe",
        description: "Een offerte moet minimaal 1 productregel bevatten",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingOfferte(true);
    try {
      // Find selected relation details
      const selectedRelatie = relaties.find(r => String(r.id) === selectedRelatieId);
      
      // Create offerte locally (e-Boekhouden has no quote API)
      await apiRequest('/eboekhouden/offertes', {
        method: 'POST',
        body: JSON.stringify({
          relatieId: selectedRelatieId ? Number(selectedRelatieId) : null,
          klantnaam: selectedRelatie?.bedrijf || selectedRelatie?.contactpersoon || quote?.customer_name || 'Onbekend',
          klantEmail: selectedRelatie?.email || quote?.customer_email || null,
          klantTelefoon: selectedRelatie?.telefoon || quote?.customer_phone || null,
          klantAdres: null, // Could be expanded later
          regels: productRegels.filter(r => r.omschrijving).map(r => ({
            omschrijving: r.omschrijving,
            code: r.code || null,
            aantal: r.aantal,
            eenheid: r.eenheid,
            prijsPerEenheid: r.prijsPerEenheid,
            btwPercentage: 21,
            btwCode: 'HOOG_VERK_21'
          })),
          notitieKlant: notitieKlant || null,
          quoteRequestId: quote?.id || null
        }),
      });

      // Update quote status
      await api.updateQuoteStatus(quote.id, 'offerte_verstuurd');

      toast({
        title: "Offerte aangemaakt!",
        description: "De offerte is lokaal opgeslagen. Je kunt deze later overnemen in e-Boekhouden.",
      });

      setShowOfferteDialog(false);
      onUpdated();
    } catch (error: any) {
      console.error('Failed to create offerte:', error);
      toast({
        title: "Fout bij aanmaken offerte",
        description: error.message || "Kon offerte niet opslaan",
        variant: "destructive",
      });
    } finally {
      setIsCreatingOfferte(false);
    }
  };

  const getPhotoUrl = (photo: QuotePhoto) => {
    // Determine the backend base URL
    // In development via Vite proxy, API_URL is '/api' so we use the same origin
    // In production, API_URL might be a full URL
    const baseUrl = API_URL.startsWith('http') 
      ? API_URL.replace('/api', '') 
      : window.location.origin;
    
    // Clean up the file path - remove leading ./ if present
    const cleanPath = photo.file_path.replace(/^\.\//, '');
    
    return `${baseUrl}/${cleanPath}`;
  };

  if (!quote) return null;

  // Parse rooms
  let rooms: any[] = [];
  try {
    rooms = typeof quote.rooms === 'string' ? JSON.parse(quote.rooms) : (quote.rooms || []);
  } catch (e) {
    rooms = [];
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl">
                  Offerte #{quote.id}
                </DialogTitle>
                <DialogDescription>
                  {quote.selected_airco_brand} {quote.selected_airco_name}
                </DialogDescription>
              </div>
              <Badge className={statusColors[quote.status]}>
                {quote.status.replace("_", " ")}
              </Badge>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Klantgegevens */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Klantgegevens
              </h3>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                {quote.customer_name && (
                  <div>
                    <span className="text-muted-foreground">Naam:</span>{" "}
                    <span className="font-medium">{quote.customer_name}</span>
                  </div>
                )}
                {quote.customer_email && (
                  <div className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-muted-foreground" />
                    <a href={`mailto:${quote.customer_email}`} className="text-accent hover:underline">
                      {quote.customer_email}
                    </a>
                  </div>
                )}
                {quote.customer_phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-muted-foreground" />
                    <a href={`tel:${quote.customer_phone}`} className="text-accent hover:underline">
                      {quote.customer_phone}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  {new Date(quote.created_at).toLocaleString('nl-NL')}
                </div>
              </div>
            </div>

            {/* Specificaties */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Thermometer className="w-4 h-4" />
                Specificaties
              </h3>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Airco:</span>{" "}
                  <span className="font-medium">{quote.selected_airco_brand} {quote.selected_airco_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Prijs:</span>{" "}
                  <span className="font-bold text-accent">€{Number(quote.estimated_price || 0).toLocaleString('nl-NL')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Oppervlakte:</span>{" "}
                  <span className="font-medium">{quote.total_size}m²</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Capaciteit:</span>{" "}
                  <span className="font-medium">{Number(quote.total_capacity || 0).toFixed(1)} kW</span>
                </div>
                {quote.pipe_color && (
                  <div>
                    <span className="text-muted-foreground">Leidingkleur:</span>{" "}
                    <span className="font-medium">{quote.pipe_color}</span>
                  </div>
                )}
                {quote.pipe_length && (
                  <div>
                    <span className="text-muted-foreground">Leidinglengte:</span>{" "}
                    <span className="font-medium">{quote.pipe_length}m</span>
                  </div>
                )}
              </div>
            </div>

            {/* Ruimtes */}
            {rooms.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Ruimtes ({rooms.length})
                </h3>
                <div className="space-y-2">
                  {rooms.map((room: any, index: number) => (
                    <div key={index} className="text-sm flex items-center gap-2">
                      <span className="bg-accent/20 text-accent px-2 py-0.5 rounded text-xs">
                        {index + 1}
                      </span>
                      <span>{room.name || room.type}:</span>
                      <span className="font-medium">{room.size}m²</span>
                      {room.ceilingHeight && (
                        <span className="text-muted-foreground">(plafond: {room.ceilingHeight}m)</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Opmerkingen */}
            {quote.additional_notes && (
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Opmerkingen klant</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {quote.additional_notes}
                </p>
              </div>
            )}

            {/* Foto's */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Image className="w-4 h-4" />
                Foto's ({photos.length})
              </h3>
              {loadingPhotos ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Laden...
                </div>
              ) : photos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Geen foto's geüpload</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative group">
                      <img
                        src={getPhotoUrl(photo)}
                        alt={photo.file_name}
                        className="w-full aspect-square object-cover rounded-lg border cursor-pointer hover:opacity-90"
                        onClick={() => window.open(getPhotoUrl(photo), '_blank')}
                        onError={(e) => {
                          console.error('Failed to load photo:', getPhotoUrl(photo));
                          (e.target as HTMLImageElement).src = '/placeholder.svg';
                        }}
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 rounded-b-lg truncate">
                        {photo.category}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 mt-6">
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full sm:w-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Verwijderen
            </Button>
            <div className="flex-1" />
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Sluiten
            </Button>
            <Button
              onClick={handleOpenOfferteDialog}
              className="w-full sm:w-auto bg-accent hover:bg-accent/90"
            >
              <FileText className="w-4 h-4 mr-2" />
              Behandelen / Offerte maken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Offerte verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je offerte #{quote.id} wilt verwijderen? 
              Dit kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verwijderen...
                </>
              ) : (
                "Verwijderen"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Offerte Dialog */}
      <Dialog open={showOfferteDialog} onOpenChange={setShowOfferteDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Offerte aanmaken</DialogTitle>
            <DialogDescription>
              Maak een officiële offerte aan. Deze wordt lokaal opgeslagen en kun je later overnemen in e-Boekhouden.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Klant selecteren */}
            <div>
              <Label>Klant selecteren *</Label>
              {loadingRelaties ? (
                <div className="flex items-center gap-2 text-muted-foreground py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Klanten laden...
                </div>
              ) : (
                <Select value={selectedRelatieId} onValueChange={setSelectedRelatieId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer een klant" />
                  </SelectTrigger>
                  <SelectContent>
                    {relaties.map((relatie) => (
                      <SelectItem key={relatie.id} value={relatie.id}>
                        {relatie.bedrijf || relatie.contactpersoon} ({relatie.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Klant niet in lijst? Maak eerst aan in e-Boekhouden tab.
              </p>
            </div>

            {/* Productregels tabel */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Productregels</Label>
                <Button size="sm" variant="outline" onClick={handleAddRegel}>
                  <Plus className="w-4 h-4 mr-1" />
                  Regel toevoegen
                </Button>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-2 font-medium">Omschrijving</th>
                        <th className="text-left p-2 font-medium w-20">Code</th>
                        <th className="text-right p-2 font-medium w-20">Aantal</th>
                        <th className="text-left p-2 font-medium w-20">Eenheid</th>
                        <th className="text-right p-2 font-medium w-28">Prijs p.e.</th>
                        <th className="text-right p-2 font-medium w-28">Totaal</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {productRegels.map((regel, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-1">
                            <Input
                              value={regel.omschrijving}
                              onChange={(e) => handleRegelChange(index, 'omschrijving', e.target.value)}
                              placeholder="Omschrijving"
                              className="h-8"
                            />
                          </td>
                          <td className="p-1">
                            <Input
                              value={regel.code}
                              onChange={(e) => handleRegelChange(index, 'code', e.target.value)}
                              placeholder="Code"
                              className="h-8"
                            />
                          </td>
                          <td className="p-1">
                            <Input
                              type="number"
                              value={regel.aantal}
                              onChange={(e) => handleRegelChange(index, 'aantal', parseFloat(e.target.value) || 0)}
                              className="h-8 text-right"
                              min="0"
                              step="0.5"
                            />
                          </td>
                          <td className="p-1">
                            <Select 
                              value={regel.eenheid} 
                              onValueChange={(v) => handleRegelChange(index, 'eenheid', v)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="stuk">stuk</SelectItem>
                                <SelectItem value="meter">meter</SelectItem>
                                <SelectItem value="uur">uur</SelectItem>
                                <SelectItem value="m2">m²</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-1">
                            <Input
                              type="number"
                              value={regel.prijsPerEenheid}
                              onChange={(e) => handleRegelChange(index, 'prijsPerEenheid', parseFloat(e.target.value) || 0)}
                              className="h-8 text-right"
                              min="0"
                              step="0.01"
                            />
                          </td>
                          <td className="p-2 text-right font-medium">
                            €{(regel.aantal * regel.prijsPerEenheid).toFixed(2)}
                          </td>
                          <td className="p-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleRemoveRegel(index)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {productRegels.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-4 text-center text-muted-foreground">
                            Geen productregels. Klik op "Regel toevoegen" om te beginnen.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-muted/30 border-t">
                      <tr>
                        <td colSpan={5} className="p-2 text-right font-semibold">
                          Totaal excl. BTW:
                        </td>
                        <td className="p-2 text-right font-bold text-accent">
                          €{calculateTotaal().toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                      <tr>
                        <td colSpan={5} className="p-2 text-right text-muted-foreground">
                          BTW 21%:
                        </td>
                        <td className="p-2 text-right text-muted-foreground">
                          €{(calculateTotaal() * 0.21).toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                      <tr className="border-t">
                        <td colSpan={5} className="p-2 text-right font-semibold">
                          Totaal incl. BTW:
                        </td>
                        <td className="p-2 text-right font-bold text-lg">
                          €{(calculateTotaal() * 1.21).toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* Notitie voor klant */}
            <div>
              <Label>Notitie voor klant (optioneel)</Label>
              <Textarea
                value={notitieKlant}
                onChange={(e) => setNotitieKlant(e.target.value)}
                placeholder="Eventuele opmerkingen voor de klant..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowOfferteDialog(false)}>
              Annuleren
            </Button>
            <Button
              onClick={handleCreateOfferte}
              disabled={isCreatingOfferte || !selectedRelatieId}
              className="bg-accent hover:bg-accent/90"
            >
              {isCreatingOfferte ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Aanmaken...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Offerte aanmaken
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QuoteDetailDialog;
