# R. Veldhuis Installatie - Backend API

## Installatie

1. Kopieer de `backend` map naar je server
2. Kopieer `.env.example` naar `.env` en pas de waarden aan
3. Importeer `../database/rv_installatie.sql` in je MySQL database
4. Installeer dependencies:

```bash
cd backend
npm install
```

5. Start de server:

```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Authenticatie
- `POST /api/auth/login` - Inloggen
- `GET /api/auth/me` - Huidige gebruiker ophalen (auth)
- `PUT /api/auth/password` - Wachtwoord wijzigen (auth)

### Reviews
- `GET /api/reviews` - Alle zichtbare reviews (public)
- `GET /api/reviews/admin` - Alle reviews (auth)
- `POST /api/reviews` - Review toevoegen (auth)
- `PUT /api/reviews/:id` - Review bewerken (auth)
- `DELETE /api/reviews/:id` - Review verwijderen (auth)
- `PATCH /api/reviews/:id/toggle` - Zichtbaarheid wisselen (auth)

### Offerteaanvragen
- `GET /api/quotes` - Alle offertes (auth)
- `GET /api/quotes/:id` - Offerte details (auth)
- `POST /api/quotes` - Nieuwe offerte (public)
- `PATCH /api/quotes/:id/status` - Status bijwerken (auth)
- `DELETE /api/quotes/:id` - Offerte verwijderen (auth)
- `GET /api/quotes/stats/summary` - Statistieken (auth)

### Contactberichten
- `GET /api/contact` - Alle berichten (auth)
- `GET /api/contact/:id` - Bericht details (auth)
- `POST /api/contact` - Nieuw bericht (public)
- `PATCH /api/contact/:id/replied` - Markeer als beantwoord (auth)
- `DELETE /api/contact/:id` - Bericht verwijderen (auth)
- `GET /api/contact/stats/unread` - Aantal ongelezen (auth)

### Airco producten
- `GET /api/airco` - Alle actieve airco's (public)
- `GET /api/airco/admin` - Alle airco's (auth)
- `POST /api/airco` - Airco toevoegen (auth)
- `PUT /api/airco/:id` - Airco bewerken (auth)
- `DELETE /api/airco/:id` - Airco verwijderen (auth)
- `PATCH /api/airco/:id/toggle` - Actief/inactief wisselen (auth)

### Producten (universeel)
- `GET /api/products` - Alle actieve producten (public, optioneel ?category=)
- `GET /api/products/:id` - Product details (public)
- `GET /api/products/admin/all` - Alle producten (auth, optioneel ?category=)
- `POST /api/products` - Product toevoegen (auth)
- `PUT /api/products/:id` - Product bewerken (auth)
- `DELETE /api/products/:id` - Product verwijderen (auth)
- `PATCH /api/products/:id/toggle` - Actief/inactief wisselen (auth)
- `POST /api/products/:id/image` - Afbeelding uploaden (auth)
- `DELETE /api/products/:id/image` - Afbeelding verwijderen (auth)
- `PATCH /api/products/sort` - Sorteervolgorde bijwerken (auth)

### Uploads
- `POST /api/upload/quote/:quoteId` - Foto's uploaden bij offerte
- `DELETE /api/upload/:photoId` - Foto verwijderen (auth)

## Frontend koppeling

Pas in je React frontend de API URL aan:

```typescript
// src/lib/api.ts
const API_URL = 'https://jouw-server.nl/api';
```

## Vereisten

- Node.js 18+
- MySQL 5.7+ of MariaDB 10.2+
- PM2 (aanbevolen voor production)

## Production deployment

```bash
# Installeer PM2
npm install -g pm2

# Start met PM2
pm2 start server.js --name "rv-api"

# Auto-start bij reboot
pm2 startup
pm2 save
```
