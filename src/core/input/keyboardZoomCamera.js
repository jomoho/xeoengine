/**
 A **KeyboardZoomCamera** zooms a {{#crossLink "Camera"}}{{/crossLink}} using the + and - keys.

 ## Overview

 <ul>
 <li>A KeyboardZoomCamera updates the {{#crossLink "Lookat"}}{{/crossLink}} attached to the target {{#crossLink "Camera"}}{{/crossLink}}.
 <li>Zooming involves translating the positions of the {{#crossLink "Lookat"}}Lookat's{{/crossLink}}
 {{#crossLink "Lookat/eye:property"}}{{/crossLink}} and {{#crossLink "Lookat/look:property"}}{{/crossLink}} back and forth
 along the {{#crossLink "Lookat/eye:property"}}{{/crossLink}}-&gt;{{#crossLink "Lookat/look:property"}}{{/crossLink}} vector.</li>
 </ul>

 ## Example

 ````Javascript
 var scene = new XEO.Scene();

 var camera = new XEO.Camera(scene);

 var control = new XEO.KeyboardZoomCamera(scene, {
        camera: camera
    });

 var object = new XEO.GameObject(scene);
 ````

 @class KeyboardZoomCamera
 @module XEO
 @submodule input
 @constructor
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}{{/crossLink}}.
 @param [cfg] {*} Configs
 @param [cfg.id] {String} Optional ID, unique among all components in the parent scene, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this KeyboardZoomCamera.
 @param [cfg.camera] {String|Camera} ID or instance of a {{#crossLink "Camera"}}Camera{{/crossLink}} to control.
 Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this KeyboardZoomCamera. Defaults to the
 parent {{#crossLink "Scene"}}Scene{{/crossLink}}'s default instance, {{#crossLink "Scene/camera:property"}}camera{{/crossLink}}.
 @param [cfg.sensitivity=1.0] {Number} Zoom sensitivity factor.
 @param [cfg.active=true] {Boolean} Whether or not this KeyboardZoomCamera is active.
 @extends Component
 */
(function () {

    "use strict";

    XEO.KeyboardZoomCamera = XEO.Component.extend({

        /**
         JavaScript class name for this Component.

         @property type
         @type String
         @final
         */
        type: "XEO.KeyboardZoomCamera",

        _init: function (cfg) {

            // Event handles

            this._onTick = null;

            // Init properties

            this.camera = cfg.camera;
            this.sensitivity = cfg.sensitivity;
            this.active = cfg.active !== false;
        },

        _props: {

            /**
             * The {{#crossLink "Camera"}}Camera{{/crossLink}} attached to this KeyboardZoomCamera.
             *
             * Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this KeyboardZoomCamera. Defaults to the parent
             * {{#crossLink "Scene"}}Scene{{/crossLink}}'s default {{#crossLink "Scene/camera:property"}}camera{{/crossLink}} when set to
             * a null or undefined value.
             *
             * Fires a {{#crossLink "KeyboardZoomCamera/camera:event"}}{{/crossLink}} event on change.
             *
             * @property camera
             * @type Camera
             */
            camera: {

                set: function (value) {

                    /**
                     * Fired whenever this KeyboardZoomCamera's {{#crossLink "KeyboardZoomCamera/camera:property"}}{{/crossLink}} property changes.
                     *
                     * @event camera
                     * @param value The property's new value
                     */
                    this._setChild("camera", value);
                },

                get: function () {
                    return this._children.camera;
                }
            },

            /**
             * The sensitivity of this KeyboardZoomCamera.
             *
             * Fires a {{#crossLink "KeyboardZoomCamera/sensitivity:event"}}{{/crossLink}} event on change.
             *
             * @property sensitivity
             * @type Number
             * @default 1.0
             */
            sensitivity: {

                set: function (value) {

                    this._sensitivity = value || 1.0;

                    /**
                     * Fired whenever this KeyboardZoomCamera's  {{#crossLink "KeyboardZoomCamera/sensitivity:property"}}{{/crossLink}} property changes.
                     *
                     * @event sensitivity
                     * @param value The property's new value
                     */
                    this.fire("sensitivity", this._sensitivity);
                },

                get: function () {
                    return this._sensitivity;
                }
            },

            /**
             * Flag which indicates whether this KeyboardZoomCamera is active or not.
             *
             * Fires an {{#crossLink "KeyboardZoomCamera/active:event"}}{{/crossLink}} event on change.
             *
             * @property active
             * @type Boolean
             */
            active: {

                set: function (value) {

                    if (this._active === value) {
                        return;
                    }

                    var input = this.scene.input;

                    if (value) {

                        var self = this;

                        this._onTick = this.scene.on("tick",
                            function (params) {

                                var camera = self._children.camera;

                                if (!camera) {
                                    return;
                                }

                                var elapsed = params.deltaTime;

                                if (!input.ctrlDown && !input.altDown) {

                                    var wkey = input.keyDown[input.KEY_ADD];
                                    var skey = input.keyDown[input.KEY_SUBTRACT];

                                    if (wkey || skey) {

                                        var z = 0;

                                        var sensitivity = self.sensitivity * 15.0;

                                        if (skey) {
                                            z = elapsed * sensitivity;

                                        } else if (wkey) {
                                            z = -elapsed * sensitivity;
                                        }

                                        camera.view.zoom(z);
                                    }
                                }
                            });

                    } else {

                        if (this._onTick !== null) {
                            this.scene.off(this._onTick);
                        }
                    }

                    /**
                     * Fired whenever this KeyboardZoomCamera's {{#crossLink "KeyboardZoomCamera/active:property"}}{{/crossLink}} property changes.
                     * @event active
                     * @param value The property's new value
                     */
                    this.fire('active', this._active = value);
                },

                get: function () {
                    return this._active;
                }
            }
        },

        _getJSON: function () {

            var json = {
                sensitivity: this._sensitivity,
                active: this._active
            };

            if (this._children.camera) {
                json.camera = this._children.camera.id;
            }

            return json;
        },

        _destroy: function () {
            this.active = false;
        }
    });

})();
