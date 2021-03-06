
/**
 A **Layer** specifies the render order of {{#crossLink "GameObject"}}GameObjects{{/crossLink}} within their {{#crossLink "Stage"}}Stages{{/crossLink}}.

 ## Overview

 <ul>
 <li>When xeoEngine renders a {{#crossLink "Scene"}}Scene{{/crossLink}}, each {{#crossLink "Stage"}}Stage{{/crossLink}} within that will render its bin
 of {{#crossLink "GameObject"}}GameObjects{{/crossLink}} in turn, from the lowest priority {{#crossLink "Stage"}}Stage{{/crossLink}} to the highest.</li>

 <li>{{#crossLink "Stage"}}Stages{{/crossLink}} are typically used for ordering the render-to-texture steps in posteffects pipelines.</li>

 <li>You can control the render order of the individual {{#crossLink "GameObject"}}GameObjects{{/crossLink}} ***within*** a {{#crossLink "Stage"}}Stage{{/crossLink}}
 by associating them with {{#crossLink "Layer"}}Layers{{/crossLink}}.</li>

 <li>{{#crossLink "Layer"}}Layers{{/crossLink}} are typically used to <a href="https://www.opengl.org/wiki/Transparency_Sorting" target="_other">transparency-sort</a> the
 {{#crossLink "GameObject"}}GameObjects{{/crossLink}} within {{#crossLink "Stage"}}Stages{{/crossLink}}.</li>


 <li>{{#crossLink "GameObject"}}GameObjects{{/crossLink}} not explicitly attached to a Layer are implicitly
 attached to the {{#crossLink "Scene"}}Scene{{/crossLink}}'s default
 {{#crossLink "Scene/layer:property"}}layer{{/crossLink}}. which has
 a {{#crossLink "Layer/priority:property"}}{{/crossLink}} value of zero.</li>

 <li>You can use Layers without defining any {{#crossLink "Stage"}}Stages{{/crossLink}} if you simply let your
 {{#crossLink "GameObject"}}GameObjects{{/crossLink}} fall back on the {{#crossLink "Scene"}}Scene{{/crossLink}}'s default
 {{#crossLink "Scene/stage:property"}}stage{{/crossLink}}. which has a {{#crossLink "Stage/priority:property"}}{{/crossLink}} value of zero.</li>
 </ul>

 <img src="../../../assets/images/Layer.png"></img>

 ## Example

 In this example we'll use Layers to perform <a href="https://www.opengl.org/wiki/Transparency_Sorting" target="_other">transparency sorting</a>,
 which ensures that transparent objects are rendered farthest-to-nearest, so that they alpha-blend correctly with each other.

 We want to render the three nested boxes shown below, in which the innermost box is opaque and blue,
 the box enclosing that is transparent and yellow, and the outermost box is transparent and green. We need the boxes to
 render in order innermost-to-outermost, in order to blend transparencies correctly.

 <img src="../../assets/images/transparencySort.jpg"></img>

 Our scene has one {{#crossLink "Stage"}}{{/crossLink}}, just for completeness. As mentioned earlier, you don't have to
 create this because the {{#crossLink "Scene"}}{{/crossLink}} will provide its default {{#crossLink "Stage"}}{{/crossLink}}.
 Then, within that {{#crossLink "Stage"}}{{/crossLink}}, we create a {{#crossLink "GameObject"}}{{/crossLink}} for each box,
 each assigned to a different prioritised {{#crossLink "Layer"}}{{/crossLink}} to ensure that they are rendered in the right order.

 ````javascript
var scene = new XEO.Scene();

// View transform
var lookat = new XEO.Lookat(scene, {
    eye: [0,0,10]
});

// Camera, using Scene's default projection transform
var camera = new XEO.Camera(scene, {
    view: lookat
});

// A Stage, just for completeness
// We could instead just implicitly use the Scene's default Stage
var stage = new XEO.Stage(scene, {
    priority: 0
});

// Geometry with no parameters defaults to a 2x2x2 box
var geometry = new XEO.Geometry(scene);

//-----------------------------------------------------------------------------
// Innermost box
// Blue and opaque, in Layer with render order 0, renders first
 //-----------------------------------------------------------------------------

var layer1 = new XEO.Layer(scene, {
    priority: 1
});

var material1 = new XEO.PhongMaterial(scene, {
    diffuse: [0.2, 0.2, 1.0],
    opacity: 1.0
});

var object1 = new XEO.GameObject(scene, {
    camera: camera,
    geometry: geometry,
    stage: stage,
    layer: layer1,
    material: material1
});

//-----------------------------------------------------------------------------
// Middle box
// Red and transparent, in Layer with render order 2, renders next
 //-----------------------------------------------------------------------------

var layer2 = new XEO.Layer(scene, {
    priority: 2
});

var material2 = new XEO.PhongMaterial(scene, {
    diffuse: [1, 0.2, 0.2],
    opacity: 0.2
});

var scale2 = new XEO.Scale(scene, {
    xyz: [6, 6, 6]
});

var object2 = new XEO.GameObject(scene, {
    camera: camera,
    geometry: geometry,
    stage: stage,
    layer: layer2,
    material: material2,
    scale: scale2
});

//-----------------------------------------------------------------------------
// Outermost box
// Green and transparent, in Layer with render order 3, renders last
//-----------------------------------------------------------------------------

var layer3 = new XEO.Layer(scene, {
    priority: 3
});

var material3 = new XEO.PhongMaterial(scene, {
    diffuse: [0.2, 1, 0.2],
    opacity: 0.2
});

var scale3 = new XEO.Scale(scene, {
    xyz: [9, 9, 9]
});

var object3 = new XEO.GameObject(scene, {
    camera: camera,
    geometry: geometry,
    stage: stage,
    layer: layer3,
    material: material3,
    scale: scale3
});

 ````

 @class Layer
 @module XEO
 @submodule rendering
 @constructor
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}Scene{{/crossLink}} - creates this Geometry in the default
 {{#crossLink "Scene"}}Scene{{/crossLink}} when omitted.
 @param [cfg] {*} Configs
 @param [cfg.id] {String} Optional ID, unique among all components in the parent scene, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this Layer.
 @param [cfg.priority=0] {Number} The rendering priority,
 @extends Component
 */
