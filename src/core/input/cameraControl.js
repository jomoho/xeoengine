/**
 A **CameraControl** pans, rotates and zooms a {{#crossLink "Camera"}}{{/crossLink}} using the mouse and keyboard,
 as well as switches it between preset left, right, anterior, posterior, superior and inferior views.

 A CameraControl is comprised of the following control components, which each handle an aspect of interaction:

 <ul>
 <li>panning - {{#crossLink "KeyboardPanCamera"}}{{/crossLink}} and {{#crossLink "MousePanCamera"}}{{/crossLink}}</li>
 <li>rotation - {{#crossLink "KeyboardOrbitCamera"}}{{/crossLink}} and {{#crossLink "MouseOrbitCamera"}}{{/crossLink}}</li>
 <li>zooming - {{#crossLink "KeyboardZoomCamera"}}{{/crossLink}} and {{#crossLink "MouseZoomCamera"}}{{/crossLink}}</li>
 <li>switching preset views - {{#crossLink "KeyboardAxisCamera"}}{{/crossLink}}</li>
 <li>picking - {{#crossLink "MousePickObject"}}{{/crossLink}}</li>
 <li>camera flight animation - {{#crossLink "CameraFlight"}}{{/crossLink}}</li>
 </ul>

 A CameraControl provides the controls as read-only properties, in case you need to configure or deactivate
 them individually.

 <ul>
 <li>Activating or deactivating the CameraControl will activate/deactivate all the controls in unison.</li>
 <li>Attaching a different {{#crossLink "Camera"}}{{/crossLink}} to the CameraControl will also attach that
 {{#crossLink "Camera"}}{{/crossLink}} to all the controls.</li>
 <li>The controls are not intended to be attached to a different {{#crossLink "Camera"}}{{/crossLink}} than the owner CameraControl.</li>
 <li>The CameraControl manages the lifecycles of the controls, destroying them when the CameraControl is destroyed.</li>
 </ul>

 ## Example

 ````Javascript
 var scene = new XEO.Scene();

 var camera = new XEO.Camera(scene);

 var cameraControl = new XEO.CameraControl(scene, {

        camera: camera,

        // "First person" mode rotates look about eye.
        // By default however, we orbit eye about look.
        firstPerson: false
    });

 // Reduce the sensitivity of mouse rotation
 cameraControl.mouseOrbit.sensitivity = 0.7;

 // Deactivate switching between preset views
 cameraControl.axisCamera.active = false;

 // Create a GameObject
 var object = new XEO.GameObject(scene);
 ````

 @class CameraControl
 @module XEO
 @submodule input
 @constructor
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}{{/crossLink}}.
 @param [cfg] {*} Configs
 @param [cfg.id] {String} Optional ID, unique among all components in the parent scene, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this CameraControl.
 @param [cfg.camera] {String|Camera} ID or instance of a {{#crossLink "Camera"}}Camera{{/crossLink}} to control.
 Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this CameraControl. Defaults to the
 parent {{#crossLink "Scene"}}Scene{{/crossLink}}'s default instance, {{#crossLink "Scene/camera:property"}}camera{{/crossLink}}.
 @param [cfg.active=true] {Boolean} Whether or not this CameraControl is active.
 @param [firstPerson=false] {Boolean} Whether or not this CameraControl is in "first person" mode.
 @extends Component
 */
