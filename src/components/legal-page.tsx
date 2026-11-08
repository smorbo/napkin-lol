import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <main className="mesh-background min-h-screen px-5 py-6 sm:px-8">
      <nav className="mx-auto flex w-full max-w-3xl items-center justify-between">
        <Link to="/" className="flex items-center gap-3 font-semibold text-foreground">
          <img
            src="/favicon.png"
            alt=""
            className="size-9 rounded-md border border-border bg-background object-contain p-1"
          />
          Napkin
        </Link>
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back home
        </Link>
      </nav>
      <article className="mx-auto max-w-3xl pb-20 pt-20">
        <p className="text-sm text-primary">Legal</p>
        <h1 className="mt-3 text-4xl font-semibold sm:text-6xl">{title}</h1>
        <p className="mt-4 text-sm text-muted-foreground">Last updated {updated}</p>
        <div className="mt-12 space-y-9 text-base leading-7 text-muted-foreground [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_p+p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
          {children}
        </div>
      </article>
    </main>
  );
}
