import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authClient } from "../lib/auth";
import { Button, Card, ErrorNote, Field, Input } from "../components/ui";

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/app";
  const isRegister = mode === "register";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = isRegister
      ? await authClient.signUp.email({ email, password, name: name.trim() })
      : await authClient.signIn.email({ email, password });
    setBusy(false);
    if (res.error) {
      setError(res.error.message ?? "Something went wrong — try again");
    } else {
      navigate(next, { replace: true });
    }
  };

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
          <h1 className="mb-1 text-xl font-bold">{isRegister ? "Create your account" : "Welcome back"}</h1>
          <p className="mb-5 text-sm text-zinc-400">
            {isRegister ? "Your name is what teammates see on court." : "Sign in to your padel crew."}
          </p>
          <form className="space-y-4" onSubmit={submit}>
            {isRegister && (
              <Field label="Name">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Andrew" required autoFocus />
              </Field>
            )}
            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus={!isRegister}
              />
            </Field>
            <Field label="Password" hint={isRegister ? "At least 8 characters" : undefined}>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={8}
                required
              />
            </Field>
            <ErrorNote message={error} />
            <Button className="w-full" size="lg" busy={busy} type="submit">
              {isRegister ? "Create account" : "Sign in"}
            </Button>
          </form>
        </Card>
        <p className="mt-4 text-center text-sm text-zinc-400">
          {isRegister ? "Already have an account? " : "New here? "}
          <Link
            className="font-semibold text-lime-400 hover:text-lime-300"
            to={`${isRegister ? "/login" : "/register"}?next=${encodeURIComponent(next)}`}
          >
            {isRegister ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </div>
    </div>
  );
}
