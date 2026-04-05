import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Star, MessageSquare, TrendingUp, Eye, ArrowUpRight, Calendar, Loader2 } from "lucide-react";
import { QuoteStats, QuoteRequest, Review, ContactMessage, api } from "@/lib/api";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area } from "recharts";
import { useEffect, useState, lazy, Suspense } from "react";
import ServerStatusWidget from "./ServerStatusWidget";
import { installationsApi, type Installation } from "@/lib/installationsApi";

const InstallationMap = lazy(() => import("@/components/InstallationMap"));

interface DashboardOverviewProps {
  stats: QuoteStats | null;
  quotes: QuoteRequest[];
  reviews: Review[];
  messages: ContactMessage[];
}

const AdminDashboardOverview = ({ stats, quotes, reviews, messages }: DashboardOverviewProps) => {
  const [pageViews, setPageViews] = useState<{
    total: number; today: number; thisWeek: number; thisMonth: number;
    daily: { date: string; views: number; visitors?: number }[];
  } | null>(null);
  const [loadingViews, setLoadingViews] = useState(true);

  useEffect(() => {
    api.getVisitorStats()
      .then(data => {
        setPageViews({
          total: data.total,
          today: data.today,
          thisWeek: data.thisWeek,
          thisMonth: data.thisMonth,
          daily: data.daily.map(d => ({ date: d.date, views: d.visitors || d.views })),
        });
      })
      .catch(() => {
        // Fallback: toon 0 als Cloudflare niet geconfigureerd is
        setPageViews({ total: 0, today: 0, thisWeek: 0, thisMonth: 0, daily: [] });
      })
      .finally(() => setLoadingViews(false));
  }, []);

  const unreadMessages = messages.filter(m => !m.is_read).length;
  const newQuotes = quotes.filter(q => q.status === "nieuw").length;

  // Monthly quote data for chart
  const monthlyData = (() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString("nl-NL", { month: "short" });
      months[key] = 0;
    }
    quotes.forEach(q => {
      const d = new Date(q.created_at);
      const key = d.toLocaleDateString("nl-NL", { month: "short" });
      if (key in months) months[key]++;
    });
    return Object.entries(months).map(([month, count]) => ({ month, offertes: count }));
  })();

  const chartConfig = {
    offertes: { label: "Offertes", color: "hsl(var(--accent))" },
    views: { label: "Bezoekers", color: "hsl(var(--primary))" }
  };

  const statCards = [
    {
      title: "Website Bezoekers",
      value: pageViews?.thisMonth || 0,
      subtitle: `${pageViews?.today || 0} vandaag`,
      icon: Eye,
      color: "bg-blue-500/10 text-blue-600",
      trend: `${pageViews?.thisWeek || 0} deze week`,
      loading: loadingViews,
    },
    {
      title: "Offerteaanvragen",
      value: stats?.total || 0,
      subtitle: `${newQuotes} nieuw`,
      icon: FileText,
      color: "bg-emerald-500/10 text-emerald-600",
      trend: `+${stats?.thisMonth || 0} deze maand`,
    },
    {
      title: "Reviews",
      value: reviews.length,
      subtitle: `${reviews.filter(r => r.is_visible).length} zichtbaar`,
      icon: Star,
      color: "bg-amber-500/10 text-amber-600",
      trend: reviews.length > 0
        ? `${(reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)} gem.`
        : "–"
    },
    {
      title: "Berichten",
      value: messages.length,
      subtitle: `${unreadMessages} ongelezen`,
      icon: MessageSquare,
      color: "bg-purple-500/10 text-purple-600",
      trend: unreadMessages > 0 ? "Actie vereist" : "Alles gelezen"
    }
  ];

  const recentQuotes = [...quotes]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="font-heading text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overzicht van je bedrijf</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.title} className="relative overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  {'loading' in card && card.loading ? (
                    <Loader2 className="w-5 h-5 animate-spin mt-2 text-muted-foreground" />
                  ) : (
                    <p className="text-3xl font-bold font-heading mt-1">{card.value.toLocaleString()}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.color}`}>
                  <card.icon className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                <span>{card.trend}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Bezoekers Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Eye className="w-4 h-4 text-muted-foreground" />
              Website Bezoekers (30 dagen)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pageViews && pageViews.daily.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[220px] w-full">
                <AreaChart data={pageViews.daily}>
                  <defs>
                    <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                  <YAxis tick={{ fontSize: 10 }} width={30} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" fill="url(#viewsGrad)" strokeWidth={2} />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                {loadingViews ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Geen bezoekersdata beschikbaar — configureer Cloudflare API"
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Offertes Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              Offertes per maand
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[220px] w-full">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={24} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="offertes" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            Recente Activiteit
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentQuotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nog geen activiteit</p>
          ) : (
            <div className="space-y-3">
              {recentQuotes.map((quote) => (
                <div key={quote.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {quote.customer_name || "Nieuwe aanvraag"} — {quote.selected_airco_brand || "Offerte"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(quote.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                  {quote.estimated_price && (
                    <span className="text-sm font-semibold text-accent">
                      €{Number(quote.estimated_price).toLocaleString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Server Status */}
      <ServerStatusWidget />

      {/* Installatiekaart */}
      <InstallationMapSection />
    </div>
  );
};

const InstallationMapSection = () => {
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [faultIds, setFaultIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      installationsApi.getInstallations().catch(() => []),
      installationsApi.getAllFaultReports().catch(() => []),
    ]).then(([instData, faults]) => {
      setInstallations(instData.filter(i => i.status !== "verwijderd"));
      const openFaultInstIds = new Set<number>(
        faults.filter((f: any) => f.status === "open" || f.status === "in_behandeling").map((f: any) => Number(f.installation_id))
      );
      setFaultIds(openFaultInstIds);
    }).finally(() => setLoading(false));
  }, []);

  const mapData = installations.map(i => ({
    id: i.id,
    name: i.name,
    customer_name: i.customer_name || "",
    city: i.customer_city || "",
    installation_type: i.installation_type,
    status: i.status,
    has_fault: faultIds.has(i.id) || i.status === "storing",
  }));

  return (
    <Suspense fallback={<Card><CardContent className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></CardContent></Card>}>
      <InstallationMap installations={mapData} loading={loading} height="350px" />
    </Suspense>
  );
};

export default AdminDashboardOverview;
