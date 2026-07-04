/**
 * OfficeMap — animated top-view SVG floor plan of the 3-room office.
 *
 * Fully self-contained (no deps beyond React, no Tailwind, all CSS inline):
 *  - Lights glow warm yellow with a soft radial halo when ON.
 *  - Fans spin (~1s/rev, CSS animation) when ON, static at 40% opacity when OFF.
 *  - Rooms tint slightly warmer as more of their lights turn on.
 *  - Room headers show live wattage summed from the devices prop.
 *  - Click (or Enter/Space) on any device fires onToggle(deviceId) when provided.
 *
 * Pure function of props: no state, no effects, no timers — the parent
 * re-renders it on every Socket.IO snapshot.
 */

export interface OfficeMapDevice {
  id: string;
  room: 'drawing' | 'work1' | 'work2';
  type: 'fan' | 'light';
  label: string;
  status: 'on' | 'off';
  watts: number;
}

export interface OfficeMapProps {
  devices: OfficeMapDevice[];
  onToggle?: (id: string) => void;
}

type RoomId = OfficeMapDevice['room'];

interface RoomGeom {
  id: RoomId;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/* ------------------------------------------------------------------ */
/* Static geometry (viewBox 1000 x 560)                                */
/* ------------------------------------------------------------------ */

const ROOMS: [RoomGeom, RoomGeom, RoomGeom] = [
  { id: 'drawing', name: 'Drawing Room', x: 24, y: 24, w: 318, h: 430 },
  { id: 'work1', name: 'Work Room 1', x: 342, y: 24, w: 316, h: 430 },
  { id: 'work2', name: 'Work Room 2', x: 658, y: 24, w: 318, h: 430 },
];

const CORRIDOR = { x: 24, y: 454, w: 952, h: 82 };

/** Ceiling position of every device, hardcoded per device id. */
const DEVICE_POS: Record<string, { x: number; y: number }> = {
  'drawing-light-1': { x: 104, y: 110 },
  'drawing-light-2': { x: 262, y: 110 },
  'drawing-light-3': { x: 183, y: 368 },
  'drawing-fan-1': { x: 126, y: 248 },
  'drawing-fan-2': { x: 240, y: 248 },
  'work1-light-1': { x: 421, y: 110 },
  'work1-light-2': { x: 579, y: 110 },
  'work1-light-3': { x: 500, y: 368 },
  'work1-fan-1': { x: 443, y: 248 },
  'work1-fan-2': { x: 557, y: 248 },
  'work2-light-1': { x: 737, y: 110 },
  'work2-light-2': { x: 897, y: 110 },
  'work2-light-3': { x: 817, y: 368 },
  'work2-fan-1': { x: 760, y: 248 },
  'work2-fan-2': { x: 874, y: 248 },
};

const DEVICE_KINDS = ['fan-1', 'fan-2', 'light-1', 'light-2', 'light-3'] as const;
type DeviceKind = (typeof DEVICE_KINDS)[number];

const KIND_LABEL: Record<DeviceKind, string> = {
  'fan-1': 'Fan 1',
  'fan-2': 'Fan 2',
  'light-1': 'Light 1',
  'light-2': 'Light 2',
  'light-3': 'Light 3',
};

const KIND_SHORT: Record<DeviceKind, string> = {
  'fan-1': 'F1',
  'fan-2': 'F2',
  'light-1': 'L1',
  'light-2': 'L2',
  'light-3': 'L3',
};

/** Wall segments [x1, y1, x2, y2] — gaps left where the doors are. */
const WALLS: Array<[number, number, number, number]> = [
  [24, 24, 976, 24], // top outer
  [24, 536, 976, 536], // bottom outer
  [24, 24, 24, 468], // left outer (above entry gap)
  [24, 522, 24, 536], // left outer (below entry gap)
  [976, 24, 976, 536], // right outer
  [342, 24, 342, 454], // drawing / work1 divider
  [658, 24, 658, 454], // work1 / work2 divider
  [24, 454, 155, 454], // corridor wall segments (3 door gaps)
  [211, 454, 472, 454],
  [528, 454, 789, 454],
  [845, 454, 976, 454],
];

/** Door leaves + swing arcs (architectural style). */
const DOORS: Array<{ leaf: [number, number, number, number]; arc: string }> = [
  { leaf: [155, 454, 155, 400], arc: 'M 155 400 A 54 54 0 0 1 209 454' }, // drawing
  { leaf: [472, 454, 472, 400], arc: 'M 472 400 A 54 54 0 0 1 526 454' }, // work1
  { leaf: [789, 454, 789, 400], arc: 'M 789 400 A 54 54 0 0 1 843 454' }, // work2
  { leaf: [24, 468, 78, 468], arc: 'M 78 468 A 54 54 0 0 1 24 522' }, // entry
];

const SANS = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";
const MONO = "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace";

const BLADE_PATH =
  'M 0 -4.5 C 4.6 -7.4 6.6 -13 5.6 -18.4 C 4.8 -23 -4.8 -23 -5.6 -18.4 C -6.6 -13 -4.6 -7.4 0 -4.5 Z';
const FAN_ANGLES = [0, 90, 180, 270];

const STYLE_CSS = `
  .om-svg text { user-select: none; -webkit-user-select: none; }
  .om-blades { transform-box: fill-box; transform-origin: center; }
  .om-blades--on { animation: om-spin 1s linear infinite; }
  @keyframes om-spin { to { transform: rotate(360deg); } }
  .om-halo, .om-tint { transition: opacity 400ms ease; }
  .om-device { transition: filter 150ms ease; }
  .om-device--click:hover { filter: brightness(1.4); }
  .om-device--click:focus { outline: none; }
  .om-device--click:focus-visible { filter: brightness(1.6); }
  @media (prefers-reduced-motion: reduce) {
    .om-blades--on { animation-duration: 6s; }
  }
`;

/* ------------------------------------------------------------------ */
/* Furniture (all decorative, pointer-events: none)                    */
/* ------------------------------------------------------------------ */

function Plant({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={10} fill="#14532d" />
      <circle cx={cx - 4} cy={cy - 3} r={4.5} fill="#22c55e" opacity={0.7} />
      <circle cx={cx + 4.5} cy={cy - 1} r={4} fill="#4ade80" opacity={0.5} />
      <circle cx={cx - 0.5} cy={cy + 4} r={4} fill="#16a34a" opacity={0.75} />
    </g>
  );
}

function Desk({ x, y, chair }: { x: number; y: number; chair: 'above' | 'below' }) {
  const w = 84;
  const h = 38;
  const chairCy = chair === 'below' ? y + h + 16 : y - 16;
  const monitorY = chair === 'below' ? y + 6 : y + h - 12;
  return (
    <g>
      <circle cx={x + w / 2} cy={chairCy} r={11} fill="#1e293b" stroke="#334155" strokeWidth={1} />
      <circle cx={x + w / 2} cy={chairCy} r={5} fill="#273449" />
      <rect x={x} y={y} width={w} height={h} rx={4} fill="#1e293b" stroke="#334155" strokeWidth={1} />
      <rect x={x + w / 2 - 14} y={monitorY} width={28} height={6} rx={1.5} fill="#475569" />
    </g>
  );
}

function WorkRoomFurniture({ room }: { room: RoomGeom }) {
  const lx = room.x + 40;
  const rx = room.x + room.w - 124;
  return (
    <g>
      <Desk x={lx} y={132} chair="below" />
      <Desk x={rx} y={132} chair="below" />
      <Desk x={lx} y={330} chair="above" />
      <Desk x={rx} y={330} chair="above" />
      {/* storage cabinet along the right wall */}
      <rect
        x={room.x + room.w - 52}
        y={210}
        width={24}
        height={92}
        rx={3}
        fill="#1e293b"
        stroke="#334155"
        strokeWidth={1}
      />
      <line x1={room.x + room.w - 48} y1={241} x2={room.x + room.w - 32} y2={241} stroke="#334155" strokeWidth={1} />
      <line x1={room.x + room.w - 48} y1={271} x2={room.x + room.w - 32} y2={271} stroke="#334155" strokeWidth={1} />
      <Plant cx={room.x + 26} cy={430} />
    </g>
  );
}

function DrawingRoomFurniture() {
  return (
    <g>
      {/* rug */}
      <rect
        x={127}
        y={196}
        width={112}
        height={112}
        rx={14}
        fill="#111d33"
        stroke="#243350"
        strokeWidth={1}
        strokeDasharray="4 5"
      />
      {/* sofa along the left wall */}
      <rect x={30} y={140} width={9} height={170} rx={2} fill="#334155" />
      <rect x={39} y={142} width={26} height={166} rx={7} fill="#1e293b" stroke="#334155" strokeWidth={1} />
      <line x1={41} y1={197} x2={63} y2={197} stroke="#334155" strokeWidth={1} />
      <line x1={41} y1={253} x2={63} y2={253} stroke="#334155" strokeWidth={1} />
      {/* sofa along the right wall */}
      <rect x={327} y={160} width={9} height={170} rx={2} fill="#334155" />
      <rect x={301} y={162} width={26} height={166} rx={7} fill="#1e293b" stroke="#334155" strokeWidth={1} />
      <line x1={303} y1={217} x2={325} y2={217} stroke="#334155" strokeWidth={1} />
      <line x1={303} y1={273} x2={325} y2={273} stroke="#334155" strokeWidth={1} />
      {/* low coffee table with a magazine and a cup */}
      <rect x={147} y={220} width={72} height={50} rx={10} fill="#22304a" stroke="#3b4a68" strokeWidth={1} />
      <rect x={163} y={236} width={18} height={12} rx={1.5} fill="#475569" transform="rotate(-8 172 242)" />
      <circle cx={200} cy={246} r={3.5} fill="#64748b" />
      {/* potted plants */}
      <Plant cx={48} cy={52} />
      <Plant cx={318} cy={52} />
      <Plant cx={48} cy={424} />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Device icons                                                        */
/* ------------------------------------------------------------------ */

function LightIcon({ on }: { on: boolean }) {
  return (
    <g>
      <circle className="om-halo" r={30} fill="url(#om-glow)" style={{ opacity: on ? 0.9 : 0 }} />
      <circle
        r={8.5}
        fill={on ? '#fbbf24' : '#334155'}
        stroke={on ? '#fde68a' : '#475569'}
        strokeWidth={1.2}
      />
      <circle cx={-2.5} cy={-2.5} r={2.6} fill="#fef9c3" style={{ opacity: on ? 0.9 : 0 }} />
    </g>
  );
}

function FanIcon({ on }: { on: boolean }) {
  return (
    <g>
      {/* faint "motion disc" behind the blades while running */}
      <circle r={21} fill="#e2e8f0" style={{ opacity: on ? 0.07 : 0 }} />
      <g className={on ? 'om-blades om-blades--on' : 'om-blades'} opacity={on ? 1 : 0.4}>
        {FAN_ANGLES.map((a) => (
          <path key={a} d={BLADE_PATH} transform={`rotate(${a})`} fill={on ? '#cbd5e1' : '#64748b'} />
        ))}
      </g>
      {/* static hub — deliberately outside the spinning group */}
      <circle r={4.5} fill={on ? '#94a3b8' : '#475569'} stroke="#0f172a" strokeWidth={1} />
      <circle r={1.5} fill={on ? '#e2e8f0' : '#334155'} />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function OfficeMap({ devices, onToggle }: OfficeMapProps) {
  const byId = new Map<string, OfficeMapDevice>(devices.map((d) => [d.id, d]));
  const clickable = typeof onToggle === 'function';

  const stats: Record<RoomId, { watts: number; litLights: number }> = {
    drawing: { watts: 0, litLights: 0 },
    work1: { watts: 0, litLights: 0 },
    work2: { watts: 0, litLights: 0 },
  };
  for (const d of devices) {
    const s = stats[d.room];
    if (!s || d.status !== 'on') continue;
    s.watts += d.watts;
    if (d.type === 'light') s.litLights += 1;
  }

  const ariaLabel =
    'Top-view office floor plan. ' +
    ROOMS.map((r) => `${r.name}: ${stats[r.id].watts} watts`).join(', ') +
    '. Lights glow and fans spin when running.';

  return (
    <svg
      className="om-svg"
      viewBox="0 0 1000 560"
      width="100%"
      style={{ height: 'auto', display: 'block' }}
      role="img"
      aria-label={ariaLabel}
      xmlns="http://www.w3.org/2000/svg"
    >
      <style>{STYLE_CSS}</style>
      <defs>
        <radialGradient id="om-glow">
          <stop offset="0%" stopColor="#fde68a" stopOpacity={0.95} />
          <stop offset="35%" stopColor="#fbbf24" stopOpacity={0.5} />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
        </radialGradient>
        <pattern id="om-grid" width={26} height={26} patternUnits="userSpaceOnUse">
          <path d="M 26 0 H 0 V 26" fill="none" stroke="#64748b" strokeOpacity={0.06} strokeWidth={1} />
        </pattern>
      </defs>

      {/* building plinth */}
      <rect x={14} y={14} width={972} height={532} rx={6} fill="#060d1f" />

      {/* floors */}
      {ROOMS.map((r) => (
        <rect key={r.id} x={r.x} y={r.y} width={r.w} height={r.h} fill="#0f172a" />
      ))}
      <rect x={CORRIDOR.x} y={CORRIDOR.y} width={CORRIDOR.w} height={CORRIDOR.h} fill="#0c1526" />
      <rect x={24} y={24} width={952} height={512} fill="url(#om-grid)" pointerEvents="none" />

      {/* furniture */}
      <g pointerEvents="none">
        <DrawingRoomFurniture />
        <WorkRoomFurniture room={ROOMS[1]} />
        <WorkRoomFurniture room={ROOMS[2]} />
      </g>

      {/* warm tint — each room brightens as its lights come on */}
      {ROOMS.map((r) => (
        <rect
          key={`tint-${r.id}`}
          className="om-tint"
          x={r.x}
          y={r.y}
          width={r.w}
          height={r.h}
          fill="#fbbf24"
          pointerEvents="none"
          style={{ opacity: Math.min(0.04 * stats[r.id].litLights, 0.12) }}
        />
      ))}

      {/* corridor labelling */}
      <text
        x={500}
        y={500}
        textAnchor="middle"
        fontFamily={SANS}
        fontSize={11}
        letterSpacing={6}
        fill="#334155"
      >
        CORRIDOR
      </text>
      <polygon points="92,494 104,500 92,506" fill="#475569" />
      <text x={112} y={504} fontFamily={SANS} fontSize={9} letterSpacing={2} fill="#475569">
        ENTRY
      </text>

      {/* walls */}
      <g stroke="#475569" strokeWidth={7} strokeLinecap="square">
        {WALLS.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
        ))}
      </g>

      {/* doors: leaf + swing arc */}
      <g>
        {DOORS.map((d, i) => (
          <g key={i}>
            <path d={d.arc} fill="none" stroke="#334155" strokeWidth={1} strokeDasharray="3 3" />
            <line
              x1={d.leaf[0]}
              y1={d.leaf[1]}
              x2={d.leaf[2]}
              y2={d.leaf[3]}
              stroke="#94a3b8"
              strokeWidth={2.5}
            />
          </g>
        ))}
      </g>

      {/* room headers: name + live wattage */}
      {ROOMS.map((r) => {
        const cx = r.x + r.w / 2;
        const w = stats[r.id].watts;
        return (
          <g key={`hdr-${r.id}`} pointerEvents="none">
            <text
              x={cx}
              y={58}
              textAnchor="middle"
              fontFamily={SANS}
              fontSize={12.5}
              fontWeight={600}
              letterSpacing={2.2}
              fill="#94a3b8"
            >
              {r.name.toUpperCase()}
            </text>
            <text
              x={cx}
              y={76}
              textAnchor="middle"
              fontFamily={MONO}
              fontSize={12}
              fill={w > 0 ? '#fbbf24' : '#475569'}
            >
              {w} W
            </text>
          </g>
        );
      })}

      {/* devices (ceiling layer, rendered last) */}
      {ROOMS.map((room) =>
        DEVICE_KINDS.map((kind) => {
          const id = `${room.id}-${kind}`;
          const pos = DEVICE_POS[id];
          if (!pos) return null;
          const dev = byId.get(id);
          const on = dev?.status === 'on';
          const liveWatts = dev && dev.status === 'on' ? dev.watts : 0;
          const label = dev?.label ?? KIND_LABEL[kind];
          const isFan = kind === 'fan-1' || kind === 'fan-2';
          const tooltip = `${room.name} - ${label} - ${on ? 'ON' : 'OFF'}, ${liveWatts} W`;
          return (
            <g
              key={id}
              className={clickable ? 'om-device om-device--click' : 'om-device'}
              transform={`translate(${pos.x} ${pos.y})`}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              aria-label={tooltip}
              style={{ cursor: clickable ? 'pointer' : undefined }}
              onClick={clickable ? () => onToggle?.(id) : undefined}
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onToggle?.(id);
                      }
                    }
                  : undefined
              }
            >
              <title>{tooltip}</title>
              {/* generous invisible hit target */}
              <circle r={26} fill="transparent" />
              {isFan ? <FanIcon on={on} /> : <LightIcon on={on} />}
              <text
                y={isFan ? 36 : 26}
                textAnchor="middle"
                fontFamily={MONO}
                fontSize={9.5}
                letterSpacing={1}
                fill={on ? '#94a3b8' : '#475569'}
              >
                {KIND_SHORT[kind]}
              </text>
            </g>
          );
        }),
      )}
    </svg>
  );
}
