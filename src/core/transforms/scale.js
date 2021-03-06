/**

 A **Scale** applies a scaling transformation to associated {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.

 ## Overview

 <ul>
 <li>Scale is a sub-class of {{#crossLink "Transform"}}{{/crossLink}}</li>
 <li>Can be connected into hierarchies with other {{#crossLink "Transform"}}Transforms{{/crossLink}} and sub-classes</li>
 <li>{{#crossLink "GameObject"}}GameObjects{{/crossLink}} are connected to leaf {{#crossLink "Transform"}}Transforms{{/crossLink}}
 in the hierarchy, and will be transformed by each {{#crossLink "Transform"}}Transform{{/crossLink}} on the path up to the
 root, in that order.</li>
 <li>See <a href="Shader.html#inputs">Shader Inputs</a> for the variables that Transforms create within xeoEngine's shaders.</li>
 </ul>

 <<img src="../../../assets/images/Scale.png"></img>

 ## Example

 In this example we have two {{#crossLink "GameObject"}}GameObjects{{/crossLink}} that are transformed by a hierarchy that contains
 {{#crossLink "Rotate"}}{{/crossLink}}, {{#crossLink "Translate"}}{{/crossLink}} and Scale transforms.
 The GameObjects share the same {{#crossLink "Geometry"}}{{/crossLink}}, which is the default 2x2x2 cube.<br>

 ````javascript
var scene = new XEO.Scene();

var rotate = new XEO.Rotate(scene, {
    xyz: [0, 1, 0], // Rotate 30 degrees about Y axis
    angle: 30
});

var translate1 = new XEO.Translate(scene, {
    parent: rotate,
    xyz: [-5, 0, 0] // Translate along -X axis
});

var translate2 = new XEO.Translate(scene, {
    parent: rotate,
    xyz: [5, 0, 0] // Translate along +X axis
});

var scale = new XEO.Scale(scene, {
    parent: translate2,
    xyz: [1, 2, 1] // Scale x2 on Y axis
});

var geometry = new XEO.Geometry(scene); // Defaults to a 2x2x2 box

var gameObject1 = new XEO.GameObject(scene, {
    transform: translate1,
    geometry: geometry
});

var gameObject2 = new XEO.GameObject(scene, {
    transform: scale,
    geometry: geometry
});
 ````

Since everything in xeoEngine is dynamically editable, we can restructure the transform hierarchy at any time.

Let's insert a {{#crossLink "Scale"}}{{/crossLink}} between the first Translate and the first {{#crossLink "GameObject"}}{{/crossLink}}:

````javascript

var scale2 = new XEO.Scale(scene, {
    parent: translate1,
    xyz: [1, 1, 2] // Scale x2 on Z axis
});

gameObject2.transform = scale2;
````

 And just for fun, we'll start spinning the {{#crossLink "Rotate"}}{{/crossLink}}:

````javascript
// Rotate 0.2 degrees on each frame
scene.on("tick", function(e) {
    rotate.angle += 0.2;
});
````
 @class Scale
 @module XEO
 @submodule transforms
 @extends Transform
 */
(function () {

    "use strict";

    XEO.Scale = XEO.Transform.extend({

        type: "XEO.Scale",

        _init: function (cfg) {

            this._super(cfg);

            this.xyz = cfg.xyz;
        },

        _props: {

            /**
             * Vector indicating a scale factor for each axis.
             * Fires an {{#crossLink "Scale/xyz:event"}}{{/crossLink}} event on change.
             * @property xyz
             * @default [1,1,1]
             * @type {Array of Number}
             */
            xyz: {

                set: function (value) {

                    this._xyz = value || [1, 1, 1];

                    this.matrix = XEO.math.scalingMat4v(this._xyz);

                    /**
                     Fired whenever this Scale's {{#crossLink "Scale/xyz:property"}}{{/crossLink}} property changes.

                     @event xyz
                     @param value {Array of Number} The property's new value
                     */
                    this.fire("xyz", this._xyz);
                },

                get: function () {
                    return this._xyz;
                }
            }
        },

        _getJSON: function () {
            return {
                xyz: this.xyz
            };
        }
    });

})();
