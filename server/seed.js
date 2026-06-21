// Seed a demo user + sample listings for local development.
// Run with: npm run db:seed   (safe to re-run — it resets the demo data)
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { sql } from './db.js';

// Strong, non-breached demo password (avoids Chrome's leaked-password warning).
const DEMO = { username: 'demo', email: 'demo@swap.test', phone: '555-0100', password: 'swap-demo-2026!' };

const ITEMS = [
  { title: 'Cannondale road bike, 56cm',     category: 'bikes',       price: 120,  description: 'Light alloy frame, recently serviced. Rides great.' },
  { title: 'Mid-century teak desk',          category: 'furniture',   price: 85,   description: 'Some surface wear, structurally solid.' },
  { title: 'Film camera + 50mm lens',        category: 'photo',       price: null, description: 'Fully working, light meter accurate. Open to offers.' },
  { title: 'Stack of vinyl records (~40)',   category: 'music',       price: 40,   description: 'Mostly jazz and soul, all play fine.' },
  { title: 'IKEA bookshelf, white',          category: 'home',        price: 25,   description: 'Moving out, must go this week.' },
  { title: 'Winter jacket, size M',          category: 'clothing',    price: null, description: 'Worn one season. Price negotiable.' },
];

async function run() {
  const password_hash = await bcrypt.hash(DEMO.password, 10);
  const [user] = await sql`
    INSERT INTO users (username, email, password_hash, phone, email_verified)
    VALUES (${DEMO.username}, ${DEMO.email}, ${password_hash}, ${DEMO.phone}, true)
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
    RETURNING id`;
  console.log(`[seed] demo user id=${user.id} (login: ${DEMO.email} / ${DEMO.password})`);

  await sql`DELETE FROM items WHERE seller_id = ${user.id}`;
  for (const it of ITEMS) {
    await sql`
      INSERT INTO items (seller_id, title, description, price, category)
      VALUES (${user.id}, ${it.title}, ${it.description}, ${it.price}, ${it.category})`;
  }
  console.log(`[seed] inserted ${ITEMS.length} listings. done.`);
}

run().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
