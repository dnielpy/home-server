"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { localTubeUrls } from "@/src/modules/localtube/utils/urls";

export const VideoSearch = ({ initialQuery = "" }: { initialQuery?: string }) => {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const requestId = useRef(0);
  useEffect(() => {
    const value = query.trim();
    if (!value) return;
    const id = ++requestId.current;
    const timeout = window.setTimeout(() => {
      void fetch(`${localTubeUrls.suggestions}?q=${encodeURIComponent(value)}`)
        .then((response) =>
          response.ok ? (response.json() as Promise<{ suggestions: string[] }>) : { suggestions: [] },
        )
        .then((data) => {
          if (id === requestId.current) setSuggestions(data.suggestions);
        })
        .catch(() => {
          if (id === requestId.current) setSuggestions([]);
        });
    }, 200);
    return () => window.clearTimeout(timeout);
  }, [query]);
  const navigate = (value: string) => {
    const next = value.trim();
    setOpen(false);
    router.push(next ? `/localtube?q=${encodeURIComponent(next)}` : "/localtube");
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate(query);
  };
  return (
    <form className="relative mx-auto w-full max-w-3xl" onSubmit={submit}>
      <div className="border-border bg-background focus-within:border-ring focus-within:ring-ring/20 flex h-9 overflow-hidden rounded-full border shadow-sm focus-within:ring-2">
        <input
          value={query}
          onChange={(event) => {
            const next = event.currentTarget.value;
            setQuery(next);
            if (!next.trim()) setSuggestions([]);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          placeholder="Buscar"
          className="text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent px-3.5 text-sm outline-none"
        />
        <button
          type="submit"
          aria-label="Buscar vídeos"
          className="border-border text-foreground hover:bg-muted focus-visible:ring-ring grid w-14 shrink-0 place-items-center border-l transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
        >
          <Search className="size-4" strokeWidth={2.25} />
        </button>
      </div>
      {open && suggestions.length > 0 && (
        <ul className="border-border bg-popover absolute inset-x-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-lg border p-1 shadow-lg">
          {suggestions.map((suggestion) => (
            <li key={suggestion}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => navigate(suggestion)}
                className="hover:bg-muted flex w-full rounded-md px-3 py-2 text-left text-sm"
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
};
