import { useState, useEffect } from "react";
import { RefreshCw, Users, Package, FileText, CheckCircle, AlertCircle, ExternalLink, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";

interface Relatie {
  id: string;
  code: string;
  bedrijf: string;
  contactpersoon: string;
  email: string;
  telefoon: string;
  adres: string;
  postcode: string;
  plaats: string;
}

interface Artikel {
  id: string;
  code: string;
  omschrijving: string;
  groepId?: number;
  eenheid?: string;
  prijsExcl?: number;
  prijsIncl?: number;
  inkoopprijs?: number;
  btwCode?: string;
  actief?: boolean;
}

interface Factuur {
  id?: string;
  factuurnummer: string;
  relatieId?: string;
  datum: string;
  betalingstermijn?: number;
  totaalExcl?: number;
  totaalBtw?: number;
  totaalIncl?: number;
  openstaand?: number;
  status?: string;
}

const EBoekhoudenSync = () => {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [relaties, setRelaties] = useState<Relatie[]>([]);
  const [artikelen, setArtikelen] = useState<Artikel[]>([]);
  const [facturen, setFacturen] = useState<Factuur[]>([]);
  
  const [newRelatie, setNewRelatie] = useState({ bedrijf: '', contactpersoon: '', email: '', telefoon: '', adres: '', postcode: '', plaats: '' });
  const [newArtikel, setNewArtikel] = useState({ code: '', omschrijving: '', groep: '', verkoopprijs: '' });
  const [showAddRelatie, setShowAddRelatie] = useState(false);
  const [showAddArtikel, setShowAddArtikel] = useState(false);

  const testConnection = async () => {
    setIsLoading(true);
    try {
      await apiRequest('/eboekhouden/test');
      setIsConnected(true);
      toast({ title: "Verbonden met e-Boekhouden!" });
    } catch (error) {
      setIsConnected(false);
      toast({ title: "Verbinding mislukt", description: "Controleer de API credentials", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRelaties = async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<Relatie[]>('/eboekhouden/relaties');
      setRelaties(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Fetch relaties error:', error);
      toast({ title: "Fout bij ophalen klanten", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchArtikelen = async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<Artikel[]>('/eboekhouden/producten');
      setArtikelen(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Fetch producten error:', error);
      toast({ title: "Fout bij ophalen producten", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFacturen = async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<Factuur[]>('/eboekhouden/facturen');
      setFacturen(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Fetch facturen error:', error);
      toast({ title: "Fout bij ophalen facturen", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const addRelatie = async () => {
    if (!newRelatie.bedrijf && !newRelatie.contactpersoon) {
      toast({ title: "Vul bedrijf of contactpersoon in", variant: "destructive" });
      return;
    }
    
    setIsLoading(true);
    try {
      await apiRequest('/eboekhouden/relaties', {
        method: 'POST',
        body: JSON.stringify(newRelatie),
      });
      toast({ title: "Klant toegevoegd aan e-Boekhouden!" });
      setShowAddRelatie(false);
      setNewRelatie({ bedrijf: '', contactpersoon: '', email: '', telefoon: '', adres: '', postcode: '', plaats: '' });
      fetchRelaties();
    } catch (error) {
      toast({ title: "Fout bij toevoegen klant", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const addArtikel = async () => {
    if (!newArtikel.omschrijving) {
      toast({ title: "Vul omschrijving in", variant: "destructive" });
      return;
    }
    
    setIsLoading(true);
    try {
      await apiRequest('/eboekhouden/artikelen', {
        method: 'POST',
        body: JSON.stringify({
          ...newArtikel,
          verkoopprijs: parseFloat(newArtikel.verkoopprijs) || 0,
        }),
      });
      toast({ title: "Product toegevoegd aan e-Boekhouden!" });
      setShowAddArtikel(false);
      setNewArtikel({ code: '', omschrijving: '', groep: '', verkoopprijs: '' });
      fetchArtikelen();
    } catch (error) {
      toast({ title: "Fout bij toevoegen product", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <img 
              src="https://www.e-boekhouden.nl/Content/images/logo-e-boekhouden.svg" 
              alt="e-Boekhouden" 
              className="h-6"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            e-Boekhouden Integratie
          </CardTitle>
          <CardDescription>
            Synchroniseer klanten, producten en facturen met e-Boekhouden.nl
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              {isConnected === null ? (
                <Badge variant="secondary">Controleren...</Badge>
              ) : isConnected ? (
                <Badge className="bg-green-500">
                  <CheckCircle className="w-3 h-3 mr-1" /> Verbonden
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertCircle className="w-3 h-3 mr-1" /> Niet verbonden
                </Badge>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={testConnection} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 sm:mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Test Verbinding</span>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a href="https://www.e-boekhouden.nl" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">e-Boekhouden.nl</span>
              </a>
            </Button>
          </div>
          
          {!isConnected && isConnected !== null && (
            <div className="mt-4 p-4 bg-muted rounded-lg text-sm">
              <p className="font-medium mb-2">Configuratie nodig:</p>
              <p className="text-muted-foreground">
                Voeg de volgende environment variable toe aan je backend .env bestand:
              </p>
              <code className="block mt-2 p-2 bg-background rounded text-xs">
                EBOEKHOUDEN_API_TOKEN=jouw_api_token_hier
              </code>
              <p className="text-muted-foreground mt-2 text-xs">
                Maak een API-token aan via e-Boekhouden.nl → Instellingen → API-tokens
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {isConnected && (
        <Tabs defaultValue="klanten">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="klanten" className="gap-2">
              <Users className="w-4 h-4" /> Klanten
            </TabsTrigger>
            <TabsTrigger value="producten" className="gap-2">
              <Package className="w-4 h-4" /> Producten
            </TabsTrigger>
            <TabsTrigger value="facturen" className="gap-2">
              <FileText className="w-4 h-4" /> Facturen
            </TabsTrigger>
          </TabsList>

          {/* Klanten Tab */}
          <TabsContent value="klanten" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="text-lg">Klanten (Relaties)</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={fetchRelaties} disabled={isLoading}>
                    <RefreshCw className={`w-4 h-4 sm:mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Ophalen</span>
                  </Button>
                  <Dialog open={showAddRelatie} onOpenChange={setShowAddRelatie}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Toevoegen</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Klant Toevoegen aan e-Boekhouden</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Bedrijf</Label>
                            <Input 
                              value={newRelatie.bedrijf} 
                              onChange={e => setNewRelatie({...newRelatie, bedrijf: e.target.value})} 
                            />
                          </div>
                          <div>
                            <Label>Contactpersoon</Label>
                            <Input 
                              value={newRelatie.contactpersoon} 
                              onChange={e => setNewRelatie({...newRelatie, contactpersoon: e.target.value})} 
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>E-mail</Label>
                            <Input 
                              type="email"
                              value={newRelatie.email} 
                              onChange={e => setNewRelatie({...newRelatie, email: e.target.value})} 
                            />
                          </div>
                          <div>
                            <Label>Telefoon</Label>
                            <Input 
                              value={newRelatie.telefoon} 
                              onChange={e => setNewRelatie({...newRelatie, telefoon: e.target.value})} 
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Adres</Label>
                          <Input 
                            value={newRelatie.adres} 
                            onChange={e => setNewRelatie({...newRelatie, adres: e.target.value})} 
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Postcode</Label>
                            <Input 
                              value={newRelatie.postcode} 
                              onChange={e => setNewRelatie({...newRelatie, postcode: e.target.value})} 
                            />
                          </div>
                          <div>
                            <Label>Plaats</Label>
                            <Input 
                              value={newRelatie.plaats} 
                              onChange={e => setNewRelatie({...newRelatie, plaats: e.target.value})} 
                            />
                          </div>
                        </div>
                        <Button onClick={addRelatie} disabled={isLoading}>
                          {isLoading ? 'Bezig...' : 'Toevoegen aan e-Boekhouden'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {relaties.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Klik op "Ophalen" om klanten te laden uit e-Boekhouden
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Bedrijf/Naam</TableHead>
                        <TableHead>E-mail</TableHead>
                        <TableHead>Telefoon</TableHead>
                        <TableHead>Plaats</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {relaties.map(relatie => (
                        <TableRow key={relatie.id}>
                          <TableCell className="font-mono text-sm">{relatie.code}</TableCell>
                          <TableCell>{relatie.bedrijf || relatie.contactpersoon}</TableCell>
                          <TableCell>{relatie.email}</TableCell>
                          <TableCell>{relatie.telefoon}</TableCell>
                          <TableCell>{relatie.plaats}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Producten Tab */}
          <TabsContent value="producten" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="text-lg">Producten (Artikelen)</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={fetchArtikelen} disabled={isLoading}>
                    <RefreshCw className={`w-4 h-4 sm:mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Ophalen</span>
                  </Button>
                  <Dialog open={showAddArtikel} onOpenChange={setShowAddArtikel}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Toevoegen</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Product Toevoegen aan e-Boekhouden</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Artikelcode</Label>
                            <Input 
                              value={newArtikel.code} 
                              onChange={e => setNewArtikel({...newArtikel, code: e.target.value})} 
                              placeholder="Optioneel"
                            />
                          </div>
                          <div>
                            <Label>Groep</Label>
                            <Input 
                              value={newArtikel.groep} 
                              onChange={e => setNewArtikel({...newArtikel, groep: e.target.value})} 
                              placeholder="bijv. Airco"
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Omschrijving *</Label>
                          <Input 
                            value={newArtikel.omschrijving} 
                            onChange={e => setNewArtikel({...newArtikel, omschrijving: e.target.value})} 
                            placeholder="Productnaam"
                          />
                        </div>
                        <div>
                          <Label>Verkoopprijs (excl. BTW)</Label>
                          <Input 
                            type="number"
                            value={newArtikel.verkoopprijs} 
                            onChange={e => setNewArtikel({...newArtikel, verkoopprijs: e.target.value})} 
                            placeholder="0.00"
                          />
                        </div>
                        <Button onClick={addArtikel} disabled={isLoading}>
                          {isLoading ? 'Bezig...' : 'Toevoegen aan e-Boekhouden'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {artikelen.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Klik op "Ophalen" om producten te laden uit e-Boekhouden
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Omschrijving</TableHead>
                        <TableHead>Groep</TableHead>
                        <TableHead className="text-right">Prijs (excl)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {artikelen.map(artikel => (
                        <TableRow key={artikel.id}>
                          <TableCell className="font-mono text-sm">{artikel.code}</TableCell>
                          <TableCell>{artikel.omschrijving}</TableCell>
                          <TableCell>{artikel.groepId || '-'}</TableCell>
                          <TableCell className="text-right">€{(artikel.prijsExcl || 0).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Facturen Tab */}
          <TabsContent value="facturen" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="text-lg">Facturen</CardTitle>
                <Button variant="outline" size="sm" onClick={fetchFacturen} disabled={isLoading}>
                  <RefreshCw className={`w-4 h-4 sm:mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Ophalen</span>
                </Button>
              </CardHeader>
              <CardContent>
                {facturen.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Klik op "Ophalen" om facturen te laden uit e-Boekhouden
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nummer</TableHead>
                        <TableHead>Relatie</TableHead>
                        <TableHead>Datum</TableHead>
                        <TableHead className="text-right">Totaal</TableHead>
                        <TableHead className="text-right">Openstaand</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {facturen.map(factuur => (
                        <TableRow key={factuur.factuurnummer}>
                          <TableCell className="font-mono">{factuur.factuurnummer}</TableCell>
                          <TableCell>{factuur.relatieId || '-'}</TableCell>
                          <TableCell>{factuur.datum}</TableCell>
                          <TableCell className="text-right">€{(factuur.totaalIncl || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            {(factuur.openstaand || 0) > 0 ? (
                              <Badge variant="destructive">€{(factuur.openstaand || 0).toFixed(2)}</Badge>
                            ) : (
                              <Badge variant="secondary">Betaald</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default EBoekhoudenSync;
