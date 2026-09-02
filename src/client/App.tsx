import { Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { authClient } from "./lib/auth";
import { PageSpinner } from "./components/ui";
import { Landing } from "./pages/Landing";
import { AuthPage } from "./pages/AuthPage";
import { Home } from "./pages/Home";
import { GroupPage } from "./pages/GroupPage";
import { SessionPage } from "./pages/SessionPage";
import { JoinPage } from "./pages/JoinPage";
import { BoardPage } from "./pages/BoardPage";
import { PrintSheetPage } from "./pages/PrintSheetPage";
import { firstName } from "./lib/format";

function Logo() {
  return (
    <Link to="/app" className="flex items-center gap-2 font-extrabold tracking-tight">
      <span className="text-xl">🎾</span>
      <span className="text-lg">
        Padel<span className="text-lime-400">Time</span>
      </span>
    </Link>
  );
}

function AppLayout() {
  const { data: session, isPending, isRefetching } = authClient.useSession();
  const location = useLocation();
  const navigate = useNavigate();

  // Never bounce to login while a session read is still in flight.
  if (isPending || (isRefetching && !session)) return <PageSpinner />;
  if (!session) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }
  return (
    <div className="app-bg min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-zinc-800/70 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Logo />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-zinc-400 sm:block">
              {firstName(session.user.name)}
            </span>
            <button
              className="rounded-lg px-2.5 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              onClick={async () => {
                await authClient.signOut();
                navigate("/");
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6 pb-24">
        <Outlet />
      </main>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="/join/:code" element={<JoinPage />} />
      <Route path="/board/:code" element={<BoardPage />} />
      <Route path="/print" element={<PrintSheetPage />} />
      <Route element={<AppLayout />}>
        <Route path="/app" element={<Home />} />
        <Route path="/app/groups/:id" element={<GroupPage />} />
        <Route path="/app/sessions/:id" element={<SessionPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
