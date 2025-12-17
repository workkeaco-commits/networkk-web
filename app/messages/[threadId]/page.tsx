import ChatComposer from "@/components/chat/ChatComposer.client";

// If this page is a Server Component, it's fine. Just render the client composer.
export default async function ChatThreadPage() {
  // TODO: replace these with real IDs from your thread lookup
  const clientId = 1;
  const freelancerId = 2;
  const jobPostId = 9;

  return (
    <div className="flex h-[100vh] flex-col">
      <div className="flex-1 overflow-auto">{/* your messages list */}</div>
      <ChatComposer
        clientId={clientId}
        freelancerId={freelancerId}
        jobPostId={jobPostId}
        role="client"
      />
    </div>
  );
}
