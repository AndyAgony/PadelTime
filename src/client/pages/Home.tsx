import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Api, useLoad } from "../lib/api";
import { fmtDateTime, firstName, plural } from "../lib/format";
import { SESSION_STATUS_LABEL } from "../../shared/types";
import type { SessionStatus } from "../../shared/types";
import { Badge, Button, Card, EmptyState, ErrorNote, Input, Modal, PageSpinner } from "../components/ui";

export const statusTone = (s: SessionStatus) =>
  s === "active" ? "lime" : s === "checkin" ? "amber" : s === "open" ? "sky" : s === "complete" ? "emerald" : "zinc";

export function Home() {
  const { data, error, loading, reload } = useLoad(() => Api.me(), []);
  const [showCreate, setShowCreate] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  if (loading) return <PageSpinner />;
  if (error || !data) return <ErrorNote message={error ?? "Couldn't load"} />;

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setCreateErr(null);
    try {
      const { id } = await Api.createGroup(groupName);
      setShowCreate(false);
      setGroupName("");
      reload();
      navigate(`/app/groups/${id}`);
    } catch (err) {
      setCreateErr((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Hey {firstName(data.user.name)} 👋</h1>
        <p className="text-sm text-zinc-400">Ready to hit?</p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-400">Up next</h2>
        {data.sessions.length === 0 ? (
          <EmptyState title="No upcoming sessions" hint="Create a session from one of your groups." />
        ) : (
          <div className="space-y-3">
            {data.sessions.map((s) => (
              <Link key={s.id} to={`/app/sessions/${s.id}`} className="block">
                <Card className="transition-colors hover:border-lime-400/40">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold">{s.name}</p>
                      <p className="truncate text-sm text-zinc-400">
                        {s.groupName} · {fmtDateTime(s.startsAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <Badge tone={statusTone(s.status)}>{SESSION_STATUS_LABEL[s.status]}</Badge>
                      <span className="text-xs text-zinc-500">
                        {s.confirmedCount}/{s.maxPlayers} in
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Your groups</h2>
          <Button size="sm" variant="ghost" onClick={() => setShowCreate(true)}>
            + New group
          </Button>
        </div>
        {data.groups.length === 0 ? (
          <EmptyState title="No groups yet" hint="A group is your recurring crew — Sunday Padel, Tuesday League…">
            <Button onClick={() => setShowCreate(true)}>Create your first group</Button>
          </EmptyState>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.groups.map((g) => (
              <Link key={g.id} to={`/app/groups/${g.id}`} className="block">
                <Card className="transition-colors hover:border-lime-400/40">
                  <p className="font-bold">{g.name}</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    {plural(g.memberCount, "member")}
                    {g.role === "organizer" && <span className="ml-2 text-lime-400">organizer</span>}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New group">
        <form className="space-y-4" onSubmit={createGroup}>
          <Input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Sunday Padel Crew"
            autoFocus
            required
          />
          <ErrorNote message={createErr} />
          <Button className="w-full" busy={busy} type="submit">
            Create group
          </Button>
        </form>
      </Modal>
    </div>
  );
}
