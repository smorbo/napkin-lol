import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type RefObject } from "react";
import {
  ArrowRight,
  BadgeDollarSign,
  Clock3,
  Download,
  Loader2,
  LockKeyhole,
  Plus,
  Search,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NapkinHero } from "@/components/napkin-hero";
import { supabaseTab as supabase } from "@/integrations/supabase/tab-client";
import { generateRoomId, getIdentity } from "@/lib/room";

const ACTIONS = ["draw", "plan", "scheme", "sketch", "doodle", "plot"];

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Napkin | Disposable Workspace" },
      {
        name: "description",
        content: "Create a free, secure Napkin that disappears after 24 hours.",
      },
      { property: "og:title", content: "Napkin | Disposable Workspace" },
      {
        property: "og:description",
        content: "A free, secure Napkin for drawing, planning, and building together.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://napkin.lol/" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: "https://napkin.lol/og-image.png" },
      { name: "twitter:image", content: "https://napkin.lol/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://napkin.lol/" }],
  }),
  component: Index,
});

type CodeSearchProps = {
  sticky?: boolean;
  code: string;
  onCodeChange: (value: string) => void;
  searchError: boolean;
  searchOpen: boolean;
  onOpen: () => void;
  onSubmit: () => void;
  inputRef?: RefObject<HTMLInputElement | null>;
};

function CodeSearch({
  sticky = false,
  code,
  onCodeChange,
  searchError,
  searchOpen,
  onOpen,
  onSubmit,
  inputRef,
}: CodeSearchProps) {
  if (sticky && !searchOpen) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="rounded-full"
        onClick={onOpen}
        title="Find a Napkin"
        aria-label="Find a Napkin by code"
      >
        <Search />
      </Button>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className={`relative flex items-center rounded-full border p-1 backdrop-blur-md ${sticky ? "w-40 sm:w-44" : "w-44"} ${searchError ? "animate-code-shake border-destructive bg-destructive/10 text-destructive" : "border-border bg-secondary/80"}`}
    >
      <Input
        ref={inputRef}
        autoFocus={sticky}
        value={code}
        onChange={(event) =>
          onCodeChange(
            event.target.value
              .replace(/[^a-zA-Z0-9]/g, "")
              .toUpperCase()
              .slice(0, 7),
          )
        }
        aria-label="Napkin code"
        placeholder={searchError ? "Unknown Napkin Code" : "Napkin Code"}
        className="h-8 min-w-0 border-0 bg-transparent px-7 text-center font-mono text-xs uppercase shadow-none placeholder:text-center placeholder:normal-case"
      />
      <Button type="submit" variant="ghost" size="icon-sm" className="absolute right-1" aria-label="Open Napkin">
        <ArrowRight />
      </Button>
    </form>
  );
}

