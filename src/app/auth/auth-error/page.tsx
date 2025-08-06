export default function AuthError() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <h2 className="text-3xl font-bold tracking-tight">Authentication Error</h2>
        <p className="text-gray-600">
          There was an error during the authentication process. Please try again.
        </p>
        <a
          href="/auth/login"
          className="inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Back to Login
        </a>
      </div>
    </div>
  )
}