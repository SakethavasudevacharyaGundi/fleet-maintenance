import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

/* ─────────────────────────────── config ─────────────────────────────── */
const STRIPE_COUNT       = 6;
const STRIPE_COLOR       = "#1C1E1A";
const COVER_DURATION_MS  = 360;
const STAGGER_DELAY_MS   = 55;
const HOLD_MS            = 60;
const REVEAL_DURATION_MS = 320;

const COVER_TOTAL_MS =
  COVER_DURATION_MS + (STRIPE_COUNT - 1) * STAGGER_DELAY_MS + HOLD_MS;

/* ─────────────────────────────── types ──────────────────────────────── */
type Phase = "idle" | "covering" | "revealing";

interface TransitionCtx {
  trigger: (onMidpoint: () => void) => void;
}

/* ─────────────────────────────── context ────────────────────────────── */
const TransitionContext = createContext<TransitionCtx>({ trigger: () => {} });

export function usePageTransition() {
  return useContext(TransitionContext);
}

/* ─────────────────────────────── provider ───────────────────────────── */
export function StripedTransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const activeRef = useRef(false);

  const trigger = useCallback((onMidpoint: () => void) => {
    if (activeRef.current) return;
    activeRef.current = true;

    setPhase("covering");

    setTimeout(() => {
      // Navigate while bars fully cover the screen
      onMidpoint();

      // Two animation frames so React renders the new route before we reveal
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setPhase("revealing");

          const revealTotal =
            REVEAL_DURATION_MS + (STRIPE_COUNT - 1) * STAGGER_DELAY_MS;

          setTimeout(() => {
            setPhase("idle");
            activeRef.current = false;
          }, revealTotal + 60);
        });
      });
    }, COVER_TOTAL_MS);
  }, []);

  return (
    <TransitionContext.Provider value={{ trigger }}>
      {children}
      {/* Always in the DOM — never unmounted — so CSS transitions are never interrupted */}
      <TransitionStripeContainer phase={phase} />
    </TransitionContext.Provider>
  );
}

/* ─────────────────────────────── overlay ────────────────────────────── */
function TransitionStripeContainer({ phase }: { phase: Phase }) {
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "row",
        pointerEvents: "none",
        zIndex: 9999,
        visibility: phase === "idle" ? "hidden" : "visible",
      }}
    >
      {Array.from({ length: STRIPE_COUNT }).map((_, i) => (
        <RevealStripe key={i} index={i} phase={phase} />
      ))}
    </div>
  );
}

function RevealStripe({ index, phase }: { index: number; phase: Phase }) {
  const isCovering  = phase === "covering";
  const isRevealing = phase === "revealing";

  const scaleY   = isCovering ? 1 : 0;
  const duration = isCovering ? COVER_DURATION_MS : REVEAL_DURATION_MS;
  const staggerIdx = isCovering ? index : STRIPE_COUNT - 1 - index;
  const delay      = staggerIdx * STAGGER_DELAY_MS;

  // Snap to 0 instantly when phase resets to idle (bars already off-screen)
  const transitionStr =
    isCovering || isRevealing
      ? `transform ${duration}ms cubic-bezier(0.76, 0, 0.24, 1) ${delay}ms`
      : "none";

  return (
    <div
      style={{
        flex: 1,
        background: STRIPE_COLOR,
        transform: `scaleY(${scaleY})`,
        transformOrigin: "bottom",
        transition: transitionStr,
      }}
    />
  );
}
