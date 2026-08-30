import styles from "./Atmosphere.module.css";

const FAMILIES = new Set([
  "mountain-mist",
  "tea-forest",
  "honey-shan",
  "smoke-shan",
  "lotus-dawn",
  "old-brass",
]);

const STRENGTHS = new Set(["quiet", "soft", "present", "staff"]);

/**
 * A controlled atmospheric surface. Content and semantics remain unchanged;
 * the visual layer is isolated below the children and never receives input.
 */
export default function Atmosphere({
  as: Component = "div",
  family = "mountain-mist",
  strength = "quiet",
  motion = false,
  grain = true,
  className = "",
  children,
  ...props
}) {
  const safeFamily = FAMILIES.has(family) ? family : "mountain-mist";
  const safeStrength = STRENGTHS.has(strength) ? strength : "quiet";

  return (
    <Component
      className={[styles.root, className].filter(Boolean).join(" ")}
      data-atmosphere={safeFamily}
      data-atmosphere-strength={safeStrength}
      data-atmosphere-motion={motion ? "drift" : "still"}
      data-atmosphere-grain={grain ? "true" : "false"}
      {...props}
    >
      <span className={styles.colorLayer} aria-hidden="true" />
      {grain && <span className={styles.grainLayer} aria-hidden="true" />}
      {children}
    </Component>
  );
}
