# Recipe Curator

A modern recipe management web application built with SolidStart, Drizzle ORM, and Turso. Organize, discover, and curate your favorite recipes with ease.

## Features

- 🌐 **Recipe Import**: Automatically scrape recipes from any website URL
- 📝 **Manual Recipe Creation**: Add your own recipes from scratch
- 🏷️ **Tag Organization**: Categorize recipes with custom tags
- 🔍 **Search & Filter**: Find recipes by title, tags, cuisine, and more
- ✏️ **Recipe Editing**: Modify all aspects of your recipes
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile
- 🔐 **User Authentication**: Secure email/password authentication
- 📧 **Email Notifications**: Welcome emails via Resend

## Tech Stack

- **Frontend**: SolidStart, Solid.js, TailwindCSS
- **Backend**: SolidStart API routes
- **Database**: Turso (SQLite)
- **ORM**: Drizzle ORM
- **Email**: Resend
- **Scraping**: Cheerio
- **Authentication**: Custom email/password with sessions

## Quick Start

### Prerequisites

- Node.js 20+ (though the project specifies Node.js 22+)
- A Turso database
- A Resend account (optional, for welcome emails)

### Installation

1. **Clone and install dependencies**
   ```bash
   git clone <your-repo-url>
   cd cookbook
   pnpm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

3. **Configure your `.env` file**
   ```env
   # Turso Database (Required)
   TURSO_DATABASE_URL=your_turso_database_url
   TURSO_AUTH_TOKEN=your_turso_auth_token

   # Resend API for emails (Optional)
   RESEND_API_KEY=your_resend_api_key

   # Session secret (Required - generate a secure random string)
   SESSION_SECRET=your_very_long_session_secret_key
   AUTH_SECRET=your_secret_key_for_sessions
   ```

### Database Setup

1. **Create a Turso database**
   ```bash
   # Install Turso CLI
   curl -sSfL https://get.tur.so/install.sh | bash

   # Create database
   turso db create cookbook

   # Get database URL and auth token
   turso db show cookbook
   turso db tokens create cookbook
   ```

2. **Generate and run migrations**
   ```bash
   pnpm db:generate
   pnpm db:push
   ```

### Development

Start the development server:
```bash
pnpm dev
```

The app will be available at `http://localhost:3000`

## Database Commands

- `pnpm db:generate` - Generate migrations from schema changes
- `pnpm db:push` - Push schema changes to database
- `pnpm db:studio` - Open Drizzle Studio for database management

## Project Structure

```
src/
├── components/          # Reusable UI components
├── db/                 # Database schema and configuration
│   ├── schema.ts       # Drizzle schema definitions
│   └── index.ts        # Database connection
├── lib/                # Utility functions and services
│   ├── auth.ts         # Authentication utilities
│   ├── auth-context.tsx # Authentication context
│   ├── email.ts        # Email service
│   ├── middleware.ts   # API middleware
│   ├── recipe-scraper.ts # Recipe scraping logic
│   └── recipe-service.ts # Recipe CRUD operations
├── routes/             # File-based routing
│   ├── api/            # API endpoints
│   │   ├── auth/       # Authentication routes
│   │   ├── recipes/    # Recipe CRUD routes
│   │   └── tags/       # Tag management routes
│   ├── recipe/         # Recipe detail pages
│   ├── dashboard.tsx   # Main dashboard
│   ├── login.tsx       # Login page
│   ├── register.tsx    # Registration page
│   └── index.tsx       # Landing page
└── app.tsx             # Root application component
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - Authenticate user
- `POST /api/auth/logout` - Sign out user
- `GET /api/auth/me` - Get current user

### Recipes
- `GET /api/recipes` - List user's recipes (with filtering)
- `POST /api/recipes` - Create new recipe
- `GET /api/recipes/:id` - Get recipe by ID
- `PUT /api/recipes/:id` - Update recipe
- `DELETE /api/recipes/:id` - Delete recipe
- `POST /api/recipes/scrape` - Scrape recipe from URL

### Tags
- `GET /api/tags` - List all tags
- `POST /api/tags` - Create new tag
- `DELETE /api/tags/:id` - Delete tag

## Recipe Image Uploads

Recipe editors support file uploads as well as external image URLs. Uploads go
directly from the browser to Vercel Blob with a short-lived, authenticated upload
token, avoiding Vercel Functions' request-body size limit. JPEG, PNG, WebP, GIF,
and AVIF images up to 10 MB are supported.

### Storage setup

1. In your Vercel project's **Storage** tab, create or connect a **public Blob** store.
2. Enable the store connection for the environments you use (Production, Preview,
   and Development).
3. Set the server environment variable `BLOB_READ_WRITE_TOKEN` to the store's
   read-write token. Vercel can add this automatically when connecting the store.
4. For local development, add the same variable to `.env`, or pull your Development
   variables with `vercel env pull .env.local`. Restart the dev server after adding it.
5. Redeploy after configuring the production environment.

Open a recipe, select **Edit Recipe**, then **Upload image** in the Recipe image
section. New recipes and recipe variants support uploads too. The image is uploaded
immediately, but its URL is attached to the recipe only when you save. No database
migration is needed: both uploaded and external images use the existing `imageUrl`.

Blob image URLs are public, so anyone with an image URL can view it. The read-write
token stays on the server. Token issuance checks the user's session, limits paths
to that user's image folder, and enforces image types and a 10 MB limit.

Removing/replacing an image detaches its URL when the recipe is saved; it does not
delete the stored file, which may also be used by a fork or variant. Uploads from
abandoned edits also remain in Blob. Unused files can be managed in the Vercel Blob
dashboard. Saving does not depend on upload-completion webhooks, so local uploads
do not require a public tunnel.

## Recipe Scraping

The app can automatically extract recipe data from most recipe websites using:

1. **JSON-LD structured data** (preferred)
2. **Microdata markup** (fallback)
3. **HTML parsing** (fallback)

Supported recipe properties:
- Title and description
- Ingredients and instructions
- Cooking times (prep, cook, total)
- Servings, difficulty, cuisine
- Images and nutrition info

## Deployment

### Vercel (Recommended)

1. **Connect your repository to Vercel**
2. **Set environment variables in Vercel dashboard**
3. **Deploy**

### Other Platforms

The app can be deployed to any Node.js hosting platform. Make sure to:
1. Set all required environment variables
2. Ensure your Turso database is accessible
3. Run database migrations if needed

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

If you encounter any issues or have questions:
1. Check the existing issues on GitHub
2. Create a new issue with detailed information
3. Include error messages and steps to reproduce

---

Built with ❤️ using SolidStart and modern web technologies.
