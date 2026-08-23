import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Api, useLoad } from "../lib/api";
import { fmtDateTime, fromLocalInputValue, plural } from "../lib/format";
import { SESSION_STATUS_LABEL } from "../../shared/types";
import type { SessionSummary } from "../../shared/types";
import { Badge, Button, Card, EmptyState, ErrorNote, Field, Input, Modal, PageSpinner } from "../components/ui";
import { statusTone } from "./Home";

function SessionLink({ s }: { s: SessionSummary }) {
  return (
    <Link to={`/app/sessions/${s.id}`} className="block">
      <Card className="transition-colors hover:border-lime-400/40">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-bold">{s.name}</p>
            <p className="truncate text-sm text-zinc-400">{fmtDateTime(s.startsAt)}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <Badge tone={statusTone(s.status)}>{SESSION_STATUS_LABEL[s.status]}</Badge>
            {s.status === "complete" && s.winnerName ? (
              <span className="text-xs text-amber-300">🏆 {s.winnerName}</span>
            ) : (
              <span className="text-xs text-zinc-500">
                {s.confirmedCount}/{s.maxPlayers} in
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

export function GroupPage() {
  const { id = "" } = useParams();
  const { data, error, loading, reload } = useLoad(() => Api.group(id), [id]);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    when: "",
    venue: "",
    courts: 2,
    maxPlayers: 12,
    pointsPerMatch: 24,
  });
  const navigate = useNavigate();

  if (loading) return <PageSpinner />;
  if (error || !data) return <ErrorNote message={error ?? "Couldn't load"} />;

  const isOrganizer = data.myRole === "organizer";
  const upcoming = data.sessions.filter((s) => !["complete", "cancelled"].includes(s.status));
  const past = data.sessions.filter((s) => ["complete", "cancelled"].includes(s.status));

  const createSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setCreateErr(null);
    try {
      const { id: sessionId } = await Api.createSession(data.id, {
        name: form.name || `${data.name} session`,
        venue: form.venue || null,
        startsAt: fromLocalInputValue(form.when),
        courts: form.courts,
        maxPlayers: form.maxPlayers,
        pointsPerMatch: form.pointsPerMatch,
        format: "americano",
      });
      navigate(`/app/sessions/${sessionId}`);
    } catch (err) {
      setCreateErr((err as Error).message);
      setBusy(false);
    }
  };

  const num = (v: string, fallback: number) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-500">
            <Link to="/app" className="hover:text-lime-300">Home</Link> / group
          </p>
          <h1 className="text-2xl font-black tracking-tight">{data.name}</h1>
          <p className="text-sm text-zinc-400">{plural(data.members.length, "member")}</p>
        </div>
        {isOrganizer && <Button onClick={() => setShowCreate(true)}>+ New session</Button>}
      </div>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-400">Upcoming</h2>
        {upcoming.length === 0 ? (
          <EmptyState
            title="Nothing scheduled"
            hint={isOrganizer ? "Spin up the next session — it takes 20 seconds." : "The organizer hasn't scheduled the next one yet."}
          >
            {isOrganizer ? <Button onClick={() => setShowCreate(true)}>Create a session</Button> : undefined}
          </EmptyState>
        ) : (
          <div className="space-y-3">
            {upcoming.map((s) => (
              <SessionLink key={s.id} s={s} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-400">Past sessions</h2>
          <div className="space-y-3">
            {past.map((s) => (
              <SessionLink key={s.id} s={s} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-400">Members</h2>
        <Card className="divide-y divide-zinc-800/70 p-0">
          {data.members.map((m) => (
            <div key={m.userId} className="flex items-center justify-between px-5 py-3">
              <span className="font-medium">{m.name}</span>
              <div className="flex items-center gap-2">
                {m.role === "organizer" ? (
                  <Badge tone="lime">organizer</Badge>
                ) : (
                  <Badge tone="zinc">member</Badge>
                )}
                {isOrganizer && (
                  <>
                    {m.role === "member" ? (
                      <Button
                        size="sm"
                        variant="subtle"
                        onClick={async () => {
                          await Api.setMemberRole(data.id, m.userId, "organizer");
                          reload();
                        }}
                      >
                        Make organizer
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="subtle"
                        onClick={async () => {
                          try {
                            await Api.setMemberRole(data.id, m.userId, "member");
                            reload();
                          } catch {
                            /* owner can't be demoted */
                          }
                        }}
                      >
                        Demote
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </Card>
      </section>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New session">
        <form className="space-y-4" onSubmit={createSession}>
          <Field label="Name">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Sunday Padel"
              autoFocus
            />
          </Field>
          <Field label="When">
            <Input
              type="datetime-local"
              value={form.when}
              onChange={(e) => setForm({ ...form, when: e.target.value })}
            />
          </Field>
          <Field label="Venue">
            <Input
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
              placeholder="Padel club"
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Courts">
              <Input
                type="number"
                min={1}
                max={12}
                value={form.courts}
                onChange={(e) => setForm({ ...form, courts: num(e.target.value, 2) })}
              />
            </Field>
            <Field label="Max players">
              <Input
                type="number"
                min={4}
                max={64}
                value={form.maxPlayers}
                onChange={(e) => setForm({ ...form, maxPlayers: num(e.target.value, 12) })}
              />
            </Field>
            <Field label="Points">
              <Input
                type="number"
                min={4}
                max={99}
                value={form.pointsPerMatch}
                onChange={(e) => setForm({ ...form, pointsPerMatch: num(e.target.value, 24) })}
              />
            </Field>
          </div>
          <p className="text-xs text-zinc-500">
            Format: <span className="font-semibold text-zinc-300">Americano</span> — rotating partners,
            every point counts individually. More formats coming.
          </p>
          <ErrorNote message={createErr} />
          <Button className="w-full" busy={busy} type="submit">
            Create session
          </Button>
        </form>
      </Modal>
    </div>
  );
}
