# Claude Reminders

## Database Migrations Required

1. **User Settings Table** - Run the migration at `/supabase/migrations/009_user_settings.sql` in Supabase Studio to enable AI features. This creates:
   - `user_settings` table for storing OpenAI API keys
   - Proper RLS policies for security
   - Required for AI image generation and text suggestions to work

2. **Folders Table** - Run the migration at `/supabase/migrations/010_folders.sql` in Supabase Studio to enable folder organization. This creates:
   - `folders` table for organizing canvases
   - Adds `folder_id` column to canvases table
   - Proper RLS policies for folder security
   - Indexes for performance

## Fixed Issues

1. **React Flow nodeTypes/edgeTypes warning** - Import node components directly in Canvas.tsx and define nodeTypes object outside the component. Don't use a separate index.ts file for nodeTypes.
2. **Edge delete button flickering** - Added hover delay and proper event handling to maintain stable hover state
3. **AI suggestions API error** - Fixed JSON parsing to handle OpenAI's response format when using `response_format: { type: "json_object" }`
4. **CORS error with AI image generation** - Fixed by downloading the image server-side in the API route and uploading to Supabase storage before returning the URL
5. **406 Error on user_settings queries** - Use `maybeSingle()` instead of `single()` and check for error codes 42P01 or PGRST204 to detect missing table
6. **Group node not recognizing dragged nodes** - Implemented proper React Flow parent-child relationships using `parentNode` and `extent: 'parent'`. Added `onNodeDragStop` handler to check for intersections.

## AI Features Setup

1. User must add their OpenAI API key in Settings page (`/settings`)
2. AI features available in:
   - Image Node: Click "AI" button to generate images
   - Text Node: Click "AI" button for writing assistance
   - Headline Node: Click "AI" button when editing
   - Sticky Note: Click "AI" button in top controls

## Known Issues

1. **406 Error on user_settings** - This occurs when the database migration hasn't been run yet. The table doesn't exist until you run the migration in Supabase Studio.
2. **500 Error on AI suggestions** - If you get this error, it means:
   - The database migration hasn't been run yet, OR
   - The user hasn't added their OpenAI API key in settings

## OpenAI API Notes

- Using GPT-4 Turbo Preview for text suggestions
- Using DALL-E 3 for image generation
- When using `response_format: { type: "json_object" }`, the response must be a JSON object (not array)