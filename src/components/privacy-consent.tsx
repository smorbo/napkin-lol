import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const CONSENT_KEY = "napkin-privacy-choice";

export function PrivacyConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(window.localStorage.getItem(CONSENT_KEY) === null);
  }, []);

  function choose(choice: "all" | "essential") {
    window.localStorage.setItem(CONSENT_KEY, choice);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <aside
      aria-label="Privacy choices"
      className="glass-panel privacy-glass fixed inset-x-4 bottom-4 z-50 mx-auto max-w-3xl rounded-lg p-4 sm:flex sm:items-center sm:gap-5 sm:p-5"
    >
      <img
        src="/favicon.png"
        alt=""
        className="mb-3 size-9 shrink-0 rounded-md border border-border bg-background object-contain p-1 sm:mb-0"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">Your privacy, your choice</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
          Napkin uses essential browser storage to remember your Napkin identity and choices.
          Optional usage data helps improve the tool. Read our{" "}
          <Link to="/privacy" className="text-foreground underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
      <div className="mt-4 flex shrink-0 gap-2 sm:mt-0">
        <Button size="sm" variant="outline" onClick={() => choose("essential")}>
          Essential only
        </Button>
        <Button size="sm" onClick={() => choose("all")}>
          Accept all
        </Button>
      </div>
    </aside>
  );
}
