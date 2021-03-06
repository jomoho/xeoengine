/**
 A **Torus** defines toroid geometry for attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.

 ## Example

 ````javascript

 ````

 @class Torus
 @module XEO
 @submodule geometry
 @constructor
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}Scene{{/crossLink}} - creates this Torus in the default
 {{#crossLink "Scene"}}Scene{{/crossLink}} when omitted.
 @param [cfg] {*} Configs
 @param [cfg.id] {String} Optional ID, unique among all components in the parent {{#crossLink "Scene"}}Scene{{/crossLink}},
 generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this Torus.
 @param [cfg.radius=1] {Number}
 @param [cfg.tube=0.3] {Number}
 @param [cfg.segmentsR=32] {Number}
 @param [cfg.segmentsT=24] {Number}
 @param [cfg.arc=Math.PI / 2.0] {Number}
 @extends Geometry
 */
(function () {

    "use strict";

    XEO.Torus = XEO.Geometry.extend({

        type: "XEO.Torus",

        _init: function (cfg) {

            this._super(cfg);

            this.radius = cfg.radius;
            this.tube = cfg.tube;
            this.segmentsR = cfg.segmentsR;
            this.segmentsT = cfg.segmentsT;
            this.arc = cfg.arc;

            this._build2();
        },

        _scheduleBuild2: function () {
            if (!this._dirty) {
                this._dirty = true;
                var self = this;
                this.scene.once("tick",
                    function () {
                        self._build2();
                    });
            }
        },

        _build2: function () {

            var radius = this._radius;
            var tube = this._tube;
            var segmentsR = this._segmentsR;
            var segmentsT = this._segmentsT;
            var arc = this._arc;

            var positions = [];
            var normals = [];
            var uvs = [];
            var indices = [];

            var u;
            var v;
            var centerX;
            var centerY;
            var centerZ = 0;
            var x;
            var y;
            var z;
            var vec;

            var i;
            var j;

            for (j = 0; j <= segmentsR; j++) {
                for (i = 0; i <= segmentsT; i++) {

                    u = i / segmentsT * arc;
                    v = j / segmentsR * Math.PI * 2;

                    centerX = radius * Math.cos(u);
                    centerY = radius * Math.sin(u);

                    x = (radius + tube * Math.cos(v) ) * Math.cos(u);
                    y = (radius + tube * Math.cos(v) ) * Math.sin(u);
                    z = tube * Math.sin(v);

                    positions.push(x);
                    positions.push(y);
                    positions.push(z);

                    uvs.push(i / segmentsT);
                    uvs.push(1 - j / segmentsR);

                    vec = XEO.math.normalizeVec3(XEO.math.subVec3([x, y, z], [centerX, centerY, centerZ], []), []);

                    normals.push(vec[0]);
                    normals.push(vec[1]);
                    normals.push(vec[2]);
                }
            }

            var a;
            var b;
            var c;
            var d;

            for (j = 1; j <= segmentsR; j++) {
                for (i = 1; i <= segmentsT; i++) {

                    a = ( segmentsT + 1 ) * j + i - 1;
                    b = ( segmentsT + 1 ) * ( j - 1 ) + i - 1;
                    c = ( segmentsT + 1 ) * ( j - 1 ) + i;
                    d = ( segmentsT + 1 ) * j + i;

                    indices.push(a);
                    indices.push(b);
                    indices.push(c);

                    indices.push(c);
                    indices.push(d);
                    indices.push(a);
                }
            }

            this.positions = positions;
            this.normals = normals;
            this.uv = uvs;
            this.indices = indices;

            this._dirty = false;
        },

        _props: {

            /**
             * The Torus's radius.
             *
             * Fires a {{#crossLink "Torus/radius:event"}}{{/crossLink}} event on change.
             *
             * @property radius
             * @default 1
             * @type Number
             */
            radius: {

                set: function (value) {

                    value = value || 1;

                    if (this._radius === value) {
                        return;
                    }

                    if (value < 0) {
                        this.warn("negative radius not allowed - will invert");
                        value = value * -1;
                    }

                    this._radius = value;

                    /**
                     * Fired whenever this Torus's {{#crossLink "Torus/radius:property"}}{{/crossLink}} property changes.
                     * @event radius
                     * @type Number
                     * @param value The property's new value
                     */
                    this.fire("radius", this._radius);

                    this._scheduleBuild2();
                },

                get: function () {
                    return this._radius;
                }
            },


            /**
             * The Torus's tube.
             *
             * Fires a {{#crossLink "Torus/tube:event"}}{{/crossLink}} event on change.
             *
             * @property tube
             * @default 0.3
             * @type Number
             */
            tube: {

                set: function (value) {

                    value = value || 0.3;

                    if (this._tube === value) {
                        return;
                    }

                    if (value < 0) {
                        this.warn("negative tube not allowed - will invert");
                        value = value * -1;
                    }

                    this._tube = value;

                    /**
                     * Fired whenever this Torus's {{#crossLink "Torus/tube:property"}}{{/crossLink}} property changes.
                     * @event tube
                     * @type Number
                     * @param value The property's new value
                     */
                    this.fire("tube", this._tube);

                    this._scheduleBuild2();
                },

                get: function () {
                    return this._tube;
                }
            },

            /**
             * The Torus's segmentsR.
             *
             * Fires a {{#crossLink "Torus/segmentsR:event"}}{{/crossLink}} event on change.
             *
             * @property segmentsR
             * @default 32
             * @type Number
             */
            segmentsR: {

                set: function (value) {

                    value = value || 32;

                    if (this._segmentsR === value) {
                        return;
                    }

                    if (value < 0) {
                        this.warn("negative segmentsR not allowed - will invert");
                        value = value * -1;
                    }

                    this._segmentsR = value;

                    /**
                     * Fired whenever this Torus's {{#crossLink "Torus/segmentsR:property"}}{{/crossLink}} property changes.
                     * @event segmentsR
                     * @type Number
                     * @param value The property's new value
                     */
                    this.fire("segmentsR", this._segmentsR);

                    this._scheduleBuild2();
                },

                get: function () {
                    return this._segmentsR;
                }
            },


            /**
             * The Torus's segmentsT.
             *
             * Fires a {{#crossLink "Torus/segmentsT:event"}}{{/crossLink}} event on change.
             *
             * @property segmentsT
             * @default 24
             * @type Number
             */
            segmentsT: {

                set: function (value) {

                    value = value || 24;

                    if (this._segmentsT === value) {
                        return;
                    }

                    if (value < 0) {
                        this.warn("negative segmentsT not allowed - will invert");
                        value = value * -1;
                    }

                    this._segmentsT = value;

                    /**
                     * Fired whenever this Torus's {{#crossLink "Torus/segmentsT:property"}}{{/crossLink}} property changes.
                     * @event segmentsT
                     * @type Number
                     * @param value The property's new value
                     */
                    this.fire("segmentsT", this._segmentsT);

                    this._scheduleBuild2();
                },

                get: function () {
                    return this._segmentsT;
                }
            },

            /**
             * The Torus's arc.
             *
             * Fires a {{#crossLink "Torus/arc:event"}}{{/crossLink}} event on change.
             *
             * @property arc
             * @default Math.PI * 2
             * @type Number
             */
            arc: {

                set: function (value) {

                    value = value || Math.PI * 2;

                    if (this._arc === value) {
                        return;
                    }

                    if (value < 0) {
                        this.warn("negative arc not allowed - will invert");
                        value = value * -1;
                    }

                    this._arc = value;

                    /**
                     * Fired whenever this Torus's {{#crossLink "Torus/arc:property"}}{{/crossLink}} property changes.
                     * @event arc
                     * @type Number
                     * @param value The property's new value
                     */
                    this.fire("arc", this._arc);

                    this._scheduleBuild2();
                },

                get: function () {
                    return this._arc;
                }
            }
        },

        _getJSON: function () {
            return XEO._apply2({
                radius: this._radius,
                tube: this._tube,
                segmentsR: this._segmentsR,
                segmentsT: this._segmentsT,
                arc: this._arc
            }, {});
        }
    });

})();
