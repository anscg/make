import Link from "next/link"
import { getCurrentUser } from "@/lib/session"
import { redirect } from "next/navigation"
import { LogoutButton } from "@/app/components/LogoutButton"

// Where the tour sends anyone who says they are 19 or over. Make, like Hack
// Club, is only for teens, so there is nothing further to onboard into.
export default async function AgeGate() {
  const user = await getCurrentUser()
  if (!user) redirect("/")

  return (
    <main
      className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 text-center font-fredoka text-white"
      style={{
        background: "radial-gradient(120% 90% at 20% 0%, #7b6fe0 0%, #5d55c4 45%, #3d3591 100%)",
      }}
    >
      <h1 className="text-4xl font-semibold">Sorry! Make is only for teens.</h1>
      <p className="max-w-xl text-xl text-white/80">
        Hack Club is a nonprofit run by teens, for teens. Make, like everything Hack Club does, is only for people
        aged 13–18, so it isn’t for you.
      </p>
      <p className="max-w-xl text-xl text-white/80">
        Curious about why?{" "}
        <a href="https://hackclub.com/philosophy" className="underline underline-offset-4">
          Read about our philosophy.
        </a>
      </p>
      <p className="max-w-xl text-xl text-white/80">Thanks for stopping by!</p>
      <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-lg text-white/80">
        <Link href="/" className="underline underline-offset-4">
          Landing page
        </Link>
        <Link href="/edu" className="underline underline-offset-4">
          Teacher? See the edu page
        </Link>
        <a href="https://hackclub.com/" className="underline underline-offset-4">
          Learn about Hack Club
        </a>
      </nav>
      <LogoutButton />
    </main>
  )
}
