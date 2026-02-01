import { useState, useEffect } from "react";
import { 
  Trash2, Mail, Phone, Calendar, Image, FileText, ExternalLink, 
  Send, X, Loader2, MapPin, Ruler, Thermometer, Package
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
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [relaties, setRelaties] = useState<Relatie[]>([]);
  const [selectedRelatieId, setSelectedRelatieId] = useState<string>("");
  const [invoiceDescription, setInvoiceDescription] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [loadingRelaties, setLoadingRelaties] = useState(false);

  // Fetch quote details with photos when opened
  useEffect(() => {
    if (open && quote) {
      fetchQuoteDetails();
      setInvoiceDescription(`Airco installatie - ${quote.selected_airco_brand || ''} ${quote.selected_airco_name || ''}`);
      setInvoiceAmount(quote.estimated_price?.toString() || "");
    }
  }, [open, quote]);

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

  const handleOpenInvoiceDialog = () => {
    setShowInvoiceDialog(true);
    fetchRelaties();
  };

  const handleCreateInvoice = async () => {
    if (!quote || !selectedRelatieId) {
      toast({
        title: "Selecteer een klant",
        description: "Kies een klant uit e-Boekhouden of maak eerst een nieuwe aan",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingInvoice(true);
    try {
      // Parse rooms if available
      let rooms = [];
      try {
        rooms = typeof quote.rooms === 'string' ? JSON.parse(quote.rooms) : quote.rooms;
      } catch (e) {
        rooms = [];
      }

      // Build description with all quote details
      let fullDescription = invoiceDescription;
      if (rooms.length > 0) {
        fullDescription += `\n\nRuimtes:\n${rooms.map((r: any, i: number) => 
          `${i + 1}. ${r.name || r.type}: ${r.size}m²`
        ).join('\n')}`;
      }
      if (quote.total_size) {
        fullDescription += `\n\nTotaal oppervlakte: ${quote.total_size}m²`;
      }
      if (quote.pipe_color) {
        fullDescription += `\nLeidingkleur: ${quote.pipe_color}`;
      }
      if (quote.pipe_length) {
        fullDescription += `\nLeidinglengte: ${quote.pipe_length}m`;
      }
      if (quote.additional_notes) {
        fullDescription += `\n\nOpmerkingen: ${quote.additional_notes}`;
      }

      // Create invoice in e-Boekhouden
      await apiRequest('/eboekhouden/facturen', {
        method: 'POST',
        body: JSON.stringify({
          relatieId: selectedRelatieId,
          regels: [{
            omschrijving: fullDescription,
            aantal: 1,
            prijsPerEenheid: parseFloat(invoiceAmount) || quote.estimated_price || 0,
            btwCode: 'HOOG_VERK_21'
          }],
          betalingstermijn: 14,
          opmerkingen: `Offerte aanvraag #${quote.id}`
        }),
      });

      // Update quote status
      await api.updateQuoteStatus(quote.id, 'offerte_verstuurd');

      toast({
        title: "Offerte aangemaakt!",
        description: "De factuur is aangemaakt in e-Boekhouden",
      });

      setShowInvoiceDialog(false);
      onUpdated();
    } catch (error: any) {
      console.error('Failed to create invoice:', error);
      toast({
        title: "Fout bij aanmaken factuur",
        description: error.message || "Kon factuur niet aanmaken in e-Boekhouden",
        variant: "destructive",
      });
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const getPhotoUrl = (photo: QuotePhoto) => {
    // Photos are stored with full path in database, serve from backend
    const backendUrl = API_URL.replace('/api', '');
    return `${backendUrl}/${photo.file_path.replace('./uploads/', 'uploads/')}`;
  };

  if (!quote) return null;

  // Parse rooms
  let rooms = [];
  try {
    rooms = typeof quote.rooms === 'string' ? JSON.parse(quote.rooms) : quote.rooms;
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
              onClick={handleOpenInvoiceDialog}
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

      {/* Create Invoice Dialog */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Offerte aanmaken in e-Boekhouden</DialogTitle>
            <DialogDescription>
              Maak een officiële offerte/factuur aan in e-Boekhouden
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Klant selecteren</Label>
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

            <div>
              <Label>Omschrijving</Label>
              <Textarea
                value={invoiceDescription}
                onChange={(e) => setInvoiceDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <Label>Bedrag (excl. BTW)</Label>
              <Input
                type="number"
                step="0.01"
                value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvoiceDialog(false)}>
              Annuleren
            </Button>
            <Button
              onClick={handleCreateInvoice}
              disabled={isCreatingInvoice || !selectedRelatieId}
            >
              {isCreatingInvoice ? (
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
