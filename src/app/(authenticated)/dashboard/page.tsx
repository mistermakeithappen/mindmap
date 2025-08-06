import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardClient } from '@/components/dashboard/DashboardClient'

export default async function Dashboard() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user has a profile with organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, organizations(*)')
    .eq('id', user.id)
    .single()

  // If no profile or organization, create them
  if (!profile || !profile.organization_id) {
    const orgName = user.email?.split('@')[0] || 'My Organization'
    const slug = `${orgName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`

    // Create organization
    const { data: org } = await supabase
      .from('organizations')
      .insert({
        name: `${orgName}'s Workspace`,
        slug
      })
      .select()
      .single()

    if (org) {
      // Create or update profile
      await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email!,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          organization_id: org.id,
          role: 'admin'
        })
    }
  }

  // Get user's canvases (exclude sub-canvases)
  const { data: canvases } = await supabase
    .from('canvases')
    .select('*')
    .is('parent_canvas_id', null)
    .order('created_at', { ascending: false })

  // Get user's folders
  const { data: folders } = await supabase
    .from('folders')
    .select('*')
    .order('name', { ascending: true })

  return (
    <DashboardClient 
      user={user} 
      initialCanvases={canvases || []} 
      initialFolders={folders || []}
    />
  )
}