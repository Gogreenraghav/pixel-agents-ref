import { useEffect, useRef, useState } from 'react';
import { OfficeState } from '../office/engine/officeState.js';
import {
  renderFrame,
  DEFAULT_AREA_LABELS,
  FLOOR2_AREA_LABELS,
  FLOOR3_AREA_LABELS,
  FLOOR4_AREA_LABELS,
} from '../office/engine/renderer.js';
import type { AreaLabel } from '../office/engine/renderer.js';

interface FloorDef {
  index: number;
  file: string;
  label: string;
  color: string;
  areaLabels: AreaLabel[];
}

const FLOORS: FloorDef[] = [
  { index: 0, file: 'floor-0.json', label: 'GROUND FLOOR', color: '#aaccff', areaLabels: DEFAULT_AREA_LABELS },
  { index: 1, file: 'floor-1.json', label: 'FLOOR 1',      color: '#aaffcc', areaLabels: FLOOR2_AREA_LABELS },
  { index: 2, file: 'floor-2.json', label: 'FLOOR 2',      color: '#ffccaa', areaLabels: FLOOR3_AREA_LABELS },
  { index: 3, file: 'floor-3.json', label: 'FLOOR 3',      color: '#ddaaff', areaLabels: FLOOR4_AREA_LABELS },
];

interface SingleFloorProps {
  floor: FloorDef;
}

function SingleFloorCanvas({ floor }: SingleFloorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const osRef = useRef<OfficeState | null>(null);
  const rafRef = useRef<number>(0);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    const os = new OfficeState();
    osRef.current = os;

    const base = window.location.href.replace(/\/[^/]*$/, '/');
    fetch(`${base}assets/${floor.file}?t=${Date.now()}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((layout) => {
        if (!alive) return;
        try {
          // Send as layoutLoaded message so OfficeState processes it properly
          // But we can't use the global message system for multiple floors
          // Instead directly call rebuildFromLayout
          os.rebuildFromLayout(layout);
          setReady(true);
        } catch (e) {
          setErr(String(e));
        }
      })
      .catch((e) => {
        if (alive) setErr(String(e));
      });

    return () => {
      alive = false;
      cancelAnimationFrame(rafRef.current);
      osRef.current = null;
    };
  }, [floor.file]);

  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    const os = osRef.current;
    if (!canvas || !os) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ZOOM = 0.5;
    const PAN_X = 0;
    const PAN_Y = -20;
    let last = performance.now();

    function loop(now: number) {
      const dt = Math.min(now - last, 50);
      last = now;
      if (!canvas || !os) return;

      // Resize canvas to CSS size
      const dpr = window.devicePixelRatio || 1;
      const w = Math.floor(canvas.clientWidth * dpr);
      const h = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      os.update(dt);

      const layout = os.getLayout();
      renderFrame(
        ctx!,
        w, h,
        os.tileMap,
        os.furniture,
        os.getCharacters(),
        ZOOM * dpr,
        PAN_X,
        PAN_Y,
        undefined,
        undefined,
        layout.tileColors,
        layout.cols,
        layout.rows,
        floor.areaLabels,
      );
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [ready, floor.areaLabels]);

  return (
    <div style={{
      position: 'relative',
      width: '50%',
      height: '50%',
      boxSizing: 'border-box',
      background: '#0d0d1a',
      overflow: 'hidden',
      border: '1px solid #1a1a3a',
    }}>
      {/* Label */}
      <div style={{
        position: 'absolute', top: 6, left: 8, zIndex: 10,
        fontSize: 10, fontFamily: 'monospace',
        color: floor.color, background: 'rgba(0,0,0,0.8)',
        padding: '2px 8px', border: `1px solid ${floor.color}`,
        letterSpacing: 1, pointerEvents: 'none',
      }}>
        {floor.label}
      </div>
      {/* Status */}
      {!ready && !err && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          color: '#333', fontSize: 11, fontFamily: 'monospace',
        }}>
          Loading {floor.label}...
        </div>
      )}
      {err && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          color: '#f66', fontSize: 10, fontFamily: 'monospace', padding: 8,
        }}>
          {err}
        </div>
      )}
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}

interface MultiFloorViewProps {
  onClose: () => void;
}

export function MultiFloorView({ onClose }: MultiFloorViewProps) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      display: 'flex', flexWrap: 'wrap',
      background: '#0d0d1a',
    }}>
      {/* Close/back button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 8, right: 8, zIndex: 600,
          background: '#1a1a2e', color: '#aaa',
          border: '1px solid #333', borderRadius: 0,
          padding: '4px 12px', fontSize: 12,
          fontFamily: 'monospace', cursor: 'pointer',
          letterSpacing: 1,
        }}
      >
        ✕ CLOSE
      </button>

      {/* 4 floor canvases in 2x2 grid */}
      {FLOORS.map((floor) => (
        <SingleFloorCanvas key={floor.index} floor={floor} />
      ))}
    </div>
  );
}
