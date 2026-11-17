# EduConnect

EduConnect is a multi-school school-management and e-learning platform. This repository starts the application as a JavaScript monorepo with a React/Vite web app, an Express REST API, and a MySQL schema.

## Requirements

- Node.js 20+
- MySQL 8+

## Run locally

1. Create a MySQL database and apply `database/schema.sql`.
2. Copy `.env.example` to `.env` and set database credentials and a long random `JWT_SECRET`.
3. Install dependencies with `npm install`.
4. Start both apps with `npm run dev`.
5. The web app is at `http://localhost:5173`; API health check is `http://localhost:4000/api/health`.

The API refuses to start without required database settings and a suitably long JWT secret. Authentication currently supports sign-in for provisioned accounts; account provisioning and the wider role-specific modules are the next implementation milestone. Do not expose this starter to production until those workflows, authorization tests, migrations, backups, and operational controls are complete.

## Structure

- `apps/web`: React, Vite, Tailwind CSS, React Router, Axios, React Hook Form, Zod, Recharts and Lucide.
- `apps/api`: Express, mysql2, JWT, bcrypt, Helmet, rate limiting, Zod.
- `database/schema.sql`: initial relational schema with tenant-scoped records and indexes.

## Security notes

- Store secrets in environment variables; never commit `.env`.
- Use HTTPS in deployed environments and configure `CORS_ORIGIN` to the exact web origin.
- This initial schema establishes school scoping, but every future data query must enforce the authenticated user's school boundary and role permissions.
