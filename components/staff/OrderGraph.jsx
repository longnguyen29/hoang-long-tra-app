"use client";

import { useEffect, useRef } from "react";
import styles from "./OrderJourneyMap.module.css";

const hubs = [
  { xyz: [-3.15, -0.9, 0.8], color: "#7edec3" },
  { xyz: [-0.95, 1.0, -0.75], color: "#f2b76d" },
  { xyz: [1.15, -0.78, 0.65], color: "#80c7fc" },
  { xyz: [3.08, 0.97, -0.28], color: "#ba9bed" },
];
const route = (a, b, t) => a.map((value, index) => value + (b[index] - value) * t
  + Math.sin(Math.PI * t) * (index === 1 ? 0.48 : index === 2 ? -0.58 : 0));
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

function project([x, y, z], width, height, yaw, pitch, zoom) {
  const horizontal = x * Math.cos(yaw) - z * Math.sin(yaw);
  const depth = z * Math.cos(yaw) + x * Math.sin(yaw);
  const vertical = y * Math.cos(pitch) - depth * Math.sin(pitch);
  const cameraDepth = depth * Math.cos(pitch) + y * Math.sin(pitch);
  const factor = (15 / (15 - cameraDepth)) * Math.min(width / 8.8, height / 5.0) * zoom;
  return { x: width / 2 + horizontal * factor, y: height / 2 - vertical * factor, depth: cameraDepth };
}

function glow(ctx, point, radius, color) {
  const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
  gradient.addColorStop(0, color + "ae");
  gradient.addColorStop(0.32, color + "45");
  gradient.addColorStop(1, color + "00");
  ctx.fillStyle = gradient;
  ctx.fillRect(point.x - radius, point.y - radius, radius * 2, radius * 2);
}

