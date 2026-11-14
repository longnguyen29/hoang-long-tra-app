import styles from "./Skeleton.module.css";

export default function Skeleton({ className = "" }) {
  return <span className={`${styles.block} ${className}`} aria-hidden="true"/>;
}
