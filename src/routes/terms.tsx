import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Napkin" },
      {
        name: "description",
        content: "The terms for using temporary Napkins.",
      },
      { property: "og:title", content: "Terms of Service — Napkin" },
      {
        property: "og:description",
        content: "The terms for using temporary Napkins.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://napkin.lol/terms" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: "https://napkin.lol/og-image.png" },
      { name: "twitter:image", content: "https://napkin.lol/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://napkin.lol/terms" }],
  }),
  component: Terms,
});

function Terms() {
  return (
    <LegalPage title="Terms of Service" updated="22 September 2026">
      <section>
        <h2>Using Napkin</h2>
        <p>
          Napkin provides temporary shared canvases for drawing, messaging, planning, and sharing
          files. By using the service, you agree to these terms. If you do not agree, do not use
          Napkin.
        </p>
      </section>
      <section>
        <h2>Temporary by design</h2>
        <p>
          Napkins are designed to expire 24 hours after creation and may be shredded or closed
          sooner by participants. Do not use Napkin as permanent storage. Save anything you need
          before the Napkin disappears. We cannot recover deleted content.
        </p>
      </section>
      <section>
        <h2>Your responsibilities</h2>
        <ul>
          <li>Only upload or share content you have the right to use.</li>
          <li>
            Do not use Napkin for illegal, harmful, abusive, deceptive, or privacy-invasive
            activity.
          </li>
          <li>
            Do not attempt to disrupt, probe, reverse engineer, or bypass the service’s security or
            access controls.
          </li>
          <li>
            Treat Napkin codes as private links and share them only with intended participants.
          </li>
        </ul>
      </section>
      <section>
        <h2>Content and collaboration</h2>
        <p>
          You retain ownership of your content. You grant Napkin a limited permission to process and
          display it only as needed to operate the service. Anyone admitted to a Napkin may view,
          change, export, mute, shred, or close shared work using the controls available to them.
        </p>
      </section>
      <section>
        <h2>Availability and changes</h2>
        <p>
          Napkin is provided on an “as available” basis. Features may change, pause, or end without
          notice. We may restrict access when necessary to protect users, comply with law, or
          maintain the service.
        </p>
      </section>
      <section>
        <h2>Disclaimers and liability</h2>
        <p>
          To the extent permitted by law, Napkin is provided without warranties of uninterrupted
          availability, fitness for a particular purpose, or preservation of content. We are not
          liable for lost Napkin content, lost exports, participant actions, or indirect damages.
          Nothing in these terms limits rights or liability that cannot legally be limited.
        </p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>
          Questions about these terms can be sent through{" "}
          <a
            href="https://arman.life"
            target="_blank"
            rel="noreferrer"
            className="text-foreground underline underline-offset-2"
          >
            arman.life
          </a>
          .
        </p>
      </section>
    </LegalPage>
  );
}
