import { Link, Navigate } from "react-router-dom";
import { authClient } from "../lib/auth";
import { Button } from "../components/ui";

const steps = [
  {
    title: "Create your group",
    text: "Sunday Padel Crew, Tuesday League — your people, one place.",
  },
  {
    title: "Share one link",
    text: "Players join from WhatsApp. Signup, waitlist and check-in handled.",
  },
  {
    title: "Play",
    text: "Americano pairings, byes and live standings — generated every round.",
  },
];

export function Landing() {
  const { data: session, isPending } = authClient.useSession();
  if (!isPending && session) return <Navigate to="/app" replace />;

  return (
    <div className="app-bg flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2 font-extrabold tracking-tight">
          <span className="text-xl">🎾</span>
          <span className="text-lg">
            Padel<span className="text-lime-400">Time</span>
          </span>
        </div>
        <Link to="/login" className="text-sm font-medium text-zinc-300 hover:text-lime-300">
          Sign in
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-5 pb-16">
        <div className="max-w-xl">
          <p className="mb-4 inline-block rounded-full border border-lime-400/30 bg-lime-400/10 px-3 py-1 text-xs font-semibold text-lime-300">
            Americano · more formats coming
          </p>
          <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-6xl">
            Padel nights that
            <span className="text-lime-400"> run themselves.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-zinc-400">
            Signups, check-in, rotating pairings, byes, scoring and a live leaderboard — so the only
            thing you organize is showing up.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/register">
              <Button size="lg">Start a group — it's free</Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline">
                Sign in
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5">
              <span className="mb-3 inline-flex size-7 items-center justify-center rounded-full bg-lime-400 text-sm font-extrabold text-zinc-950">
                {i + 1}
              </span>
              <h3 className="font-bold">{s.title}</h3>
              <p className="mt-1 text-sm text-zinc-400">{s.text}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-zinc-800/60 py-6 text-center text-xs text-zinc-600">
        PadelTime — the organizer gets the complexity, the players get simplicity.
      </footer>
    </div>
  );
}
