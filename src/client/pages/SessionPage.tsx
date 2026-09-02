import { Fragment, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Api, usePoll } from "../lib/api";
import { fmtDateTime, fromLocalInputValue, toLocalInputValue } from "../lib/format";
import { SESSION_STATUS_LABEL } from "../../shared/types";
import type { MatchRow, PlayerRow, RoundRow, SessionDetail } from "../../shared/types";
import { estimateRounds } from "../../shared/timing";
import { Badge, Button, Card, CopyButton, ErrorNote, Field, Input, Modal, PageSpinner, cls } from "../components/ui";
import { ScoreEntry } from "../components/ScoreEntry";
import { StandingsTable } from "../components/StandingsTable";
import { statusTone } from "./Home";

type Run = (key: string, fn: () => Promise<unknown>) => Promise<void>;

export function SessionPage() {
  const { id = "" } = useParams();
  const { data, error, loading, reload } = usePoll(() => Api.session(id), 4000, [id]);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const navigate = useNavigate();

  const run: Run = async (key, fn) => {
    setBusyKey(key);
    setActionErr(null);
    try {
      await fn();
      reload();
    } catch (e) {
      setActionErr((e as Error).message);
    } finally {
      setBusyKey(null);
    }
  };

  if (loading && !data) return <PageSpinner />;
  if (error && !data) return <ErrorNote message={error} />;
  if (!data) return null;

  const d = data;
  const isOrganizer = d.myRole === "organizer";

  return (
    <div className="space-y-5">
      <Header d={d} isOrganizer={isOrganizer} run={run} busyKey={busyKey} onDeleted={() => navigate(`/app/groups/${d.groupId}`)} />
      <LifecycleStepper d={d} isOrganizer={isOrganizer} run={run} busyKey={busyKey} />
      <ErrorNote message={actionErr} />
      {d.status !== "cancelled" && <RulesCard d={d} />}

      {d.status === "draft" && <DraftView d={d} isOrganizer={isOrganizer} run={run} busyKey={busyKey} />}
      {d.status === "open" && <OpenView d={d} isOrganizer={isOrganizer} run={run} busyKey={busyKey} />}
      {d.status === "checkin" && <CheckinView d={d} isOrganizer={isOrganizer} run={run} busyKey={busyKey} />}
      {d.status === "active" && <ActiveView d={d} isOrganizer={isOrganizer} run={run} busyKey={busyKey} />}
      {d.status === "complete" && <CompleteView d={d} isOrganizer={isOrganizer} run={run} busyKey={busyKey} />}
      {d.status === "cancelled" && (
        <Card>
          <p className="text-zinc-400">This session was cancelled.</p>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function Header({
  d,
  isOrganizer,
  run,
  busyKey,
  onDeleted,
}: {
  d: SessionDetail;
  isOrganizer: boolean;
  run: Run;
  busyKey: string | null;
  onDeleted: () => void;
}) {
  const [showSettings, setShowSettings] = useState(false);
  return (
    <div>
      <p className="text-sm text-zinc-500">
        <Link to={`/app/groups/${d.groupId}`} className="hover:text-lime-300">
          {d.groupName}
        </Link>
      </p>
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-black tracking-tight">{d.name}</h1>
        {isOrganizer && (
          <div className="flex shrink-0 gap-1">
            <a href={`/print?session=${d.id}`} target="_blank" rel="noreferrer" title="Printable pen & paper sheet for this session">
              <Button variant="subtle" size="sm">🖨 Print</Button>
            </a>
            <Button variant="subtle" size="sm" onClick={() => setShowSettings(true)}>
              Settings
            </Button>
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge tone={statusTone(d.status)}>{SESSION_STATUS_LABEL[d.status]}</Badge>
        <Badge tone="zinc">Americano · {d.pointsPerMatch} pts</Badge>
        <Badge tone="zinc">
          {d.courts} court{d.courts === 1 ? "" : "s"}
        </Badge>
        <span className="text-sm text-zinc-400">
          {fmtDateTime(d.startsAt)}
          {d.durationMin ? ` · ${d.durationMin} min` : ""}
          {d.venue ? ` · ${d.venue}` : ""}
        </span>
      </div>
      {isOrganizer && (
        <SettingsModal d={d} open={showSettings} onClose={() => setShowSettings(false)} run={run} busyKey={busyKey} onDeleted={onDeleted} />
      )}
    </div>
  );
}

function SettingsModal({
  d,
  open,
  onClose,
  run,
  busyKey,
  onDeleted,
}: {
  d: SessionDetail;
  open: boolean;
  onClose: () => void;
  run: Run;
  busyKey: string | null;
  onDeleted: () => void;
}) {
  const [form, setForm] = useState({
    name: d.name,
    venue: d.venue ?? "",
    when: toLocalInputValue(d.startsAt),
    durationMin: d.durationMin ?? 0,
    courts: d.courts,
    maxPlayers: d.maxPlayers,
    pointsPerMatch: d.pointsPerMatch,
  });
  const preActive = ["draft", "open", "checkin"].includes(d.status);
  const num = (v: string, fallback: number) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
  };
  return (
    <Modal open={open} onClose={onClose} title="Session settings">
      <div className="space-y-4">
        <Field label="Name">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="When">
          <Input type="datetime-local" value={form.when} onChange={(e) => setForm({ ...form, when: e.target.value })} />
        </Field>
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Field label="Venue">
            <Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
          </Field>
          <Field label="Court time (min)">
            <Input
              type="number"
              min={0}
              max={600}
              step={15}
              className="w-24"
              value={form.durationMin}
              onChange={(e) => setForm({ ...form, durationMin: num(e.target.value, d.durationMin ?? 0) })}
            />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Courts">
            <Input type="number" min={1} max={12} value={form.courts} onChange={(e) => setForm({ ...form, courts: num(e.target.value, d.courts) })} />
          </Field>
          <Field label="Max players">
            <Input type="number" min={4} max={64} disabled={!preActive} value={form.maxPlayers} onChange={(e) => setForm({ ...form, maxPlayers: num(e.target.value, d.maxPlayers) })} />
          </Field>
          <Field label="Points">
            <Input type="number" min={4} max={99} disabled={!preActive} value={form.pointsPerMatch} onChange={(e) => setForm({ ...form, pointsPerMatch: num(e.target.value, d.pointsPerMatch) })} />
          </Field>
        </div>
        {!preActive && <p className="text-xs text-zinc-500">Max players and points lock once the session starts. Courts can change any time.</p>}
        <Button
          className="w-full"
          busy={busyKey === "settings"}
          onClick={() =>
            run("settings", async () => {
              await Api.updateSession(d.id, {
                name: form.name,
                venue: form.venue || null,
                startsAt: fromLocalInputValue(form.when),
                durationMin: form.durationMin || null,
                courts: form.courts,
                maxPlayers: form.maxPlayers,
                pointsPerMatch: form.pointsPerMatch,
              });
              onClose();
            })
          }
        >
          Save changes
        </Button>
        <div className="flex gap-2 border-t border-zinc-800 pt-4">
          {d.status !== "complete" && (
            <Button
              variant="danger"
              size="sm"
              busy={busyKey === "cancel"}
              onClick={() => {
                if (window.confirm("Cancel this session for everyone?")) {
                  run("cancel", () => Api.sessionAction(d.id, "cancel"));
                  onClose();
                }
              }}
            >
              Cancel session
            </Button>
          )}
          <Button
            variant="danger"
            size="sm"
            busy={busyKey === "delete"}
            onClick={() => {
              if (window.confirm("Delete this session and all its results? This can't be undone.")) {
                run("delete", async () => {
                  await Api.deleteSession(d.id);
                  onDeleted();
                });
              }
            }}
          >
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------

// The session journey, always visible: Players → Check-in → Play → Results.
// Organizers can click ahead to advance (same validations as the buttons).
const STEPS = [
  { label: "Players", statuses: ["draft", "open"] },
  { label: "Check-in", statuses: ["checkin"] },
  { label: "Play", statuses: ["active"] },
  { label: "Results", statuses: ["complete"] },
] as const;

function LifecycleStepper({ d, isOrganizer, run, busyKey }: ViewProps) {
  if (d.status === "cancelled") return null;
  const current = STEPS.findIndex((s) => (s.statuses as readonly string[]).includes(d.status));

  const advance = (target: number) => {
    if (!isOrganizer || target <= current || busyKey) return;
    if (d.status === "active" && target === 3) {
      if (window.confirm("Finish the session and lock the final standings?")) {
        run("finish", () => Api.sessionAction(d.id, "complete"));
      }
      return;
    }
    if (target === 1) run("checkin", () => Api.sessionAction(d.id, "start_checkin"));
    if (target === 2) run("start", () => Api.sessionAction(d.id, "start"));
  };

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-1">
      {STEPS.map((s, i) => {
        const done = i < current;
        const cur = i === current;
        const reach = current === 0 ? 2 : 1; // from Players you can jump straight to Play
        const clickable = isOrganizer && i > current && i - current <= reach && d.status !== "complete";
        return (
          <Fragment key={s.label}>
            {i > 0 && <span className={cls("h-px w-3 shrink-0 sm:w-8", done || cur ? "bg-lime-400/60" : "bg-zinc-800")} />}
            <button
              type="button"
              disabled={!clickable}
              onClick={() => advance(i)}
              title={clickable ? `Go to ${s.label}` : undefined}
              className={cls(
                "flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
                cur
                  ? "bg-lime-400/15 text-lime-300 ring-1 ring-lime-400/40"
                  : done
                    ? "text-lime-400/80"
                    : clickable
                      ? "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                      : "text-zinc-600",
              )}
            >
              <span
                className={cls(
                  "flex size-4 items-center justify-center rounded-full text-[10px] font-black",
                  cur ? "bg-lime-400 text-zinc-950" : done ? "bg-lime-400/80 text-zinc-950" : "bg-zinc-800 text-zinc-500",
                )}
              >
                {done ? "✓" : i + 1}
              </span>
              {s.label}
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}

function RulesCard({ d }: { d: SessionDetail }) {
  const [open, setOpen] = useState(["draft", "open", "checkin"].includes(d.status));
  return (
    <Card className="py-3">
      <button type="button" className="flex w-full items-center justify-between text-left" onClick={() => setOpen((o) => !o)}>
        <span className="font-bold">
          📖 Americano tournament — <span className="font-semibold text-zinc-300">the rules</span>
        </span>
        <span className="text-zinc-500">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <ul className="mt-3 space-y-1.5 text-sm text-zinc-300">
          <li>
            🔄 <b>New partner every round.</b> Pairings rotate for maximum variety of partners and opponents — it's you
            against the field, not fixed teams.
          </li>
          <li>
            🎯 Each match is one game to <b>{d.pointsPerMatch} total rally points</b> (e.g. 14–10). Every point counts,
            serve rotates, no deuce.
          </li>
          <li>
            🧮 <b>You score as an individual</b> — both players on a team bank the team's points.
          </li>
          <li>
            🏟️ {d.courts} court{d.courts === 1 ? "" : "s"} per round. Extra players sit out, and sit-outs rotate so
            everyone rests about equally.
          </li>
          <li>
            ✅ Players enter the score, the other team confirms it. The organizer can always correct a score.
          </li>
          <li>
            🏆 <b>Most total points at the end wins.</b> Ties are allowed.
          </li>
          {d.durationMin && estimateRounds(d.durationMin, d.pointsPerMatch) && (
            <li>
              ⏱ {d.durationMin} min of court time fits roughly{" "}
              <b>{estimateRounds(d.durationMin, d.pointsPerMatch)} rounds</b> — but rounds keep coming as long as you
              want to play.
            </li>
          )}
        </ul>
      )}
    </Card>
  );
}

function ShareCard({ d }: { d: SessionDetail }) {
  const joinUrl = `${window.location.origin}/join/${d.inviteCode}`;
  const boardUrl = `${window.location.origin}/board/${d.inviteCode}`;
  return (
    <Card>
      <h3 className="mb-1 font-bold">Invite players</h3>
      <p className="mb-3 text-sm text-zinc-400">Drop this link in the group chat — players sign up themselves.</p>
      <div className="mb-3 truncate rounded-xl bg-zinc-950/80 px-3 py-2.5 font-mono text-xs text-lime-300">{joinUrl}</div>
      <div className="flex flex-wrap gap-2">
        <CopyButton text={joinUrl} label="Copy join link" />
        <CopyButton text={boardUrl} label="Copy board link (TV)" />
        <a href={boardUrl} target="_blank" rel="noreferrer">
          <Button variant="subtle" size="sm">Open board ↗</Button>
        </a>
      </div>
    </Card>
  );
}

function playerTone(p: PlayerRow) {
  switch (p.status) {
    case "checked_in":
      return <Badge tone="lime">here</Badge>;
    case "confirmed":
      return <Badge tone="sky">in</Badge>;
    case "waitlist":
      return <Badge tone="amber">waitlist</Badge>;
    case "dropped":
      return <Badge tone="zinc">out</Badge>;
  }
}

function RosterCard({
  d,
  isOrganizer,
  run,
  busyKey,
  checkinMode = false,
}: {
  d: SessionDetail;
  isOrganizer: boolean;
  run: Run;
  busyKey: string | null;
  checkinMode?: boolean;
}) {
  const [guestName, setGuestName] = useState("");
  const visible = d.players.filter((p) => p.status !== "dropped");
  const dropped = d.players.filter((p) => p.status === "dropped");
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-bold">Players</h3>
        <span className="text-sm text-zinc-400">
          {d.counts.confirmed + d.counts.checkedIn}/{d.maxPlayers}
          {d.counts.waitlist > 0 && ` · ${d.counts.waitlist} waitlisted`}
        </span>
      </div>
      {visible.length === 0 && <p className="py-4 text-center text-sm text-zinc-500">Nobody yet — share the invite link.</p>}
      <ul className="divide-y divide-zinc-800/60">
        {visible.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-2 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              {checkinMode && isOrganizer && (
                <input
                  type="checkbox"
                  className="size-5 accent-lime-400"
                  checked={p.status === "checked_in"}
                  disabled={p.status === "waitlist"}
                  onChange={() =>
                    run(`p-${p.id}`, () =>
                      Api.playerAction(d.id, p.id, p.status === "checked_in" ? "undo_checkin" : "checkin"),
                    )
                  }
                />
              )}
              <span className="truncate font-medium">
                {p.name}
                {p.isGuest && <span className="ml-1.5 text-xs text-zinc-500">guest</span>}
                {p.id === d.myPlayerId && <span className="ml-1.5 text-xs text-lime-400">you</span>}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {playerTone(p)}
              {isOrganizer && p.status === "waitlist" && (
                <Button size="sm" variant="subtle" onClick={() => run(`p-${p.id}`, () => Api.playerAction(d.id, p.id, "promote"))}>
                  Bring in
                </Button>
              )}
              {isOrganizer && (
                <button
                  className="rounded-md px-1.5 py-1 text-zinc-600 hover:bg-zinc-800 hover:text-rose-300"
                  title="Remove from session"
                  onClick={() => run(`p-${p.id}`, () => Api.playerAction(d.id, p.id, "drop"))}
                >
                  ✕
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {dropped.length > 0 && isOrganizer && (
        <div className="mt-2 border-t border-zinc-800/60 pt-2">
          {dropped.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-1.5 text-sm text-zinc-500">
              <span className="line-through">{p.name}</span>
              <Button size="sm" variant="subtle" onClick={() => run(`p-${p.id}`, () => Api.playerAction(d.id, p.id, "restore"))}>
                Restore
              </Button>
            </div>
          ))}
        </div>
      )}
      {isOrganizer && !d.myPlayerId && ["open", "checkin"].includes(d.status) && (
        <div className="mt-3 border-t border-zinc-800/60 pt-3">
          <Button
            variant="ghost"
            size="sm"
            busy={busyKey === "selfjoin"}
            onClick={() => run("selfjoin", () => Api.join(d.inviteCode))}
          >
            + I'm playing too
          </Button>
        </div>
      )}
      {isOrganizer && (
        <form
          className="mt-3 flex gap-2 border-t border-zinc-800/60 pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!guestName.trim()) return;
            run("guest", async () => {
              await Api.addGuest(d.id, guestName.trim());
              setGuestName("");
            });
          }}
        >
          <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Add player by name (no account needed)" />
          <Button variant="ghost" busy={busyKey === "guest"} type="submit">
            Add
          </Button>
        </form>
      )}
    </Card>
  );
}

function MyStatusCard({ d, run, busyKey }: { d: SessionDetail; run: Run; busyKey: string | null }) {
  const me = d.players.find((p) => p.id === d.myPlayerId);
  if (!me || me.status === "dropped") return null;
  return (
    <Card className="border-lime-400/20">
      {me.status === "waitlist" ? (
        <p className="text-sm text-amber-300">You're on the waitlist — you'll move up automatically if a spot opens.</p>
      ) : d.status === "checkin" && me.status === "confirmed" ? (
        <div className="flex items-center justify-between gap-3">
          <p className="font-semibold">At the club?</p>
          <Button busy={busyKey === "selfcheckin"} onClick={() => run("selfcheckin", () => Api.selfCheckin(d.id))}>
            ✓ I'm here
          </Button>
        </div>
      ) : me.status === "checked_in" ? (
        <p className="text-sm text-lime-300">You're checked in. Pairings drop when the organizer starts the session.</p>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-zinc-300">You're in ✓</p>
          <Button variant="subtle" size="sm" busy={busyKey === "leave"} onClick={() => run("leave", () => Api.leave(d.id))}>
            Can't make it
          </Button>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------

function StartPreview({ d }: { d: SessionDetail }) {
  const ready = d.counts.confirmed + d.counts.checkedIn;
  const courtsUsed = Math.min(d.courts, Math.floor(ready / 4));
  const byes = courtsUsed > 0 ? ready - courtsUsed * 4 : ready;
  const estimate = estimateRounds(d.durationMin, d.pointsPerMatch);
  if (ready === 0) return null;
  return (
    <div className="mt-3 rounded-xl bg-zinc-950/70 px-4 py-3 text-sm">
      <span className="font-bold text-lime-300">{ready}</span> player{ready === 1 ? "" : "s"} →{" "}
      <span className="font-bold">{courtsUsed}</span> court{courtsUsed === 1 ? "" : "s"} per round
      {courtsUsed > 0 && byes > 0 && (
        <>
          {" "}
          · <span className="font-bold">{byes}</span> sitting each round
        </>
      )}
      {courtsUsed === 0 && <span className="text-amber-300"> — need at least 4 to start</span>}
      {estimate && courtsUsed > 0 && (
        <p className="mt-1 text-xs text-zinc-400">
          {d.durationMin} min of court time ≈ <span className="font-bold text-zinc-200">{estimate} rounds</span> of{" "}
          {d.pointsPerMatch} points — keep dealing rounds if you have time left.
        </p>
      )}
    </div>
  );
}

function DraftView({ d, isOrganizer, run, busyKey }: ViewProps) {
  const ready = d.counts.confirmed + d.counts.checkedIn;
  return (
    <div className="space-y-4">
      {isOrganizer ? (
        <Card className="border-lime-400/30">
          <h3 className="font-bold">Get the session going</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Add players by name below and start whenever you have enough — or open signup and share
            the invite link so people join themselves.
          </p>
          <StartPreview d={d} />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button busy={busyKey === "start"} disabled={ready < 4} onClick={() => run("start", () => Api.sessionAction(d.id, "start"))}>
              Start session →
            </Button>
            <Button variant="ghost" busy={busyKey === "open"} onClick={() => run("open", () => Api.sessionAction(d.id, "open"))}>
              Open signup
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <p className="text-zinc-400">Signup hasn't opened yet.</p>
        </Card>
      )}
      <RosterCard d={d} isOrganizer={isOrganizer} run={run} busyKey={busyKey} />
    </div>
  );
}

function OpenView({ d, isOrganizer, run, busyKey }: ViewProps) {
  return (
    <div className="space-y-4">
      <MyStatusCard d={d} run={run} busyKey={busyKey} />
      <ShareCard d={d} />
      {isOrganizer && (
        <Card className="border-lime-400/30">
          <h3 className="font-bold">Game day?</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Start now to play with everyone who's signed up, or run check-in first so only the people
            actually at the club get scheduled.
          </p>
          <StartPreview d={d} />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              busy={busyKey === "start"}
              disabled={d.counts.confirmed + d.counts.checkedIn < 4}
              onClick={() => run("start", () => Api.sessionAction(d.id, "start"))}
            >
              Start session →
            </Button>
            <Button variant="ghost" busy={busyKey === "checkin"} onClick={() => run("checkin", () => Api.sessionAction(d.id, "start_checkin"))}>
              Start check-in
            </Button>
          </div>
        </Card>
      )}
      <RosterCard d={d} isOrganizer={isOrganizer} run={run} busyKey={busyKey} />
    </div>
  );
}

function CheckinView({ d, isOrganizer, run, busyKey }: ViewProps) {
  const n = d.counts.checkedIn;
  const courtsUsed = Math.min(d.courts, Math.floor(n / 4));
  const byes = courtsUsed > 0 ? n - courtsUsed * 4 : n;
  return (
    <div className="space-y-4">
      <MyStatusCard d={d} run={run} busyKey={busyKey} />
      {isOrganizer && (
        <Card className="border-lime-400/30">
          <h3 className="font-bold">Check-in</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Only checked-in players get scheduled — one no-show can wreck a round otherwise.
          </p>
          <div className="mt-3 rounded-xl bg-zinc-950/70 px-4 py-3 text-sm">
            <span className="font-bold text-lime-300">{n}</span> checked in →{" "}
            <span className="font-bold">{courtsUsed}</span> court{courtsUsed === 1 ? "" : "s"} per round
            {courtsUsed > 0 && byes > 0 && (
              <>
                {" "}
                · <span className="font-bold">{byes}</span> sitting each round
              </>
            )}
            {courtsUsed === 0 && <span className="text-amber-300"> — need at least 4</span>}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="ghost" busy={busyKey === "checkin_all"} onClick={() => run("checkin_all", () => Api.sessionAction(d.id, "checkin_all"))}>
              Everyone's here
            </Button>
            <Button
              busy={busyKey === "start"}
              disabled={courtsUsed === 0}
              onClick={() => run("start", () => Api.sessionAction(d.id, "start"))}
            >
              Start session →
            </Button>
          </div>
        </Card>
      )}
      <RosterCard d={d} isOrganizer={isOrganizer} run={run} busyKey={busyKey} checkinMode />
      <ShareCard d={d} />
    </div>
  );
}

// ---------------------------------------------------------------------------

type ViewProps = { d: SessionDetail; isOrganizer: boolean; run: Run; busyKey: string | null };

function teamNames(ids: [string, string], nameOf: (id: string) => string): string {
  return `${nameOf(ids[0])} + ${nameOf(ids[1])}`;
}

function MatchStatusBadge({ m }: { m: MatchRow }) {
  switch (m.status) {
    case "confirmed":
      return <Badge tone="lime">final</Badge>;
    case "submitted":
      return <Badge tone="sky">awaiting confirm</Badge>;
    case "disputed":
      return <Badge tone="rose">disputed</Badge>;
    default:
      return <Badge tone="zinc">live</Badge>;
  }
}

function ActiveView({ d, isOrganizer, run, busyKey }: ViewProps) {
  const nameOf = useMemo(() => {
    const map = new Map(d.players.map((p) => [p.id, p.name]));
    return (pid: string) => map.get(pid) ?? "?";
  }, [d.players]);

  const current = d.rounds[d.rounds.length - 1];
  const previous = d.rounds.slice(0, -1);
  const [showRoster, setShowRoster] = useState(false);

  return (
    <div className="space-y-4">
      {isOrganizer && d.warnings.length > 0 && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          {d.warnings.map((w, i) => (
            <p key={i}>⚠ {w}</p>
          ))}
        </div>
      )}

      {!isOrganizer && d.myPlayerId && current && (
        <MyMatchCard d={d} round={current} nameOf={nameOf} run={run} busyKey={busyKey} />
      )}

      {current && (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-black">
              Round {current.number}
              {(() => {
                const est = estimateRounds(d.durationMin, d.pointsPerMatch);
                if (!est) return null;
                return (
                  <span className="ml-1.5 text-sm font-medium text-zinc-500">
                    {current.number <= est ? `of ~${est}` : "· extra time"}
                  </span>
                );
              })()}
            </h3>
            {current.complete ? <Badge tone="lime">all scores in</Badge> : <Badge tone="zinc">{current.matches.filter((m) => m.status === "confirmed").length}/{current.matches.length} scored</Badge>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {current.matches.map((m) => (
              <CourtCard key={m.id} d={d} m={m} nameOf={nameOf} isOrganizer={isOrganizer} run={run} busyKey={busyKey} />
            ))}
          </div>
          {current.byes.length > 0 && (
            <p className="mt-3 text-sm text-zinc-400">
              <span className="font-semibold text-zinc-300">Sitting this round:</span>{" "}
              {current.byes.map(nameOf).join(" · ")}
            </p>
          )}
        </Card>
      )}

      {isOrganizer && current && (
        <Card>
          <h3 className="mb-3 font-bold">Organizer controls</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              busy={busyKey === "next"}
              onClick={() => {
                if (!current.complete && !window.confirm("Some scores aren't confirmed yet. Generate the next round anyway?")) return;
                run("next", () => Api.nextRound(d.id, { force: !current.complete }));
              }}
            >
              Next round →
            </Button>
            {!current.matches.some((m) => m.status === "confirmed") && (
              <Button
                variant="ghost"
                busy={busyKey === "regen"}
                onClick={() => {
                  if (window.confirm("Throw away these pairings and draw new ones?")) run("regen", () => Api.nextRound(d.id, { regenerate: true }));
                }}
              >
                Redraw pairings
              </Button>
            )}
            <Button
              variant="ghost"
              busy={busyKey === "undo"}
              onClick={() => {
                if (window.confirm(`Undo round ${current.number}? Its scores will be lost.`)) run("undo", () => Api.undoRound(d.id, current.id));
              }}
            >
              Undo round
            </Button>
            <Button
              variant="outline"
              busy={busyKey === "finish"}
              onClick={() => {
                if (window.confirm("Finish the session and lock the final standings?")) run("finish", () => Api.sessionAction(d.id, "complete"));
              }}
            >
              Finish session
            </Button>
          </div>
          <button className="mt-3 text-sm text-zinc-400 underline-offset-4 hover:text-lime-300 hover:underline" onClick={() => setShowRoster((s) => !s)}>
            {showRoster ? "Hide players" : "Manage players (late arrivals, drop-outs)"}
          </button>
          {showRoster && (
            <div className="mt-3">
              <RosterCard d={d} isOrganizer run={run} busyKey={busyKey} />
              <p className="mt-2 text-xs text-zinc-500">Changes apply from the next generated round.</p>
            </div>
          )}
        </Card>
      )}

      <Card>
        <h3 className="mb-3 font-bold">Standings</h3>
        <StandingsTable standings={d.standings} highlightId={d.myPlayerId} />
      </Card>

      {previous.length > 0 && <RoundHistory rounds={previous} nameOf={nameOf} />}
    </div>
  );
}

function CourtCard({
  d,
  m,
  nameOf,
  isOrganizer,
  run,
  busyKey,
}: {
  d: SessionDetail;
  m: MatchRow;
  nameOf: (id: string) => string;
  isOrganizer: boolean;
  run: Run;
  busyKey: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const scored = m.scoreA != null && m.scoreB != null;
  return (
    <>
      <button
        className={cls(
          "rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-left transition-colors",
          isOrganizer && "hover:border-lime-400/50",
        )}
        onClick={() => isOrganizer && setEditing(true)}
        disabled={!isOrganizer}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-2xl font-black uppercase tracking-tight text-lime-300">
            <span aria-hidden>🏟️</span>
            <span>Court {m.court}</span>
          </span>
          <MatchStatusBadge m={m} />
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate font-semibold">{teamNames(m.a, nameOf)}</span>
            <span className="tabular text-xl font-extrabold text-lime-300">{m.scoreA ?? "–"}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate font-semibold">{teamNames(m.b, nameOf)}</span>
            <span className="tabular text-xl font-extrabold text-lime-300">{m.scoreB ?? "–"}</span>
          </div>
        </div>
        {isOrganizer && <p className="mt-2 text-xs text-zinc-600">{scored ? "Tap to edit score" : "Tap to enter score"}</p>}
      </button>
      <Modal open={editing} onClose={() => setEditing(false)} title={`Court ${m.court} — score`}>
        <ScoreEntry
          total={d.pointsPerMatch}
          teamA={teamNames(m.a, nameOf)}
          teamB={teamNames(m.b, nameOf)}
          initialA={m.scoreA}
          busy={busyKey === `score-${m.id}`}
          submitLabel="Save score"
          onSubmit={(a, b) =>
            run(`score-${m.id}`, async () => {
              await Api.score(m.id, a, b);
              setEditing(false);
            })
          }
        />
      </Modal>
    </>
  );
}

function MyMatchCard({
  d,
  round,
  nameOf,
  run,
  busyKey,
}: {
  d: SessionDetail;
  round: RoundRow;
  nameOf: (id: string) => string;
  run: Run;
  busyKey: string | null;
}) {
  const me = d.myPlayerId!;
  const myMatch = round.matches.find((m) => [...m.a, ...m.b].includes(me));
  const [editing, setEditing] = useState(false);

  if (!myMatch) {
    return (
      <Card className="border-amber-400/20 text-center">
        <p className="text-3xl">🧘</p>
        <p className="mt-1 font-bold">You're sitting round {round.number} out</p>
        <p className="text-sm text-zinc-400">Grab a drink — you're back in the next one.</p>
      </Card>
    );
  }

  const myTeam: "a" | "b" = myMatch.a.includes(me) ? "a" : "b";
  const partner = (myTeam === "a" ? myMatch.a : myMatch.b).find((x) => x !== me)!;
  const opponents = myTeam === "a" ? myMatch.b : myMatch.a;
  const submittedByMyTeam =
    myMatch.submittedBy != null && (myTeam === "a" ? myMatch.a : myMatch.b).includes(myMatch.submittedBy);
  const scoreLine = myMatch.scoreA != null ? `${myMatch.scoreA}–${myMatch.scoreB}` : null;

  return (
    <Card className="border-lime-400/30">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          Round {round.number} · your match
        </span>
        <MatchStatusBadge m={myMatch} />
      </div>
      <p className="text-center text-4xl font-black tracking-tight text-lime-300">
        <span aria-hidden>🏟️</span> COURT {myMatch.court}
      </p>
      <div className="mt-4 text-center">
        <p className="text-lg font-bold">
          You + {nameOf(partner)}
        </p>
        <p className="my-1 text-xs font-bold uppercase tracking-widest text-zinc-500">vs</p>
        <p className="text-lg font-bold">{teamNames(opponents, nameOf)}</p>
      </div>

      <div className="mt-4">
        {myMatch.status === "pending" && (
          <>
            {!editing ? (
              <Button className="w-full" size="lg" onClick={() => setEditing(true)}>
                Enter final score
              </Button>
            ) : (
              <ScoreEntry
                total={d.pointsPerMatch}
                teamA={`You + ${nameOf(partner)}`}
                teamB={teamNames(opponents, nameOf)}
                initialA={myTeam === "a" ? myMatch.scoreA : myMatch.scoreB}
                busy={busyKey === `score-${myMatch.id}`}
                onSubmit={(mine, theirs) =>
                  run(`score-${myMatch.id}`, async () => {
                    const [a, b] = myTeam === "a" ? [mine, theirs] : [theirs, mine];
                    await Api.score(myMatch.id, a, b);
                    setEditing(false);
                  })
                }
              />
            )}
          </>
        )}

        {myMatch.status === "submitted" && submittedByMyTeam && (
          <p className="text-center text-sm text-zinc-400">
            {scoreLine} submitted — waiting for {teamNames(opponents, nameOf)} to confirm.
          </p>
        )}

        {myMatch.status === "submitted" && !submittedByMyTeam && (
          <div className="space-y-2">
            <p className="text-center text-sm text-zinc-300">
              They submitted <span className="font-bold text-lime-300">{scoreLine}</span> — look right?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button busy={busyKey === `confirm-${myMatch.id}`} onClick={() => run(`confirm-${myMatch.id}`, () => Api.confirmScore(myMatch.id))}>
                ✓ Confirm
              </Button>
              <Button variant="danger" busy={busyKey === `dispute-${myMatch.id}`} onClick={() => run(`dispute-${myMatch.id}`, () => Api.disputeScore(myMatch.id))}>
                Dispute
              </Button>
            </div>
          </div>
        )}

        {myMatch.status === "disputed" && (
          <p className="text-center text-sm text-rose-300">Score disputed — the organizer will settle it.</p>
        )}

        {myMatch.status === "confirmed" && (
          <p className="text-center text-lg font-bold text-lime-300">
            Final: {scoreLine} ✓
          </p>
        )}
      </div>
    </Card>
  );
}

function RoundHistory({ rounds, nameOf }: { rounds: RoundRow[]; nameOf: (id: string) => string }) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <button className="flex w-full items-center justify-between" onClick={() => setOpen((o) => !o)}>
        <h3 className="font-bold">Previous rounds</h3>
        <span className="text-zinc-500">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-4">
          {[...rounds].reverse().map((r) => (
            <div key={r.id}>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500">Round {r.number}</p>
              <div className="space-y-1 text-sm">
                {r.matches.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-zinc-300">
                      {teamNames(m.a, nameOf)} <span className="text-zinc-600">vs</span> {teamNames(m.b, nameOf)}
                    </span>
                    <span className="tabular shrink-0 font-bold text-lime-300">
                      {m.scoreA != null ? `${m.scoreA}–${m.scoreB}` : "—"}
                    </span>
                  </div>
                ))}
                {r.byes.length > 0 && (
                  <p className="text-xs text-zinc-500">Sat out: {r.byes.map(nameOf).join(", ")}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------

function CompleteView({ d, isOrganizer, run, busyKey }: ViewProps) {
  const nameOf = useMemo(() => {
    const map = new Map(d.players.map((p) => [p.id, p.name]));
    return (pid: string) => map.get(pid) ?? "?";
  }, [d.players]);
  const podium = d.standings.slice(0, 3);
  return (
    <div className="space-y-4">
      {podium.length > 0 && (
        <Card className="border-lime-400/30 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Final result</p>
          <p className="mt-2 text-3xl">🏆</p>
          <p className="text-2xl font-black text-lime-300">{podium[0].name}</p>
          <p className="text-sm text-zinc-400">{podium[0].points} points</p>
          {podium.length > 1 && (
            <div className="mt-4 flex justify-center gap-6 text-sm">
              {podium[1] && (
                <span className="text-zinc-300">
                  🥈 {podium[1].name} · {podium[1].points}
                </span>
              )}
              {podium[2] && (
                <span className="text-zinc-300">
                  🥉 {podium[2].name} · {podium[2].points}
                </span>
              )}
            </div>
          )}
        </Card>
      )}
      <Card>
        <h3 className="mb-3 font-bold">Standings</h3>
        <StandingsTable standings={d.standings} highlightId={d.myPlayerId} />
      </Card>
      <RoundHistory rounds={d.rounds} nameOf={nameOf} />
      {isOrganizer && (
        <Button variant="outline" busy={busyKey === "reopen"} onClick={() => run("reopen", () => Api.sessionAction(d.id, "reopen"))}>
          Reopen session
        </Button>
      )}
    </div>
  );
}
