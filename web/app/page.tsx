import Link from "next/link"
import { JoinForm } from "@/app/components/JoinForm"
import { LogoutButton } from "@/app/components/LogoutButton"
import { getCurrentUser } from "@/lib/session"

export default async function Home() {
  const user = await getCurrentUser()

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight">make</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          A Hack Club You Ship, We Ship program.
        </p>
      </div>

      {user ? (
        <div className="space-y-4 rounded-xl border border-black/10 p-5 dark:border-white/15">
          <p className="text-sm">
            Signed in as <span className="font-medium">{user.name ?? user.email}</span>
            {user.is_admin && (
              <span className="ml-2 rounded bg-black/5 px-1.5 py-0.5 text-xs dark:bg-white/10">
                admin
              </span>
            )}
          </p>
          <div className="flex items-center justify-between gap-4">
            <p className="font-mono text-xs text-black/50 dark:text-white/50">{user.id}</p>
            <LogoutButton />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-black/60 dark:text-white/60">
            Enter your email to get started. No password, no verification.
          </p>
          <JoinForm />
        </div>
      )}

      <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-black/60 dark:text-white/60">
        <Link href="/edu" className="underline-offset-4 hover:underline">
          Teacher? See the edu page
        </Link>
        <a href="https://hackclub.com/" className="underline-offset-4 hover:underline">
          Learn about Hack Club
        </a>
      </nav>
    </main>
  )
}
