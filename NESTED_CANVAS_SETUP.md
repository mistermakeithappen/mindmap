# Nested Canvas Feature Setup Guide

## Overview
I've implemented the nested mind maps feature as requested. This allows you to create group nodes that act as portals to sub-canvases, enabling unlimited depth in your mind maps.

## Database Migration Required

You need to run the SQL migration in your Supabase dashboard:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `apply_nested_canvas_migrations.sql`
4. Run the migration

## New Features Implemented

### 1. **Nested Group Node**
- A new node type that acts as a portal to a sub-canvas
- Double-click to enter the sub-canvas
- Shows the number of items inside
- Visual distinction with folder icon (📂)

### 2. **Multi-Select & Group Creation**
- Select multiple nodes by clicking and dragging
- Right-click on selected nodes to see context menu
- Options:
  - **Create Group**: Creates a regular group that contains nodes
  - **Create Nested Group**: Creates a portal to a new sub-canvas

### 3. **Canvas Navigation**
- Breadcrumb navigation at the top showing your current location
- Back button to return to parent canvas
- Click any breadcrumb to jump to that level

### 4. **API Endpoints**
- `/api/canvas/[canvasId]/sub-canvas` - Create and fetch sub-canvases
- `/api/canvas/[canvasId]/breadcrumbs` - Get navigation breadcrumbs

## How to Use

### Creating a Nested Group:
1. Select multiple nodes (hold Shift and click, or drag to select)
2. Right-click on any selected node
3. Choose "Create Nested Group"
4. The selected nodes will be replaced with a single nested group node

### Navigating Nested Canvases:
1. Double-click a nested group node to enter it
2. Use the breadcrumb navigation at the top to go back
3. The back arrow returns you to the parent canvas

### Visual Indicators:
- Regular groups: Dashed border, can contain nodes directly
- Nested groups: Solid border, portal icon, shows item count

## Current Status

### Completed:
✅ Database schema for nested canvases
✅ NestedGroupNode component
✅ Canvas navigation with breadcrumbs
✅ API endpoints for sub-canvas operations
✅ Multi-select functionality
✅ Right-click context menu
✅ Group creation utilities

### Pending:
- Integration with canvas store for saving nodes to sub-canvases
- Proper deletion of nodes when creating nested groups
- Full testing of navigation flow

## Next Steps

To complete the implementation:

1. **Update Canvas Store**: Add methods to handle moving nodes between canvases
2. **Fix Node Management**: Ensure nodes are properly moved to sub-canvas when creating nested groups
3. **Test Navigation**: Verify the complete flow of creating and navigating nested canvases

The foundation is in place, but some integration work remains to fully connect all the pieces.