import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { authClient } from "../lib/auth";
import { Api, useLoad } from "../lib/api";
import { fmtTimeRange } from "../lib/format";
import { Button, Card, ErrorNote, InfoRow, PageSpinner, ProgressBar, StatCell } from "../components/ui";
import { Logo } from "../App";

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

  if (error || !data) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas px-4">
        <Card className="text-center">
          <p className="text-ink">{error ?? "Invite not found"}</p>
        </Card>
      </div>
    );
  }

  const spotsLeft = Math.max(0, data.maxPlayers - data.confirmedCount);
  const joined = !!data.myStatus && data.myStatus !== "dropped";
  const over = ["complete", "cancelled"].includes(data.status);

  return (
    <div className="min-h-dvh bg-canvas pb-28">
      <div className="mx-auto max-w-lg">
        <div className="court-banner relative h-40 sm:rounded-b-3xl">
          <div className="absolute left-4 top-4">
            <span className="rounded-full bg-white px-3 py-1.5 shadow-md">
              <Logo to="/" />
            </span>
          </div>
        </div>
        <div className="px-3">
          <Card className="relative -mt-14 shadow-lg">
            <p className="text-xs font-bold uppercase tracking-widest text-muted">You're invited</p>
            <h1 className="mt-1 text-2xl font-black leading-tight text-navy">{data.name}</h1>
            <p className="mt-1 text-sm text-muted">{fmtTimeRange(data.startsAt, data.durationMin)}</p>
            {data.venue && <p className="text-sm text-muted">📍 {data.venue}</p>}
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4">
              <StatCell label="Format" value="Americano" />
              <StatCell label="Points" value={data.pointsPerMatch} />
              <StatCell label="Courts" value={data.courts} />
            </div>
          </Card>

          <Card className="mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-navy">Players</h3>
              <span className="tabular text-sm font-bold text-navy">
                {data.confirmedCount} <span className="font-medium text-muted">/ {data.maxPlayers}</span>
              </span>
            </div>
            <ProgressBar value={data.confirmedCount} max={data.maxPlayers} className="mt-3" />
            <p className="mt-2 text-xs text-muted">
              {spotsLeft > 0 ? `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left` : "Full — new joins go on the waitlist"}
              {data.waitlistCount > 0 && ` · ${data.waitlistCount} waitlisted`}
            </p>
          </Card>

          <Card className="mt-4">
            <h3 className="mb-1 text-lg font-black text-navy">How it works</h3>
            <div className="divide-y divide-line">
              <InfoRow icon="🔄">New partner every round — Americano</InfoRow>
              <InfoRow icon="🎯">Matches to {data.pointsPerMatch} rally points, you score individually</InfoRow>
              <InfoRow icon="📱">Enter and confirm scores from your phone; live leaderboard</InfoRow>
              <InfoRow icon="🔑">No password — a one-time code by email</InfoRow>
            </div>
          </Card>

          <div className="mt-4">
            <ErrorNote message={joinErr} />
          </div>
        </div>
      </div>

      {/* Sticky action, Playtomic-style */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-lg">
          {joined ? (
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1 text-sm font-semibold">
                {data.myStatus === "waitlist" ? (
                  <span className="text-amber-dark">You're on the waitlist — hang tight.</span>
                ) : (
                  <span className="text-navy">You're in ✓</span>
                )}
              </div>
              <Button size="lg" onClick={() => navigate(`/app/sessions/${data.sessionId}`)}>
                Open session
              </Button>
            </div>
          ) : over ? (
            <Button className="w-full" size="lg" disabled>
              {data.status === "complete" ? "Session finished" : "Session cancelled"}
            </Button>
          ) : !session ? (
            <Link to={`/login?next=${encodeURIComponent(`/join/${code}`)}`} className="block">
              <Button className="w-full" size="lg">
                Continue with email →
              </Button>
            </Link>
          ) : (
            <Button className="w-full" size="lg" busy={busy} onClick={join}>
              {data.status === "active" ? "Ask the organizer to add you" : spotsLeft > 0 ? "Join session" : "Join waitlist"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
