interface Props {
  status: string;
  animate?: boolean;
  size?: "sm" | "md";
}

const config: Record<string, { color: string; borderWidth: string; rotate: boolean }> = {
  OK:           { color: "#8A9A5B", borderWidth: "1px",   rotate: false },
  DUE:          { color: "#3E5C76", borderWidth: "1px",   rotate: false },
  OVERDUE:      { color: "#C4622D", borderWidth: "1.5px", rotate: false },
  "IN SERVICE": { color: "#6B6558", borderWidth: "1px",   rotate: false },
  BOOKED:       { color: "#3E5C76", borderWidth: "1px",   rotate: false },
  COMPLETED:    { color: "#1C1E1A", borderWidth: "1px",   rotate: false },
  FAULT:        { color: "#C4622D", borderWidth: "1.5px", rotate: false },
};

export default function StatusStamp({ status, animate, size = "md" }: Props) {
  const c = config[status] ?? { color: "#6B6558", borderWidth: "1px", rotate: false };

  const pad  = size === "sm" ? "1px 5px"   : "2px 7px";
  const fs   = size === "sm" ? "10px"       : "11px";
  const ls   = size === "sm" ? "0.09em"     : "0.1em";

  const transform = animate
    ? undefined                      // animation handles it via keyframes
    : c.rotate ? "rotate(-2deg)" : undefined;

  return (
    <span
      className={animate ? "stamp-animate" : ""}
      style={{
        display:        "inline-block",
        fontFamily:     "'JetBrains Mono', monospace",
        fontWeight:     700,
        fontSize:       fs,
        letterSpacing:  ls,
        textTransform:  "uppercase",
        color:          c.color,
        border:         `${c.borderWidth} solid ${c.color}`,
        padding:        pad,
        background:     "transparent",
        transform,
        lineHeight:     "1.6",
        whiteSpace:     "nowrap",
      }}
    >
      {status}
    </span>
  );
}
