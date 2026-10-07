// One-finger hold input via native Pointer Events (anywhere on the canvas).
// Pointer cancel / hidden tab / blur -> onCancel (auto pause) WITHOUT releasing the balloon.
import { config } from './config';
import { inRoom, type RoomInput } from './logic/room';

export class InputController {
  held = false;
  enabled = true;
  /** Return true if (x, y) in game coords belongs to UI and must not inflate. */
  blockers: Array<(x: number, y: number) => boolean> = [];
  onGesture: () => void = () => {};
  onCancel: () => void = () => {};
  private pointerId: number | null = null;
  private pressed = false;
  private released = false;
  private keyHeld = false;
  /** Finger (or hovering mouse) position in game coords. */
  private x = config.layout.refSpawnX;
  private y = config.layout.refSpawnY;
  private snap: RoomInput = { held: false, pressed: false, released: false, x: 0, y: 0 };

  constructor(private canvas: HTMLCanvasElement) {
    canvas.addEventListener('pointerdown', this.down);
    window.addEventListener('pointermove', this.move);
    window.addEventListener('pointerup', this.up);
    window.addEventListener('pointercancel', this.cancel);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    window.addEventListener('touchend', () => this.onGesture(), { passive: true });
    window.addEventListener('keydown', this.keyDown);
    window.addEventListener('keyup', this.keyUp);
  }

  toGame(clientX: number, clientY: number): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: ((clientX - r.left) / r.width) * config.layout.width,
      y: ((clientY - r.top) / r.height) * config.layout.height,
    };
  }

  /** Input for one logic step. Edges are delivered once; a press+release inside one frame still inflates one step. */
  consume(): RoomInput {
    const s = this.snap;
    s.x = this.x;
    s.y = this.y;
    if (this.pressed && this.released && !this.held) {
      s.held = true;
      s.pressed = true;
      s.released = false;
      this.pressed = false;
      return s;
    }
    s.held = this.held;
    s.pressed = this.pressed;
    s.released = this.released;
    this.pressed = false;
    this.released = false;
    return s;
  }

  /** Drop the current finger without a release (pause). Its later pointerup is ignored. */
  forget(): void {
    this.pointerId = null;
    this.held = false;
    this.keyHeld = false;
    this.pressed = false;
    this.released = false;
  }

  // No preventDefault here: it would suppress the compatibility mouse events Phaser's UI uses.
  // Scrolling/zoom/callouts are blocked by touch-action:none + touchstart preventDefault.
  private down = (e: PointerEvent): void => {
    this.onGesture();
    if (!this.enabled || this.pointerId !== null || this.keyHeld) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const p = this.toGame(e.clientX, e.clientY);
    for (const b of this.blockers) if (b(p.x, p.y)) return;
    this.x = p.x;
    this.y = p.y;
    this.pointerId = e.pointerId;
    this.held = true;
    this.pressed = true;
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  private move = (e: PointerEvent): void => {
    // Track the active finger, or a hovering mouse (used by the Space key on desktop).
    if (this.pointerId !== null && e.pointerId !== this.pointerId) return;
    if (this.pointerId === null && (e.pointerType !== 'mouse' || this.keyHeld)) return;
    const p = this.toGame(e.clientX, e.clientY);
    this.x = p.x;
    this.y = p.y;
  };

  private up = (e: PointerEvent): void => {
    this.onGesture();
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = null;
    this.held = false;
    this.released = true;
  };

  private cancel = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return;
    this.forget();
    this.onCancel();
  };

  // Space bar = hold (desktop testing).
  private keyDown = (e: KeyboardEvent): void => {
    if (e.code !== 'Space' || e.repeat) return;
    e.preventDefault();
    this.onGesture();
    if (!this.enabled || this.pointerId !== null) return;
    if (!inRoom(this.x, this.y)) {
      this.x = config.layout.refSpawnX;
      this.y = config.layout.refSpawnY;
    }
    this.keyHeld = true;
    this.held = true;
    this.pressed = true;
  };

  private keyUp = (e: KeyboardEvent): void => {
    if (e.code !== 'Space' || !this.keyHeld) return;
    this.keyHeld = false;
    this.held = false;
    this.released = true;
  };
}
