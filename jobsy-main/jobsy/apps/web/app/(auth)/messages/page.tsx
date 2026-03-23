"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiGet, apiPost, apiDelete, ApiError } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Conversation {
  id: string;
  participant_id?: string;
  participant_name: string;
  participant_avatar?: string;
  last_message: string;
  updated_at: string;
  unread_count?: number;
  is_blocked?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewInfo, setShowNewInfo] = useState(false);
  const [blockingUser, setBlockingUser] = useState<string | null>(null);
  const [showBlockMenu, setShowBlockMenu] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    apiGet<{ recent_threads?: Conversation[] }>("/api/messages/summary")
      .then((data) => {
        setConversations(data.recent_threads ?? []);
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Failed to load messages",
        );
      })
      .finally(() => setIsLoading(false));
  }, []);

  const selectedConversation = conversations.find(
    (c) => c.id === selectedId,
  );

  async function handleBlockUser(conv: Conversation) {
    const userId = conv.participant_id ?? conv.id;
    setBlockingUser(userId);
    try {
      if (conv.is_blocked) {
        await apiDelete(`/api/trust/block?user_id=${userId}`);
      } else {
        await apiPost("/api/trust/block", { user_id: userId });
      }
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conv.id ? { ...c, is_blocked: !c.is_blocked } : c,
        ),
      );
      setShowBlockMenu(false);
    } catch {
      // silently fail
    } finally {
      setBlockingUser(null);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-JM", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <main className="mx-auto max-w-6xl space-y-4 px-4 py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Messages</h1>
          <p className="mt-1 text-sm text-neutral-500">Your conversations</p>
        </div>
        <button
          onClick={() => setShowNewInfo(!showNewInfo)}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          + New Conversation
        </button>
      </div>

      {/* New conversation info */}
      {showNewInfo && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h3 className="mb-1 text-sm font-medium text-blue-900">
            Start a New Conversation
          </h3>
          <p className="text-sm text-blue-700">
            To start a conversation with a service provider, visit their profile
            page and click the &ldquo;Message&rdquo; button. You can find
            providers by{" "}
            <Link
              href="/search"
              className="font-medium underline hover:text-blue-900"
            >
              searching for services
            </Link>
            .
          </p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-brand-primary" />
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 text-5xl">{"\u{1F4AC}"}</div>
          <h3 className="text-lg font-medium text-neutral-900">
            Chat unavailable
          </h3>
          <p className="text-sm text-neutral-500">
            Unable to connect to the messaging service. Please try again later.
          </p>
        </div>
      )}

      {/* Conversations */}
      {!isLoading && !error && (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex h-[calc(100vh-280px)] min-h-[500px]">
            {/* Conversation list */}
            <div
              className={`w-full flex-shrink-0 border-r border-neutral-200 md:w-80 lg:w-96 ${
                selectedId ? "hidden md:block" : "block"
              }`}
            >
              {conversations.length > 0 ? (
                <div className="divide-y divide-neutral-100">
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => {
                        setSelectedId(conv.id);
                        setShowBlockMenu(false);
                      }}
                      className={`block w-full px-4 py-3 text-left transition hover:bg-neutral-50 ${
                        selectedId === conv.id ? "bg-brand-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-sm font-bold text-brand-primary">
                          {conv.participant_name?.charAt(0) ?? "?"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="truncate text-sm font-medium text-neutral-900">
                              {conv.participant_name}
                              {conv.is_blocked && (
                                <span className="ml-1.5 text-xs text-error">
                                  (Blocked)
                                </span>
                              )}
                            </p>
                            <span className="ml-2 shrink-0 text-[10px] text-neutral-400">
                              {formatDate(conv.updated_at)}
                            </span>
                          </div>
                          <p className="truncate text-xs text-neutral-500">
                            {conv.last_message}
                          </p>
                        </div>
                        {conv.unread_count != null &&
                          conv.unread_count > 0 && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary text-[10px] font-bold text-white">
                              {conv.unread_count}
                            </span>
                          )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                  <div className="text-4xl text-neutral-300">
                    {"\u{1F4EC}"}
                  </div>
                  <h3 className="mt-3 text-sm font-medium text-neutral-900">
                    No conversations yet
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Start a conversation from a provider&apos;s profile page.
                  </p>
                </div>
              )}
            </div>

            {/* Message area */}
            <div
              className={`flex min-w-0 flex-1 flex-col ${
                selectedId ? "block" : "hidden md:flex"
              }`}
            >
              {selectedConversation ? (
                <>
                  {/* Mobile back */}
                  <div className="flex items-center gap-2 border-b border-neutral-100 px-3 py-2 md:hidden">
                    <button
                      onClick={() => setSelectedId(null)}
                      className="rounded-lg p-1.5 text-neutral-500 transition hover:bg-neutral-100"
                      aria-label="Back to conversations"
                    >
                      &larr;
                    </button>
                    <span className="text-sm text-neutral-500">
                      Back to conversations
                    </span>
                  </div>

                  {/* Chat header with block action */}
                  <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
                    <div>
                      <p className="font-medium text-neutral-900">
                        {selectedConversation.participant_name}
                      </p>
                      {selectedConversation.is_blocked && (
                        <p className="text-xs text-error">
                          This user is blocked
                        </p>
                      )}
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setShowBlockMenu(!showBlockMenu)}
                        className="rounded-lg p-2 text-neutral-500 transition hover:bg-neutral-100"
                        aria-label="More options"
                        aria-expanded={showBlockMenu}
                      >
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                          aria-hidden="true"
                        >
                          <circle cx="12" cy="5" r="1" />
                          <circle cx="12" cy="12" r="1" />
                          <circle cx="12" cy="19" r="1" />
                        </svg>
                      </button>
                      {showBlockMenu && (
                        <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
                          <button
                            onClick={() =>
                              handleBlockUser(selectedConversation)
                            }
                            disabled={blockingUser !== null}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-error transition hover:bg-red-50 disabled:opacity-50"
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                              aria-hidden="true"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <line
                                x1="4.93"
                                y1="4.93"
                                x2="19.07"
                                y2="19.07"
                              />
                            </svg>
                            {blockingUser
                              ? "Processing..."
                              : selectedConversation.is_blocked
                                ? "Unblock User"
                                : "Block User"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Messages placeholder */}
                  <div className="flex flex-1 items-center justify-center p-8 text-center">
                    <div>
                      <div className="mx-auto mb-4 text-5xl text-neutral-200">
                        {"\u{1F4AC}"}
                      </div>
                      <p className="text-sm text-neutral-500">
                        {selectedConversation.is_blocked
                          ? "You have blocked this user. Unblock them to continue messaging."
                          : "Real-time messaging will be available once the chat service is connected."}
                      </p>
                    </div>
                  </div>

                  {/* Input */}
                  <div className="border-t border-neutral-200 p-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={
                          selectedConversation.is_blocked
                            ? "Unblock user to send messages"
                            : "Type a message..."
                        }
                        className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                        disabled={selectedConversation.is_blocked}
                      />
                      <button
                        className="shrink-0 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white opacity-50"
                        disabled
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center p-8 text-center">
                  <div>
                    <div className="mx-auto mb-4 text-5xl text-neutral-200">
                      {"\u{1F4EC}"}
                    </div>
                    <h3 className="text-lg font-medium text-neutral-900">
                      No messages yet
                    </h3>
                    <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">
                      Start a conversation by visiting a provider&apos;s profile
                      and clicking Message. You can find providers by searching
                      or browsing.
                    </p>
                    <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                      <Link
                        href="/search"
                        className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
                      >
                        Search Providers
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
