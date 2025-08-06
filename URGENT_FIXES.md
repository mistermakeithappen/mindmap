# Urgent Fixes Required

## 1. Database - RLS Policy Fix (CRITICAL)

The RLS policies are causing infinite recursion. Run this SQL in your Supabase dashboard immediately:

1. Go to Supabase SQL Editor
2. Run the contents of `fix_all_issues.sql`

This will:
- Drop all existing problematic policies
- Create simple, non-recursive policies
- Fix the infinite recursion error

## 2. Current Status

I've temporarily disabled the nested canvas features to stop the infinite loop:
- Commented out NestedGroupNode imports
- Commented out CanvasNavigation
- Disabled "Create Nested Group" button

## 3. The Application Should Now Work

After running the SQL fix, the app should:
- Load canvases without errors
- Allow multi-select by dragging
- Show right-click context menu
- Allow creating regular groups (not nested)

## 4. To Re-enable Nested Canvas Feature

Once the app is stable, we need to:
1. Fix the infinite loop in the nested canvas store
2. Properly implement the canvas loading without circular dependencies
3. Re-enable the commented code
4. Test the nested navigation carefully

## 5. Root Cause

The infinite loop was caused by:
- The Canvas component using both `useCanvasStore` and `useNestedCanvasStore`
- Both stores potentially triggering updates to each other
- The breadcrumb loading triggering more updates

## Next Steps

1. **Immediate**: Run the SQL fix
2. **Test**: Verify the app works with regular groups
3. **Later**: Carefully re-implement nested canvases with proper state management