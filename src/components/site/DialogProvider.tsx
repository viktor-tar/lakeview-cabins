"use client";
import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Modal, type ModalVariant } from "./Modal";
import { AmenitiesPanel, DirectionsPanel, LandmarksPanel, MapPanel, OccupancyPanel } from "./Panels";

export type DialogName = "amenities" | "landmarks" | "directions" | "occupancy" | "map" | "booking";

// The booking calendar is only downloaded when someone opens the booking popup.
const BookingDialogContent = dynamic(() => import("@/components/booking/BookingDialogContent"), { ssr: false });

const DIALOGS: Record<DialogName, { label: string; variant: ModalVariant; render: () => ReactNode }> = {
  amenities: { label: "What this place offers", variant: "narrow", render: () => <AmenitiesPanel /> },
  landmarks: { label: "Activities and landmarks", variant: "panel", render: () => <LandmarksPanel /> },
  directions: { label: "How to find us", variant: "panel", render: () => <DirectionsPanel /> },
  occupancy: { label: "Occupancy rules", variant: "panel", render: () => <OccupancyPanel /> },
  map: { label: "Map", variant: "map", render: () => <MapPanel /> },
  booking: { label: "Book your stay", variant: "booking", render: () => <BookingDialogContent /> },
};

const Ctx = createContext<{ open: (name: DialogName) => void; close: () => void } | null>(null);

export function DialogProvider({ children }: { children: ReactNode }) {
  // The name is kept after closing so the popup keeps its look while it fades out.
  const [state, setState] = useState<{ name: DialogName | null; open: boolean }>({ name: null, open: false });
  const open = useCallback((name: DialogName) => setState({ name, open: true }), []);
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);
  const value = useMemo(() => ({ open, close }), [open, close]);
  const d = state.name ? DIALOGS[state.name] : null;
  return (
    <Ctx.Provider value={value}>
      {children}
      <Modal open={state.open} onClose={close} label={d?.label ?? ""} variant={d?.variant}>
        {state.open && d?.render()}
      </Modal>
    </Ctx.Provider>
  );
}

export function useDialogs() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDialogs must be used inside <DialogProvider>");
  return ctx;
}

/** A button that opens one of the site popups. */
export function DialogButton({
  name,
  className,
  children,
}: {
  name: DialogName;
  className?: string;
  children: ReactNode;
}) {
  const { open } = useDialogs();
  return (
    <button type="button" className={className} onClick={() => open(name)} aria-haspopup="dialog">
      {children}
    </button>
  );
}
