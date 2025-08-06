import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4 text-indigo-600">MindGrid</h1>
        <p className="text-xl text-gray-600 mb-8">
          Visual mind mapping and idea organization platform
        </p>
        <div className="space-x-4">
          <Link
            href="/auth/login"
            className="rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Sign In
          </Link>
          <Link
            href="/auth/signup"
            className="rounded-md bg-gray-200 px-6 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-300"
          >
            Get Started
          </Link>
        </div>
      </div>
    </main>
  )
}