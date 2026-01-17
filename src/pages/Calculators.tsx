import { Calculator, Sun, Wind } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AircoCalculator from "@/components/AircoCalculator";
import SolarCalculator from "@/components/SolarCalculator";

const Calculators = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20">
        <section className="py-12 md:py-20 bg-gradient-to-b from-background to-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <span className="text-accent font-semibold text-sm uppercase tracking-wider">
                Bereken Uw Besparing
              </span>
              <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mt-4 mb-6">
                Calculatoren
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Bereken eenvoudig de kosten en besparingen voor airconditioning, 
                zonnepanelen en thuisaccu's.
              </p>
            </div>

            <Tabs defaultValue="airco" className="max-w-6xl mx-auto">
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
                <TabsTrigger value="airco" className="flex items-center gap-2">
                  <Wind className="w-4 h-4" />
                  Airco
                </TabsTrigger>
                <TabsTrigger value="solar" className="flex items-center gap-2">
                  <Sun className="w-4 h-4" />
                  Zonnepanelen
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="airco">
                <AircoCalculator />
              </TabsContent>
              
              <TabsContent value="solar">
                <SolarCalculator />
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Calculators;
