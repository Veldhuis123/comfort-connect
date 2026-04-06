import { 
  LayoutDashboard, Users, FileText, Receipt,
  Star, MessageSquare, Euro, Settings,
  Download, BookOpen, LogOut, ChevronDown,
  Snowflake, Thermometer, Package, Zap, Grid3X3, QrCode, FolderOpen
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  userName: string;
  onLogout: () => void;
  unreadMessages?: number;
  newQuotes?: number;
}

const AdminSidebar = ({ 
  activeSection, 
  onSectionChange, 
  userName, 
  onLogout,
  unreadMessages = 0,
  newQuotes = 0
}: AdminSidebarProps) => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const isActive = (section: string) => activeSection === section;

  const MenuItem = ({ section, icon: Icon, label, badge }: { section: string; icon: any; label: string; badge?: number }) => (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={() => onSectionChange(section)}
        className={cn(
          "w-full cursor-pointer transition-colors",
          isActive(section) && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1">{label}</span>
            {badge !== undefined && badge > 0 && (
              <Badge variant="default" className="ml-auto h-5 min-w-5 px-1.5 text-[10px] bg-accent text-accent-foreground">
                {badge}
              </Badge>
            )}
          </>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  const sectionGroups = [
    { label: "Klantbeheer", sections: ["customers-overview"] },
    { label: "Verkoop", sections: ["quotes", "local-quotes", "pricing", "messages"] },
    { label: "Airco", sections: ["airco-products", "airco-installations", "airco-calculator"] },
    { label: "Elektra", sections: ["elektra-groepenkasten", "elektra-configurator", "elektra-qrcodes"] },
    { label: "Website", sections: ["projects", "reviews", "settings"] },
    { label: "Systeem", sections: ["boekhouden", "wasco"] },
  ];

  const isGroupActive = (sections: string[]) => sections.includes(activeSection);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <span className="text-sidebar-primary-foreground font-bold text-sm">RV</span>
            </div>
            <div className="min-w-0">
              <p className="font-heading font-bold text-sm truncate">RV Installatie</p>
              <p className="text-xs text-muted-foreground truncate">Admin Panel</p>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center mx-auto">
            <span className="text-sidebar-primary-foreground font-bold text-sm">RV</span>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        {/* Dashboard */}
        <SidebarGroup>
          <SidebarMenu>
            <MenuItem section="dashboard" icon={LayoutDashboard} label="Dashboard" />
          </SidebarMenu>
        </SidebarGroup>

        {/* Klantbeheer */}
        <SidebarGroup>
          <Collapsible defaultOpen={isGroupActive(sectionGroups[0].sections)}>
            <CollapsibleTrigger className="w-full">
              <SidebarGroupLabel className="cursor-pointer flex items-center justify-between w-full hover:text-foreground transition-colors">
                {!collapsed && <span>Klantbeheer</span>}
                {!collapsed && <ChevronDown className="h-3 w-3" />}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <MenuItem section="customers-overview" icon={Users} label="Klanten" />
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Verkoop */}
        <SidebarGroup>
          <Collapsible defaultOpen={isGroupActive(sectionGroups[1].sections)}>
            <CollapsibleTrigger className="w-full">
              <SidebarGroupLabel className="cursor-pointer flex items-center justify-between w-full hover:text-foreground transition-colors">
                {!collapsed && <span>Verkoop</span>}
                {!collapsed && <ChevronDown className="h-3 w-3" />}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <MenuItem section="quotes" icon={FileText} label="Offerteaanvragen" badge={newQuotes} />
                  <MenuItem section="local-quotes" icon={Receipt} label="Lokale Offertes" />
                  <MenuItem section="pricing" icon={Euro} label="Prijsbeheer" />
                  <MenuItem section="messages" icon={MessageSquare} label="Berichten" badge={unreadMessages} />
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Airco */}
        <SidebarGroup>
          <Collapsible defaultOpen={isGroupActive(sectionGroups[2].sections)}>
            <CollapsibleTrigger className="w-full">
              <SidebarGroupLabel className="cursor-pointer flex items-center justify-between w-full hover:text-foreground transition-colors">
                {!collapsed && <span>Airco</span>}
                {!collapsed && <ChevronDown className="h-3 w-3" />}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <MenuItem section="airco-products" icon={Package} label="Producten" />
                  <MenuItem section="airco-installations" icon={Thermometer} label="Installaties" />
                  <MenuItem section="airco-calculator" icon={Snowflake} label="Calculator" />
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Elektra */}
        <SidebarGroup>
          <Collapsible defaultOpen={isGroupActive(sectionGroups[3].sections)}>
            <CollapsibleTrigger className="w-full">
              <SidebarGroupLabel className="cursor-pointer flex items-center justify-between w-full hover:text-foreground transition-colors">
                {!collapsed && <span>Elektra</span>}
                {!collapsed && <ChevronDown className="h-3 w-3" />}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <MenuItem section="elektra-groepenkasten" icon={Grid3X3} label="Groepenkasten" />
                  <MenuItem section="elektra-configurator" icon={Zap} label="Configurator" />
                  <MenuItem section="elektra-qrcodes" icon={QrCode} label="QR-codes" />
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Website */}
        <SidebarGroup>
          <Collapsible defaultOpen={isGroupActive(sectionGroups[4].sections)}>
            <CollapsibleTrigger className="w-full">
              <SidebarGroupLabel className="cursor-pointer flex items-center justify-between w-full hover:text-foreground transition-colors">
                {!collapsed && <span>Website</span>}
                {!collapsed && <ChevronDown className="h-3 w-3" />}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <MenuItem section="projects" icon={FolderOpen} label="Projecten" />
                  <MenuItem section="reviews" icon={Star} label="Reviews" />
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Systeem */}
        <SidebarGroup>
          <Collapsible defaultOpen={isGroupActive(sectionGroups[5].sections)}>
            <CollapsibleTrigger className="w-full">
              <SidebarGroupLabel className="cursor-pointer flex items-center justify-between w-full hover:text-foreground transition-colors">
                {!collapsed && <span>Systeem</span>}
                {!collapsed && <ChevronDown className="h-3 w-3" />}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <MenuItem section="settings" icon={Settings} label="Instellingen" />
                  <MenuItem section="boekhouden" icon={BookOpen} label="e-Boekhouden" />
                  <MenuItem section="wasco" icon={Download} label="Wasco Sync" />
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border">
        {!collapsed ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-medium text-primary">{userName.charAt(0).toUpperCase()}</span>
              </div>
              <span className="text-sm font-medium truncate">{userName}</span>
            </div>
            <SidebarMenuButton onClick={onLogout} className="w-auto p-2 cursor-pointer hover:text-destructive">
              <LogOut className="h-4 w-4" />
            </SidebarMenuButton>
          </div>
        ) : (
          <SidebarMenuButton onClick={onLogout} className="mx-auto cursor-pointer hover:text-destructive">
            <LogOut className="h-4 w-4" />
          </SidebarMenuButton>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};

export default AdminSidebar;
