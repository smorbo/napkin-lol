import { Link } from "@tanstack/react-router";
import { Clock3, DoorOpen, FilePenLine, House } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RoomExpired({ roomId, closed = false }: { roomId: string; closed?: boolean }) {
  return (
    <main className="mesh-background mesh-animated grid min-h-screen place-items-center px-5 py-10">
      <section className="glass-panel w-full max-w-md rounded-2xl p-8 text-center">
        <div className="relative mx-auto mb-6 size-14">
          <img
            src="/favicon.png"
            alt=""
            className="size-14 rounded-lg bg-background object-contain"
          />
          <Clock3 className="absolute -bottom-1 -right-1 size-5 rounded-full bg-background p-0.5 text-primary" />
        </div>
        <h1 className="text-3xl font-semibold">{closed ? "Napkin wrapped up" : "Napkin expired"}</h1>
        <p className="mt-3 text-balance leading-relaxed text-muted-foreground">
          {closed
            ? "Everyone agreed the work was done. Nothing is lost — you can walk straight back in until this Napkin expires."
            : "This Napkin has vanished. Napkins self-destruct 24 hours after they are created, so nothing is left behind."}
        </p>
        {roomId && (
          <p className="mt-4 rounded-md bg-secondary px-3 py-2 font-mono text-xs text-muted-foreground">
            #{roomId}
          </p>
        )}
        {closed && (
          <Button
            size="lg"
            className="mt-7 h-12 w-full rounded-full"
            onClick={() => window.location.reload()}
          >
            <DoorOpen className="size-4" /> Go back in
          </Button>
        )}
        <Button
          asChild
          size="lg"
          className={`${closed ? "mt-2" : "mt-7"} h-12 w-full rounded-full bg-secondary text-foreground hover:bg-accent`}
        >
          <Link to="/">
            <FilePenLine className="size-4" /> Create a fresh Napkin
          </Link>
        </Button>
        <Button asChild variant="ghost" size="lg" className="mt-2 h-12 w-full rounded-full">
          <Link to="/">
            <House className="size-4" /> Go Home
          </Link>
        </Button>
      </section>
    </main>
  );
}