(function () {

    "use strict";

    XEO.Layer = XEO.Component.extend({

        type: "XEO.Layer",

        _init: function (cfg) {

            this._state = new XEO.renderer.Layer({
                priority: 0
            });

            this.priority = cfg.priority;
        },

        _props: {

            /**
             * Indicates this Layer's rendering priority for the attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.
             *
             * Each {{#crossLink "GameObject"}}{{/crossLink}} is also attached to a {{#crossLink "Stage"}}Stage{{/crossLink}}, which sets a *stage* rendering
             * priority via its {{#crossLink "Stage/priority:property"}}priority{{/crossLink}} property.
             *
             * Fires a {{#crossLink "Layer/priority:event"}}{{/crossLink}} event on change.
             *
             * @property priority
             * @default 0
             * @type Number
             */
            priority: {

                set: function (value) {

                    this._state.priority = value || 0;

                    this._renderer.stateOrderDirty = true;

                    /**
                     * Fired whenever this Layer's  {{#crossLink "Layer/priority:property"}}{{/crossLink}} property changes.
                     *
                     * @event priority
                     * @param value The property's new value
                     */
                    this.fire("priority", this._state.priority);
                },

                get: function () {
                    return this._state.priority;
                }
            }
        },

        _compile: function () {
            this._renderer.layer = this._state;
        },

        _getJSON: function () {
            return {
                priority: this._state.priority
            };
        },

        _destroy: function () {
            this._state.destroy();
        }
    });

})();
