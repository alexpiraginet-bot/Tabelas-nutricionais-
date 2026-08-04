"use client";

import { AgentDock } from "@/components/ui/agent-dock";

// A demo original do 21st.dev aponta para api.dicebear.com. Trocado por um
// asset local do próprio repo: a bancada funciona offline, não depende de um
// serviço de terceiros no runtime e não vaza requisição para fora.
const avatarSrc = "/bento-logo.webp";

export default function Default() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white p-8">
      <AgentDock
        agentName="Zara"
        avatarSrc={avatarSrc}
        className="w-full max-w-md"
        idleStatus="Your hyperaide"
        onMessageSubmit={async () => {
          await new Promise((resolve) => setTimeout(resolve, 1200));
        }}
        workingStatus="doing stuff..."
      />
    </div>
  );
}
