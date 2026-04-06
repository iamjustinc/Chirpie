"use client";

import { AppShell } from "@/components/shell/AppShell";
import { ConversationThread } from "@/components/digest/ConversationThread";
import { mockDigest } from "@/lib/mock-data";

export default function DigestPage() {
  return (
    <AppShell maxWidth="md" padTop={true} className="!px-0">
      {/* Full-height thread, minus the nav bar height (56px = pt-14) */}
      <div className="h-[calc(100vh-56px)] flex flex-col">
        <ConversationThread digest={mockDigest} />
      </div>
    </AppShell>
  );
}
