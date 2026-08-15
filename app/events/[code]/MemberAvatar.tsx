"use client";

import { useCallback, useState } from "react";
import { getMemberPhotoUrl } from "@/lib/member-photo";

export default function MemberAvatar({ memberName }: { memberName: string }) {
  const [errored, setErrored] = useState(false);
  const src = getMemberPhotoUrl(memberName);

  // Attaches a native listener directly via ref callback rather than JSX
  // onError — this runs synchronously at commit time (before paint), so it
  // reliably catches both already-failed (cached/instantly-blocked) images
  // and images that fail after mount, without relying on React's synthetic
  // event delegation for the non-bubbling 'error' event.
  const attachRef = useCallback((node: HTMLImageElement | null) => {
    if (!node) return;
    if (node.complete) {
      if (node.naturalWidth === 0) setErrored(true);
      return;
    }
    const handleError = () => setErrored(true);
    node.addEventListener("error", handleError);
    return () => node.removeEventListener("error", handleError);
  }, []);

  return (
    <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-zinc-900 bg-white">
      {errored ? (
        <span className="text-sm text-zinc-400">Foto</span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- external, unpredictable per-member availability; browser-fetched to avoid the Cloudflare fingerprinting server-side fetches hit on this domain
        <img ref={attachRef} src={src} alt={memberName} className="h-full w-full object-cover" />
      )}
    </div>
  );
}
