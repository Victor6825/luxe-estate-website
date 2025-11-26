# LuxeEstate Backend API

This backend is built for Vercel serverless functions and provides API endpoints for managing properties, submissions, content blocks, admin users, and dashboard metrics. It also powers the `/admin` single-page application for internal tooling.

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Vercel Postgres Database

1. Go to your Vercel dashboard
2. Navigate to your project
3. Go to **Storage** tab
4. Click **Create Database** → Select **Postgres**
5. Once created, copy the connection strings

### 3. Configure Environment Variables

1. In Vercel dashboard, go to **Settings** → **Environment Variables**
2. Add the following variables (database + auth + email):
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL`
   - `POSTGRES_URL_NON_POOLING`
   - `POSTGRES_USER`
   - `POSTGRES_HOST`
   - `POSTGRES_PASSWORD`
   - `POSTGRES_DATABASE`
   - `JWT_SECRET` (any strong random string)
   - `RESEND_API_KEY` (or another transactional email provider key)
   - `RESEND_FROM_EMAIL` (verified sender address)
   - `NOTIFY_EMAIL` (where submission notifications should be delivered)

### 4. Initialize Database

Run the SQL schema to create tables:

1. In Vercel dashboard, go to your Postgres database
2. Click on **Data** tab
3. Use the SQL editor to run the contents of `database/schema.sql`

Or use the Vercel CLI:
```bash
vercel env pull .env.local
psql $POSTGRES_URL < database/schema.sql
```

### 5. Deploy to Vercel

```bash
vercel
```

Or push to your connected GitHub repository (Vercel will auto-deploy).

## API Endpoints

### Auth / Users

- `POST /api/auth/register` – Create user (first user bootstraps as admin)
- `POST /api/auth/login` / `POST /api/auth/logout`
- `POST /api/auth/refresh` – Rotate refresh token
- `GET /api/auth/me` – Current session details
- `GET /api/users` – List users (**admin only**)
- `POST /api/users` – Create user (**admin only**)
- `PUT /api/users/[id]`, `DELETE /api/users/[id]` (**admin only**)

### Properties

- `GET /api/properties` - Get all properties (supports query filters: location, type, priceRange, bedrooms)
- `GET /api/properties/[id]` - Get a specific property
- `POST /api/properties` - Create a new property (**admin/editor**)
- `PUT /api/properties/[id]` - Update a property (**admin/editor**)
- `DELETE /api/properties/[id]` - Delete a property (**admin**)

### Submissions

- `GET /api/submissions` - Get all form submissions (**admin/editor**)
- `POST /api/submissions` - Create a new submission (public). Triggers email notification.
- `PUT /api/submissions/[id]`, `DELETE /api/submissions/[id]` (**admin/editor** / **admin**)

### Content Blocks

- `GET /api/content-blocks` (optional `?slug=hero`)
- `POST /api/content-blocks` (**admin/editor**) – upsert by slug
- `GET/PUT/DELETE /api/content-blocks/[slug]`

### Dashboard & Uploads

- `GET /api/dashboard/metrics` (**admin/editor**)
- `POST /api/uploads/blob-url` (**admin/editor**) – returns signed upload URLs for images (Vercel Blob)
- `GET /api/health` - Check API status

### Health Check

- `GET /api/health` - Check API status

## Example Usage

### Get Properties with Filters
```javascript
fetch('/api/properties?location=beverly-hills&type=penthouse&bedrooms=4')
  .then(res => res.json())
  .then(data => console.log(data));
```

### Create Property
```javascript
fetch('/api/properties', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Modern Penthouse Suite',
    location: 'beverly-hills',
    type: 'penthouse',
    price: 4500000,
    bedrooms: 4,
    bathrooms: 3,
    sqft: 3500,
    description: 'Luxury penthouse with stunning views',
    image: 'https://example.com/image.jpg'
  })
})
  .then(res => res.json())
  .then(data => console.log(data));
```

## Database Schema

- **users**: `id`, `name`, `email`, `password_hash`, `role`
- **properties**: content fields + `status`, `featured`, `created_by`, `updated_by`
- **submissions**: contact info + `status`, `notes`, `assigned_to`
- **content_blocks**: `slug`, `title`, `content` JSON, `published`
- **refresh_tokens**: stored hashed refresh tokens for JWT rotation

## Local Development

```bash
npm run dev
```

This starts Vercel's development server at `http://localhost:3000` (admin UI is served at `/admin`).

## Notes

- All API endpoints support CORS and expect HTTP-only cookies for auth
- Backend uses Vercel Postgres + Vercel Blob (for property images) + Resend (for email alerts)
- Form submissions trigger in-app storage + optional notification emails
- Admin SPA (vanilla JS) lives in `/admin` and uses these APIs directly

