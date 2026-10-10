// Pooled floating text: damage numbers, CLOSE!, PERFECT!, -23, etc.
import Phaser from 'phaser';
import { easeOutBack, easeOutQuad } from './ease';
import { fontFamily, fontWeight } from '../view/gui';

export type FloatStyle = 'damage' | 'pop' | 'loss' | 'bonus' | 'small';

class FloatItem {
  text: Phaser.GameObjects.Text;
  active = false;
  style: FloatStyle = 'damage';
  x = 0;
  y = 0;
  dx = 0;
  t = 0;
  life = 0.5;
  size = 1;

  constructor(text: Phaser.GameObjects.Text) {
    this.text = text;
  }
}


export class FloatingText {
  private pool: FloatItem[] = [];

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, max = 40) {
    for (let i = 0; i < max; i++) {
      const t = scene.add
        .text(0, 0, '', { fontFamily: fontFamily('cairo'), fontSize: '48px', fontStyle: fontWeight(), color: '#ffffff', stroke: '#22163F', strokeThickness: 10 })
        .setOrigin(0.5)
        .setVisible(false);
      layer.add(t);
      this.pool.push(new FloatItem(t));
    }
  }

  /**
   * damage: rises 40 px, fades in 0.5 s.  pop: jumps in big then floats (CLOSE!/PERFECT!).
   * loss: red, falls with gravity.  bonus: gold "+4" rising.  small: short label.
   */
  show(style: FloatStyle, x: number, y: number, msg: string, color = '#ffffff', size = 1): void {
    const it = this.take();
    it.active = true;
    it.style = style;
    it.x = x;
    it.y = y;
    it.t = 0;
    it.size = size;
    it.dx = style === 'damage' ? (Math.random() - 0.5) * 30 : 0;
    it.life = style === 'damage' ? 0.5 : style === 'loss' ? 0.9 : style === 'pop' ? 0.85 : 0.7;
    it.text.setText(msg).setColor(color).setVisible(true).setAlpha(1).setPosition(x, y).setScale(0);
    it.text.setDepth(style === 'pop' ? 2 : 1);
  }

  update(dt: number): void {
    for (const it of this.pool) {
      if (!it.active) continue;
      it.t += dt;
      const k = it.t / it.life;
      if (k >= 1) {
        it.active = false;
        it.text.setVisible(false);
        continue;
      }
      const tx = it.text;
      switch (it.style) {
        case 'damage':
          tx.setPosition(it.x + it.dx * easeOutQuad(k), it.y - 40 * easeOutQuad(k));
          tx.setScale(it.size * 0.55 * (k < 0.15 ? easeOutBack(k / 0.15) : 1));
          tx.setAlpha(k < 0.5 ? 1 : 1 - (k - 0.5) / 0.5);
          break;
        case 'pop': {
          const pop = k < 0.2 ? easeOutBack(k / 0.2, 3) : 1;
          tx.setPosition(it.x, it.y - 50 * easeOutQuad(k));
          tx.setScale(it.size * pop);
          tx.setAngle(Math.sin(it.t * 18) * 4 * (1 - k));
          tx.setAlpha(k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3);
          break;
        }
        case 'loss':
          tx.setPosition(it.x, it.y + 260 * it.t * it.t);
          tx.setScale(it.size * (k < 0.12 ? easeOutBack(k / 0.12, 3) : 1));
          tx.setAngle(10 * k);
          tx.setAlpha(k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4);
          break;
        default:
          tx.setPosition(it.x, it.y - 60 * easeOutQuad(k));
          tx.setScale(it.size * (k < 0.15 ? easeOutBack(k / 0.15, 2.5) : 1));
          tx.setAlpha(k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4);
      }
    }
  }

  private take(): FloatItem {
    let oldest = this.pool[0];
    for (const it of this.pool) {
      if (!it.active) return it;
      if (it.t / it.life > oldest.t / oldest.life) oldest = it;
    }
    return oldest;
  }
}
