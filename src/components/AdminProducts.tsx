import { useState, useEffect, useRef } from "react";
import { api, Product, CreateProduct, ProductCategory } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
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
import { 
  Plus, Trash2, Edit, Eye, EyeOff, Upload, X, 
  Image as ImageIcon, GripVertical, Save, Search
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const categoryLabels: Record<ProductCategory, string> = {
  airco: "Airco's",
  unifi_router: "UniFi Routers",
  unifi_switch: "UniFi Switches",
  unifi_accesspoint: "UniFi Access Points",
  unifi_camera: "UniFi Camera's",
  battery: "Thuisaccu's",
  charger: "Laadpalen",
  solar: "Zonnepanelen",
};

const categoryOptions: ProductCategory[] = [
  'airco',
  'unifi_router',
  'unifi_switch',
  'unifi_accesspoint',
  'unifi_camera',
  'battery',
  'charger',
  'solar',
];

const defaultSpecs: Record<ProductCategory, Record<string, unknown>> = {
  airco: { capacity: "", min_m2: 0, max_m2: 0, energy_label: "A++" },
  unifi_router: { ports: "", wan: "", throughput: "" },
  unifi_switch: { ports: 8, poe_ports: 0, poe_budget: "" },
  unifi_accesspoint: { wifi: "WiFi 6", speed: "", devices: 0 },
  unifi_camera: { resolution: "4MP", ip_rating: "", night_vision: "" },
  battery: { capacity: 0, warranty: "10 jaar", cycles: 0 },
  charger: { power: 22, type: "home", connectivity: "" },
  solar: { watt_peak: 400, efficiency: "21%", warranty: "25 jaar" },
};

interface AdminProductsProps {
  selectedCategory: ProductCategory;
  onCategoryChange: (category: ProductCategory) => void;
}

const AdminProducts = ({ selectedCategory, onCategoryChange }: AdminProductsProps) => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [hasOrderChanged, setHasOrderChanged] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  const [formData, setFormData] = useState<CreateProduct>({
    id: "",
    name: "",
    brand: "",
    category: selectedCategory,
    base_price: 0,
    description: "",
    specs: defaultSpecs[selectedCategory],
    features: [],
    is_active: true,
    sort_order: 0,
  });
  const [featuresText, setFeaturesText] = useState("");

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminProducts(selectedCategory);
      setProducts(data);
    } catch (err) {
      toast({
        title: "Fout",
        description: "Kon producten niet laden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    setHasOrderChanged(false);
    setSearchQuery("");
  }, [selectedCategory]);

  // Filter products based on search query
  const filteredProducts = products.filter((product) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(query) ||
      product.brand.toLowerCase().includes(query) ||
      (product.description && product.description.toLowerCase().includes(query)) ||
      product.id.toLowerCase().includes(query)
    );
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setProducts((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      setHasOrderChanged(true);
    }
  };

  const handleSaveOrder = async () => {
    setSavingOrder(true);
    try {
      const sortedProducts = products.map((p, index) => ({
        id: p.id,
        sort_order: index,
      }));
      await api.updateProductSort(sortedProducts);
      setHasOrderChanged(false);
      toast({
        title: "Volgorde opgeslagen",
        description: "De productvolgorde is bijgewerkt",
      });
    } catch (err) {
      toast({
        title: "Fout",
        description: "Kon volgorde niet opslaan",
        variant: "destructive",
      });
    } finally {
      setSavingOrder(false);
    }
  };

  const handleAdd = () => {
    setEditingProduct(null);
    setFormData({
      id: "",
      name: "",
      brand: "",
      category: selectedCategory,
      base_price: 0,
      description: "",
      specs: defaultSpecs[selectedCategory],
      features: [],
      is_active: true,
      sort_order: products.length,
    });
    setFeaturesText("");
    setShowForm(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      id: product.id,
      name: product.name,
      brand: product.brand,
      category: product.category,
      base_price: product.base_price,
      description: product.description || "",
      specs: product.specs,
      features: product.features,
      is_active: product.is_active,
      sort_order: product.sort_order,
    });
    setFeaturesText(product.features.join("\n"));
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      const dataToSave = {
        ...formData,
        features: featuresText.split("\n").filter(f => f.trim()),
      };

      if (editingProduct) {
        await api.updateProduct(editingProduct.id, dataToSave);
        toast({ title: "Product bijgewerkt" });
      } else {
        await api.createProduct(dataToSave);
        toast({ title: "Product aangemaakt" });
      }
      
      setShowForm(false);
      fetchProducts();
    } catch (err: unknown) {
      toast({
        title: "Fout",
        description: err instanceof Error ? err.message : "Kon product niet opslaan",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Weet je zeker dat je dit product wilt verwijderen?")) return;
    
    try {
      await api.deleteProduct(id);
      toast({ title: "Product verwijderd" });
      fetchProducts();
    } catch (err) {
      toast({
        title: "Fout",
        description: "Kon product niet verwijderen",
        variant: "destructive",
      });
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await api.toggleProductActive(id);
      fetchProducts();
    } catch (err) {
      toast({
        title: "Fout",
        description: "Kon status niet wijzigen",
        variant: "destructive",
      });
    }
  };

  const handleImageUpload = async (productId: string, file: File) => {
    setUploadingImage(productId);
    try {
      await api.uploadProductImage(productId, file);
      toast({ title: "Afbeelding geüpload" });
      fetchProducts();
    } catch (err) {
      toast({
        title: "Fout",
        description: "Kon afbeelding niet uploaden",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(null);
    }
  };

  const handleDeleteImage = async (productId: string) => {
    try {
      await api.deleteProductImage(productId);
      toast({ title: "Afbeelding verwijderd" });
      fetchProducts();
    } catch (err) {
      toast({
        title: "Fout",
        description: "Kon afbeelding niet verwijderen",
        variant: "destructive",
      });
    }
  };

  const updateSpec = (key: string, value: unknown) => {
    setFormData({
      ...formData,
      specs: { ...formData.specs, [key]: value },
    });
  };

  const renderSpecsForm = () => {
    const specs = formData.specs || {};
    
    switch (formData.category) {
      case 'airco':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Capaciteit (bijv. 2.5 kW)</label>
                <Input
                  value={String(specs.capacity || "")}
                  onChange={(e) => updateSpec("capacity", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Energielabel</label>
                <Input
                  value={String(specs.energy_label || "")}
                  onChange={(e) => updateSpec("energy_label", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Min m²</label>
                <Input
                  type="number"
                  value={Number(specs.min_m2) || 0}
                  onChange={(e) => updateSpec("min_m2", parseInt(e.target.value))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Max m²</label>
                <Input
                  type="number"
                  value={Number(specs.max_m2) || 0}
                  onChange={(e) => updateSpec("max_m2", parseInt(e.target.value))}
                />
              </div>
            </div>
          </>
        );
      case 'battery':
        return (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Capaciteit (kWh)</label>
              <Input
                type="number"
                step="0.1"
                value={Number(specs.capacity) || 0}
                onChange={(e) => updateSpec("capacity", parseFloat(e.target.value))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Garantie</label>
              <Input
                value={String(specs.warranty || "")}
                onChange={(e) => updateSpec("warranty", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Laadcycli</label>
              <Input
                type="number"
                value={Number(specs.cycles) || 0}
                onChange={(e) => updateSpec("cycles", parseInt(e.target.value))}
              />
            </div>
          </div>
        );
      case 'charger':
        return (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Vermogen (kW)</label>
              <Input
                type="number"
                value={Number(specs.power) || 0}
                onChange={(e) => updateSpec("power", parseInt(e.target.value))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Type</label>
              <Select
                value={String(specs.type || "home")}
                onValueChange={(v) => updateSpec("type", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">Particulier</SelectItem>
                  <SelectItem value="business">Zakelijk</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Connectiviteit</label>
              <Input
                value={String(specs.connectivity || "")}
                onChange={(e) => updateSpec("connectivity", e.target.value)}
              />
            </div>
          </div>
        );
      case 'unifi_camera':
        return (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Resolutie</label>
              <Input
                value={String(specs.resolution || "")}
                onChange={(e) => updateSpec("resolution", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">IP Rating</label>
              <Input
                value={String(specs.ip_rating || "")}
                onChange={(e) => updateSpec("ip_rating", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Nachtzicht</label>
              <Input
                value={String(specs.night_vision || "")}
                onChange={(e) => updateSpec("night_vision", e.target.value)}
              />
            </div>
          </div>
        );
      case 'solar':
        return (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Vermogen (Wp)</label>
              <Input
                type="number"
                value={Number(specs.watt_peak) || 0}
                onChange={(e) => updateSpec("watt_peak", parseInt(e.target.value))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Efficiëntie</label>
              <Input
                value={String(specs.efficiency || "")}
                onChange={(e) => updateSpec("efficiency", e.target.value)}
                placeholder="bijv. 21.5%"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Garantie</label>
              <Input
                value={String(specs.warranty || "")}
                onChange={(e) => updateSpec("warranty", e.target.value)}
                placeholder="bijv. 25 jaar"
              />
            </div>
          </div>
        );
      default:
        return (
          <div>
            <label className="text-sm font-medium">Specs (JSON)</label>
            <Textarea
              value={JSON.stringify(specs, null, 2)}
              onChange={(e) => {
                try {
                  setFormData({ ...formData, specs: JSON.parse(e.target.value) });
                } catch {}
              }}
              rows={4}
            />
          </div>
        );
    }
  };

  // Sortable Product Row Component
  const SortableProductRow = ({ product }: { product: Product }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: product.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`border rounded-lg p-4 flex gap-4 bg-background ${
          !product.is_active ? "opacity-50" : ""
        } ${isDragging ? "shadow-lg ring-2 ring-accent" : ""}`}
      >
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex items-center cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-5 h-5 text-muted-foreground" />
        </div>

        {/* Product Image */}
        <div className="w-24 h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0 relative group">
          {product.image_url ? (
            <>
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => handleDeleteImage(product.id)}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </>
          ) : (
            <label className="w-full h-full flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors">
              {uploadingImage === product.id ? (
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              ) : (
                <Upload className="w-6 h-6 text-muted-foreground" />
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(product.id, file);
                }}
              />
            </label>
          )}
        </div>

        {/* Product Info */}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold">{product.name}</h4>
                <Badge variant={product.is_active ? "default" : "secondary"}>
                  {product.is_active ? "Actief" : "Inactief"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{product.brand}</p>
              {product.description && (
                <p className="text-sm mt-1">{product.description}</p>
              )}
            </div>
            <p className="text-lg font-bold text-accent">
              €{product.base_price.toLocaleString("nl-NL")},-
            </p>
          </div>
          
          {product.features.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {product.features.slice(0, 3).map((f, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {f}
                </Badge>
              ))}
              {product.features.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{product.features.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleToggle(product.id)}
            title={product.is_active ? "Deactiveren" : "Activeren"}
          >
            {product.is_active ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEdit(product)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(product.id)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Productbeheer</CardTitle>
            <CardDescription>
              Beheer producten per categorie - sleep om volgorde te wijzigen
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {hasOrderChanged && (
              <Button 
                onClick={handleSaveOrder} 
                disabled={savingOrder}
                variant="secondary"
              >
                {savingOrder ? (
                  <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Volgorde Opslaan
              </Button>
            )}
            <Select value={selectedCategory} onValueChange={(v) => onCategoryChange(v as ProductCategory)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {categoryLabels[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Product Toevoegen
            </Button>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Zoek op naam, merk of beschrijving..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Laden...</p>
        ) : products.length === 0 ? (
          <p className="text-muted-foreground">Geen producten in deze categorie</p>
        ) : filteredProducts.length === 0 ? (
          <p className="text-muted-foreground">Geen producten gevonden voor "{searchQuery}"</p>
        ) : (
          <>
            {searchQuery && (
              <p className="text-sm text-muted-foreground mb-4">
                {filteredProducts.length} van {products.length} producten gevonden
              </p>
            )}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredProducts.map(p => p.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {filteredProducts.map((product) => (
                    <SortableProductRow key={product.id} product={product} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </>
        )}

        {/* Product Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Product Bewerken" : "Nieuw Product"}
              </DialogTitle>
              <DialogDescription>
                {editingProduct
                  ? "Wijzig de productgegevens"
                  : "Voeg een nieuw product toe"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Product ID*</label>
                  <Input
                    value={formData.id}
                    onChange={(e) =>
                      setFormData({ ...formData, id: e.target.value.toLowerCase().replace(/\s+/g, '-') })
                    }
                    disabled={!!editingProduct}
                    placeholder="bijv. daikin-perfera"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Categorie*</label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) =>
                      setFormData({
                        ...formData,
                        category: v as ProductCategory,
                        specs: defaultSpecs[v as ProductCategory],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {categoryLabels[cat]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Productnaam*</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="bijv. Perfera"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Merk*</label>
                  <Input
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="bijv. Daikin"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Basisprijs (€)*</label>
                  <Input
                    type="number"
                    value={formData.base_price}
                    onChange={(e) =>
                      setFormData({ ...formData, base_price: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Sorteervolgorde</label>
                  <Input
                    type="number"
                    value={formData.sort_order || 0}
                    onChange={(e) =>
                      setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Beschrijving</label>
                <Textarea
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Korte productomschrijving..."
                  rows={2}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Specificaties</label>
                <div className="mt-2 p-4 bg-muted/50 rounded-lg">
                  {renderSpecsForm()}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">
                  Features (één per regel)
                </label>
                <Textarea
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                  placeholder="Stille werking (19 dB)&#10;Wifi bediening&#10;Koelen & verwarmen"
                  rows={4}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active !== false}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
                <label className="text-sm">Product actief (zichtbaar in calculator)</label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Annuleren
                </Button>
                <Button onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" />
                  {editingProduct ? "Opslaan" : "Toevoegen"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default AdminProducts;