(function () {

    "use strict";

    XEO.CameraControl = XEO.Component.extend({

        /**
         JavaScript class name for this Component.

         @property type
         @type String
         @final
         */
        type: "XEO.CameraControl",

        /**
         Indicates that only one instance of a CameraControl may be active within
         its {{#crossLink "Scene"}}{{/crossLink}} at a time. When a CameraControl is activated, that has
         a true value for this flag, then any other active CameraControl will be deactivated first.

         @property exclusive
         @type Boolean
         @final
         */
        exclusive: true,

        _init: function (cfg) {

            var self = this;

            var scene = this.scene;

            /**
             * The {{#crossLink "KeyboardAxisCamera"}}{{/crossLink}} within this CameraControl.
             *
             * @property keyboardAxis
             * @final
             * @type KeyboardAxisCamera
             */
            this.keyboardAxis = new XEO.KeyboardAxisCamera(scene, {
                camera: cfg.camera
            });

            /**
             * The {{#crossLink "KeyboardOrbitCamera"}}{{/crossLink}} within this CameraControl.
             *
             * @property keyboardOrbit
             * @final
             * @type KeyboardOrbitCamera
             */
            this.keyboardOrbit = new XEO.KeyboardOrbitCamera(scene, {
                sensitivity: 1,
                camera: cfg.camera
            });

            /**
             * The {{#crossLink "MouseOrbitCamera"}}{{/crossLink}} within this CameraControl.
             *
             * @property mouseOrbit
             * @final
             * @type MouseOrbitCamera
             */
            this.mouseOrbit = new XEO.MouseOrbitCamera(scene, {
                sensitivity: 1,
                camera: cfg.camera
            });

            /**
             * The {{#crossLink "KeyboardPanCamera"}}{{/crossLink}} within this CameraControl.
             *
             * @property keyboardPan
             * @final
             * @type KeyboardPanCamera
             */
            this.keyboardPan = new XEO.KeyboardPanCamera(scene, {
                sensitivity: 1,
                camera: cfg.camera
            });

            /**
             * The {{#crossLink "MousePanCamera"}}{{/crossLink}} within this CameraControl.
             *
             * @property mousePan
             * @final
             * @type MousePanCamera
             */
            this.mousePan = new XEO.MousePanCamera(scene, {
                sensitivity: 1,
                camera: cfg.camera
            });

            /**
             * The {{#crossLink "KeyboardZoomCamera"}}{{/crossLink}} within this CameraControl.
             *
             * @property keyboardZoom
             * @final
             * @type KeyboardZoomCamera
             */
            this.keyboardZoom = new XEO.KeyboardZoomCamera(scene, {
                sensitivity: 1,
                camera: cfg.camera
            });

            /**
             * The {{#crossLink "MouseZoomCamera"}}{{/crossLink}} within this CameraControl.
             *
             * @property mouseZoom
             * @final
             * @type MouseZoomCamera
             */
            this.mouseZoom = new XEO.MouseZoomCamera(scene, {
                sensitivity: 1,
                camera: cfg.camera
            });

            /**
             * The {{#crossLink "MousePickObject"}}{{/crossLink}} within this CameraControl.
             *
             * @property mousePickObject
             * @final
             * @type MousePickObject
             */
            this.mousePickObject = new XEO.MousePickObject(scene, {
                rayPick: true,
                camera: cfg.camera
            });

            /**
             * The {{#crossLink "CameraFlight"}}{{/crossLink}} within this CameraControl.
             *
             * @property cameraFly
             * @final
             * @type CameraFlight
             */
            this.cameraFly = new XEO.CameraFlight(scene, {
                camera: cfg.camera
            });

            this.mousePickObject.on("pick",
                function (e) {

                    var view = self.cameraFly.camera.view;

                    var diff = XEO.math.subVec3(view.eye, view.look, []);

                    self.cameraFly.flyTo({
                        look: e.worldPos,
                        eye: [
                            e.worldPos[0] + diff[0],
                            e.worldPos[1] + diff[1],
                            e.worldPos[2] + diff[2]
                        ]
                    });
                });

            // Handle when nothing is picked
            this.mousePickObject.on("nopick",
                function (e) {
                    // alert("Mothing picked");
                });

            this.firstPerson = cfg.firstPerson;
            this.camera = cfg.camera;
            this.active = cfg.active !== false;
        },

        _props: {

            /**
             * Flag which indicates whether this CameraControl is in "first person" mode.
             *
             * In "first person" mode (disabled by default) the look position rotates about the eye position. Otherwise,
             * the eye rotates about the look.
             *
             * Fires a {{#crossLink "KeyboardOrbitCamera/firstPerson:event"}}{{/crossLink}} event on change.
             *
             * @property firstPerson
             * @default false
             * @type Boolean
             */
            firstPerson: {

                set: function (value) {

                    value = !!value;

                    this._firstPerson = value;

                    this.keyboardOrbit.firstPerson = value;
                    this.mouseOrbit.firstPerson = value;

                    /**
                     * Fired whenever this CameraControl's {{#crossLink "CameraControl/firstPerson:property"}}{{/crossLink}} property changes.
                     * @event firstPerson
                     * @param value The property's new value
                     */
                    this.fire('firstPerson', this._firstPerson);
                },

                get: function () {
                    return this._firstPerson;
                }
            },

            /**
             * The {{#crossLink "Camera"}}{{/crossLink}} being controlled by this CameraControl.
             *
             * Must be within the same {{#crossLink "Scene"}}{{/crossLink}} as this CameraControl. Defaults to the parent
             * {{#crossLink "Scene"}}Scene's{{/crossLink}} default {{#crossLink "Scene/camera:property"}}camera{{/crossLink}} when set to
             * a null or undefined value.
             *
             * @property camera
             * @type Camera
             */
            camera: {

                set: function (value) {

                    /**
                     * Fired whenever this CameraControl's {{#crossLink "CameraControl/camera:property"}}{{/crossLink}}
                     * property changes.
                     *
                     * @event camera
                     * @param value The property's new value
                     */
                    this._setChild("camera", value);

                    // Update camera on child components

                    var camera = this._children.camera;

                    this.keyboardAxis.camera = camera;
                    this.keyboardOrbit.camera = camera;
                    this.mouseOrbit.camera = camera;
                    this.keyboardPan.camera = camera;
                    this.mousePan.camera = camera;
                    this.keyboardZoom.camera = camera;
                    this.mouseZoom.camera = camera;
                    this.cameraFly.camera = camera;
                },

                get: function () {
                    return this._camera;
                }
            },

            /**
             * Flag which indicates whether this CameraControl is active or not.
             *
             * Fires an {{#crossLink "CameraControl/active:event"}}{{/crossLink}} event on change.
             *
             * @property active
             * @type Boolean
             */
            active: {

                set: function (value) {

                    value = !!value;

                    if (this._active === value) {
                        return;
                    }

                    // Activate or deactivate child components

                    this.keyboardAxis.active = value;
                    this.keyboardOrbit.active = value;
                    this.mouseOrbit.active = value;
                    this.keyboardPan.active = value;
                    this.mousePan.active = value;
                    this.keyboardZoom.active = value;
                    this.mouseZoom.active = value;
                    this.mousePickObject.active = value;
                    this.cameraFly.active = value;

                    /**
                     * Fired whenever this CameraControl's {{#crossLink "CameraControl/active:property"}}{{/crossLink}} property changes.
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

            this.keyboardAxis.destroy();
            this.keyboardOrbit.destroy();
            this.mouseOrbit.destroy();
            this.keyboardPan.destroy();
            this.mousePan.destroy();
            this.keyboardZoom.destroy();
            this.mouseZoom.destroy();
            this.mousePickObject.destroy();
            this.cameraFly.destroy();
        }
    });

})();
