import type { Metadata } from "next";
import { PitchDeck } from "@/components/pitch-deck";

// Presentación para inversores. No tiene links desde la web y no se indexa.
export const metadata: Metadata = {
  title: "Presentación",
  robots: { index: false, follow: false },
};

export default function PresentacionPage() {
  return (
    <div className="minimal">
      <PitchDeck />
    </div>
  );
}
