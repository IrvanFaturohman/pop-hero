// Phaser 3.90 NineSlice WebGL bug: when a 9-slice lands on the batch buffer boundary, its renderer
// flushes mid-object (not on a triangle boundary) and most of the slice disappears. Flushing first
// when the remaining room is too small keeps the whole slice in one batch.
import Phaser from 'phaser';

type RenderFn = (renderer: Phaser.Renderer.WebGL.WebGLRenderer, src: Phaser.GameObjects.NineSlice, camera: Phaser.Cameras.Scene2D.Camera, parentMatrix?: Phaser.GameObjects.Components.TransformMatrix) => void;

export function patchNineSlice(): void {
  const proto = Phaser.GameObjects.NineSlice.prototype as unknown as { renderWebGL?: RenderFn; __fixed?: boolean };
  const orig = proto.renderWebGL;
  if (!orig || proto.__fixed) return;
  proto.__fixed = true;
  proto.renderWebGL = function (renderer, src, camera, parentMatrix) {
    const pipeline = renderer.pipelines.set(src.pipeline, src) as Phaser.Renderer.WebGL.Pipelines.MultiPipeline;
    if (pipeline.vertexAvailable() < src.vertices.length) pipeline.flush();
    orig.call(this, renderer, src, camera, parentMatrix);
  };
}
