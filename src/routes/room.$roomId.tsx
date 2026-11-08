import { frameAt, loadGif, type GifAnimation } from "@/lib/gif-frames";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { NapkinDraw } from "@/components/napkin-draw";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type PointerEvent,
} from "react";
import {
  Check,
  Copy,
  Download,
  DoorClosed,
  DoorOpen,
  Eye,
  EyeOff,
  Eraser,
  Link2,
  Loader2,
  Lock,
  LockOpen,
  MessageCircle,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  MousePointer2,
  Moon,
  RotateCw,
  Users,
  Pencil,
  Send,
  Scissors,
  CircleHelp,
  ShieldCheck,
  Sun,
  SunDim,
  Trash2,
  LogOut,
  Type,
  Undo2,
  PenLine,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RoomExpired } from "@/components/room-expired";
import { NapkinHelp } from "@/components/napkin-help";
import { supabaseTab as supabase } from "@/integrations/supabase/tab-client";
import {
  BOARD_BG,
  CHAKRA_COLORS,
  COLORS,
  adoptIdentityId,
  getIdentity,
  onColor,
  readableInk,
  setIdentity,
  textFontStack,
  type CanvasObject,
  type Identity,
  type ImagePayload,
  type StrokePayload,
  type TextFont,
  type TextPayload,
} from "@/lib/room";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BOARD_TEMPLATES, templatePng, templateSvg, type BoardTemplate } from "@/lib/templates";

export const Route = createFileRoute("/room/$roomId")({
  head: ({ params }) => ({
    meta: [
      { title: `Napkin ${params.roomId}` },
      { name: "description", content: "Napkin – Disposable Workspaces" },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Napkin – Disposable Workspaces" },
      {
        property: "og:description",
        content: "A disposable workspace. Join in one click.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: "https://napkin.lol/og-image.png" },
      { name: "twitter:image", content: "https://napkin.lol/og-image.png" },
    ],
  }),
  component: RoomPage,
});

type ChatMessage = {
  id: string;
  author: string;
  author_id: string | null;
  body: string;
  created_at: string;
};
type Peer = {
  id: string;
  name: string;
  color: string;
  x?: number | undefined;
  y?: number | undefined;
  view?: { x: number; y: number; w: number; h: number } | undefined;
};
type Vote = { voter_id: string; voter_name: string; agree: boolean };
type Member = {
  user_id?: string | null;
  visitor_id: string;
  display_name: string;
  color: string;
  admitted: boolean;
  muted: boolean;
};
type Knock = {
  user_id?: string | null;
  visitor_id: string;
  visitor_name: string;
  visitor_color: string;
  status: string;
};
type BoardTheme = "dark" | "light";
type GridMode = "off" | "light" | "medium";
type TransformMode = "move" | "resize" | "rotate";
type Transform = {
  id: string;
  mode: TransformMode;
  startX: number;
  startY: number;
  origin: ImagePayload | TextPayload;
};
type Tool = "select" | "draw" | "text" | "erase" | null;
type ViewTransform = { scale: number; x: number; y: number };

const WIDTH = 1400;
const HEIGHT = 1400;

/** Personal napkin brightness — a view filter, cycles per tap in the ••• menu. */
const BRIGHTNESS_LEVELS = [
  { label: "Dim", value: 0.55 },
  { label: "Normal", value: 1 },
  { label: "Bright", value: 1.6 },
  { label: "Blazing", value: 2.3 },
] as const;
/** Rough glyph width so text boxes hit-test close to what is drawn. */
function textWidthRatio(font: "sketch" | "type" | undefined) {
  return font === "type" ? 0.55 : 0.42;
}

type UndoEntry =
  | { kind: "add"; ids: string[] }
  | { kind: "remove"; rows: CanvasObject[] };

const TEXT_SIZE = 52;
const MIN_TEXT_SIZE = 20;
const MAX_TEXT_SIZE = 140;

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Soft two-tone chime when someone else says something. */
function playPing() {
  try {
    const Context =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return;
    const context = new Context();
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.09, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.35);
    gain.connect(context.destination);
    const tone = context.createOscillator();
    tone.type = "sine";
    tone.frequency.setValueAtTime(660, context.currentTime);
    tone.frequency.setValueAtTime(880, context.currentTime + 0.09);
    tone.connect(gain);
    tone.start();
    tone.stop(context.currentTime + 0.36);
    tone.onended = () => void context.close();
  } catch {
    /* audio is a nicety, never block chat */
  }
}

