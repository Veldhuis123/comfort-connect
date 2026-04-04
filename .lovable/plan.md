
# BRL 100 App - Complete Herbouw

## Overzicht
De huidige losse modules worden vervangen door een gestructureerde wizard met een centraal overzicht van alle inbedrijfstellingen.

## Structuur

### 1. Hoofdscherm: Overzicht alle inbedrijfstellingen
- Lijst van alle rapporten met statusbalk (% voltooid)
- Status: concept / bezig / voltooid / verzonden
- Knop "Nieuwe inbedrijfstelling starten"
- Zoeken/filteren op klant of datum

### 2. Wizard: Stappen per inbedrijfstelling
Elke stap heeft een vinkje/status indicator:

**Stap 1 - Klantgegevens**
- Klant selecteren uit e-Boekhouden of nieuw aanmaken
- Adres, contactgegevens automatisch invullen

**Stap 2 - Monteur & Gereedschap**
- Monteur selecteren (uit admin-lijst)
- Gereedschap selecteren met geldigheidscontrole
- ⚠️ Melding als certificaat/gereedschap verlopen is

**Stap 3 - Apparatuur & Serienummers**
- Merk/model invoeren
- Serienummer scannen (camera barcode) of handmatig
- Binnen-/buitenunit gegevens

**Stap 4 - BRL Checklist**
- 7-stappen installatie checklist
- Foto's toevoegen bij specifieke stappen

**Stap 5 - Meetwaarden (Testo 558s)**
- Handmatig invoeren of CSV importeren
- Drukken, temperaturen, superheat/subcooling

**Stap 6 - Foto's & Documentatie**
- Foto's per categorie (buitenunit, binnenunit, leidingwerk, etc.)
- Camera of bibliotheek

**Stap 7 - Controle & Verzenden**
- Overzicht alle ingevulde data
- Alleen actief als alle stappen ✅
- PDF genereren & e-mailen naar klant

### 3. Technische aanpak
- State opslaan in localStorage (offline werken)
- Lijst inbedrijfstellingen bewaren
- Herbruikbare stap-componenten
- Progress indicator bovenaan

### 4. Bestanden
- `src/pages/MobileBRL.tsx` - Hoofdpagina met overzicht + wizard
- `src/components/mobile/BRLWizard.tsx` - Wizard container met stappen
- `src/components/mobile/BRLOverview.tsx` - Overzicht alle rapporten
- `src/components/mobile/steps/StepCustomer.tsx` - Stap 1
- `src/components/mobile/steps/StepTechnician.tsx` - Stap 2
- `src/components/mobile/steps/StepEquipment.tsx` - Stap 3
- `src/components/mobile/steps/StepChecklist.tsx` - Stap 4
- `src/components/mobile/steps/StepMeasurements.tsx` - Stap 5
- `src/components/mobile/steps/StepPhotos.tsx` - Stap 6
- `src/components/mobile/steps/StepReview.tsx` - Stap 7
- `src/lib/brlTypes.ts` - Types en defaults
- `src/lib/brlStorage.ts` - LocalStorage persistentie
