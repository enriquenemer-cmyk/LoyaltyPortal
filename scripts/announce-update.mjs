// Anuncia una actualización de la plataforma como notificación global (la
// campanita del panel admin) para todos los restaurantes.
//
// Uso:
//   node scripts/announce-update.mjs "Título corto" "Descripción de qué cambió"
//
// Se ejecuta después de cada push a producción para avisar del cambio —
// no requiere sesión ni CRON_SECRET porque inserta directo a la base de
// datos, igual que el resto de los scripts de mantenimiento de este repo.
import { Pool } from 'pg';
import fs from 'fs';
import { randomUUID } from 'crypto';

const [title, body] = process.argv.slice(2);
if (!title || !body) {
  console.error('Uso: node scripts/announce-update.mjs "Título" "Descripción"');
  process.exit(1);
}

const envText = fs.readFileSync('.env.local', 'utf8');
const match = envText.match(/^DATABASE_URL=(.*)$/m);
const pool = new Pool({ connectionString: match[1].trim().replace(/^"|"$/g, '') });

await pool.query(
  `INSERT INTO notifications (id, type, title, body, link, restaurant_id)
   VALUES ($1, 'platform_update', $2, $3, NULL, NULL)`,
  [randomUUID(), title, body]
);

console.log('Notificación de actualización creada:', title);
await pool.end();
