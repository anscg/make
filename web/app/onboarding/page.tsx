import { getCurrentUser } from "@/lib/session"
import { redirect } from "next/navigation"
import { OnboardingDialog } from "./OnboardingDialog"

// The flow itself is still to be designed — for now the page exercises the
// dialog system with a short scripted conversation.
export default async function Onboarding() {
  const user = await getCurrentUser()
  if (!user) redirect("/")

  return (
    <main className="min-h-svh">
      <OnboardingDialog name={user.name?.split(" ")[0] ?? user.email} />
    </main>
  )
}
