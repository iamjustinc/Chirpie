"use client";

import { useState } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { ConversationThread } from "@/components/digest/ConversationThread";
import { mockDigest } from "@/lib/mock-data";
import { loadUserPrefs, getToneGreeting } from "@/lib/user-prefs";

export default function DigestPage() {
  // Personalise the greeting from stored user prefs.
  // mockDigest provides the stories; we only swap the greeting copy.
  const [digest] = useState(() => {
    const prefs = loadUserPrefs();
    const greeting = getToneGreeting(prefs.tone, prefs.name);
    return { ...mockDigest, greeting };
  });

  return (
    <AppShell maxWidth="md" padTop={true} className="!px-0">
      {/* Full-height thread, minus the nav bar height (56px = pt-14) */}
      <div className="h-[calc(100vh-56px)] flex flex-col">
        <ConversationThread digest={digest} />
      </div>
    </AppShell>
  );
}
