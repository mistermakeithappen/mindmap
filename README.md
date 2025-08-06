# MindGrid

A visual mind mapping and idea organization platform built with Next.js, React Flow, and Supabase.

## Features

- 🧠 **Visual Mind Mapping**: Create interactive node-based mind maps
- 📁 **Folder Organization**: Organize your canvases into colored folders
- 🎨 **Multiple Node Types**: Text, Headlines, Sticky Notes, Images, Videos, Files, Links, Emojis, and Groups
- 🤖 **AI-Powered Features**: 
  - Generate images with DALL-E 3
  - Improve and generate text with GPT-4
  - Smart writing suggestions
- 🎯 **Drag & Drop**: Intuitive interface for creating and organizing nodes
- 🔗 **Custom Connections**: Style edges with colors, patterns, and arrow types
- 📱 **Responsive Design**: Works on all devices
- 🔒 **Multi-tenancy**: Secure workspace isolation with Supabase RLS

## Tech Stack

- **Frontend**: Next.js 15.4.5, React 19, TypeScript
- **UI Components**: React Flow, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Authentication, Storage)
- **State Management**: Zustand
- **AI Integration**: OpenAI API (GPT-4, DALL-E 3)

## Getting Started

### Prerequisites

- Node.js 18+ 
- Supabase account
- OpenAI API key (for AI features)

### Installation

1. Clone the repository:
```bash
git clone [your-repo-url]
cd mindgrid
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Update `.env.local` with your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

5. Run database migrations in Supabase Studio:
- `/supabase/migrations/001_initial_schema.sql`
- `/supabase/migrations/009_user_settings.sql` (for AI features)
- `/supabase/migrations/010_folders.sql` (for folder organization)

6. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Usage

1. **Sign Up/Login**: Create an account to start using MindGrid
2. **Create Canvas**: Click "Create New Canvas" to start a new mind map
3. **Add Nodes**: Drag node types from the toolbar onto the canvas
4. **Connect Nodes**: Click and drag between node handles to create connections
5. **Organize**: Create folders and drag canvases to organize your work
6. **AI Features**: Add your OpenAI API key in Settings to unlock AI capabilities

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## License

Private project - All rights reserved