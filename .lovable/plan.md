
Doel: de projectfoto’s op de live site weer zichtbaar maken zonder eerst de app-code te wijzigen.

Wat ik heb vastgesteld
- De frontend is correct: `src/pages/Projects.tsx` gebruikt `getUploadUrl(mainPhoto)`.
- De helper is correct: `src/lib/api.ts` zet `/uploads/projects/...` om naar een geldige same-origin URL.
- De backend is correct: `backend/routes/projects.js` uploadt naar `backend/uploads/projects` en slaat paden op als `/uploads/projects/bestand.jpg`.
- Het bestand bestaat echt op de server in `/opt/comfort-connect/backend/uploads/projects/1775981175111-16644963.jpg`.

Conclusie
- Dit is vrijwel zeker een live Nginx-routingprobleem, niet een React- of backend-bug.
- De meest waarschijnlijke oorzaak is dat een regex `location` voor afbeeldingen (`.jpg`, `.png`, etc.) de `/uploads/` alias onderschept, waardoor Nginx in de verkeerde map zoekt en 404 geeft.

Plan van aanpak
1. Controleer de volledige actieve Nginx-config
   - Niet alleen het `/uploads/` blok, maar ook alle andere `location` blokken in dezelfde server.
   - Specifiek zoeken naar een blok zoals:
     ```nginx
     location ~* \.(jpg|jpeg|png|gif|webp|svg|css|js|...) { ... }
     ```
   - Als zo’n regex bestaat, moet `/uploads/` hogere prioriteit krijgen.

2. Pas `/uploads/` aan naar een high-priority alias
   - Wijzig:
     ```nginx
     location /uploads/ {
         alias /opt/comfort-connect/backend/uploads/;
     }
     ```
   - Naar:
     ```nginx
     location ^~ /uploads/ {
         alias /opt/comfort-connect/backend/uploads/;
         expires 30d;
         add_header Cache-Control "public, immutable";
         try_files $uri =404;
     }
     ```
   - Belangrijk:
     - `^~` voorkomt dat regex-locaties deze requests overnemen.
     - `alias` moet eindigen op `/`.
     - Dit blok moet in de juiste `server {}` voor `rv-installatie.nl` staan.

3. Herlaad en valideer Nginx
   - Config testen met `nginx -t`
   - Daarna herladen met `systemctl reload nginx`

4. Verifieer direct op bestandsniveau
   - Test in de browser:
     ```text
     https://rv-installatie.nl/uploads/projects/1775981175111-16644963.jpg
     ```
   - Als dit nog steeds 404 geeft, dan de volledige uitgeklapte config inspecteren met `nginx -T`, omdat de actieve config mogelijk uit een ander bestand of include komt dan verwacht.

5. Tweede controle als fallback: directory-toegang
   - Als routing goed is maar het bestand nog niet opent, controleer execute-rechten op oudermappen:
     - `/opt`
     - `/opt/comfort-connect`
     - `/opt/comfort-connect/backend`
     - `/opt/comfort-connect/backend/uploads`
   - `www-data` moet kunnen traversen; anders kan Nginx het bestand niet bereiken.

Geen app-code wijziging nodig
- Op basis van de gelezen code verwacht ik nu geen frontend-fix.
- Pas alleen code aan als na de Nginx-fix blijkt dat de database absolute/onjuiste paden terugstuurt, maar dat zie ik nu niet.

Technische details
- Frontend verwacht: `/uploads/projects/<bestand>`
- Backend schrijft naar: `backend/uploads/projects`
- Nginx moet dus exact mappen:
  ```text
  URL /uploads/projects/x.jpg
  -> alias /opt/comfort-connect/backend/uploads/
  -> fysiek bestand /opt/comfort-connect/backend/uploads/projects/x.jpg
  ```
- Zonder `^~` kan een regex image-location winnen en zoekt Nginx vaak onder de site root in plaats van onder de alias-map.

Als je dit plan goedkeurt, voer ik in de volgende stap de concrete serverfix uit en loop ik ook de verificatie stap voor stap met je langs.