function RoomPage() {
  const { roomId } = Route.useParams();
  const [me, setMe] = useState<Identity>({
    id: "server",
    name: "Guest",
    color: COLORS[0] ?? "#8B7CF6",
  });
  const meRef = useRef(me);
  meRef.current = me;
  const admittedRef = useRef(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const current = useRef<StrokePayload | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const transformRef = useRef<Transform | null>(null);
  const images = useRef(new Map<string, HTMLImageElement>());
  const shredGuard = useRef(false);
  const shredRetries = useRef(0);
  const sectionRef = useRef<HTMLElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [board, setBoard] = useState({ w: 0, h: 0 });

  const [status, setStatus] = useState<
    "loading" | "expired" | "closed" | "waiting" | "rejected" | "ready" | "rescuing"
  >("loading");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [objects, setObjects] = useState<CanvasObject[]>([]);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [tool, setTool] = useState<Tool>(null);
  const erasingRef = useRef(false);
  const lastCursorSent = useRef(0);
  const redrawFrame = useRef<number | null>(null);
  useEffect(() => {
    // iOS/iPadOS: block native touch scrolling/selection on the board so strokes never stall.
    const canvas = canvasRef.current;
    if (!canvas) return;
    const block = (event: TouchEvent) => {
      if (tool !== "text" && event.touches.length < 2) event.preventDefault();
    };
    canvas.addEventListener("touchstart", block, { passive: false });
    canvas.addEventListener("touchmove", block, { passive: false });
    return () => {
      canvas.removeEventListener("touchstart", block);
      canvas.removeEventListener("touchmove", block);
    };
  });
  const [eraseMode, setEraseMode] = useState<null | "stroke" | "partial">(null);
  const eraseCommit = useRef<Set<string>>(new Set());
  const erasedOriginals = useRef<CanvasObject[]>([]);
  const [helpOpen, setHelpOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const closeHelp = useCallback(() => setHelpOpen(false), []);
  useEffect(() => {
    if (tool !== "draw") setEraseMode(null);
  }, [tool]);
  const [penWidth, setPenWidth] = useState(4);
  const [inkColor, setInkColor] = useState(me.color);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [textSize, setTextSize] = useState(TEXT_SIZE);
  const [textFont, setTextFont] = useState<TextFont>("sketch");
  // Personal undo: only ever touches things this person put on the board
  const undoStack = useRef<UndoEntry[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState<BoardTheme>("dark");
  const [gridMode, setGridMode] = useState<GridMode>("light");
  const [brightnessIdx, setBrightnessIdx] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  function toggleFullscreen() {
    try {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void document.documentElement.requestFullscreen();
    } catch {
      /* fullscreen is a nicety, never block the room */
    }
  }
  const [uploading, setUploading] = useState(false);
  const [pendingText, setPendingText] = useState<{
    x: number;
    y: number;
    value: string;
    editingId?: string;
  } | null>(null);
  const [identityOpen, setIdentityOpen] = useState(false);
  const [chatDraft, setChatDraft] = useState("");
  const [draftName, setDraftName] = useState(me.name);
  const [draftColor, setDraftColor] = useState(me.color);
  const pendingDraftColor = useRef(me.color);
  const [shredRound, setShredRound] = useState<string | null>(null);
  const [shredExecuteAt, setShredExecuteAt] = useState<number | null>(null);
  const [shredCooldown, setShredCooldown] = useState(0);
  // Bashing the shred button during the countdown chips away at its "hit points";
  // 10 hits from anyone in the Napkin together call the whole thing off.
  const SHRED_HP = 10;
  const [shredHits, setShredHits] = useState(0);
  // Short celebratory / destructive flash over the board so everyone sees the outcome
  const [boardFx, setBoardFx] = useState<"saved" | "shredded" | null>(null);
  const boardFxTimer = useRef<number | null>(null);
  const flashBoard = useCallback((kind: "saved" | "shredded") => {
    setBoardFx(kind);
    if (boardFxTimer.current) window.clearTimeout(boardFxTimer.current);
    boardFxTimer.current = window.setTimeout(() => setBoardFx(null), 1400);
  }, []);
  const [schedTick, setSchedTick] = useState(0);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [rescue, setRescue] = useState<{
    url: string;
    transcript: string;
    left: number;
    expiry?: boolean;
  } | null>(null);
  const expiryCaptured = useRef(false);
  const [locked, setLocked] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [knocks, setKnocks] = useState<Knock[]>([]);
  const [knockCooldown, setKnockCooldown] = useState(0);
  const [peopleOpen, setPeopleOpen] = useState(false);
  // People this browser has chosen to hide — a personal mute, nobody else is affected
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [closeRound, setCloseRound] = useState<string | null>(null);
  const [closeVotes, setCloseVotes] = useState<Vote[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [knockSent, setKnockSent] = useState(false);
  // Set by the home page right before it sends a brand-new Napkin here
  const [isNewNapkin, setIsNewNapkin] = useState(false);
  useEffect(() => {
    const fresh = window.sessionStorage.getItem("napkin-created") === roomId;
    if (fresh) {
      window.sessionStorage.removeItem("napkin-created");
      setIsNewNapkin(true);
    }
  }, [roomId]);
  const [unread, setUnread] = useState(0);
  const [view, setView] = useState<ViewTransform>({ scale: 1, x: 0, y: 0 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const navigationPointers = useRef(new Map<number, { x: number; y: number }>());
  const navigationGesture = useRef<{
    distance: number;
    center: { x: number; y: number };
    view: ViewTransform;
  } | null>(null);
  const penSeen = useRef(false);
  const strokePointerType = useRef<string | null>(null);
  const guardedTouches = useRef(new Map<number, { x: number; y: number }>());
  const guardedGesture = useRef<{
    distance: number;
    center: { x: number; y: number };
    view: ViewTransform;
  } | null>(null);
  const ephemeralInk = useRef(
    new Map<string, { author_id: string | null; payload: StrokePayload; updatedAt: number }>(),
  );
  const settledInk = useRef(new Set<string>());
  const presentIdsRef = useRef(new Set<string>());
  const lastInkSent = useRef(0);
  const inkSentPoints = useRef(0);

  function settleInk(sid: string) {
    if (settledInk.current.size > 2000) settledInk.current.clear();
    settledInk.current.add(sid);
  }
  const uploadImageRef = useRef(uploadImage);
  uploadImageRef.current = uploadImage;
  const chatOpenRef = useRef(false);
  chatOpenRef.current = chatOpen;

  // Keep the board at the canvas aspect ratio so everyone sees identical geometry
  useEffect(() => {
    const element = sectionRef.current;
    if (!element) return;
    const fit = () => {
      const rect = element.getBoundingClientRect();
      const scale = Math.min(rect.width / WIDTH, rect.height / HEIGHT);
      setBoard({ w: Math.floor(WIDTH * scale), h: Math.floor(HEIGHT * scale) });
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
  }, [status]);

  useEffect(() => {
    const update = () => {
      const height = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--app-vh", `${height}px`);
    };
    update();
    window.visualViewport?.addEventListener("resize", update);
    window.addEventListener("resize", update);
    return () => {
      window.visualViewport?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (!canvasRef.current) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      )
        return;
      const item = Array.from(event.clipboardData?.items ?? []).find(
        (entry) => entry.kind === "file" && entry.type.startsWith("image/"),
      );
      const file = item?.getAsFile();
      if (!file) return;
      event.preventDefault();
      uploadImageRef.current(file, { x: 0.5, y: 0.5 });
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const broadcastView = useCallback((next: ViewTransform) => {
    const section = sectionRef.current;
    const base = boardRef.current;
    if (!section || !base) return;
    const visibleW = Math.min(1, section.clientWidth / (Math.max(base.clientWidth, 1) * next.scale));
    const visibleH = Math.min(1, section.clientHeight / (Math.max(base.clientHeight, 1) * next.scale));
    const x = Math.max(0, Math.min(1 - visibleW, -next.x / (Math.max(base.clientWidth, 1) * next.scale)));
    const y = Math.max(0, Math.min(1 - visibleH, -next.y / (Math.max(base.clientHeight, 1) * next.scale)));
    channelRef.current?.send({
      type: "broadcast",
      event: "view",
      payload: { ...meRef.current, view: { x, y, w: visibleW, h: visibleH } },
    });
  }, []);

  const setCanvasView = useCallback(
    (next: ViewTransform) => {
      const clamped = { ...next, scale: Math.min(4, Math.max(0.75, next.scale)) };
      setView(clamped);
      broadcastView(clamped);
    },
    [broadcastView],
  );

  useEffect(() => {
    const element = sectionRef.current;
    if (!element || status !== "ready") return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const currentView = viewRef.current;
      const dy = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 100 : 1);
      const scale = Math.min(4, Math.max(0.75, currentView.scale * Math.exp(-dy * 0.0015)));
      const ratio = scale / currentView.scale;
      const rect = element.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      setCanvasView({
        scale,
        x: px - (px - currentView.x) * ratio,
        y: py - (py - currentView.y) * ratio,
      });
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [status, setCanvasView]);

  // Load room + existing content
  useEffect(() => {
    let active = true;
    (async () => {
      const storedIdentity = getIdentity();
      meRef.current = storedIdentity;
      setMe(storedIdentity);
      const { data: sessionData } = await supabase.auth.getSession();
      let userId = sessionData.session?.user.id;
      if (!userId) {
        const { data: anonymous, error: authError } = await supabase.auth.signInAnonymously();
        if (authError || !anonymous.user) {
          if (active) setStatus("expired");
          return;
        }
        userId = anonymous.user.id;
      }
      const identity = meRef.current;
      if (identity.id !== userId) {
        const next = adoptIdentityId(userId);
        meRef.current = next;
        setMe(next);
      }
      const { data: entered, error: enterError } = await supabase.rpc("enter_napkin", {
        _room_id: roomId,
        _name: meRef.current.name,
        _color: meRef.current.color,
      });
      const room = entered?.[0];
      if (!active) return;
      if (enterError || !room) {
        setStatus("expired");
        return;
      }
      if (room.is_closed) {
        setStatus("closed");
        return;
      }
      setLocked(room.is_locked);
      setCloseRound(room.close_round);
      setExpiresAt(new Date(room.expires_at).getTime());
      setTheme((room.board_theme as BoardTheme) ?? "dark");
      setShredRound(room.shred_round);
      const admitted = room.admitted;
      admittedRef.current = admitted;
      if (!admitted) {
        const { data: ownKnock } = await supabase
          .from("room_knocks")
          .select("status")
          .eq("room_id", roomId)
          .eq("visitor_id", meRef.current.id)
          .maybeSingle();
        setStatus(ownKnock?.status === "declined" ? "rejected" : "waiting");
        return;
      }
      const { data: liveRoom } = await supabase
        .from("rooms")
        .select("shred_execute_at, grid_mode")
        .eq("id", roomId)
        .maybeSingle();
      setShredExecuteAt(liveRoom?.shred_execute_at ? new Date(liveRoom.shred_execute_at).getTime() : null);
      setGridMode(((liveRoom as { grid_mode?: GridMode } | null)?.grid_mode ?? "light") as GridMode);
      const [
        { data: chat },
        { data: rows },
        { data: voteRows },
        { data: memberRows },
        { data: knockRows },
        { data: closingRows },
      ] = await Promise.all([
        supabase
          .from("messages")
          .select("id, author, author_id, body, created_at")
          .eq("room_id", roomId)
          .order("created_at"),
        supabase
          .from("canvas_objects")
          .select("id, author_id, kind, payload")
          .eq("room_id", roomId)
          .order("created_at"),
        supabase.from("shred_votes").select("voter_id, voter_name, agree").eq("room_id", roomId),
        supabase
          .from("room_members")
          .select("user_id, visitor_id, display_name, color, admitted, muted")
          .eq("room_id", roomId),
        supabase
          .from("room_knocks")
          .select("user_id, visitor_id, visitor_name, visitor_color, status")
          .eq("room_id", roomId)
          .eq("status", "pending"),
        supabase.from("close_votes").select("voter_id, voter_name, agree").eq("room_id", roomId),
      ]);
      if (!active) return;
      setMessages(chat ?? []);
      setObjects((rows ?? []) as unknown as CanvasObject[]);
      setVotes((voteRows ?? []) as Vote[]);
      setMembers((memberRows ?? []) as Member[]);
      setKnocks((knockRows ?? []) as Knock[]);
      setCloseVotes((closingRows ?? []) as Vote[]);
      setStatus("ready");
    })();
    return () => {
      active = false;
    };
  }, [roomId]);

  // Realtime
  useEffect(() => {
    if (status !== "ready" && status !== "waiting") return;
    const channel = supabase
      .channel(`room:${roomId}`, { config: { presence: { key: me.id } } })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const row = payload.new as ChatMessage;
          setMessages((list) => (list.some((m) => m.id === row.id) ? list : [...list, row]));
          if (row.author_id && row.author_id !== meRef.current.id) {
            playPing();
            if (!chatOpenRef.current) setUnread((count) => count + 1);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "canvas_objects", filter: `room_id=eq.${roomId}` },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const landedSid = ((payload.new as unknown as CanvasObject).payload as StrokePayload)
              ?.sid;
            if (landedSid) {
              ephemeralInk.current.delete(landedSid);
              settleInk(landedSid);
            }
          }
          if (payload.eventType === "INSERT") {
            const row = payload.new as unknown as CanvasObject;
            setObjects((list) => (list.some((o) => o.id === row.id) ? list : [...list, row]));
          }
          if (payload.eventType === "UPDATE") {
            const row = payload.new as unknown as CanvasObject;
            setObjects((list) => list.map((o) => (o.id === row.id ? { ...o, ...row } : o)));
          }
          if (payload.eventType === "DELETE") {
            const row = payload.old as { id?: string };
            if (row.id) setObjects((list) => list.filter((object) => object.id !== row.id));
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        (payload) => {
          const row = payload.new as {
            board_theme: BoardTheme;
            shred_round: string | null;
            is_locked: boolean;
            is_closed: boolean;
            close_round: string | null;
            shred_execute_at: string | null;
            grid_mode: GridMode | null;
          };
          setTheme(row.board_theme ?? "dark");
          setGridMode(row.grid_mode ?? "light");
          setShredRound(row.shred_round);
          setShredExecuteAt(row.shred_execute_at ? new Date(row.shred_execute_at).getTime() : null);
          setLocked(row.is_locked);
          setCloseRound(row.close_round);
          if (row.is_closed) setStatus("closed");
          if (!row.shred_round) setVotes([]);
          if (!row.close_round) setCloseVotes([]);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_members", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const row = payload.new as Member;
          setMembers((list) =>
            list.some((item) => item.visitor_id === row.visitor_id)
              ? list.map((item) => (item.visitor_id === row.visitor_id ? row : item))
              : [...list, row],
          );
          // Only reload when the door actually opens for us — heartbeats and
          // name/colour edits touch this same row and must not refresh the page.
          if (row.visitor_id === meRef.current.id && row.admitted && !admittedRef.current) {
            admittedRef.current = true;
            window.location.reload();
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_knocks", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const row = payload.new as Knock;
          if (row.visitor_id === meRef.current.id && row.status === "declined") {
            setStatus("rejected");
          }
          if (row.visitor_id !== meRef.current.id && row.status === "pending") {
            playPing();
            toast(`${row.visitor_name} is at the door`, {
              description: "Let them in or turn them away.",
              action: { label: "Answer", onClick: () => setPeopleOpen(true) },
            });
          }
          setKnocks((list) =>
            row.status === "pending"
              ? list.some((item) => item.visitor_id === row.visitor_id)
                ? list.map((item) => (item.visitor_id === row.visitor_id ? row : item))
                : [...list, row]
              : list.filter((item) => item.visitor_id !== row.visitor_id),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "close_votes", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const row = payload.new as Vote;
          setCloseVotes((list) =>
            list.some((vote) => vote.voter_id === row.voter_id) ? list : [...list, row],
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "shred_votes", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const row = payload.new as Vote;
          setVotes((list) =>
            list.some((v) => v.voter_id === row.voter_id) ? list : [...list, row],
          );
        },
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<Peer>();
        const unique = new Map<string, Peer>();
        for (const entries of Object.values(state)) {
          for (const peer of entries as unknown as Peer[]) unique.set(peer.id, peer);
        }
        presentIdsRef.current = new Set(unique.keys());
        setPeers([...unique.values()]);
      })
      .on("broadcast", { event: "cursor" }, ({ payload }) => {
        const peer = payload as Peer;
        if (peer.id === meRef.current.id) return;
        setPeers((list) =>
          list.map((p) => (p.id === peer.id ? { ...p, x: peer.x, y: peer.y } : p)),
        );
      })
      .on("broadcast", { event: "view" }, ({ payload }) => {
        const peer = payload as Peer;
        if (peer.id === meRef.current.id) return;
        setPeers((list) =>
          list.map((item) => (item.id === peer.id ? { ...item, view: peer.view } : item)),
        );
      })
      .on("broadcast", { event: "ink" }, ({ payload }) => {
        const ink = payload as {
          sid?: string;
          author_id?: string | null;
          color: string;
          width?: number;
          points: { x: number; y: number }[];
        };
        if (!ink.sid || !ink.points || ink.points.length < 2) return;
        if (ink.author_id === meRef.current.id) return;
        if (settledInk.current.has(ink.sid)) return;
        ephemeralInk.current.set(ink.sid, {
          author_id: ink.author_id ?? null,
          payload: { color: ink.color, width: ink.width, points: ink.points },
          updatedAt: Date.now(),
        });
        pokeRedraw();
      })
      .on("broadcast", { event: "shredded" }, () => {
        keepSnapshot();
        setObjects([]);
        ephemeralInk.current.clear();
        setVotes([]);
        flashBoard("shredded");
      })
      .on("broadcast", { event: "erased" }, ({ payload }) => {
        const ids = new Set(((payload as { ids?: string[] })?.ids ?? []));
        if (ids.size) setObjects((list) => list.filter((object) => !ids.has(object.id)));
      })
      .on("broadcast", { event: "shred_hit" }, () => {
        setShredHits((n) => n + 1);
      })
      .subscribe(async (state) => {
        // Only people actually inside the Napkin count as present; visitors
        // still waiting at the door must not inflate the headcount.
        if (state === "SUBSCRIBED" && status === "ready") {
          const who = meRef.current;
          await channel.track({ id: who.id, name: who.name, color: who.color });
        }
      });
    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      ephemeralInk.current.clear();
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, status, me.id]);

  useEffect(() => {
    if (knockCooldown <= 0) return;
    const timer = window.setInterval(() => setKnockCooldown((left) => Math.max(0, left - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [knockCooldown]);

  // Let the server know we are still in the Napkin so votes only count people present
  useEffect(() => {
    if (status !== "ready") return;
    const beat = () => void supabase.rpc("heartbeat_member", { _room_id: roomId });
    beat();
    const timer = window.setInterval(beat, 30000);
    return () => window.clearInterval(timer);
  }, [status, roomId]);

  // Countdown
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const left = Math.floor((expiresAt - Date.now()) / 1000);
      setSeconds(Math.max(0, left));
      if (left <= 0 && !expiryCaptured.current) {
        expiryCaptured.current = true;
        const url = snapshotUrl();
        if (url) {
          setRescue({ url, transcript: chatTranscript(), left: 60, expiry: true });
          setStatus("rescuing");
        } else {
          setStatus("expired");
        }
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  // Rescue-window countdown after a shred
  useEffect(() => {
    if (!rescue) return;
    const timer = window.setInterval(() => {
      setRescue((state) => {
        if (!state) return state;
        if (state.left <= 1) {
          URL.revokeObjectURL(state.url);
          if (state.expiry) window.location.assign("/");
          return null;
        }
        return { ...state, left: state.left - 1 };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [rescue]);

  const gifs = useRef(new Map<string, GifAnimation | null>());
  const getImage = useCallback((payload: ImagePayload, onReady: () => void): CanvasImageSource | null => {
    const isGif = /\.gif$/i.test(payload.path);
    if (isGif) {
      const gif = gifs.current.get(payload.path);
      if (gif) return frameAt(gif, performance.now());
    }
    const existing = images.current.get(payload.path);
    if (existing) return existing.complete && existing.naturalWidth ? existing : null;
    const element = new Image();
    element.crossOrigin = "anonymous";
    images.current.set(payload.path, element);
    element.onload = onReady;
    void supabase.storage
      .from("room-uploads")
      .createSignedUrl(payload.path, 60 * 60 * 24)
      .then(({ data }) => {
        if (!data?.signedUrl) return;
        element.src = data.signedUrl;
        if (isGif)
          void loadGif(data.signedUrl).then((gif) => {
            gifs.current.set(payload.path, gif);
            onReady();
          });
      });
    return null;
  }, []);

  const objectsRef = useRef(objects);
  objectsRef.current = objects;

  // Strokes drawn on top of an image ride along when that image moves, scales, or rotates
  const strokePoints = useCallback((stroke: StrokePayload) => {
    if (!stroke.parent || !stroke.base) return stroke.points;
    const parent = objectsRef.current.find(
      (object) => object.id === stroke.parent && object.kind === "image",
    );
    if (!parent) return stroke.points;
    const base = stroke.base;
    const now = parent.payload as ImagePayload;
    const bcx = base.x + base.w / 2;
    const bcy = base.y + base.h / 2;
    const ncx = now.x + now.w / 2;
    const ncy = now.y + now.h / 2;
    const ba = -(base.rotation ?? 0);
    const na = now.rotation ?? 0;
    return stroke.points.map((p) => {
      const dx = (p.x - bcx) * WIDTH;
      const dy = (p.y - bcy) * HEIGHT;
      const ux = dx * Math.cos(ba) - dy * Math.sin(ba);
      const uy = dx * Math.sin(ba) + dy * Math.cos(ba);
      const sx = (ux / (base.w * WIDTH || 1)) * now.w * WIDTH;
      const sy = (uy / (base.h * HEIGHT || 1)) * now.h * HEIGHT;
      const rx = sx * Math.cos(na) - sy * Math.sin(na);
      const ry = sx * Math.sin(na) + sy * Math.cos(na);
      return { x: ncx + rx / WIDTH, y: ncy + ry / HEIGHT };
    });
  }, []);

  const redraw = useCallback(() => {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, WIDTH, HEIGHT);
    const mutedIds = new Set(hiddenIds);
    const all: CanvasObject[] = objects.filter(
      (object) => !object.author_id || !mutedIds.has(object.author_id),
    );
    if (current.current)
      all.push({ id: "live", kind: "stroke", payload: current.current } as CanvasObject);
    for (const [sid, entry] of ephemeralInk.current) {
      if (entry.author_id && mutedIds.has(entry.author_id)) continue;
      all.push({ id: `ink:${sid}`, kind: "stroke", payload: entry.payload } as CanvasObject);
    }
    for (const object of all) {
      if (object.kind === "stroke") {
        const stroke = object.payload as StrokePayload;
        const points = strokePoints(stroke);
        if (points.length < 2) continue;
        context.strokeStyle = readableInk(stroke.color, theme);
        context.lineWidth = stroke.width ?? 4;
        context.lineCap = "round";
        context.lineJoin = "round";
        context.beginPath();
        context.moveTo(points[0]!.x * WIDTH, points[0]!.y * HEIGHT);
        for (const p of points.slice(1)) context.lineTo(p.x * WIDTH, p.y * HEIGHT);
        context.stroke();
      }
      if (object.kind === "image") {
        const image = object.payload as ImagePayload;
        const element = getImage(image, () => redraw());
        if (element) {
          const x = image.x * WIDTH;
          const y = image.y * HEIGHT;
          const w = image.w * WIDTH;
          const h = image.h * HEIGHT;
          context.save();
          context.translate(x + w / 2, y + h / 2);
          context.rotate(image.rotation ?? 0);
          context.drawImage(element, -w / 2, -h / 2, w, h);
          context.restore();
        }
      }
      if (object.kind === "text") {
        const text = object.payload as TextPayload;
        const width = (Math.max(text.text.length, 1) * text.size * textWidthRatio(text.font)) / WIDTH;
        const height = (text.size * 1.3) / HEIGHT;
        context.save();
        context.translate((text.x + width / 2) * WIDTH, (text.y + height / 2) * HEIGHT);
        context.rotate(text.rotation ?? 0);
        context.fillStyle = readableInk(text.color, theme);
        context.font = textFontStack(text.font, text.size);
        context.textBaseline = "top";
        context.fillText(text.text, (-width * WIDTH) / 2, (-height * HEIGHT) / 2);
        context.restore();
      }
    }
  }, [objects, hiddenIds, getImage, strokePoints, theme]);

  const redrawRef = useRef(redraw);
  redrawRef.current = redraw;

  function pokeRedraw() {
    if (redrawFrame.current == null) {
      redrawFrame.current = requestAnimationFrame(() => {
        redrawFrame.current = null;
        redrawRef.current();
      });
    }
  }

  useEffect(redraw, [redraw]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (ephemeralInk.current.size === 0) return;
      const now = Date.now();
      let changed = false;
      for (const [sid, entry] of ephemeralInk.current) {
        const stale = now - entry.updatedAt > 3000;
        const orphaned =
          now - entry.updatedAt > 1000 &&
          entry.author_id != null &&
          presentIdsRef.current.size > 0 &&
          !presentIdsRef.current.has(entry.author_id);
        if (stale || orphaned) {
          ephemeralInk.current.delete(sid);
          changed = true;
        }
      }
      if (changed) pokeRedraw();
    }, 500);
    return () => window.clearInterval(timer);
  }, []);

  // Animated GIFs: repaint the board while any are on it
  const hasGif = objects.some((object) => object.kind === "image" && /\.gif$/i.test((object.payload as ImagePayload).path));
  useEffect(() => {
    if (!hasGif) return;
    let frame = 0;
    let last = 0;
    const tick = (time: number) => {
      if (time - last > 60) { last = time; redraw(); }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [hasGif, redraw]);

  function keepSnapshot() {
    const url = snapshotUrl();
    if (url) setRescue({ url, transcript: chatTranscript(), left: 30 });
  }

  // Colour of whoever wrote a message, so chat matches the board
  function authorColor(message: ChatMessage) {
    const byId = message.author_id
      ? (members.find((member) => member.visitor_id === message.author_id)?.color ??
        peers.find((peer) => peer.id === message.author_id)?.color)
      : undefined;
    const byName = members.find((member) => member.display_name === message.author)?.color;
    return byId ?? byName ?? me.color;
  }

  function chatTranscript() {
    return messages
      .map((message) => `[${formatTime(message.created_at)}] ${message.author}: ${message.body}`)
      .join("\n\n");
  }

  function snapshotUrl() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const output = document.createElement("canvas");
    output.width = canvas.width;
    output.height = canvas.height;
    const context = output.getContext("2d");
    if (!context) return null;
    context.fillStyle = BOARD_BG[theme];
    context.fillRect(0, 0, output.width, output.height);
    context.drawImage(canvas, 0, 0);
    return output.toDataURL("image/png");
  }

  function point(event: { clientX: number; clientY: number }, rect: DOMRect) {
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
  }

  function insideImage(x: number, y: number, p: ImagePayload | ReturnType<typeof objectFrame>) {
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    const angle = -(p.rotation ?? 0);
    const dx = (x - cx) * WIDTH;
    const dy = (y - cy) * HEIGHT;
    const localX = cx + (dx * Math.cos(angle) - dy * Math.sin(angle)) / WIDTH;
    const localY = cy + (dx * Math.sin(angle) + dy * Math.cos(angle)) / HEIGHT;
    return localX >= p.x && localX <= p.x + p.w && localY >= p.y && localY <= p.y + p.h;
  }

  function objectFrame(object: CanvasObject) {
    const payload = object.payload as ImagePayload | TextPayload;
    if (object.kind === "image") {
      const image = payload as ImagePayload;
      return { x: image.x, y: image.y, w: image.w, h: image.h, rotation: image.rotation ?? 0 };
    }
    const text = payload as TextPayload;
    return {
      x: text.x,
      y: text.y,
      w: (Math.max(text.text.length, 1) * text.size * textWidthRatio(text.font)) / WIDTH,
      h: (text.size * 1.3) / HEIGHT,
      rotation: text.rotation ?? 0,
    };
  }

  function hitTest(x: number, y: number, imagesOnly = false) {
    for (let i = objectsRef.current.length - 1; i >= 0; i -= 1) {
      const object = objectsRef.current[i]!;
      if (object.kind === "image" && insideImage(x, y, object.payload as ImagePayload))
        return object;
      if (object.kind === "text" && !imagesOnly && insideImage(x, y, objectFrame(object))) return object;
    }
    return null;
  }

  // Eraser: removes only strokes this participant drew (whole line or just the rubbed part)
  function eraseAt(p: { x: number; y: number }) {
    const radius = 14;
    const px = p.x * WIDTH, py = p.y * HEIGHT;
    const near = (a: { x: number; y: number }, b: { x: number; y: number }, reach: number) => {
      const ax = a.x * WIDTH, ay = a.y * HEIGHT, bx = b.x * WIDTH, by = b.y * HEIGHT;
      const dx = bx - ax, dy = by - ay;
      const len = dx * dx + dy * dy;
      const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
      return Math.hypot(px - (ax + t * dx), py - (ay + t * dy)) <= reach;
    };
    let changed = false;
    const next: CanvasObject[] = [];
    for (const object of objectsRef.current) {
      if (object.kind !== "stroke" || object.author_id !== me.id) { next.push(object); continue; }
      const stroke = object.payload as StrokePayload;
      const reach = radius + (stroke.width ?? 4) / 2;
      const pts = strokePoints(stroke);
      if (eraseMode === "partial") {
        const keep = pts.map((q) => !near(q, q, reach));
        if (keep.every(Boolean)) { next.push(object); continue; }
        changed = true;
        if (!object.id.startsWith("tmp-")) { eraseCommit.current.add(object.id); erasedOriginals.current.push(object); }
        let seg: { x: number; y: number }[] = [];
        const flush = () => {
          if (seg.length >= 2) next.push({ ...object, id: `tmp-${crypto.randomUUID()}`, payload: { ...stroke, points: seg } });
          seg = [];
        };
        stroke.points.forEach((q, i) => (keep[i] ? seg.push(q) : flush()));
        flush();
        continue;
      }
      const hit = pts.some((a, i) => near(a, pts[i + 1] ?? a, reach));
      if (!hit) { next.push(object); continue; }
      changed = true;
      if (!object.id.startsWith("tmp-")) { eraseCommit.current.add(object.id); erasedOriginals.current.push(object); }
    }
    if (!changed) return;
    objectsRef.current = next;
    setObjects(next);
  }

  async function commitErase() {
    const deleted = [...eraseCommit.current];
    const originals = erasedOriginals.current;
    erasedOriginals.current = [];
    eraseCommit.current = new Set();
    if (originals.length) rememberRemove(originals);
    const pending = objectsRef.current.filter((object) => object.id.startsWith("tmp-"));
    if (deleted.length) {
      await supabase.from("canvas_objects").delete().in("id", deleted).eq("author_id", me.id);
      // Live delete events can't be filtered per Napkin, so tell everyone directly.
      void channelRef.current?.send({ type: "broadcast", event: "erased", payload: { ids: deleted } });
    }
    if (!pending.length) return;
    const { data } = await supabase
      .from("canvas_objects")
      .insert(pending.map((object) => ({ room_id: roomId, author: me.name, author_id: me.id, user_id: me.id, kind: "stroke", payload: object.payload as never })))
      .select("id, author_id, kind, payload");
    const tmpIds = new Set(pending.map((object) => object.id));
    setObjects((list) => {
      const kept = list.filter((object) => !tmpIds.has(object.id));
      const fresh = ((data ?? []) as unknown as CanvasObject[]).filter((row) => !kept.some((object) => object.id === row.id));
      return [...kept, ...fresh];
    });
  }

  function startDrawing(event: PointerEvent<HTMLCanvasElement>) {
    if (event.pointerType === "pen") {
      penSeen.current = true;
      if (strokePointerType.current === "touch") {
        current.current = null;
        strokePointerType.current = null;
        for (const [id, pos] of navigationPointers.current) {
          guardedTouches.current.set(id, pos);
        }
        navigationPointers.current.clear();
        const first = [...guardedTouches.current.values()][0];
        guardedGesture.current = {
          distance: 0,
          center: first ?? { x: event.clientX, y: event.clientY },
          view: viewRef.current,
        };
      }
    }
    if (event.pointerType === "touch" && penSeen.current) {
      guardedTouches.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const touches = [...guardedTouches.current.values()];
      guardedGesture.current =
        touches.length === 2
          ? {
              distance: Math.hypot(touches[1]!.x - touches[0]!.x, touches[1]!.y - touches[0]!.y),
              center: { x: (touches[0]!.x + touches[1]!.x) / 2, y: (touches[0]!.y + touches[1]!.y) / 2 },
              view: viewRef.current,
            }
          : { distance: 0, center: { x: event.clientX, y: event.clientY }, view: viewRef.current };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    navigationPointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...navigationPointers.current.values()];
    if (tool === null || points.length === 2) {
      if (points.length === 2) {
        current.current = null;
        strokePointerType.current = null;
      }
      event.currentTarget.setPointerCapture(event.pointerId);
      navigationGesture.current = points.length === 2
        ? {
            distance: Math.hypot(points[1]!.x - points[0]!.x, points[1]!.y - points[0]!.y),
            center: { x: (points[0]!.x + points[1]!.x) / 2, y: (points[0]!.y + points[1]!.y) / 2 },
            view: viewRef.current,
          }
        : { distance: 0, center: { x: event.clientX, y: event.clientY }, view: viewRef.current };
      return;
    }
    const next = point(event, event.currentTarget.getBoundingClientRect());
    if (tool === "text") return;
    event.preventDefault();

    if (tool === "draw" && eraseMode) {
      erasingRef.current = true;
      eraseAt(next);
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (tool === "select") {
      const hit = hitTest(next.x, next.y);
      if (hit) {
        setSelectedId(hit.id);
        const payload = hit.payload as ImagePayload | TextPayload;
        if ((payload as ImagePayload | TextPayload).locked) return;
        transformRef.current = {
          id: hit.id,
          mode: "move",
          startX: next.x,
          startY: next.y,
          origin: structuredClone(payload),
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      } else {
        setSelectedId(null);
      }
      return;
    }
    current.current = {
      color: inkColor,
      width: penWidth,
      points: [next],
      sid: crypto.randomUUID(),
    };
    strokePointerType.current = event.pointerType;
    lastInkSent.current = 0;
    inkSentPoints.current = 0;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function applyTransform(next: { x: number; y: number }) {
    const transform = transformRef.current;
    if (!transform) return;
    setObjects((list) =>
      list.map((object) => {
        if (object.id !== transform.id) return object;
        if (transform.mode === "move") {
          return {
            ...object,
            payload: {
              ...object.payload,
              x: transform.origin.x + next.x - transform.startX,
              y: transform.origin.y + next.y - transform.startY,
            },
          };
        }
        const origin = transform.origin;
        const originalObject = objectsRef.current.find((item) => item.id === transform.id);
        if (!originalObject) return object;
        const frame = objectFrame({ ...originalObject, payload: origin });
        const cx = frame.x + frame.w / 2;
        const cy = frame.y + frame.h / 2;
        if (transform.mode === "resize") {
          const from = Math.hypot(
            (transform.startX - cx) * WIDTH,
            (transform.startY - cy) * HEIGHT,
          );
          const to = Math.hypot((next.x - cx) * WIDTH, (next.y - cy) * HEIGHT);
          const factor = Math.min(6, Math.max(0.15, to / Math.max(from, 1)));
          if (originalObject.kind === "text") {
            const text = origin as TextPayload;
            const size = Math.min(MAX_TEXT_SIZE, Math.max(MIN_TEXT_SIZE, text.size * factor));
            const nextW = (Math.max(text.text.length, 1) * size * textWidthRatio(text.font)) / WIDTH;
            const nextH = (size * 1.3) / HEIGHT;
            return { ...object, payload: { ...text, size, x: cx - nextW / 2, y: cy - nextH / 2 } };
          }
          const image = origin as ImagePayload;
          const w = Math.min(1.6, Math.max(0.04, image.w * factor));
          const h = image.h * (w / image.w);
          return { ...object, payload: { ...image, w, h, x: cx - w / 2, y: cy - h / 2 } };
        }
        const rotation = Math.atan2((next.y - cy) * HEIGHT, (next.x - cx) * WIDTH) + Math.PI / 2;
        return { ...object, payload: { ...origin, rotation } };
      }),
    );
  }

  function draw(event: PointerEvent<HTMLCanvasElement>) {
    if (guardedTouches.current.has(event.pointerId)) {
      guardedTouches.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const gesture = guardedGesture.current;
      if (!gesture) return;
      const touches = [...guardedTouches.current.values()];
      if (touches.length >= 2 && gesture.distance > 0) {
        const center = { x: (touches[0]!.x + touches[1]!.x) / 2, y: (touches[0]!.y + touches[1]!.y) / 2 };
        const distance = Math.hypot(touches[1]!.x - touches[0]!.x, touches[1]!.y - touches[0]!.y);
        const scale = Math.min(4, Math.max(0.75, gesture.view.scale * (distance / gesture.distance)));
        const ratio = scale / gesture.view.scale;
        setCanvasView({ scale, x: center.x - (gesture.center.x - gesture.view.x) * ratio, y: center.y - (gesture.center.y - gesture.view.y) * ratio });
      } else if (touches.length === 1) {
        setCanvasView({ ...gesture.view, x: gesture.view.x + event.clientX - gesture.center.x, y: gesture.view.y + event.clientY - gesture.center.y });
      }
      return;
    }
    if (navigationPointers.current.has(event.pointerId) && (tool === null || navigationPointers.current.size >= 2)) {
      navigationPointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const gesture = navigationGesture.current;
      const points = [...navigationPointers.current.values()];
      if (!gesture) return;
      if (points.length >= 2 && gesture.distance > 0) {
        const center = { x: (points[0]!.x + points[1]!.x) / 2, y: (points[0]!.y + points[1]!.y) / 2 };
        const distance = Math.hypot(points[1]!.x - points[0]!.x, points[1]!.y - points[0]!.y);
        const scale = Math.min(4, Math.max(0.75, gesture.view.scale * (distance / gesture.distance)));
        const ratio = scale / gesture.view.scale;
        setCanvasView({ scale, x: center.x - (gesture.center.x - gesture.view.x) * ratio, y: center.y - (gesture.center.y - gesture.view.y) * ratio });
      } else {
        setCanvasView({ ...gesture.view, x: gesture.view.x + event.clientX - gesture.center.x, y: gesture.view.y + event.clientY - gesture.center.y });
      }
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const next = point(event, rect);
    const now = performance.now();
    if (now - lastCursorSent.current > 50) {
      lastCursorSent.current = now;
      channelRef.current?.send({
        type: "broadcast",
        event: "cursor",
        payload: { ...me, x: next.x, y: next.y },
      });
    }
    if (transformRef.current) {
      applyTransform(next);
      return;
    }
    if (erasingRef.current) {
      eraseAt(next);
      return;
    }
    if (!current.current) return;
    const native = event.nativeEvent;
    const samples = typeof native.getCoalescedEvents === "function" ? native.getCoalescedEvents() : [];
    if (samples.length > 1) {
      for (const sample of samples) {
        current.current.points.push(point(sample as unknown as PointerEvent<HTMLCanvasElement>, rect));
      }
    } else {
      current.current.points.push(next);
    }
    if (redrawFrame.current == null) {
      redrawFrame.current = requestAnimationFrame(() => {
        redrawFrame.current = null;
        redraw();
      });
    }
    const activeStroke = current.current;
    if (activeStroke.sid && activeStroke.points.length >= 2) {
      const sentAt = performance.now();
      if (
        sentAt - lastInkSent.current >= 50 ||
        activeStroke.points.length - inkSentPoints.current >= 40
      ) {
        lastInkSent.current = sentAt;
        inkSentPoints.current = activeStroke.points.length;
        channelRef.current?.send({
          type: "broadcast",
          event: "ink",
          payload: {
            sid: activeStroke.sid,
            author_id: me.id,
            color: activeStroke.color,
            width: activeStroke.width,
            points: activeStroke.points,
          },
        });
      }
    }
  }

  async function commitTransform() {
    const transform = transformRef.current;
    transformRef.current = null;
    if (!transform) return;
    const moved = objectsRef.current.find((object) => object.id === transform.id);
    if (moved) {
      await supabase
        .from("canvas_objects")
        .update({ payload: moved.payload as never })
        .eq("id", transform.id);
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLElement>, mode: TransformMode) {
    event.stopPropagation();
    event.preventDefault();
    const selected = objectsRef.current.find((object) => object.id === selectedId);
    const rect = boardRef.current?.getBoundingClientRect();
    if (!selected || !rect || (selected.payload as ImagePayload | TextPayload).locked) return;
    const start = point(event, rect);
    transformRef.current = {
      id: selected.id,
      mode,
      startX: start.x,
      startY: start.y,
      origin: structuredClone(selected.payload as ImagePayload | TextPayload),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!transformRef.current || !rect) return;
    applyTransform(point(event, rect));
  }

  async function endPointer(event?: PointerEvent<HTMLCanvasElement>) {
    if (event && guardedTouches.current.has(event.pointerId)) {
      guardedTouches.current.delete(event.pointerId);
      if (guardedTouches.current.size === 0) guardedGesture.current = null;
      return;
    }
    if (event && navigationPointers.current.has(event.pointerId)) {
      navigationPointers.current.delete(event.pointerId);
      navigationGesture.current = null;
      if (tool === null || navigationPointers.current.size > 0) return;
    }
    if (erasingRef.current) {
      erasingRef.current = false;
      return commitErase();
    }
    if (transformRef.current) return commitTransform();
    const stroke = current.current;
    current.current = null;
    strokePointerType.current = null;
    if (!stroke || stroke.points.length < 2) return redraw();
    const middle = stroke.points[Math.floor(stroke.points.length / 2)]!;
    const parent = hitTest(middle.x, middle.y, true);
    const payload: StrokePayload = parent
      ? (() => {
          const image = parent.payload as ImagePayload;
          return {
            ...stroke,
            parent: parent.id,
            base: {
              x: image.x,
              y: image.y,
              w: image.w,
              h: image.h,
              ...(image.rotation ? { rotation: image.rotation } : {}),
            },
          };
        })()
      : stroke;
    const { data } = await supabase
      .from("canvas_objects")
      .insert({
        room_id: roomId,
        author: me.name,
        author_id: me.id,
        user_id: me.id,
        kind: "stroke",
        payload,
      })
      .select("id, author_id, kind, payload")
      .maybeSingle();
    if (data) {
      if (payload.sid) settleInk(payload.sid);
      setObjects((list) =>
        list.some((o) => o.id === data.id) ? list : [...list, data as unknown as CanvasObject],
      );
      rememberAdd([data.id]);
    }
  }

  async function commitText() {
    const draft = pendingText;
    setPendingText(null);
    if (!draft || !draft.value.trim()) return;
    if (draft.editingId) {
      const selected = objectsRef.current.find((object) => object.id === draft.editingId);
      if (!selected || selected.kind !== "text") return;
      const payload = { ...(selected.payload as TextPayload), text: draft.value.trim().slice(0, 180) };
      setObjects((list) =>
        list.map((object) => (object.id === draft.editingId ? { ...object, payload } : object)),
      );
      await supabase.from("canvas_objects").update({ payload }).eq("id", draft.editingId);
      return;
    }
    const payload: TextPayload = {
      x: draft.x,
      y: draft.y,
      text: draft.value.trim(),
      color: me.color,
      size: textSize,
      font: textFont,
    };
    const { data } = await supabase
      .from("canvas_objects")
      .insert({
        room_id: roomId,
        author: me.name,
        author_id: me.id,
        user_id: me.id,
        kind: "text",
        payload,
      })
      .select("id, author_id, kind, payload")
      .maybeSingle();
    if (data) {
      setObjects((list) =>
        list.some((o) => o.id === data.id) ? list : [...list, data as unknown as CanvasObject],
      );
      rememberAdd([data.id]);
    }
  }

  function editSelectedText() {
    const selected = objectsRef.current.find(
      (object) => object.id === selectedId && object.kind === "text",
    );
    if (!selected) return;
    const text = selected.payload as TextPayload;
    if (text.locked) return;
    setPendingText({ x: text.x, y: text.y, value: text.text, editingId: selected.id });
  }

  async function uploadImage(file: File, at: { x: number; y: number }) {
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) return;
    setUploading(true);
    try {
      const path = `${roomId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage.from("room-uploads").upload(path, file);
      if (error) throw error;
      const bitmap = await createImageBitmap(file);
      const w = Math.min(0.35, 1);
      const h = (w * WIDTH * (bitmap.height / bitmap.width)) / HEIGHT;
      const payload: ImagePayload = {
        path,
        x: Math.min(Math.max(at.x - w / 2, 0), 1 - w),
        y: Math.min(Math.max(at.y - h / 2, 0), Math.max(1 - h, 0)),
        w,
        h,
      };
      const { data } = await supabase
        .from("canvas_objects")
        .insert({
          room_id: roomId,
          author: me.name,
          author_id: me.id,
          user_id: me.id,
          kind: "image",
          payload,
        })
        .select("id, author_id, kind, payload")
        .maybeSingle();
      if (data) {
        setObjects((list) =>
          list.some((o) => o.id === data.id) ? list : [...list, data as unknown as CanvasObject],
        );
        rememberAdd([data.id]);
        setSelectedId(data.id);
        setTool("select");
      }
    } finally {
      setUploading(false);
    }
  }

  // Drops a framework (8-petal, Janus cone, horizons…) onto the board, pinned so
  // people can sketch on top of it without dragging it around by accident.
  async function placeTemplate(template: BoardTemplate) {
    setTemplatesOpen(false);
    setUploading(true);
    try {
      const ink = theme === "dark" ? "#e9ecf5" : "#1c2030";
      const blob = await templatePng(template, ink);
      const path = `${roomId}/${crypto.randomUUID()}-${template.id}.png`;
      const { error } = await supabase.storage
        .from("room-uploads")
        .upload(path, blob, { contentType: "image/png" });
      if (error) throw error;
      const w = 0.82;
      const h = (w * WIDTH * (template.height / template.width)) / HEIGHT;
      const fit = h > 0.92 ? (0.92 / h) * w : w;
      const fh = (fit * WIDTH * (template.height / template.width)) / HEIGHT;
      const payload: ImagePayload = {
        path,
        x: (1 - fit) / 2,
        y: Math.max((1 - fh) / 2, 0),
        w: fit,
        h: fh,
        locked: true,
      };
      const { data } = await supabase
        .from("canvas_objects")
        .insert({
          room_id: roomId,
          author: me.name,
          author_id: me.id,
          user_id: me.id,
          kind: "image",
          payload,
        })
        .select("id, author_id, kind, payload")
        .maybeSingle();
      if (data) {
        setObjects((list) =>
          list.some((o) => o.id === data.id) ? list : [...list, data as unknown as CanvasObject],
        );
        rememberAdd([data.id]);
        toast.success(`${template.name} added — pinned so you can draw on it`);
      }
    } catch {
      toast.error("That framework could not be added. Try again.");
    } finally {
      setUploading(false);
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    const rect = event.currentTarget.getBoundingClientRect();
    void uploadImage(file, point(event, rect));
  }

  async function toggleTheme() {
    const next: BoardTheme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    await supabase.from("rooms").update({ board_theme: next }).eq("id", roomId);
  }

  async function cycleGrid() {
    const next: GridMode = gridMode === "off" ? "light" : gridMode === "light" ? "medium" : "off";
    setGridMode(next);
    await supabase.from("rooms").update({ grid_mode: next }).eq("id", roomId);
  }

  // ---- Personal undo -------------------------------------------------------
  function rememberAdd(ids: string[]) {
    if (!ids.length) return;
    undoStack.current = [...undoStack.current, { kind: "add", ids } as UndoEntry].slice(-40);
    setCanUndo(true);
  }

  function rememberRemove(rows: CanvasObject[]) {
    if (!rows.length) return;
    undoStack.current = [...undoStack.current, { kind: "remove", rows } as UndoEntry].slice(-40);
    setCanUndo(true);
  }

  async function undoMine() {
    const entry = undoStack.current.pop();
    setCanUndo(undoStack.current.length > 0);
    if (!entry) return;
    if (entry.kind === "add") {
      const ids = entry.ids;
      setObjects((list) => list.filter((object) => !ids.includes(object.id)));
      setSelectedId(null);
      await supabase.from("canvas_objects").delete().in("id", ids);
      void channelRef.current?.send({ type: "broadcast", event: "erased", payload: { ids } });
      return;
    }
    const restored = entry.rows.map((row) => ({
      room_id: roomId,
      author: me.name,
      author_id: me.id,
      user_id: me.id,
      kind: row.kind,
      payload: row.payload as never,
    }));
    const { data } = await supabase
      .from("canvas_objects")
      .insert(restored)
      .select("id, author_id, kind, payload");
    if (data?.length) {
      const rows = data as unknown as CanvasObject[];
      setObjects((list) => [...list, ...rows.filter((row) => !list.some((o) => o.id === row.id))]);
      rememberAdd(rows.map((row) => row.id));
      undoStack.current.pop();
      setCanUndo(undoStack.current.length > 0);
    }
  }


  async function updateSelectedText(update: Partial<TextPayload>) {
    const selected = objects.find((object) => object.id === selectedId && object.kind === "text");
    if (!selected) return;
    const payload = { ...(selected.payload as TextPayload), ...update };
    setObjects((list) =>
      list.map((object) => (object.id === selected.id ? { ...object, payload } : object)),
    );
    await supabase.from("canvas_objects").update({ payload }).eq("id", selected.id);
  }

  async function toggleLockSelected() {
    const selected = objectsRef.current.find((object) => object.id === selectedId);
    if (!selected) return;
    const item = selected.payload as ImagePayload | TextPayload;
    const payload = { ...item, locked: !item.locked };
    setObjects((list) =>
      list.map((object) => (object.id === selected.id ? { ...object, payload } : object)),
    );
    await supabase.from("canvas_objects").update({ payload }).eq("id", selected.id);
  }

  async function deleteSelected() {
    const id = selectedId;
    if (!id) return;
    const children = objectsRef.current
      .filter((object) => (object.payload as StrokePayload).parent === id)
      .map((object) => object.id);
    setObjects((list) =>
      list.filter((object) => object.id !== id && !children.includes(object.id)),
    );
    setSelectedId(null);
    rememberRemove(
      objectsRef.current.filter(
        (object) => (object.id === id || children.includes(object.id)) && object.author_id === me.id,
      ),
    );
    await supabase
      .from("canvas_objects")
      .delete()
      .in("id", [id, ...children]);
    void channelRef.current?.send({ type: "broadcast", event: "erased", payload: { ids: [id, ...children] } });
  }

  function exportBoth() {
    exportChat(false);
    exportWhiteboard(undefined, false);
    void announceDownload("canvas and chat log");
  }

  async function toggleDoor() {
    const next = !locked;
    setLocked(next);
    const { error } = await supabase.from("rooms").update({ is_locked: next }).eq("id", roomId);
    if (error) setLocked(!next);
  }

  async function saveIdentity() {
    const color = /^#[0-9A-F]{6}$/i.test(pendingDraftColor.current)
      ? pendingDraftColor.current.toUpperCase()
      : me.color;
    const next = setIdentity({ name: draftName, color });
    setMe(next);
    setInkColor(color);
    setDraftColor(color);
    setIdentityOpen(false);
    await channelRef.current?.track({ id: next.id, name: next.name, color: next.color });
    await supabase
      .from("room_members")
      .update({ display_name: next.name, color: next.color })
      .eq("room_id", roomId)
      .eq("visitor_id", next.id);
  }

  async function startShred() {
    const round = crypto.randomUUID();
    shredGuard.current = false;
    shredRetries.current = 0;
    await supabase.from("shred_votes").delete().eq("room_id", roomId);
    setVotes([]);
    setShredExecuteAt(null);
    await supabase.from("rooms").update({ shred_round: round }).eq("id", roomId);
    setShredRound(round);
    await castVote(true, round);
  }

  async function castVote(agree: boolean, round = shredRound) {
    if (!round) return;
    const vote = { voter_id: me.id, voter_name: me.name, agree };
    setVotes((list) => (list.some((v) => v.voter_id === me.id) ? list : [...list, vote]));
    await supabase.from("shred_votes").insert({ room_id: roomId, round, user_id: me.id, ...vote });
  }

  // Present = me plus admitted members whose tab is live right now
  const admittedIds = useMemo(
    () => new Set(members.filter((member) => member.admitted).map((member) => member.visitor_id)),
    [members],
  );
  const presentIds = useMemo(() => {
    const ids = new Set<string>([me.id]);
    for (const peer of peers) if (peer.id !== me.id && admittedIds.has(peer.id)) ids.add(peer.id);
    return ids;
  }, [peers, admittedIds, me.id]);
  const presentCount = presentIds.size;
  const total = Math.max(presentCount, 1);
  const agreed = votes.filter((v) => v.agree).length;
  const refused = votes.some((v) => !v.agree);
  const myVote = votes.find((v) => v.voter_id === me.id);

  // Track when each admitted member dropped off, so the People list can
  // forget anyone who's been gone for more than a minute.
  const [awaySince, setAwaySince] = useState<Record<string, number>>({});
  const [awayNow, setAwayNow] = useState(() => Date.now());
  useEffect(() => {
    setAwaySince((prev) => {
      const next: Record<string, number> = {};
      const now = Date.now();
      for (const id of admittedIds) {
        if (presentIds.has(id)) continue;
        next[id] = prev[id] ?? now;
      }
      return next;
    });
  }, [admittedIds, presentIds]);
  useEffect(() => {
    const t = window.setInterval(() => setAwayNow(Date.now()), 5000);
    return () => window.clearInterval(t);
  }, []);

  // Safety net: while a vote is open, re-sync the vote state from the
  // database so the initiator's button always resets when the vote ends.
  useEffect(() => {
    if (!shredRound) return;
    const round = shredRound;
    const sync = async () => {
      const { data: room } = await supabase
        .from("rooms")
        .select("shred_round, shred_execute_at")
        .eq("id", roomId)
        .maybeSingle();
      if (!room) return;
      if (room.shred_round !== round) {
        setShredRound(room.shred_round);
        setVotes([]);
        setShredExecuteAt(room.shred_execute_at ? new Date(room.shred_execute_at).getTime() : null);
        return;
      }
      const { data: rows } = await supabase
        .from("shred_votes")
        .select("voter_id, voter_name, agree")
        .eq("room_id", roomId)
        .eq("round", round);
      if (rows) setVotes(rows as Vote[]);
      if (room.shred_execute_at) setShredExecuteAt(new Date(room.shred_execute_at).getTime());
    };
    const t = window.setInterval(() => void sync(), 2500);
    return () => window.clearInterval(t);
  }, [shredRound, roomId]);

  const cancelShred = useCallback(async () => {
    const round = shredRound;
    setShredRound(null);
    setVotes([]);
    setShredExecuteAt(null);
    if (round) {
      await supabase.rpc("cancel_room_shred", { _room_id: roomId, _round: round });
    }
  }, [roomId, shredRound]);

  async function executeShred() {
    keepSnapshot();
    if (!shredRound) return;
    const { data: shredded } = await supabase.rpc("execute_room_shred", {
      _room_id: roomId,
      _round: shredRound,
    });
    if (shredded) {
      setObjects([]);
      setShredRound(null);
      setVotes([]);
      setShredExecuteAt(null);
      flashBoard("shredded");
      channelRef.current?.send({ type: "broadcast", event: "shredded", payload: {} });
    }
  }

  useEffect(() => {
    if (!shredRound || shredGuard.current) return;
    if (refused) {
      shredGuard.current = true;
      void cancelShred();
      window.setTimeout(() => (shredGuard.current = false), 1000);
      return;
    }
    if (agreed >= total && !shredExecuteAt) {
      shredGuard.current = true;
      void supabase.rpc("schedule_room_shred", { _room_id: roomId, _round: shredRound }).then(({ data, error }) => {
        if (data) {
          shredRetries.current = 0;
          setShredExecuteAt(new Date(data).getTime());
          window.setTimeout(() => (shredGuard.current = false), 1000);
          return;
        }
        if (error) console.warn("schedule_room_shred", error.message);
        shredRetries.current += 1;
        if (shredRetries.current >= 6) {
          // Scheduling failed repeatedly — give up cleanly instead of hanging the vote.
          void cancelShred();
          window.setTimeout(() => (shredGuard.current = false), 1000);
          return;
        }
        // The confirming vote may not be visible to the database yet (solo shred);
        // release the guard and re-run the effect shortly.
        window.setTimeout(() => {
          shredGuard.current = false;
          setSchedTick((t) => t + 1);
        }, 1200);
      });
    }
  }, [shredRound, shredExecuteAt, agreed, refused, total, cancelShred, roomId, schedTick]);

  useEffect(() => {
    if (!shredExecuteAt || !shredRound) {
      setShredCooldown(0);
      return;
    }
    const tick = () => {
      const left = Math.max(0, Math.ceil((shredExecuteAt - Date.now()) / 1000));
      setShredCooldown(left);
      if (left === 0 && !shredGuard.current) {
        shredGuard.current = true;
        void executeShred().finally(() => {
          window.setTimeout(() => (shredGuard.current = false), 1000);
        });
      }
    };
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
    // executeShred reads the current round when the countdown reaches zero.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shredExecuteAt, shredRound]);

  // A fresh countdown restores the shred button's hit points.
  useEffect(() => {
    setShredHits(0);
  }, [shredExecuteAt, shredRound]);

  // Enough combined hits and the shred is called off for everyone.
  useEffect(() => {
    if (shredHits >= SHRED_HP && shredExecuteAt && shredRound && !shredGuard.current) {
      shredGuard.current = true;
      flashBoard("saved");
      void cancelShred().finally(() => {
        window.setTimeout(() => (shredGuard.current = false), 1000);
      });
    }
  }, [shredHits, shredExecuteAt, shredRound, cancelShred, flashBoard]);

  function hitShred() {
    setShredHits((n) => n + 1);
    channelRef.current?.send({ type: "broadcast", event: "shred_hit", payload: {} });
  }


  async function sendMessage(text: string) {
    await supabase.from("messages").insert({
      room_id: roomId,
      author: me.name,
      author_id: me.id,
      user_id: me.id,
      body: text.slice(0, 4000),
    });
  }

  async function knock() {
    if (knockCooldown) return;
    setKnockCooldown(5);
    const next = setIdentity({ name: draftName.trim() || me.name, color: draftColor });
    setMe(next);
    await supabase.from("room_members").update({ display_name: next.name, color: next.color }).eq("room_id", roomId).eq("visitor_id", next.id);
    const { error } = await supabase.from("room_knocks").upsert(
      {
        room_id: roomId,
        visitor_id: next.id,
        user_id: next.id,
        visitor_name: next.name,
        visitor_color: next.color,
        status: "pending",
      },
      { onConflict: "room_id,visitor_id" },
    );
    if (error) {
      setKnockCooldown(0);
      toast("That knock didn’t go through", { description: "Try knocking again." });
      return;
    }
    setKnockSent(true);
  }

  // After a decline: if the door is now open, just walk in; otherwise knock again.
  async function tryAgain() {
    const { error } = await supabase.from("room_knocks").update({ status: "pending" }).eq("room_id", roomId).eq("visitor_id", me.id);
    if (error) console.warn("knock again", error.message);
    window.location.reload();
  }

  async function answerKnock(visitorId: string, admit: boolean) {
    const target = knocks.find((item) => item.visitor_id === visitorId);
    if (!target?.user_id) return;
    await supabase.rpc("answer_room_knock", {
      _room_id: roomId,
      _user_id: target.user_id,
      _admit: admit,
    });
  }

  // Personal mute: hides that person's scribbles, images and chat for me only
  function toggleMute(member: Member) {
    setHiddenIds((current) =>
      current.includes(member.visitor_id)
        ? current.filter((id) => id !== member.visitor_id)
        : [...current, member.visitor_id],
    );
  }


  async function copyInvite() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 3000);
  }

  function downloadFile(content: BlobPart, name: string, type: string) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function exportChat(announce = true) {
    downloadFile(chatTranscript(), `napkin-${roomId}-chat.txt`, "text/plain;charset=utf-8");
    if (announce) void announceDownload("chat log");
  }

  function exportWhiteboard(dataUrl?: string, announce = true) {
    const url = dataUrl ?? snapshotUrl();
    if (!url) return;
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `napkin-${roomId}-whiteboard.png`;
    anchor.click();
    if (announce) void announceDownload("canvas");
  }

  async function announceDownload(item: "canvas" | "chat log" | "canvas and chat log") {
    await supabase.from("messages").insert({ room_id: roomId, author: "Napkin", author_id: me.id, user_id: me.id, body: `${me.name} downloaded the ${item}.` });
  }

  const time = useMemo(
    () =>
      [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60]
        .map((value) => String(value).padStart(2, "0"))
        .join(":"),
    [seconds],
  );
  const compactTime = useMemo(
    () =>
      [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60]
        .map((value) => String(value).padStart(2, "0"))
        .join(":"),
    [seconds],
  );

  if (status === "rescuing" && rescue) {
    return (
      <main className="mesh-background grid min-h-screen place-items-center px-5">
        <section className="glass-panel w-full max-w-md rounded-lg p-8 text-center">
          <img
            src="/favicon.png"
            alt=""
            className="mx-auto size-16 rounded-lg bg-background object-contain"
          />
          <h1 className="mt-5 text-3xl font-semibold">Time’s up</h1>
          <p className="mt-3 text-muted-foreground">
            This Napkin is gone. Download a local copy in the next {rescue.left} seconds.
          </p>
          <div className="mt-7 grid gap-2 sm:grid-cols-2">
            <Button
              onClick={() =>
                downloadFile(
                  rescue.transcript,
                  `napkin-${roomId}-chat.txt`,
                  "text/plain;charset=utf-8",
                )
              }
            >
              <Download /> Download chat
            </Button>
            <Button onClick={() => exportWhiteboard(rescue.url)}>
              <Download /> Download doodle
            </Button>
          </div>
        </section>
      </main>
    );
  }
  if (status === "expired") return <RoomExpired roomId={roomId} />;
  if (status === "closed") return <RoomExpired roomId={roomId} closed />;

  if (status === "waiting") {
    return (
      <main className="mesh-background grid min-h-screen place-items-center px-5">
        <section className="glass-panel w-full max-w-md rounded-lg p-8 text-center">
          <DoorClosed className="mx-auto size-7 text-primary" />
          <h1 className="mt-5 text-3xl font-semibold">The door is locked</h1>
          <p className="mt-3 text-muted-foreground">
            {knockSent
              ? "You knocked. Waiting for someone inside to let you in…"
              : "Knock to let everyone inside know you’re here."}
          </p>
          <div className="mt-6 space-y-4 text-left">
            <Input value={draftName} maxLength={24} onChange={(event) => setDraftName(event.target.value)} aria-label="Nickname at the door" placeholder="Your nickname" />
            <div className="flex flex-wrap justify-center gap-2">
              {CHAKRA_COLORS.map(({ name, value: color }) => (
                <Button key={color} type="button" variant="ghost" size="icon-sm" aria-label={`Use ${name} colour`} aria-pressed={draftColor === color} onClick={() => setDraftColor(color)} className={`rounded-full border-2 ${draftColor === color ? "border-foreground" : "border-transparent"}`}>
                  <span className="size-5 rounded-full" style={{ backgroundColor: color }} />
                </Button>
              ))}
            </div>
          </div>
          <Button
            className="mt-7 h-12 w-full rounded-full"
            disabled={knockCooldown > 0}
            onClick={() => void knock()}
          >
            {knockCooldown
              ? `Knock again in ${knockCooldown}s`
              : knockSent
                ? "Knock again"
                : "Knock to enter"}
          </Button>
        </section>
      </main>
    );
  }

  if (status === "rejected") {
    return (
      <main className="mesh-background grid min-h-screen place-items-center px-5">
        <section className="glass-panel w-full max-w-md rounded-lg p-8 text-center">
          <DoorClosed className="mx-auto size-7 text-muted-foreground" />
          <h1 className="mt-5 text-3xl font-semibold">They didn’t let you in</h1>
          <p className="mt-3 text-muted-foreground">Start your own Napkin and invite the people you want.</p>
          <Button className="mt-7 h-12 w-full rounded-full" onClick={() => void tryAgain()}>Knock again</Button>
          <Button variant="ghost" className="mt-2 h-11 w-full rounded-full" onClick={() => window.location.assign("/")}>Start your own Napkin</Button>
        </section>
      </main>
    );
  }

  if (status === "loading") {
    return (
      <main className="mesh-background grid min-h-screen place-items-center">
        <div className="glass-panel flex flex-col items-center gap-3 rounded-2xl px-8 py-7 text-sm text-muted-foreground">
          <NapkinDraw />
          <span>{isNewNapkin ? "Creating Napkin" : "Joining Napkin"}</span>
        </div>
      </main>
    );
  }

  return (
    <main className="mesh-background min-h-dvh px-2 pb-2 pt-2 sm:px-3 sm:pb-3 sm:pt-3">
      <div className="room-shell mx-auto flex w-full max-w-[1500px] flex-col gap-2 sm:gap-3">
        <header className="glass-panel relative flex h-11 shrink-0 items-center justify-between rounded-lg px-2 sm:h-12 sm:px-3">
          <Button
            variant={copied ? "default" : "ghost"}
            size="sm"
            onClick={copyInvite}
            className={`group gap-2 rounded-md px-2 font-mono text-xs sm:text-sm ${copied ? "copy-success" : ""}`}
            title="Copy Napkin link"
            aria-label="Copy Napkin link"
          >
            {copied ? <Link2 className="size-5" /> : <span className="relative size-6"><img src="/favicon.png" alt="" className="size-6 rounded bg-background object-contain transition-opacity group-hover:opacity-0" /><Copy className="absolute inset-1 size-4 opacity-0 transition-opacity group-hover:opacity-100" /></span>}
            {copied ? "Copied!" : roomId}
          </Button>
          <span role="status" className="sr-only">{copied ? "Napkin link copied" : ""}</span>
          <span
            role="timer"
            aria-label={`Time remaining ${compactTime}`}
            title="Time remaining"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md px-2 py-1 font-mono text-xs tabular-nums text-foreground sm:text-sm"
          >
            {compactTime}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPeopleOpen(true)}
              title="People in this Napkin"
              aria-label={`${presentCount} people in this Napkin`}
              className="relative gap-1.5 rounded-full px-2.5"
            >
              <Users className="size-4" />
              <span className="text-xs font-semibold">{presentCount}</span>
              {knocks.length > 0 && (
                <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                  {knocks.length}
                </span>
              )}
            </Button>
            <Button
              variant={chatOpen ? "default" : "ghost"}
              size="icon-sm"
              onClick={() => {
                setChatOpen((open) => !open);
                if (!chatOpen) setUnread(0);
              }}
              aria-label={chatOpen ? "Minimise chat" : unread > 0 ? `Open chat, ${unread} new messages` : "Open chat"}
              title={chatOpen ? "Minimise chat" : "Open chat"}
              className="relative rounded-full"
            >
              <MessageCircle className="size-4" />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 grid min-w-4 animate-pulse place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                  {unread}
                </span>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDraftName(me.name);
                setDraftColor(me.color);
                pendingDraftColor.current = me.color;
                setIdentityOpen(true);
              }}
              className="rounded-full bg-secondary"
            >
              <span
                className="size-3 rounded-full ring-1 ring-border"
                style={{ backgroundColor: me.color }}
                aria-hidden
              />
              <span className="grid size-4 place-items-center text-[10px] font-semibold sm:hidden">{me.name.trim().charAt(0).toUpperCase()}</span>
              <span className="hidden sm:inline">{me.name}</span>
            </Button>
          </div>
        </header>

        <div className="relative min-h-0 flex-1">
          <section
            ref={sectionRef}
            onDrop={onDrop}
            onDragOver={(event) => event.preventDefault()}
            className={`napkin-no-select board-tray-clear relative grid h-full min-w-0 items-center justify-items-center overflow-hidden pb-16 ${theme === "light" ? "board-surface-light" : "board-surface-dark"}`}
          >
            <div
              ref={boardRef}
              className={`relative origin-top-left overflow-hidden rounded-lg ${theme === "light" ? "board-frame-clean-light" : "board-frame-clean-dark"}`}
              style={{
                width: board.w || "100%",
                height: board.h || "100%",
                transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
                filter: `brightness(${BRIGHTNESS_LEVELS[brightnessIdx].value})`,
              }}
            >
              {gridMode !== "off" && <div
                className={`absolute inset-0 ${gridMode === "medium" ? "opacity-25" : "opacity-10"}`}
                style={{
                  color: "var(--board-control-bg)",
                  backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
                  backgroundSize: "22px 22px",
                }}
              />}
              <canvas
                ref={canvasRef}
                width={WIDTH}
                height={HEIGHT}
                onClick={(event) => {
                  if (tool !== "text") return;
                  const next = point(event, event.currentTarget.getBoundingClientRect());
                  setPendingText({ x: next.x, y: next.y, value: "" });
                }}
                onDoubleClick={() => tool === "select" && editSelectedText()}
                onPointerDown={startDrawing}
                onPointerMove={draw}
                onPointerUp={(event) => void endPointer(event)}
                onPointerCancel={(event) => void endPointer(event)}
                className={`absolute inset-0 size-full touch-none ${
                  tool === "draw"
                    ? eraseMode ? "cursor-cell" : "cursor-crosshair"
                    : tool === "text"
                      ? "cursor-text"

                      : tool === "select"
                        ? "cursor-grab"
                        : "cursor-move"
                }`}
                aria-label="Shared drawing canvas"
              />

              {pendingText && (
                <input
                  autoFocus
                  aria-label="Text box content"
                  value={pendingText.value}
                  onChange={(event) =>
                    setPendingText((state) =>
                      state ? { ...state, value: event.target.value } : state,
                    )
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void commitText();
                    if (event.key === "Escape") setPendingText(null);
                  }}
                  onBlur={() => void commitText()}
                  placeholder="Type, then press Enter"
                  className="absolute z-10 min-w-48 rounded-md border border-primary bg-background/95 px-2 py-1 shadow-xl outline-none"
                  style={{
                    left: `${pendingText.x * 100}%`,
                    top: `${pendingText.y * 100}%`,
                    fontSize: `${Math.max(14, textSize * (board.w / WIDTH))}px`,
                    fontFamily: textFont === "type" ? '"DM Sans", Inter, sans-serif' : 'Caveat, cursive',
                    lineHeight: 1.2,
                    color: readableInk(me.color, theme),
                  }}
                />
              )}

              {tool === "select" &&
                selectedId &&
                (() => {
                  const selected = objects.find((object) => object.id === selectedId);
                  if (!selected || selected.kind === "stroke") return null;
                  const payload = selected.payload as ImagePayload | TextPayload;
                  const frame = objectFrame(selected);
                  const isLocked = !!payload.locked;
                   const controlColor = readableInk(me.color, theme);
                   const controlForeground = onColor(controlColor);
                  return (
                    <div
                       className={`pointer-events-none absolute border-2 ${isLocked ? "border-dashed" : ""}`}
                      style={{
                        left: `${frame.x * 100}%`,
                        top: `${frame.y * 100}%`,
                        width: `${frame.w * 100}%`,
                        height: `${frame.h * 100}%`,
                        transform: `rotate(${frame.rotation}rad)`,
                         borderColor: controlColor,
                      }}
                    >
                      {!isLocked && (
                         <Button size="icon-sm" variant="secondary" aria-label="Delete selected" title="Delete" onClick={() => void deleteSelected()} className="selected-control pointer-events-auto absolute -left-4 -top-4 size-8 rounded-full [&_svg]:text-current" style={{ backgroundColor: controlColor, color: controlForeground, borderColor: controlForeground }}><X /></Button>
                      )}
                      {!isLocked && (
                         <Button size="icon-sm" variant="secondary" aria-label="Rotate selected" title="Drag to rotate" onPointerDown={(event) => handlePointerDown(event, "rotate")} onPointerMove={handlePointerMove} onPointerUp={() => void commitTransform()} onPointerCancel={() => void commitTransform()} className="selected-control pointer-events-auto absolute -right-4 -top-4 size-8 touch-none rounded-full [&_svg]:text-current" style={{ backgroundColor: controlColor, color: controlForeground, borderColor: controlForeground }}><RotateCw /></Button>
                      )}
                        <Button size="icon-sm" variant="secondary" aria-label="Lock or unlock selected" title={isLocked ? "Unlock" : "Lock"} onClick={() => void toggleLockSelected()} className="selected-control pointer-events-auto absolute -bottom-4 -left-4 size-8 rounded-full [&_svg]:text-current" style={{ backgroundColor: controlColor, color: controlForeground, borderColor: controlForeground }}>{isLocked ? <Lock /> : <LockOpen />}</Button>
                      {!isLocked && (
                         <span role="button" tabIndex={0} aria-label="Resize selected" title="Drag to resize" onPointerDown={(event) => handlePointerDown(event, "resize")} onPointerMove={handlePointerMove} onPointerUp={() => void commitTransform()} onPointerCancel={() => void commitTransform()} className="selected-control pointer-events-auto absolute -bottom-4 -right-4 grid size-8 cursor-nwse-resize touch-none place-items-center rounded-full [&_svg]:text-current" style={{ backgroundColor: controlColor, color: controlForeground, borderColor: controlForeground }}><Maximize2 className="size-4" /></span>
                      )}
                    </div>
                  );
                })()}

              {uploading && (
                <div className="glass-panel absolute right-4 top-4 flex items-center gap-2 rounded-full px-3 py-2 text-xs">
                  <Loader2 className="size-3.5 animate-spin text-primary" /> Uploading image…
                </div>
              )}

              {peers
                .filter((peer) => peer.id !== me.id && peer.x != null && peer.y != null)
                .map((peer) => (
                  <div
                    key={peer.id}
                    className="pointer-events-none absolute flex items-start gap-1 text-xs font-semibold"
                    style={{
                      left: `${(peer.x ?? 0) * 100}%`,
                      top: `${(peer.y ?? 0) * 100}%`,
                    }}
                  >
                    <MousePointer2
                      className="size-4"
                      style={{
                        fill: readableInk(peer.color, theme),
                        color: readableInk(peer.color, theme),
                      }}
                    />
                    <span
                      className="rounded-full px-1.5 py-0.5"
                      style={{
                        backgroundColor: readableInk(peer.color, theme),
                        color: onColor(readableInk(peer.color, theme)),
                      }}
                    >
                      {peer.name}
                    </span>
                  </div>
                ))}
              {peers
                .filter((peer) => peer.id !== me.id && peer.view && ((peer.view?.w ?? 1) < 0.99 || (peer.view?.h ?? 1) < 0.99))
                .map((peer) => (
                  <div key={`view-${peer.id}`} className="pointer-events-none absolute border-2 border-dashed" style={{ left: `${(peer.view?.x ?? 0) * 100}%`, top: `${(peer.view?.y ?? 0) * 100}%`, width: `${(peer.view?.w ?? 1) * 100}%`, height: `${(peer.view?.h ?? 1) * 100}%`, borderColor: readableInk(peer.color, theme) }} title={`${peer.name}'s view`} />
                ))}
            </div>

            {/* What just happened: the board gets sliced, or the save is celebrated */}
            {boardFx === "shredded" && (
              <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={index}
                    className="absolute top-0 h-full bg-destructive/30"
                    style={{
                      left: `${index * 12.5}%`,
                      width: "12.5%",
                      animation: `shred-slice 0.75s ${index * 0.04}s cubic-bezier(0.4, 0, 1, 1) forwards`,
                    }}
                  />
                ))}
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-[fade-out_1.1s_0.3s_ease-out_forwards] text-sm font-semibold uppercase tracking-[0.3em] text-destructive">
                  Shredded
                </span>
              </div>
            )}
            {boardFx === "saved" && (
              <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center">
                <div className="flex animate-[saved-pop_1.2s_ease-out_forwards] flex-col items-center gap-2 rounded-2xl border border-emerald-400/60 bg-emerald-400/15 px-6 py-5 text-emerald-300 backdrop-blur-sm">
                  <ShieldCheck className="size-9" />
                  <span className="text-xs font-semibold uppercase tracking-[0.2em]">Saved</span>
                </div>
              </div>
            )}


            {/* Shred in progress: vote or countdown, floating over the board top */}
            {(shredRound || shredCooldown > 0) && (
              <div className="board-control absolute left-1/2 top-3 z-20 flex max-w-[calc(100%-1rem)] -translate-x-1/2 items-center gap-1.5 rounded-full py-1.5 pl-2 pr-2">
                {shredCooldown > 0 ? (
                  <>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={hitShred}
                      className="gap-1.5 rounded-full font-mono tabular-nums transition-transform active:scale-90"
                      title={`Shredding in ${shredCooldown}s — bash to stop it`}
                      aria-label={`Shredding in ${shredCooldown} seconds. Press repeatedly to stop it.`}
                    >
                      <Trash2 className="size-4" />
                      <span>{shredCooldown}</span>
                    </Button>
                    <div
                      className="h-1.5 w-16 overflow-hidden rounded-full bg-destructive/20"
                      role="progressbar"
                      aria-label="Shred resistance"
                      aria-valuemin={0}
                      aria-valuemax={SHRED_HP}
                      aria-valuenow={Math.max(0, SHRED_HP - shredHits)}
                    >
                      <div
                        key={shredHits}
                        className="h-full animate-[hp-chip_0.2s_ease-out] rounded-full bg-destructive transition-[width] duration-200 ease-out"
                        style={{ width: `${(Math.max(0, SHRED_HP - shredHits) / SHRED_HP) * 100}%` }}
                      />
                    </div>
                  </>
                ) : myVote ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void cancelShred()}
                    className="knock-pulse rounded-full text-destructive hover:text-destructive"
                    title="Vote in progress — tap to call it off"
                    aria-label="Shred vote in progress. Tap to call it off."
                  >
                    <Trash2 className="size-4" />
                    <span className="hidden sm:inline">Shred vote — tap to call it off</span>
                  </Button>
                ) : (
                  <>
                    <span className="whitespace-nowrap px-1 text-xs font-medium">Shred this Napkin?</span>
                    <Button variant="ghost" size="icon-sm" className="rounded-full text-destructive hover:text-destructive" onClick={() => void castVote(true)} title="Vote to shred" aria-label="Vote to shred"><Check className="size-4" /></Button>
                    <Button variant="ghost" size="icon-sm" className="rounded-full" onClick={() => void castVote(false)} title="Vote to keep" aria-label="Vote to keep"><X className="size-4" /></Button>
                  </>
                )}
                {shredRound && !shredExecuteAt && (
                  <span className="flex gap-1.5 pr-1 font-mono text-[10px] tabular-nums leading-none opacity-80" aria-label={`${agreed} yes, ${votes.length - agreed} no, of ${total}`}>
                    <span className="text-destructive">✓{agreed}</span>
                    <span>✗{votes.length - agreed}</span>
                    <span>/{total}</span>
                  </span>
                )}
              </div>
            )}

            {helpOpen && <NapkinHelp onClose={closeHelp} />}
            {/* One floating white pill carries the everyday tools; the rest live in ••• */}
            <div className="absolute bottom-3 left-1/2 flex max-w-[calc(100%-1rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-full bg-white p-1.5 text-neutral-900 shadow-2xl ring-1 ring-black/10 sm:bottom-4 [&_button]:shrink-0" role="toolbar" aria-label="Drawing tools">
              {([
                { id: "select", Icon: MousePointer2, label: "Pointer" },
                { id: "draw", Icon: Pencil, label: "Pen" },
                { id: "text", Icon: Type, label: "Text" },
              ] as const).map(({ id, Icon, label }) => {
                const active = tool === id;
                return (
                  <Button
                    key={id}
                    variant={active ? "default" : "ghost"}
                    size="icon"
                    title={active ? `${label} (tap to put down)` : label}
                    aria-label={label}
                    aria-pressed={active}
                    onClick={() => {
                      if (active) {
                        setTool(null);
                        setSelectedId(null);
                      } else {
                        setTool(id);
                      }
                    }}
                    className={active ? "rounded-full" : "rounded-full text-neutral-600 hover:bg-neutral-900/5 hover:text-neutral-900"}
                  >
                    <Icon />
                  </Button>
                );
              })}
              <Popover open={templatesOpen} onOpenChange={setTemplatesOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Add a picture or a framework"
                    aria-label="Add a picture or a framework"
                    className="rounded-full text-neutral-600 hover:bg-neutral-900/5 hover:text-neutral-900"
                  >
                    <Upload />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="center" side="top" className="w-[19rem] p-3 sm:w-[26rem]">
                  <label className="mb-3 flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-foreground/5">
                    <Upload className="size-4" />
                    Upload a picture or GIF
                    <input
                      type="file"
                      accept="image/*,.gif"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        setTemplatesOpen(false);
                        if (file) void uploadImage(file, { x: 0.5, y: 0.5 });
                      }}
                    />
                  </label>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    Frameworks
                  </p>
                  <div className="grid max-h-[16rem] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
                    {BOARD_TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => void placeTemplate(template)}
                        className="rounded-md border border-border p-2 text-left transition hover:border-primary hover:bg-foreground/5"
                        title={template.blurb}
                      >
                        <span
                          aria-hidden
                          className="mb-1.5 block h-14 w-full bg-contain bg-center bg-no-repeat opacity-80"
                          style={{
                            backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(templateSvg(template, "#9aa3b8"))}")`,
                          }}
                        />
                        <span className="block text-xs font-semibold leading-tight">{template.name}</span>
                        <span className="mt-0.5 block text-[10px] leading-tight text-muted-foreground">
                          {template.blurb}
                        </span>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                variant="ghost"
                size="icon"
                disabled={!canUndo}
                onClick={() => void undoMine()}
                title="Undo my last change"
                aria-label="Undo my last change"
                className="rounded-full text-neutral-600 hover:bg-neutral-900/5 hover:text-neutral-900 disabled:opacity-40"
              >
                <Undo2 />
              </Button>
              <span aria-hidden className="mx-0.5 w-px self-stretch bg-neutral-900/15" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="More room options"
                    aria-label="More room options"
                    className="rounded-full text-neutral-600 hover:bg-neutral-900/5 hover:text-neutral-900"
                  >
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="top" sideOffset={10} className="w-60">
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault();
                      setBrightnessIdx((idx) => (idx + 1) % BRIGHTNESS_LEVELS.length);
                    }}
                  >
                    <SunDim /> Brightness · {BRIGHTNESS_LEVELS[brightnessIdx].label}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault();
                      void cycleGrid();
                    }}
                  >
                    <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <circle cx="6" cy="6" r="2" /><circle cx="12" cy="6" r="2" /><circle cx="18" cy="6" r="2" />
                      <circle cx="6" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="18" cy="12" r="2" />
                      <circle cx="6" cy="18" r="2" /><circle cx="12" cy="18" r="2" /><circle cx="18" cy="18" r="2" />
                    </svg>
                    Grid · {gridMode === "off" ? "Off" : gridMode === "light" ? "Light" : "Dense"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => void toggleTheme()}>
                    {theme === "dark" ? <Sun /> : <Moon />} Board · {theme === "dark" ? "Black" : "White"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => (knocks.length > 0 ? setPeopleOpen(true) : void toggleDoor())}
                  >
                    {locked ? <DoorClosed /> : <DoorOpen />}
                    {knocks.length > 0
                      ? `${knocks.length} at the door`
                      : locked
                        ? "Unlock the door"
                        : "Lock the door"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Download /> Export
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onSelect={() => exportChat()}>
                        <MessageCircle /> Chat
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => exportWhiteboard()}>
                        <Pencil /> Drawing
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => exportBoth()}>
                        <Download /> Both
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuItem onSelect={() => setHelpOpen(true)}>
                    <CircleHelp /> Guide
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setLeaveOpen(true)}>
                    <LogOut /> Leave room
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => {
                      if (shredCooldown > 0) hitShred();
                      else if (shredRound && myVote) void cancelShred();
                      else if (!shredRound) void startShred();
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 />
                    {shredCooldown > 0
                      ? `Shredding in ${shredCooldown}s — bash to stop it`
                      : shredRound
                        ? "Shred vote in progress"
                        : "Shred this Napkin"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                className="rounded-full text-neutral-600 hover:bg-neutral-900/5 hover:text-neutral-900"
              >
                {isFullscreen ? <Minimize2 /> : <Maximize2 />}
              </Button>
            </div>

            {tool === "draw" && (
              <div className="board-control absolute bottom-[4.25rem] left-1/2 flex -translate-x-1/2 gap-1 rounded-md p-1.5">
                {[
                  { label: "Small pen", value: 3, dot: "size-1.5" },
                  { label: "Medium pen", value: 7, dot: "size-2.5" },
                  { label: "Large pen", value: 14, dot: "size-4" },
                ].map((size) => (
                  <Button
                    key={size.value}
                    variant={!eraseMode && penWidth === size.value ? "default" : "ghost"}
                    size="icon"
                    onClick={() => { setPenWidth(size.value); setEraseMode(null); }}
                    className="rounded-md"
                    title={size.label}
                    aria-label={size.label}
                    aria-pressed={penWidth === size.value}
                  >
                    <span aria-hidden className={`${size.dot} rounded-full bg-current`} />
                  </Button>
                ))}
                <span aria-hidden className="mx-0.5 w-px self-stretch bg-current opacity-20" />
                <label
                  className="relative grid size-9 cursor-pointer place-items-center rounded-md hover:bg-foreground/10"
                  title="Pen colour"
                >
                  <span
                    aria-hidden
                    className="size-5 rounded-full border-2 border-current shadow-sm"
                    style={{ backgroundColor: inkColor }}
                  />
                  <span className="sr-only">Choose pen colour</span>
                  <input
                    key={inkColor}
                    type="color"
                    defaultValue={inkColor}
                    ref={(element) => {
                      if (!element || element.dataset["bound"]) return;
                      element.dataset["bound"] = "1";
                      element.addEventListener("change", () => setInkColor(element.value.toUpperCase()));
                    }}
                    aria-label="Choose pen colour"
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </label>
                <span aria-hidden className="mx-0.5 w-px self-stretch bg-current opacity-20" />
                <Button
                  variant={eraseMode ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setEraseMode((mode) => (mode === null ? "stroke" : mode === "stroke" ? "partial" : null))}
                  className="relative rounded-md"
                  title={eraseMode === "partial" ? "Eraser: rub out part of your line" : eraseMode === "stroke" ? "Eraser: remove your whole line" : "Eraser (your ink only)"}
                  aria-label={eraseMode === "partial" ? "Eraser, partial. Tap to turn off" : eraseMode === "stroke" ? "Eraser, whole line. Tap for partial" : "Eraser"}
                  aria-pressed={!!eraseMode}
                >
                  {eraseMode === "partial" ? <Scissors /> : <Eraser />}
                </Button>
              </div>
            )}

            {tool === "text" && (
              <div className="board-control absolute bottom-[4.25rem] left-1/2 flex -translate-x-1/2 gap-1 rounded-md p-1.5">
                <Button variant={textFont === "sketch" ? "default" : "ghost"} size="icon" onClick={() => setTextFont("sketch")} title="Sketch (handwritten)" aria-label="Sketch, handwritten text" aria-pressed={textFont === "sketch"} className="rounded-md"><PenLine /></Button>
                <Button variant={textFont === "type" ? "default" : "ghost"} size="icon" onClick={() => setTextFont("type")} title="Type (typed out)" aria-label="Type, typed text" aria-pressed={textFont === "type"} className="rounded-md"><Type /></Button>
              </div>
            )}

            <div className="absolute bottom-4 right-4 flex gap-1">
              {(view.scale !== 1 || view.x !== 0 || view.y !== 0) && (
                <Button variant="ghost" size="icon" className="board-control rounded-md [&_svg]:text-current" onClick={() => setCanvasView({ scale: 1, x: 0, y: 0 })} title="Return to normal view" aria-label="Return to normal view"><Maximize2 /></Button>
              )}
            </div>


            <div className="absolute inset-x-3 bottom-14 flex min-h-8 items-center justify-center gap-2 text-xs">
              {knocks.length > 0 && <Button type="button" variant="ghost" size="sm" onClick={() => setPeopleOpen(true)} className="board-control rounded-md [&_svg]:text-current"><strong>{knocks.length}</strong> at the door</Button>}
            </div>
          </section>


            <aside
              className={`glass-panel-solid fixed inset-x-3 bottom-3 z-40 max-h-[62dvh] min-h-0 animate-[sheet-up_0.4s_cubic-bezier(0.32,0.72,0,1)] flex-col overflow-hidden rounded-lg shadow-2xl lg:inset-x-auto lg:right-3 lg:top-[4.25rem] lg:bottom-3 lg:max-h-none lg:w-[340px] lg:animate-none ${chatOpen ? "flex" : "hidden"}`}
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2 font-semibold"><MessageCircle className="size-4" /> Chat</div>
                <div className="flex items-center gap-2">
                  <span className="hidden text-xs text-muted-foreground xl:inline">#{roomId}</span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="lg:hidden"
                    onClick={() => setChatOpen(false)}
                    aria-label="Close chat"
                    title="Close chat"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
            <div className="min-h-0 flex-1 overflow-y-auto" role="log">
              <div className="flex flex-col gap-5 p-4">
                {messages.length === 0 && (
                  <p className="pt-6 text-center text-sm text-muted-foreground sm:text-xs">
                    Be the first to say something.
                  </p>
                )}
                {messages
                  .filter((message) => !message.author_id || !hiddenIds.includes(message.author_id))
                  .map((message) => {
                    const mine = message.author === me.name;
                    return (
                      <Message
                        key={message.id}
                        from={mine ? "user" : "assistant"}
                        className="gap-1"
                      >
                        <div
                          className={`flex items-center gap-2 text-xs text-muted-foreground sm:text-[11px] ${mine ? "justify-end" : ""}`}
                        >
                          <span
                            aria-hidden
                            className="size-2.5 shrink-0 rounded-full ring-1 ring-border"
                            style={{ backgroundColor: authorColor(message) }}
                          />
                          <span>{message.author}</span>
                          <span>{formatTime(message.created_at)}</span>
                        </div>
                        <MessageContent
                          className={
                             mine
                               ? "bg-primary text-primary-foreground text-base sm:text-sm"
                               : "rounded-md bg-secondary px-3 py-2.5 text-base sm:text-sm"
                          }
                        >
                          <MessageResponse>{message.body}</MessageResponse>
                        </MessageContent>
                      </Message>
                    );
                  })}
              </div>
            </div>
            <div className="border-t border-border p-3">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const text = chatDraft.trim();
                  if (!text) return;
                  setChatDraft("");
                  void sendMessage(text);
                }}
                className="flex items-end gap-2 rounded-lg border border-border bg-secondary p-2"
              >
                <textarea
                  value={chatDraft}
                  onChange={(event) => setChatDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  placeholder={`${me.name} says…`}
                  maxLength={4000}
                  rows={2}
                  aria-label="Message"
                  className="min-h-14 flex-1 resize-none bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-sm"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="rounded-lg"
                  disabled={!chatDraft.trim()}
                  aria-label="Send message"
                >
                  <Send className="size-4" />
                </Button>
              </form>
            </div>
            </aside>
        </div>
      </div>

      {identityOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
          onClick={() => setIdentityOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Presence"
            className="glass-panel m-3 flex w-full max-w-sm animate-[card-in_0.4s_cubic-bezier(0.32,0.72,0,1)] flex-col gap-4 rounded-2xl p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Presence</h2>
                <p className="text-sm text-muted-foreground">
                  Pick your nickname and colour.
                  This is how others see you in this Napkin.
                </p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => setIdentityOpen(false)} aria-label="Close" className="rounded-md"><X /></Button>
            </div>
          <Input
            value={draftName}
            maxLength={24}
            onChange={(event) => setDraftName(event.target.value)}
            aria-label="Display name"
            placeholder="Your name"
          />
          <div className="flex flex-wrap gap-2">
            {CHAKRA_COLORS.map(({ name, value: color }) => (
              <button
                key={color}
                type="button"
                aria-label={`Use ${name} colour`}
                title={name}
                onClick={() => {
                  pendingDraftColor.current = color;
                  setDraftColor(color);
                }}
                className={`size-8 rounded-full border-2 ring-1 ring-border ${draftColor === color ? "border-foreground" : "border-transparent"}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="grid grid-cols-[2.5rem_1fr] items-center gap-2">
            <input
              type="color"
              defaultValue={/^#[0-9a-f]{6}$/i.test(draftColor) ? draftColor : (CHAKRA_COLORS[0].value)}
              onInput={(event) => {
                pendingDraftColor.current = event.currentTarget.value.toUpperCase();
              }}
              onBlur={(event) => setDraftColor(event.currentTarget.value.toUpperCase())}
              aria-label="Choose a custom colour"
              className="h-10 w-10 cursor-pointer rounded-md border border-input bg-background p-1"
            />
            <Input
              value={draftColor}
              onChange={(event) => {
                const value = event.target.value.toUpperCase();
                if (/^#?[0-9A-F]{0,6}$/.test(value)) {
                  setDraftColor(value.startsWith("#") ? value : `#${value}`);
                  pendingDraftColor.current = value.startsWith("#") ? value : `#${value}`;
                }
              }}
              onBlur={() => {
                if (!/^#[0-9A-F]{6}$/.test(draftColor)) {
                  pendingDraftColor.current = me.color;
                  setDraftColor(me.color);
                }
              }}
              maxLength={7}
              aria-label="Custom colour hex value"
              placeholder="#8B7CF6"
              className="font-mono uppercase"
            />
          </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIdentityOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void saveIdentity()}>Save</Button>
            </div>
          </div>
        </div>
      )}

      {peopleOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setPeopleOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="People in this Napkin"
            className="glass-panel flex max-h-[75vh] w-full max-w-md animate-[sheet-up_0.4s_cubic-bezier(0.32,0.72,0,1)] flex-col gap-4 overflow-y-auto rounded-t-2xl p-5 pb-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto h-1 w-10 rounded-full bg-foreground/20" aria-hidden />
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">People in this Napkin</h2>
                <p className="text-sm text-muted-foreground">
                  Everyone here and their colour. Hiding someone only affects your own view.
                </p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => setPeopleOpen(false)} aria-label="Close" className="rounded-md"><X /></Button>
            </div>
          {knocks.length > 0 && (
            <div className="space-y-2 border-b border-border pb-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">At the door</p>
              {knocks.map((knock) => (
                <div
                  key={knock.visitor_id}
                  className="flex items-center justify-between gap-3 rounded-md bg-secondary p-3"
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm font-medium"><span className="grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold" style={{ backgroundColor: knock.visitor_color, color: onColor(knock.visitor_color) }}>{knock.visitor_name.trim().charAt(0).toUpperCase()}</span><span className="truncate">{knock.visitor_name}</span></span>
                  <div className="flex gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => void answerKnock(knock.visitor_id, false)}
                      aria-label={`Decline ${knock.visitor_name}`}
                      title="Decline"
                    >
                      <X />
                    </Button>
                    <Button size="icon-sm" onClick={() => void answerKnock(knock.visitor_id, true)} aria-label={`Invite ${knock.visitor_name} in`} title="Invite in">
                      <Check />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {members
              .filter((member) => member.admitted)
              .filter((member) => {
                if (presentIds.has(member.visitor_id)) return true;
                const since = awaySince[member.visitor_id];
                return since !== undefined && awayNow - since < 60_000;
              })
              .map((member) => {
                const hidden = hiddenIds.includes(member.visitor_id);
                const online = presentIds.has(member.visitor_id);
                return (
                  <div
                    key={member.visitor_id}
                    className="flex items-center justify-between rounded-md bg-secondary px-3 py-2"
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <span
                        className="size-2.5 rounded-full ring-1 ring-border"
                        style={{ backgroundColor: member.color }}
                      />
                      <span className={hidden ? "text-muted-foreground line-through" : ""}>
                        {member.display_name}
                        {member.visitor_id === me.id ? " (you)" : ""}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {online ? "this screen" : "away"}
                      </span>
                    </span>
                    {member.visitor_id !== me.id && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => toggleMute(member)}
                        title={hidden ? "Show their contributions" : "Hide their contributions"}
                        aria-label={
                          hidden ? `Show ${member.display_name}` : `Hide ${member.display_name}`
                        }
                      >
                        {hidden ? <EyeOff /> : <Eye />}
                      </Button>
                    )}
                  </div>
                );
              })}
          </div>
          </div>
        </div>
      )}

      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this Napkin?</AlertDialogTitle>
            <AlertDialogDescription>The Napkin keeps going for everyone else. You can come back with the code until it expires.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction onClick={() => window.location.assign("/")}>Leave</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </main>
  );
}
