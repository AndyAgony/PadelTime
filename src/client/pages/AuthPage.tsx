import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { authClient } from "../lib/auth";
import { Button, Card, ErrorNote, Field, Input } from "../components/ui";

// Passwordless sign-in: email → 6-digit emailed code → (first time) your name.
// /login and /register are the same flow; accounts are created on first code.

function needsName(name: string | undefined | null, email: string): boolean {
  if (!name) return true;
  const n = name.trim().toLowerCase();
  return n.length === 0 || n.includes("@") || n === email.split("@")[0].toLowerCase();
}

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const [step, setStep] = useState<"email" | "code" | "name">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const verifying = useRef(false);
  const [params] = useSearchParams();
  const rawNext = params.get("next") || "/app";
  // Only ever land on our own paths.
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/app";

  // A full page load after sign-in guarantees the app boots with a fresh
  // session read — an in-app navigate can race the cached "no session"
  // state and bounce straight back to login.
  const enter = () => window.location.replace(next);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    const res = await authClient.emailOtp.sendVerificationOtp({
      email: email.trim().toLowerCase(),
      type: "sign-in",
    });
    setBusy(false);
    if (res.error) {
      setError(res.error.message ?? "Couldn't send the code — try again");
    } else {
      setStep("code");
      setCode("");
      setCooldown(30);
    }
  };

  const verify = async (otp: string) => {
    if (verifying.current) return;
    verifying.current = true;
    setBusy(true);
    setError(null);
    const res = await authClient.signIn.emailOtp({ email: email.trim().toLowerCase(), otp });
    setBusy(false);
    verifying.current = false;
    if (res.error) {
      setError(res.error.message ?? "That code didn't work — try again");
      setCode("");
      return;
    }
    if (needsName(res.data?.user?.name, email)) {
      setStep("name");
    } else {
      enter();
    }
  };

  const saveName = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    const res = await authClient.updateUser({ name: trimmed.slice(0, 40) });
    setBusy(false);
    if (res.error) {
      setError(res.error.message ?? "Couldn't save your name — try again");
    } else {
      enter();
    }
  };

  // Auto-verify the moment 6 digits are in.
  useEffect(() => {
    if (step === "code" && /^\d{6}$/.test(code)) void verify(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, step]);

  return (
    <div className="app-bg flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 font-extrabold tracking-tight">
          <span className="text-2xl">🎾</span>
          <span className="text-xl">
            Padel<span className="text-lime-400">Time</span>
          </span>
        </Link>
        <Card>
          {step === "email" && (
            <>
              <h1 className="mb-1 text-xl font-bold">
                {mode === "register" ? "Create your account" : "Sign in"}
              </h1>
              <p className="mb-5 text-sm text-zinc-400">
                No passwords here — we'll email you a 6-digit code. New emails get an account
                automatically.
              </p>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendCode();
                }}
              >
                <Field label="Email">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoFocus
                  />
                </Field>
                <ErrorNote message={error} />
                <Button className="w-full" size="lg" busy={busy} type="submit">
                  Email me a code
                </Button>
              </form>
            </>
          )}

          {step === "code" && (
            <>
              <h1 className="mb-1 text-xl font-bold">Check your inbox</h1>
              <p className="mb-5 text-sm text-zinc-400">
                We sent a 6-digit code to <span className="font-semibold text-zinc-200">{email.trim()}</span>.
              </p>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (/^\d{6}$/.test(code)) void verify(code);
                }}
              >
                <Input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••"
                  className="text-center text-2xl font-black tracking-[0.5em]"
                  autoFocus
                />
                <ErrorNote message={error} />
                <Button className="w-full" size="lg" busy={busy} type="submit" disabled={code.length !== 6}>
                  Sign in
                </Button>
              </form>
              <div className="mt-4 flex items-center justify-between text-sm">
                <button className="text-zinc-400 hover:text-lime-300" onClick={() => { setStep("email"); setError(null); }}>
                  ← Different email
                </button>
                <button
                  className="text-zinc-400 hover:text-lime-300 disabled:opacity-40"
                  disabled={cooldown > 0 || busy}
                  onClick={() => void sendCode()}
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                </button>
              </div>
            </>
          )}

          {step === "name" && (
            <>
              <h1 className="mb-1 text-xl font-bold">You're in 🎾</h1>
              <p className="mb-5 text-sm text-zinc-400">
                One last thing — your name is what teammates see on court.
              </p>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void saveName();
                }}
              >
                <Field label="Your name">
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Andrew" required autoFocus />
                </Field>
                <ErrorNote message={error} />
                <Button className="w-full" size="lg" busy={busy} type="submit">
                  Let's play
                </Button>
              </form>
            </>
          )}
        </Card>
        {step === "email" && (
          <p className="mt-4 text-center text-xs text-zinc-500">
            One code signs you in and creates your account if you're new.
          </p>
        )}
      </div>
    </div>
  );
}
