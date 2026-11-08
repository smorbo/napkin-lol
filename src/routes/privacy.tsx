import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Napkin" },
      {
        name: "description",
        content: "How Napkin handles shared content, browser storage, and privacy.",
      },
      { property: "og:title", content: "Privacy Policy — Napkin" },
      {
        property: "og:description",
        content: "How Napkin handles shared content, browser storage, and privacy.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://napkin.lol/privacy" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: "https://napkin.lol/og-image.png" },
      { name: "twitter:image", content: "https://napkin.lol/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://napkin.lol/privacy" }],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated="22 September 2026">
      <section>
        <h2>Napkin is built to forget</h2>
        <p>
          Napkin is a zero-account collaboration tool. You can create or join a Napkin without
          providing a name, email address, or password. Each Napkin and its contents are scheduled
          for deletion 24 hours after creation.
        </p>
      </section>
      <section>
        <h2>Information we process</h2>
        <ul>
          <li>
            Napkin content you choose to add, including messages, drawings, text, and uploaded
            images.
          </li>
          <li>
            A temporary display name, colour, Napkin membership identifier, and Napkin code used to
            support collaboration.
          </li>
          <li>
            Basic technical data required to operate and protect the service, such as request times,
            browser type, and network address.
          </li>
        </ul>
      </section>
      <section>
        <h2>Why we process it</h2>
        <p>
          We process this information to deliver live collaboration, admit people to locked Napkins,
          prevent misuse, maintain security, and keep the service reliable. Where optional usage
          measurement is enabled, we rely on your consent.
        </p>
      </section>
      <section>
        <h2>Storage and deletion</h2>
        <p>
          Napkin data is hosted in our managed cloud infrastructure and is automatically scheduled
          for deletion after 24 hours. If participants shred or close a Napkin earlier, deletion may
          happen sooner. Short-lived operational backups or security logs may persist only as
          necessary for reliability, fraud prevention, or legal obligations.
        </p>
        <p>
          Exports are downloaded directly to your device. You control those downloaded copies, and
          Napkin cannot delete them.
        </p>
      </section>
      <section>
        <h2>Browser storage and cookies</h2>
        <p>
          Napkin uses essential browser storage to remember your temporary identity, session state,
          and privacy choice. Optional measurement is used only if you choose “Accept all.” You can
          clear stored choices through your browser settings.
        </p>
      </section>
      <section>
        <h2>Sharing and international processing</h2>
        <p>
          Napkin content is shared with people who have access to your Napkin. We use service
          providers to host and secure Napkin and do not sell personal information. Processing may
          occur outside your country with appropriate safeguards.
        </p>
      </section>
      <section>
        <h2>Your rights</h2>
        <p>
          Depending on where you live, you may request access, correction, deletion, restriction,
          portability, or object to processing. Because Napkin has no accounts and Napkins expire
          quickly, we may be unable to identify data as yours without your Napkin code and temporary
          identifier.
        </p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>
          For privacy questions or requests, contact the creator through{" "}
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
