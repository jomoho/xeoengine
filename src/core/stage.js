"use strict";

/**
 Partitions associated {{#crossLink "GameObject"}}GameObjects{{/crossLink}} into ordered render bins.

 <ul>
 <li>When the parent {{#crossLink "Scene"}}Scene{{/crossLink}} renders, each Stage renders its bin
 of {{#crossLink "GameObject"}}GameObjects{{/crossLink}} in turn, from the lowest priority Stage to the highest.</li>

 <li>Stages are typically used for ordering the render-to-texture steps in posteffects pipelines.</li>

 <li>You can control the render order of the individual {{#crossLink "GameObject"}}GameObjects{{/crossLink}} ***within*** a Stage
 by associating them with {{#crossLink "Layer"}}Layers{{/crossLink}}.</li>

 <li>{{#crossLink "Layer"}}Layers{{/crossLink}} are typically used to <a href="https://www.opengl.org/wiki/Transparency_Sorting" target="_other">transparency-sort</a> the
 {{#crossLink "GameObject"}}GameObjects{{/crossLink}} within Stages.</li>

 <li>{{#crossLink "GameObject"}}GameObjects{{/crossLink}} not explicitly associated with a Stage are implicitly
 associated with the {{#crossLink "Scene"}}Scene{{/crossLink}}'s default
 {{#crossLink "Scene/stage:property"}}stage{{/crossLink}}. which has
 a {{#crossLink "Stage/priority:property"}}{{/crossLink}} value of zero.</li>

 </ul>

 <img src="http://www.gliffy.com/go/publish/image/7105073/L.png"></img>

 ### Example

 In example below, we're performing render-to-texture using {{#crossLink "ColorTarget"}}ColorTarget{{/crossLink}} and
 {{#crossLink "Texture"}}Texture{{/crossLink}} components.

 Note how we use two prioritized Stages, to ensure that the {{#crossLink "ColorTarget"}}ColorTarget{{/crossLink}} is
 rendered ***before*** the {{#crossLink "Texture"}}Texture{{/crossLink}} that consumes it.

 ````javascript
 var scene = new XEO.Scene();

 // First stage: an GameObject that renders to a ColorTarget

 var stage1 = new XEO.Stage(scene, {
       priority: 0
  });

 var geometry = new XEO.Geometry(scene); // Geometry with no parameters defaults to a 2x2x2 box

 var colorTarget = new XEO.ColorTarget(scene);

 var object1 = new XEO.GameObject(scene, {
       stage: stage1,
       geometry: geometry,
       colorTarget: colorTarget
  });


 // Second stage: an GameObject with a Texture that sources from the ColorTarget

 var stage2 = new XEO.Stage(scene, {
       priority: 1
  });

 var texture = new XEO.Texture(scene, {
       target: colorTarget
  });

 var material = new XEO.Material(scene, {
       textures: [
           texture
       ]
  });

 var geometry2 = new XEO.Geometry(scene);

 var object2 = new XEO.GameObject(scene, {
       stage: stage2,
       material: material,
       geometry: geometry2
  });
 ````

 @class Stage
 @module XEO
 @constructor
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}Scene{{/crossLink}} - creates this Stage in the default
 {{#crossLink "Scene"}}Scene{{/crossLink}} when omitted.
 @param [cfg] {*} Configs
 @param [cfg.id] {String} Optional ID, unique among all components in the parent scene, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this Stage.
 @param [cfg.priority=0] {Number} The rendering priority for the associated {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.
 @param [cfg.pickable=true] {Boolean} Indicates whether associated {{#crossLink "GameObject"}}GameObjects{{/crossLink}} are pickable.
 @extends Component
 */
XEO.Stage = XEO.Component.extend({

    className: "XEO.Stage",

    type: "stage",

    _init: function (cfg) {
        this.priority = cfg.priority;
        this.pickable = cfg.pickable;
    },

    /**
     * Indicates the rendering priority for the {{#crossLink "GameObject"}}GameObjects{{/crossLink}} in this Stage.
     *
     * Fires a {{#crossLink "Stage/priority:event"}}{{/crossLink}} event on change.
     *
     * @property priority
     * @default 0
     * @type Number
     */
    set priority(value) {
        value = value || 0;
        this._core.priority = value;
        this._renderer.stateOrderDirty = true;

        /**
         * Fired whenever this Stage's {{#crossLink "Stage/priority:property"}}{{/crossLink}} property changes.
         * @event priority
         * @param value The property's new value
         */
        this.fire("priority", value);
    },

    get priority() {
        return this._core.priority;
    },

    /**
     * Indicates whether the associated {{#crossLink "GameObject"}}GameObjects{{/crossLink}} are pickable (see {{#crossLink "Canvas/pick:method"}}Canvas#pick{{/crossLink}}).
     *
     * Fires a {{#crossLink "Stage/pickable:event"}}{{/crossLink}} event on change.
     * @property pickable
     * @default true
     * @type Boolean
     */
    set pickable(value) {
        value = value !== false; // Default is true
        this._core.pickable = value;
        this._renderer.drawListDirty = true;

        /**
         * Fired whenever this Stage's {{#crossLink "Stage/pickable:pickable"}}{{/crossLink}} property changes.
         * @event pickable
         * @param value The property's new value
         */
        this.fire("pickable", value);
    },

    get pickable() {
        return this._core.pickable;
    },

    _compile: function () {
        this._renderer.stage = this._core;
    },

    _getJSON: function () {
        return {
            priority: this.priority,
            pickable: this.pickable
        };
    }
});