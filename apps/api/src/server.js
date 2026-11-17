import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().url(),
  DB_HOST: z.string().min(1), DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().min(1), DB_PASSWORD: z.string(), DB_NAME: z.string().min(1),
  JWT_SECRET: z.string().min(32), JWT_EXPIRES_IN: z.string().default('15m')
});
const env = envSchema.parse(process.env);
const pool = mysql.createPool({ host: env.DB_HOST, port: env.DB_PORT, user: env.DB_USER, password: env.DB_PASSWORD, database: env.DB_NAME, waitForConnections: true, connectionLimit: 10, enableKeepAlive: true, charset: 'utf8mb4' });
const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false }));

app.get('/api/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok', database: 'connected' }); }
  catch { res.status(503).json({ status: 'unavailable', database: 'disconnected' }); }
});

const loginSchema = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(128) });
app.post('/api/auth/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid email or password format.' });
    const [rows] = await pool.execute(
      `SELECT u.id, u.school_id, u.email, u.password_hash, u.role, u.first_name, u.last_name, u.status
       FROM users u WHERE u.email = ? LIMIT 1`, [parsed.data.email.toLowerCase()]
    );
    const user = rows[0];
    const valid = user && user.status === 'active' && await bcrypt.compare(parsed.data.password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password.' });
    const accessToken = jwt.sign({ sub: String(user.id), schoolId: user.school_id, role: user.role }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN, issuer: 'educonnect-api', audience: 'educonnect-web' });
    res.json({ accessToken, expiresIn: env.JWT_EXPIRES_IN, user: { id: user.id, schoolId: user.school_id, email: user.email, role: user.role, firstName: user.first_name, lastName: user.last_name } });
  } catch (error) { next(error); }
});

app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'An unexpected server error occurred.' });
});

const server = app.listen(env.PORT, () => console.log(`EduConnect API listening on port ${env.PORT}`));
async function shutdown() { server.close(async () => { await pool.end(); process.exit(0); }); }
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
