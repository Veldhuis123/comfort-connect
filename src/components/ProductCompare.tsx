import { useState } from "react";
import { X, Check, Scale, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface CompareProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  image?: string;
  specs: Record<string, string | number | boolean>;
  features: string[];
}

interface ProductCompareProps {
  products: CompareProduct[];
  category: string;
  maxCompare?: number;
}

const ProductCompare = ({ products, category, maxCompare = 4 }: ProductCompareProps) => {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const toggleProduct = (productId: string) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    } else if (selectedProducts.length < maxCompare) {
      setSelectedProducts([...selectedProducts, productId]);
    }
  };

  const addProductToCompare = (productId: string) => {
    if (!selectedProducts.includes(productId) && selectedProducts.length < maxCompare) {
      setSelectedProducts([...selectedProducts, productId]);
    }
  };

  const removeFromCompare = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(id => id !== productId));
  };

  const clearAll = () => {
    setSelectedProducts([]);
  };

  const getSelectedProductsData = () => {
    return products.filter(p => selectedProducts.includes(p.id));
  };

  const getAllSpecs = () => {
    const specs = new Set<string>();
    getSelectedProductsData().forEach(product => {
      Object.keys(product.specs).forEach(key => specs.add(key));
    });
    return Array.from(specs);
  };

  const getAllFeatures = () => {
    const features = new Set<string>();
    getSelectedProductsData().forEach(product => {
      product.features.forEach(f => features.add(f));
    });
    return Array.from(features);
  };

  const formatSpecValue = (value: string | number | boolean | undefined) => {
    if (value === undefined) return "-";
    if (typeof value === "boolean") {
      return value ? <Check className="w-5 h-5 text-green-500 mx-auto" /> : <X className="w-5 h-5 text-red-400 mx-auto" />;
    }
    return String(value);
  };

  const availableProducts = products.filter(p => !selectedProducts.includes(p.id));

  return (
    <>
      {/* Floating Compare Bar */}
      {selectedProducts.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-background border-2 border-accent rounded-xl shadow-2xl p-4 flex items-center gap-4 max-w-[90vw]">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-accent" />
            <span className="font-medium text-sm">{selectedProducts.length} producten</span>
          </div>
          
          <div className="flex gap-2">
            {getSelectedProductsData().slice(0, 3).map(product => (
              <div key={product.id} className="relative group">
                <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                      {product.brand.slice(0, 2)}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeFromCompare(product.id)}
                  className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {selectedProducts.length > 3 && (
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-sm font-medium">
                +{selectedProducts.length - 3}
              </div>
            )}
          </div>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                Vergelijk <ArrowRight className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Scale className="w-6 h-6 text-accent" />
                  Producten Vergelijken - {category}
                </DialogTitle>
              </DialogHeader>
              
              <div className="mt-4">
                {/* Add more products */}
                {selectedProducts.length < maxCompare && availableProducts.length > 0 && (
                  <div className="mb-6 flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">Product toevoegen:</span>
                    <Select onValueChange={addProductToCompare}>
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder="Selecteer product..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProducts.map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.brand} {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Comparison Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left p-3 bg-muted/50 rounded-tl-lg min-w-[150px]">Kenmerk</th>
                        {getSelectedProductsData().map((product, index) => (
                          <th 
                            key={product.id} 
                            className={`p-3 bg-muted/50 min-w-[180px] ${index === getSelectedProductsData().length - 1 ? 'rounded-tr-lg' : ''}`}
                          >
                            <div className="flex flex-col items-center gap-2">
                              {product.image && (
                                <img 
                                  src={product.image} 
                                  alt={product.name} 
                                  className="w-20 h-20 object-cover rounded-lg"
                                />
                              )}
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">{product.brand}</p>
                                <p className="font-semibold">{product.name}</p>
                              </div>
                              <button
                                onClick={() => removeFromCompare(product.id)}
                                className="text-xs text-destructive hover:underline"
                              >
                                Verwijderen
                              </button>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Price Row */}
                      <tr className="border-b border-border">
                        <td className="p-3 font-medium bg-accent/5">Prijs</td>
                        {getSelectedProductsData().map(product => (
                          <td key={product.id} className="p-3 text-center bg-accent/5">
                            <span className="text-xl font-bold text-accent">
                              €{product.price.toLocaleString("nl-NL")},-
                            </span>
                          </td>
                        ))}
                      </tr>

                      {/* Specs Rows */}
                      {getAllSpecs().map((spec, index) => (
                        <tr key={spec} className={index % 2 === 0 ? "bg-muted/20" : ""}>
                          <td className="p-3 font-medium">{spec}</td>
                          {getSelectedProductsData().map(product => (
                            <td key={product.id} className="p-3 text-center">
                              {formatSpecValue(product.specs[spec])}
                            </td>
                          ))}
                        </tr>
                      ))}

                      {/* Features Section */}
                      <tr>
                        <td colSpan={selectedProducts.length + 1} className="p-3 bg-muted/50 font-semibold">
                          Kenmerken
                        </td>
                      </tr>
                      {getAllFeatures().map((feature, index) => (
                        <tr key={feature} className={index % 2 === 0 ? "bg-muted/20" : ""}>
                          <td className="p-3">{feature}</td>
                          {getSelectedProductsData().map(product => (
                            <td key={product.id} className="p-3 text-center">
                              {product.features.includes(feature) ? (
                                <Check className="w-5 h-5 text-green-500 mx-auto" />
                              ) : (
                                <X className="w-5 h-5 text-muted-foreground/30 mx-auto" />
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="ghost" size="sm" onClick={clearAll}>
            Wissen
          </Button>
        </div>
      )}

      {/* Compare Button for individual products */}
      <style>{`
        .compare-checkbox {
          position: absolute;
          top: 8px;
          left: 8px;
          z-index: 10;
        }
      `}</style>
    </>
  );
};

export const CompareCheckbox = ({ 
  productId, 
  isSelected, 
  onToggle,
  disabled = false 
}: { 
  productId: string; 
  isSelected: boolean; 
  onToggle: (id: string) => void;
  disabled?: boolean;
}) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onToggle(productId);
    }}
    disabled={disabled && !isSelected}
    className={`
      absolute top-2 left-2 z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all
      ${isSelected 
        ? 'bg-accent border-accent text-accent-foreground' 
        : 'bg-background/80 border-muted-foreground/30 hover:border-accent'
      }
      ${disabled && !isSelected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    `}
    title={isSelected ? "Verwijderen uit vergelijking" : "Toevoegen aan vergelijking"}
  >
    {isSelected ? (
      <Check className="w-4 h-4" />
    ) : (
      <Plus className="w-4 h-4" />
    )}
  </button>
);

export default ProductCompare;
