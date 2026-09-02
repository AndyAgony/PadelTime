import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { authClient } from "../lib/auth";
import { Api, useLoad } from "../lib/api";
import { fmtDateTime } from "../lib/format";
import { Badge, Button, Card, ErrorNote, PageSpinner } from "../components/ui";

export function JoinPage() {
  const { code = "" } = useParams();
  const { data: session, isPending } = authClient.useSession();
  const { data, error, loading, reload } = useLoad(() => Api.joinInfo(code), [code]);
  const [joinErr, setJoinErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  if (loading || isPending) return <PageSpinner />;

  const join = async () => {
    setBusy(true);
    setJoinErr(null);
    try {
      await Api.join(code);
      reload();
    } catch (e) {
      setJoinErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const spotsLeft = data ? Math.max(0, data.maxPlayers - data.confirmedCount) : 0;

  return (
    <div className="app-bg flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 font-extrabold tracking-tight">
          <span className="text-2xl">🎾</span>
          <span className="text-xl">
            Padel<span className="text-lime-400">Time</span>
          </span>
        </Link>

        {error || !data ? (
          <Card className="text-center">
            <p className="text-zinc-300">{error ?? "Invite not found"}</p>
          </Card>
        ) : (
          <Card>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">You're invited</p>
            <h1 className="mt-1 text-2xl font-black">{data.name}</h1>
            <p className="text-sm text-zinc-400">{data.groupName}</p>
            <div className="mt-4 space-y-1.5 text-sm text-zinc-300">
              <p>
                📅 {fmtDateTime(data.startsAt)}
                {data.durationMin ? ` · ${data.durationMin} min` : ""}
              </p>
              {data.venue && <p>📍 {data.venue}</p>}
              <p>
                🎾 Americano · {data.pointsPerMatch} points · {data.courts} court{data.courts === 1 ? "" : "s"}
              </p>
              <p className="pt-1">
                <span className="font-bold text-lime-300">{data.confirmedCount}</span>
                <span className="text-zinc-500">/{data.maxPlayers} in</span>
                {data.waitlistCount > 0 && <span className="ml-2 text-amber-300">{data.waitlistCount} waitlisted</span>}
              </p>
            </div>

            <div className="mt-5 space-y-3">
              {data.myStatus && data.myStatus !== "dropped" ? (
                <>
                  <div className="rounded-xl bg-lime-400/10 px-4 py-3 text-center text-sm">
                    {data.myStatus === "waitlist" ? (
                      <span className="text-amber-300">You're on the waitlist — hang tight.</span>
                    ) : (
                      <span className="text-lime-300">You're in ✓</span>
                    )}
                  </div>
                  <Button className="w-full" onClick={() => navigate(`/app/sessions/${data.sessionId}`)}>
                    Open session
                  </Button>
                </>
              ) : !session ? (
                <>
                  <Link to={`/login?next=${encodeURIComponent(`/join/${code}`)}`} className="block">
                    <Button className="w-full" size="lg">
                      Continue with email →
                    </Button>
                  </Link>
                  <p className="text-center text-xs text-zinc-500">
                    We'll email you a 6-digit code — no password needed.
                  </p>
                </>
              ) : (
                <Button className="w-full" size="lg" busy={busy} onClick={join}>
                  {spotsLeft > 0 ? "Join session" : "Join waitlist"}
                </Button>
              )}
              <ErrorNote message={joinErr} />
              {!data.myStatus && spotsLeft > 0 && (
                <p className="text-center text-xs text-zinc-500">
                  {spotsLeft} spot{spotsLeft === 1 ? "" : "s"} left
                </p>
              )}
              {["active", "complete"].includes(data.status) && (
                <p className="text-center text-xs text-zinc-500">
                  <Badge tone="zinc">{data.status === "active" ? "Session in progress" : "Session finished"}</Badge>
                </p>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