function dot(ctx, { x, y }, radius, color) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function paint(ctx, width, height, camera, phases, current, time, labels) {
  const toScreen = point => project(point, width, height, camera.yaw, camera.pitch, camera.zoom);
  const centers = hubs.map(hub => toScreen(hub.xyz));
  ctx.clearRect(0, 0, width, height);
  for (let index = 0; index < 86; index += 1) {
    const point = toScreen([Math.sin(index * 32.41) * 5.7, Math.cos(index * 15.81) * 3.6, Math.sin(index * 9.3) * 4.7]);
    dot(ctx, point, index % 9 === 0 ? 1.2 : 0.65, index % 9 === 0 ? "#8ac8c27a" : "#97c6cc2d");
  }

  for (let index = 0; index < hubs.length - 1; index += 1) {
    const start = hubs[index];
    const end = hubs[index + 1];
    const gradient = ctx.createLinearGradient(centers[index].x, centers[index].y, centers[index + 1].x, centers[index + 1].y);
    gradient.addColorStop(0, start.color + "a8");
    gradient.addColorStop(1, end.color + "a8");
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let segment = 0; segment <= 26; segment += 1) {
      const point = toScreen(route(start.xyz, end.xyz, segment / 26));
      if (segment === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
    // These moving points show direction along the workflow, never individual orders.
    for (let particle = 0; particle < 4; particle += 1) {
      const point = toScreen(route(start.xyz, end.xyz, (time / 5400 + particle / 4 + index * .12) % 1));
      dot(ctx, point, 1.7, start.color);
    }
  }

  const depthOrder = centers.map((point, index) => ({ point, index })).sort((a, b) => a.point.depth - b.point.depth);
  for (const [rank, { index, point }] of depthOrder.entries()) {
    const { xyz, color } = hubs[index];
    const phase = phases[index];
    const selected = phase.id === current;
    const shade = phase.blocked ? "#ff907c" : color;
    const radius = phase.count ? Math.min(18, 9 + Math.log2(phase.count + 1) * 2) : 8;
    const shimmer = selected ? 4 * Math.sin(time / 650) : 0;
    glow(ctx, point, (selected ? 63 : 40) + shimmer, shade);

    for (let satellite = 0; satellite < 19; satellite += 1) {
      const angle = satellite * 2.39996;
      const extent = 0.27 + (satellite % 7) * 0.071;
      const location = toScreen([
        xyz[0] + Math.cos(angle) * extent,
        xyz[1] + Math.sin(angle) * extent,
        xyz[2] + Math.sin(satellite * 3.28) * extent,
      ]);
      if (satellite % 3 === 0) {
        ctx.beginPath(); ctx.moveTo(point.x, point.y); ctx.lineTo(location.x, location.y);
        ctx.strokeStyle = shade + "49"; ctx.lineWidth = 0.7; ctx.stroke();
      }
      dot(ctx, location, satellite % 4 === 0 ? 2 : 0.95, shade + (satellite % 4 === 0 ? "bd" : "78"));
    }

    ctx.beginPath(); ctx.arc(point.x, point.y, radius + 5, 0, Math.PI * 2);
    ctx.strokeStyle = shade + "85"; ctx.lineWidth = selected ? 1.7 : 0.85; ctx.stroke();
    dot(ctx, point, radius / 2, shade);
    dot(ctx, point, radius / 4, "#efffff");
    const label = labels.querySelector(`[data-node="${phase.id}"]`);
    if (label) {
      label.style.left = `${clamp(point.x, 55, width - 55)}px`;
      label.style.top = `${clamp(point.y + 22, 18, height - 48)}px`;
      label.style.zIndex = selected ? "10" : String(rank + 1);
    }
  }
}

export default function OrderGraph({ phases, current, snapshot, controls, onCameraChange, onSelect, detailId, onUnavailable }) {
  const canvasRef = useRef(null);
  const viewportRef = useRef(null);
  const model = useRef({ phases, current });
  const drag = useRef(null);
  const camera = useRef({ yaw: -0.27, pitch: .16, zoom: 1 });
  const redraw = useRef(() => {});

  useEffect(() => {
    model.current = { phases, current };
    redraw.current();
  }, [phases, current]);

  useEffect(() => {
    camera.current = { yaw: controls.yaw, pitch: controls.pitch, zoom: controls.zoom };
    redraw.current();
  }, [controls]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      onUnavailable();
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let visible = false;
    let width = 0;
    let height = 0;

    const draw = time => {
      if (width > 0 && height > 0) {
        const { phases, current } = model.current;
        paint(ctx, width, height, camera.current, phases, current, reduced.matches ? 0 : time, viewport);
      }
    };
    const tick = time => {
      if (!visible || document.hidden || reduced.matches) {
        frame = 0;
        return;
      }
      draw(time);
      frame = window.requestAnimationFrame(tick);
    };
    const updateAnimation = () => {
      if (visible && !document.hidden && !reduced.matches && !frame) frame = window.requestAnimationFrame(tick);
      if ((!visible || document.hidden || reduced.matches) && frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
      if (visible) draw(performance.now());
    };
    const resize = () => {
      const bounds = viewport.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw(performance.now());
    };
    redraw.current = () => draw(performance.now());
    const resizeObserver = new ResizeObserver(resize);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      updateAnimation();
    });
    resizeObserver.observe(viewport);
    visibilityObserver.observe(viewport);
    reduced.addEventListener("change", updateAnimation);
    document.addEventListener("visibilitychange", updateAnimation);
    resize();
    return () => {
      redraw.current = () => {};
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      reduced.removeEventListener("change", updateAnimation);
      document.removeEventListener("visibilitychange", updateAnimation);
    };
  }, [onUnavailable]);

  function startDrag(event) {
    if (!event.isPrimary || event.button !== 0) return;
    drag.current = { x: event.clientX, y: event.clientY, yaw: camera.current.yaw, pitch: camera.current.pitch };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event) {
    if (!event.isPrimary || !drag.current) return;
    const start = drag.current;
    camera.current.yaw = start.yaw + (event.clientX - start.x) * .008;
    camera.current.pitch = clamp(start.pitch + (event.clientY - start.y) * .007, -.9, .9);
    redraw.current();
  }

  return <div className={styles.graphViewport} ref={viewportRef} role="group" aria-label="Đồ thị 3D vận hành">
    <canvas ref={canvasRef} aria-hidden="true" onPointerDown={startDrag} onPointerMove={moveDrag}
      onLostPointerCapture={() => {
        if (!drag.current) return;
        drag.current = null;
        onCameraChange({ ...camera.current });
      }} />
    {phases.map((phase, index) => <button className={styles.graphNode} type="button" key={phase.id}
      data-node={phase.id} aria-pressed={phase.id === current} aria-controls={detailId} onClick={() => onSelect(phase.id)}
      style={{ "--node-color": phase.blocked ? "#ff907c" : hubs[index].color }}>
      <span>{phase.zone}</span> <b>{snapshot ? phase.count : "—"}</b>
      {snapshot && phase.blocked > 0 && <small>{phase.blocked} bị vướng</small>}
    </button>)}
  </div>;
}