function Index() {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [searchError, setSearchError] = useState(false);
  const [actionIndex, setActionIndex] = useState(0);
  const [showSticky, setShowSticky] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installNote, setInstallNote] = useState("");
  const codeInputRef = useRef<HTMLInputElement | null>(null);

  function focusCodeEntry() {
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.setTimeout(() => {
      codeInputRef.current?.focus();
      codeInputRef.current?.select();
    }, 350);
  }

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(
      () => setActionIndex((current) => (current + 1) % ACTIONS.length),
      3200,
    );
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", capturePrompt);
    return () => window.removeEventListener("beforeinstallprompt", capturePrompt);
  }, []);

  useEffect(() => {
    const updateSticky = () => setShowSticky(window.scrollY > window.innerHeight * 0.75);
    updateSticky();
    window.addEventListener("scroll", updateSticky, { passive: true });
    return () => window.removeEventListener("scroll", updateSticky);
  }, []);

  async function createRoom() {
    if (creating) return;
    setCreating(true);
    setError("");
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      const { error: authError } = await supabase.auth.signInAnonymously();
      if (authError) {
        setError("We couldn't create a Napkin. Try again.");
        setCreating(false);
        return;
      }
    }
    const identity = getIdentity();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const roomId = generateRoomId();
      const { error: createError } = await supabase.rpc("create_napkin", {
        _room_id: roomId,
        _name: identity.name,
        _color: identity.color,
      });
      if (!createError) {
        window.sessionStorage.setItem("napkin-created", roomId);
        await navigate({ to: "/room/$roomId", params: { roomId } });
        return;
      }
    }
    setError("We couldn't create a Napkin. Try again.");
    setCreating(false);
  }

  async function joinRoom() {
    const roomId = code.trim().toUpperCase();
    if (!/^[A-Z]{4}\d{3}$/.test(roomId)) {
      setCode("");
      setSearchError(true);
      setError("Try again");
      return;
    }
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      const { error: authError } = await supabase.auth.signInAnonymously();
      if (authError) {
        setSearchError(true);
        setError("Try again");
        return;
      }
    }
    const identity = getIdentity();
    const { data: entered, error: enterError } = await supabase.rpc("enter_napkin", {
      _room_id: roomId,
      _name: identity.name,
      _color: identity.color,
    });
    if (enterError || !entered?.length) {
      setCode("");
      setSearchError(true);
      setError("Try again");
      return;
    }
    setSearchError(false);
    setError("");
    await navigate({ to: "/room/$roomId", params: { roomId } });
  }

  async function installNapkin() {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") setInstallNote("Napkin added to your Home Screen.");
      setInstallPrompt(null);
      return;
    }
    setInstallNote(
      /iPhone|iPad|iPod/i.test(navigator.userAgent)
        ? "Tap Share, then Add to Home Screen."
        : "Open your browser menu and choose Add to Home Screen.",
    );
  }

  function goToTutorial() {
    document.getElementById("tutorial")?.scrollIntoView({ behavior: "smooth" });
  }

  function handleCodeChange(value: string) {
    setCode(value);
    setSearchError(false);
    setError("");
  }

  return (
    <main className="mesh-background mesh-animated relative min-h-screen overflow-x-clip px-5 sm:px-8">
      <div
        className={`fixed inset-x-0 top-0 z-40 border-b border-border bg-background/80 px-5 py-3 backdrop-blur-xl transition-all duration-300 sm:px-8 ${showSticky ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-full opacity-0"}`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <img
              src="/favicon.png"
              alt=""
              className="size-7 rounded bg-background object-contain"
            />{" "}
            Napkin
          </Link>
          <div className="flex items-center gap-2">
            <CodeSearch
              sticky
              code={code}
              onCodeChange={handleCodeChange}
              searchError={searchError}
              searchOpen={searchOpen}
              onOpen={focusCodeEntry}
              onSubmit={() => void joinRoom()}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-full"
              onClick={goToTutorial}
              title="How Napkin works"
              aria-label="Go to the Napkin tutorial"
            >
              <span aria-hidden className="text-base leading-none">
                ?
              </span>
            </Button>
            <Button
              size="icon"
              className="rounded-full"
              onClick={createRoom}
              disabled={creating}
              title="Create a Napkin"
              aria-label="Create a Napkin"
            >
              {creating ? <Loader2 className="animate-spin" /> : <Plus />}
            </Button>
          </div>
        </div>
      </div>

      <section className="flex min-h-screen flex-col py-6">
        <nav
          className="mx-auto flex w-full max-w-6xl items-center justify-between"
          aria-label="Main navigation"
        >
          <div className="flex items-center gap-3 font-semibold">
            <img
              src="/favicon.png"
              alt=""
              className="size-9 rounded-md bg-background object-contain"
            />
            <span className="text-lg">Napkin</span>
          </div>
        </nav>

        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center pb-10 pt-14 text-center">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium backdrop-blur-xl">
            <Clock3 className="size-3.5 text-primary" /> 24-Hour Disposable Workspaces
          </div>
          <h1 className="flex max-w-full items-baseline justify-center whitespace-nowrap text-3xl font-semibold leading-none sm:text-6xl lg:text-8xl">
            <span>Shut up and</span>
            <span className="font-scribble relative ml-[0.26em] inline-grid min-w-[5ch] grid-cols-1 text-left text-primary">
              <span
                key={ACTIONS[actionIndex]}
                className="word-scribble col-start-1 row-start-1 inline-block origin-bottom-left"
              >
                {ACTIONS[actionIndex]}.
              </span>
            </span>
          </h1>
          <p className="mt-7 max-w-xl text-balance text-lg leading-relaxed text-muted-foreground sm:text-xl">
            A free, secure workspace for quick plans and unfinished thoughts.
          </p>

          <div className="mt-10 flex w-full max-w-md flex-col items-center gap-3">
            <Button
              size="lg"
              onClick={createRoom}
              disabled={creating}
              className="h-14 w-full rounded-full px-8 text-base font-semibold shadow-xl sm:w-auto sm:min-w-[320px]"
              title="Create a room"
              aria-label="Create a room"
            >
              {creating && <Loader2 className="animate-spin" />}
              Create a room
            </Button>
            <CodeSearch
              code={code}
              onCodeChange={handleCodeChange}
              searchError={searchError}
              searchOpen={searchOpen}
              onOpen={focusCodeEntry}
              onSubmit={() => void joinRoom()}
              inputRef={codeInputRef}
            />
          </div>
          {error && !searchError && (
            <p role="alert" className="mt-3 text-sm text-destructive-foreground">
              {error}
            </p>
          )}
          <div className="mt-14 w-full">
            <NapkinHero />
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <ShieldCheck className="size-4" /> Secure by default
            </span>
            <span className="flex items-center gap-2">
              <LockKeyhole className="size-4" /> Lock workspaces
            </span>
            <span className="flex items-center gap-2">
              <UserRoundCheck className="size-4" /> No account needed
            </span>
            <span className="flex items-center gap-2">
              <BadgeDollarSign className="size-4" /> Free
            </span>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={goToTutorial}>
              <span aria-hidden className="font-semibold">
                ?
              </span>{" "}
              What is Napkin?
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => void installNapkin()}>
              <Download /> Add Napkin to your Home Screen
            </Button>
          </div>
          {installNote && (
            <p role="status" className="mt-3 text-xs text-muted-foreground">
              {installNote}
            </p>
          )}
        </div>
      </section>

      <section
        id="tutorial"
        className="mx-auto w-full max-w-6xl scroll-mt-24 py-24"
        aria-labelledby="how-title"
      >
        <p className="text-sm font-medium text-primary">How it works</p>
        <h2
          id="how-title"
          className="mt-3 max-w-2xl text-4xl font-semibold text-balance sm:text-5xl"
        >
          From blank page to gone in one day
        </h2>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
          One Napkin, start to finish.
        </p>
        <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-3">
          {[
            {
              number: "01",
              title: "Create",
              copy: "Tap plus. A private room opens instantly — no account, just a code.",
            },
            {
              number: "02",
              title: "Share & draw",
              copy: "Send the link or code. Everyone draws, types, and chats live together.",
            },
            {
              number: "03",
              title: "Gone in 24 hours",
              copy: "Napkins evaporate after a day. Export anything you want to keep.",
            },
          ].map(({ number, title, copy }) => (
            <div key={number} className="bg-background/80 p-7 backdrop-blur-xl sm:p-9">
              <span className="text-xs text-muted-foreground">{number}</span>
              <h3 className="mt-10 text-2xl font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 border-t border-border py-8 text-xs text-muted-foreground sm:flex-row">
        <div className="flex flex-col items-center gap-1.5 sm:items-start">
          <span>
            Made with love by{" "}
            <a
              href="https://arman.life"
              target="_blank"
              rel="noreferrer"
              className="text-foreground transition-colors hover:text-primary"
            >
              Arman
            </a>
            {" "}·{" "}
            <a
              href="https://sendmorebrains.com"
              target="_blank"
              rel="noreferrer"
              className="text-foreground transition-colors hover:text-primary"
            >
              Send More Brains Inc.
            </a>
          </span>
          <span>
            A{" "}
            <a
              href="https://sneeds.xyz"
              target="_blank"
              rel="noreferrer"
              className="text-foreground transition-colors hover:text-primary"
            >
              SNEEDS
            </a>{" "}
            project.
          </span>
        </div>
        <div className="flex gap-5">
          <Link to="/privacy" className="hover:text-foreground">
            Privacy Policy
          </Link>
          <Link to="/terms" className="hover:text-foreground">
            Terms of Service
          </Link>
        </div>
      </footer>
    </main>
  );
}
