import { useState, useEffect } from "react";
import { api, apiRequest, Product } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  RefreshCw, Search, Link2, Unlink, CheckCircle2, XCircle, 
  Clock, AlertTriangle, Loader2, ExternalLink, Download
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface WascoMapping {
  id: number;
  product_id: string;
  wasco_article_number: string;
  last_synced_at: string | null;
  last_bruto_price: number | null;
  last_netto_price: number | null;
  product_name: string;
  product_brand: string;
  category: string;
  purchase_price: number | null;
  base_price: number;
}

interface WascoSearchResult {
  articleNumber: string;
  name: string;
  url: string;
}

interface SyncResult {
  total: number;
  success: number;
  failed: number;
  updated: number;
  skipped: number;
  details: Array<{
    productId: string;
    articleNumber: string;
    name?: string;
    status: string;
    message?: string;
    brutoPrice?: number;
    nettoPrice?: number;
    purchasePrice?: number;
  }>;
}

const WascoSync = () => {
  const [mappings, setMappings] = useState<WascoMapping[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionOk, setConnectionOk] = useState<boolean | null>(null);
  
  // Add mapping dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [articleNumber, setArticleNumber] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<WascoSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  
  // Sync results
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mappingsData, productsData] = await Promise.all([
        apiRequest<WascoMapping[]>('/wasco/mappings').catch(() => []),
        api.getAdminProducts().catch(() => []),
      ]);
      setMappings(mappingsData);
      setProducts(productsData);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setConnectionOk(null);
    try {
      const result = await apiRequest<{ success: boolean; error?: string }>('/wasco/test-connection', {
        method: 'POST',
      });
      setConnectionOk(result.success);
      toast.success("Verbinding met Wasco.nl succesvol!");
    } catch (err: any) {
      setConnectionOk(false);
      toast.error(`Verbinding mislukt: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleAddMapping = async () => {
    if (!selectedProduct || !articleNumber) {
      toast.error("Selecteer een product en vul een artikelnummer in");
      return;
    }
    try {
      await apiRequest('/wasco/mappings', {
        method: 'POST',
        body: JSON.stringify({
          product_id: selectedProduct,
          wasco_article_number: articleNumber,
        }),
      });
      toast.success("Koppeling opgeslagen");
      setShowAddDialog(false);
      setSelectedProduct("");
      setArticleNumber("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteMapping = async (id: number) => {
    if (!confirm("Weet je zeker dat je deze koppeling wilt verwijderen?")) return;
    try {
      await apiRequest(`/wasco/mappings/${id}`, { method: 'DELETE' });
      toast.success("Koppeling verwijderd");
      fetchData();
    } catch {
      toast.error("Verwijderen mislukt");
    }
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await apiRequest<SyncResult>('/wasco/sync', {
        method: 'POST',
      });
      setSyncResult(result);
      setShowResults(true);
      toast.success(`Sync voltooid: ${result.updated} producten bijgewerkt`);
      fetchData();
    } catch (err: any) {
      toast.error(`Sync mislukt: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncSingle = async (productId: string) => {
    try {
      toast.info("Product wordt gesynchroniseerd...");
      const result = await apiRequest<SyncResult>(`/wasco/sync/${productId}`, {
        method: 'POST',
      });
      if (result.details[0]?.status === 'updated') {
        toast.success(`Prijs bijgewerkt: €${result.details[0].purchasePrice?.toFixed(2)}`);
      } else {
        toast.warning(result.details[0]?.message || 'Geen update');
      }
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await apiRequest<WascoSearchResult[]>(`/wasco/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(results);
    } catch (err: any) {
      toast.error(`Zoeken mislukt: ${err.message}`);
    } finally {
      setSearching(false);
    }
  };

  // Products not yet mapped
  const unmappedProducts = products.filter(
    p => !mappings.find(m => m.product_id === p.id)
  );

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return "-";
    return `€${price.toFixed(2)}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Nooit";
    return new Date(dateStr).toLocaleString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Connection Status & Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Wasco Prijssynchronisatie
              </CardTitle>
              <CardDescription>
                Automatisch inkoopprijzen ophalen van Wasco.nl
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={testConnection}
                disabled={testing}
              >
                {testing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : connectionOk === true ? (
                  <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                ) : connectionOk === false ? (
                  <XCircle className="w-4 h-4 mr-2 text-red-500" />
                ) : (
                  <Link2 className="w-4 h-4 mr-2" />
                )}
                Test Verbinding
              </Button>
              <Button
                onClick={handleSyncAll}
                disabled={syncing || mappings.length === 0}
              >
                {syncing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Alle Prijzen Ophalen
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-muted/30 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold">{mappings.length}</p>
              <p className="text-sm text-muted-foreground">Gekoppelde producten</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold">{unmappedProducts.length}</p>
              <p className="text-sm text-muted-foreground">Niet gekoppeld</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold">
                {mappings.filter(m => m.last_synced_at).length}
              </p>
              <p className="text-sm text-muted-foreground">Laatst gesynchroniseerd</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Mappings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Productkoppelingen</CardTitle>
              <CardDescription>
                Koppel je producten aan Wasco artikelnummers
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddDialog(true)} disabled={unmappedProducts.length === 0}>
              <Link2 className="w-4 h-4 mr-2" />
              Koppeling Toevoegen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : mappings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Link2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Nog geen koppelingen</p>
              <p className="text-sm mt-1">Koppel je producten aan Wasco artikelnummers om prijzen automatisch op te halen.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {mappings.map((mapping) => (
                <div key={mapping.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">{mapping.product_name}</span>
                        <Badge variant="secondary" className="text-xs">{mapping.product_brand}</Badge>
                        <Badge variant="outline" className="text-xs">{mapping.category}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" />
                          Wasco #{mapping.wasco_article_number}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(mapping.last_synced_at)}
                        </span>
                      </div>
                      <div className="flex gap-4 mt-2 text-sm">
                        <span>
                          Bruto: <strong>{formatPrice(mapping.last_bruto_price)}</strong>
                        </span>
                        <span>
                          Netto: <strong className="text-green-600">{formatPrice(mapping.last_netto_price)}</strong>
                        </span>
                        <span>
                          Inkoopprijs: <strong>{formatPrice(mapping.purchase_price)}</strong>
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSyncSingle(mapping.product_id)}
                      >
                        <RefreshCw className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteMapping(mapping.id)}
                        className="text-destructive"
                      >
                        <Unlink className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Mapping Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Product Koppelen aan Wasco</DialogTitle>
            <DialogDescription>
              Selecteer een product en voer het Wasco artikelnummer in
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Product</label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer een product..." />
                </SelectTrigger>
                <SelectContent>
                  {unmappedProducts.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.brand} {p.name} ({p.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Wasco Artikelnummer</label>
              <div className="flex gap-2">
                <Input
                  placeholder="bijv. 7817827"
                  value={articleNumber}
                  onChange={(e) => setArticleNumber(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Vind het artikelnummer op wasco.nl/artikel/NUMMER
              </p>
            </div>

            {/* Wasco Search */}
            <div className="border-t pt-4">
              <label className="text-sm font-medium mb-1 block">Zoek op Wasco.nl</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Zoek bijv. 'Haier Serene 2.5kW'"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button variant="outline" onClick={handleSearch} disabled={searching}>
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
              {searchResults.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto border rounded-lg">
                  {searchResults.map((result) => (
                    <button
                      key={result.articleNumber}
                      className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm border-b last:border-b-0"
                      onClick={() => {
                        setArticleNumber(result.articleNumber);
                        setSearchResults([]);
                      }}
                    >
                      <span className="font-medium">#{result.articleNumber}</span>
                      <span className="ml-2 text-muted-foreground">{result.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button onClick={handleAddMapping} className="w-full">
              Koppeling Opslaan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sync Results Dialog */}
      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Synchronisatie Resultaat</DialogTitle>
            <DialogDescription>
              {syncResult && `${syncResult.updated} van ${syncResult.total} producten bijgewerkt`}
            </DialogDescription>
          </DialogHeader>
          {syncResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2 text-center text-sm">
                <div className="bg-muted/30 rounded p-2">
                  <p className="font-bold">{syncResult.total}</p>
                  <p className="text-xs text-muted-foreground">Totaal</p>
                </div>
                <div className="bg-green-50 rounded p-2">
                  <p className="font-bold text-green-600">{syncResult.updated}</p>
                  <p className="text-xs text-muted-foreground">Bijgewerkt</p>
                </div>
                <div className="bg-yellow-50 rounded p-2">
                  <p className="font-bold text-yellow-600">{syncResult.skipped}</p>
                  <p className="text-xs text-muted-foreground">Overgeslagen</p>
                </div>
                <div className="bg-red-50 rounded p-2">
                  <p className="font-bold text-red-600">{syncResult.failed}</p>
                  <p className="text-xs text-muted-foreground">Mislukt</p>
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {syncResult.details.map((detail, i) => (
                  <div key={i} className="flex items-center justify-between text-sm border-b pb-2">
                    <div>
                      <span className="font-medium">{detail.name || detail.productId}</span>
                      <span className="text-muted-foreground ml-2">#{detail.articleNumber}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {detail.status === 'updated' ? (
                        <>
                          <span className="text-green-600 font-medium">€{detail.purchasePrice?.toFixed(2)}</span>
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        </>
                      ) : detail.status === 'error' ? (
                        <>
                          <span className="text-xs text-red-500 max-w-32 truncate">{detail.message}</span>
                          <XCircle className="w-4 h-4 text-red-500" />
                        </>
                      ) : (
                        <>
                          <span className="text-xs text-yellow-500">{detail.message}</span>
                          <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WascoSync;
