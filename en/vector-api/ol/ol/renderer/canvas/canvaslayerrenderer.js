goog.provide('ol.renderer.canvas.Layer');

goog.require('goog.vec.Mat4');
goog.require('ol.layer.Layer');
goog.require('ol.render.Event');
goog.require('ol.render.EventType');
goog.require('ol.render.canvas.Immediate');
goog.require('ol.renderer.Layer');
goog.require('ol.vec.Mat4');



/**
 * @constructor
 * @extends {ol.renderer.Layer}
 * @param {ol.renderer.Map} mapRenderer Map renderer.
 * @param {ol.layer.Layer} layer Layer.
 */
ol.renderer.canvas.Layer = function(mapRenderer, layer) {

  goog.base(this, mapRenderer, layer);

  /**
   * @private
   * @type {!goog.vec.Mat4.Number}
   */
  this.transform_ = goog.vec.Mat4.createNumber();

};
goog.inherits(ol.renderer.canvas.Layer, ol.renderer.Layer);


/**
 * @param {ol.FrameState} frameState Frame state.
 * @param {ol.layer.LayerState} layerState Layer state.
 * @param {CanvasRenderingContext2D} context Context.
 */
ol.renderer.canvas.Layer.prototype.composeFrame =
    function(frameState, layerState, context) {

  this.dispatchPreComposeEvent(context, frameState);

  var image = this.getImage();
  if (!goog.isNull(image)) {
    var imageTransform = this.getImageTransform();
    context.globalAlpha = layerState.opacity;

    // for performance reasons, context.setTransform is only used
    // when the view is rotated. see http://jsperf.com/canvas-transform
    if (frameState.view2DState.rotation === 0) {
      var dx = goog.vec.Mat4.getElement(imageTransform, 0, 3);
      var dy = goog.vec.Mat4.getElement(imageTransform, 1, 3);
      var dw = image.width * goog.vec.Mat4.getElement(imageTransform, 0, 0);
      var dh = image.height * goog.vec.Mat4.getElement(imageTransform, 1, 1);
      context.drawImage(image, 0, 0, +image.width, +image.height,
          Math.round(dx), Math.round(dy), Math.round(dw), Math.round(dh));
    } else {
      context.setTransform(
          goog.vec.Mat4.getElement(imageTransform, 0, 0),
          goog.vec.Mat4.getElement(imageTransform, 1, 0),
          goog.vec.Mat4.getElement(imageTransform, 0, 1),
          goog.vec.Mat4.getElement(imageTransform, 1, 1),
          goog.vec.Mat4.getElement(imageTransform, 0, 3),
          goog.vec.Mat4.getElement(imageTransform, 1, 3));
      context.drawImage(image, 0, 0);
      context.setTransform(1, 0, 0, 1, 0, 0);
    }
  }

  this.dispatchPostComposeEvent(context, frameState);

};


/**
 * @param {ol.render.EventType} type Event type.
 * @param {CanvasRenderingContext2D} context Context.
 * @param {ol.FrameState} frameState Frame state.
 * @param {goog.vec.Mat4.AnyType=} opt_transform Transform.
 * @private
 */
ol.renderer.canvas.Layer.prototype.dispatchComposeEvent_ =
    function(type, context, frameState, opt_transform) {
  var layer = this.getLayer();
  if (layer.hasListener(type)) {
    var transform = goog.isDef(opt_transform) ?
        opt_transform : this.getTransform(frameState);
    var render = new ol.render.canvas.Immediate(
        context, frameState.devicePixelRatio, frameState.extent, transform);
    var composeEvent = new ol.render.Event(type, layer, render, frameState,
        context, null);
    layer.dispatchEvent(composeEvent);
  }
};


/**
 * @param {CanvasRenderingContext2D} context Context.
 * @param {ol.FrameState} frameState Frame state.
 * @param {goog.vec.Mat4.AnyType=} opt_transform Transform.
 * @protected
 */
ol.renderer.canvas.Layer.prototype.dispatchPostComposeEvent =
    function(context, frameState, opt_transform) {
  this.dispatchComposeEvent_(ol.render.EventType.POSTCOMPOSE, context,
      frameState, opt_transform);
};


/**
 * @param {CanvasRenderingContext2D} context Context.
 * @param {ol.FrameState} frameState Frame state.
 * @param {goog.vec.Mat4.AnyType=} opt_transform Transform.
 * @protected
 */
ol.renderer.canvas.Layer.prototype.dispatchPreComposeEvent =
    function(context, frameState, opt_transform) {
  this.dispatchComposeEvent_(ol.render.EventType.PRECOMPOSE, context,
      frameState, opt_transform);
};


/**
 * @return {HTMLCanvasElement|HTMLVideoElement|Image} Canvas.
 */
ol.renderer.canvas.Layer.prototype.getImage = goog.abstractMethod;


/**
 * @return {!goog.vec.Mat4.Number} Image transform.
 */
ol.renderer.canvas.Layer.prototype.getImageTransform = goog.abstractMethod;


/**
 * @param {ol.FrameState} frameState Frame state.
 * @protected
 * @return {!goog.vec.Mat4.Number} Transform.
 */
ol.renderer.canvas.Layer.prototype.getTransform = function(frameState) {
  var view2DState = frameState.view2DState;
  var devicePixelRatio = frameState.devicePixelRatio;
  return ol.vec.Mat4.makeTransform2D(this.transform_,
      devicePixelRatio * frameState.size[0] / 2,
      devicePixelRatio * frameState.size[1] / 2,
      devicePixelRatio / view2DState.resolution,
      -devicePixelRatio / view2DState.resolution,
      -view2DState.rotation,
      -view2DState.center[0], -view2DState.center[1]);
};