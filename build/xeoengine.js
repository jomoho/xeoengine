/*
 * xeoEngine V0.1.0
 *
 * A WebGL-based 3D scene graph from xeoLabs
 * http://xeoengine.org/
 *
 * Built on 2015-08-18
 *
 * MIT License
 * Copyright 2015, Lindsay Kay
 * http://xeolabs.com/
 *
 */

/**
 The xeoEngine namespace.

 @class XEO
 @main XEO
 @static
 @author xeolabs / http://xeolabs.com/
 */
(function () {

    "use strict";

    var XEO = function () {

        // Ensures unique scene IDs
        // Lazy-instantiated because class won't be defined yet
        this._sceneIDMap = null;

        // Default singleton Scene, lazy-initialized in getter
        this._scene = null;

        /**
         * Existing  {{#crossLink "Scene"}}Scene{{/crossLink}}s , mapped to their IDs
         * @property scenes
         * @namespace XEO
         * @type {{String:XEO.Scene}}
         */
        this.scenes = {};

        // Map of Scenes needing recompilation
        this._dirtyScenes = {};

        var self = this;

        // Called on each animation frame
        // fires a "tick" event on each scene, recompiles scenes as needed

        var tickEvent = {
            sceneId: null,
            time: null,
            startTime: null,
            prevTime: null,
            deltaTime: null
        };

        var frame = function () {

            var time = (new Date()).getTime() * 0.001;

            tickEvent.time = time;

            var scene;

            for (var id in self.scenes) {
                if (self.scenes.hasOwnProperty(id)) {

                    scene = self.scenes[id];

                    // Fire the tick event on the scene

                    tickEvent.sceneId = id;
                    tickEvent.startTime = scene.startTime;
                    tickEvent.deltaTime = tickEvent.prevTime != null ? time - tickEvent.prevTime : 0;

                    scene.fire("tick", tickEvent, true);

                    // Recompile the scene if it's now dirty
                    // after handling the tick event

                    // if (self._dirtyScenes[id]) {

                    scene._compile();

                    self._dirtyScenes[id] = false;
                    // }
                }
            }

            tickEvent.prevTime = time;

            window.requestAnimationFrame(frame);
        };

        window.requestAnimationFrame(frame);
    };

    XEO.prototype = {

        constructor: XEO,

        /**
         The default {{#crossLink "Scene"}}Scene{{/crossLink}}.

         Components created without an explicit parent {{#crossLink "Scene"}}Scene{{/crossLink}} will be created within this
         {{#crossLink "Scene"}}Scene{{/crossLink}} by default.

         xeoEngine creates the default {{#crossLink "Scene"}}Scene{{/crossLink}} as soon as you either
         reference this property for the first time, or create your first {{#crossLink "GameObject"}}GameObject{{/crossLink}} without
         a specified {{#crossLink "Scene"}}Scene{{/crossLink}}.

         @property scene
         @namespace XEO
         @final
         @type Scene
         */
        get scene() {

            // XEO.Scene constructor will call this._addScene
            // to register itself on XEO

            return this._scene || (this._scene = new window.XEO.Scene({
                    id: "default.scene"
                }));
        },

        /**
         * Registers a scene on xeoEngine.
         * This is called within the XEO.Scene constructor.
         *
         * @method _addScene
         * @param {Scene} scene The scene
         * @private
         */
        _addScene: function (scene) {

            this._sceneIDMap = this._sceneIDMap || new window.XEO.utils.Map();

            if (scene.id) {

                // User-supplied ID

                if (this.scenes[scene.id]) {
                    console.error("[ERROR] Scene " + XEO._inQuotes(scene.id) + " already exists");
                    return;
                }

            } else {

                // Auto-generated ID

                scene.id = this._sceneIDMap.addItem(scene);
            }

            this.scenes[scene.id] = scene;

            var self = this;

            // Unregister destroyed scenes

            scene.on("destroyed",
                function () {

                    self._sceneIDMap.removeItem(scene.id);

                    delete self.scenes[scene.id];

                    delete self._dirtyScenes[scene.id];
                });

            // Schedule recompilation of dirty scenes for next animation frame

            scene.on("dirty",
                function () {
                    self._dirtyScenes[scene.id] = true;
                });
        },

        /**
         * Destroys all user-created {{#crossLink "Scene"}}Scenes{{/crossLink}} and
         * clears the default {{#crossLink "Scene"}}Scene{{/crossLink}}.
         *
         * @method clear
         */
        clear: function () {

            var scene;

            for (var id in this.scenes) {
                if (this.scenes.hasOwnProperty(id)) {

                    scene = this.scenes[id];

                    // Only clear the default Scene
                    // but destroy all the others

                    if (id === "default.scene") {
                        scene.clear();
                    } else {
                        scene.destroy();
                    }
                }
            }
            this.scenes = {};
            this._dirtyScenes = {};
        },

        /**
         * Tests if the given object is an array
         * @private
         */
        _isArray: function (testGameObject) {
            return testGameObject && !(testGameObject.propertyIsEnumerable('length')) && typeof testGameObject === 'object' && typeof testGameObject.length === 'number';
        },

        /**
         * Tests if the given value is a string
         * @param value
         * @returns {boolean}
         * @private
         */
        _isString: function (value) {
            return (typeof value === 'string' || value instanceof String);
        },


        /**
         * Tests if the given value is a number
         * @param value
         * @returns {boolean}
         * @private
         */
        _isNumeric: function (value) {
            return !isNaN(parseFloat(value)) && isFinite(value);
        },

        /** Returns a shallow copy
         */
        _copy: function (o) {
            return this._apply(o, {});
        },

        /** Add properties of o to o2, overwriting them on o2 if already there
         */
        _apply: function (o, o2) {
            for (var name in o) {
                if (o.hasOwnProperty(name)) {
                    o2[name] = o[name];
                }
            }
            return o2;
        },

        /**
         * Add non-null/defined properties of o to o2
         * @private
         */
        _apply2: function (o, o2) {
            for (var name in o) {
                if (o.hasOwnProperty(name)) {
                    if (o[name] !== undefined && o[name] !== null) {
                        o2[name] = o[name];
                    }
                }
            }
            return o2;
        },

        /**
         * Add properties of o to o2 where undefined or null on o2
         * @private
         */
        _applyIf: function (o, o2) {
            for (var name in o) {
                if (o.hasOwnProperty(name)) {
                    if (o2[name] === undefined || o2[name] === null) {
                        o2[name] = o[name];
                    }
                }
            }
            return o2;
        },

        /**
         * Returns true if the given map is empty.
         * @param obj
         * @returns {boolean}
         * @private
         */
        _isEmptyObject: function (obj) {
            for (var name in obj) {
                if (obj.hasOwnProperty(name)) {
                    return false;
                }
            }
            return true;
        },

        /**
         * Returns the given ID as a string, in quotes if the ID was a string to begin with.
         *
         * This is useful for logging IDs.
         *
         * @param {Number| String} id The ID
         * @returns {String}
         * @private
         */
        _inQuotes: function (id) {
            return this._isNumeric(id) ? ("" + id) : ("'" + id + "'");
        }
    };

    // Have a lower-case XEO namespace as well,
    // just because it's easier to type when live-coding

    window.XEO = window.XEO = new XEO();

})();
;/*
 Based on Simple JavaScript Inheritance
 By John Resig http://ejohn.org/
 MIT Licensed.
 */
// Inspired by base2 and Prototype
(function () {

    var initializing = false;

    var fnTest = /xyz/.test(function () {
        xyz;
    }) ? /\b_super\b/ : /.*/;

    // The base Class implementation (does nothing)
    this.Class = function () {
    };

    // Create a new Class that inherits from this class
    Class.extend = function (prop) {

        var _super = this.prototype;

        // Instantiate a base class (but only create the instance,
        // don't run the init constructor)
        initializing = true;
        var prototype = new this();
        initializing = false;

        // Copy the properties over onto the new prototype
        for (var name in prop) {

            //
            if (name === "_props") {
                var props = prop[name];
                var descriptor;
                for (var key in props) {
                    descriptor = props[key];

                    // If no setter is provided, then the property
                    // is strictly read-only. Insert a dummy setter
                    // to log a warning.

                    if (!descriptor.set) {
                        (function () {

                            var name = key;

                            descriptor.set = function () {
                                this.warn("Property '" + name + "' is read-only, ignoring assignment");
                            };
                        })();
                    }


                    // Want property to show up in inspectors
                    descriptor.enumerable = true;

                    Object.defineProperty(prototype, key, descriptor);
                }
                continue;
            }

            // Check if we're overwriting an existing function
            prototype[name] = typeof prop[name] === "function" && typeof _super[name] === "function" && fnTest.test(prop[name]) ?
                (function (name, fn) {
                    return function () {
                        var tmp = this._super;

                        // Add a new ._super() method that is the same method
                        // but on the super-class
                        this._super = _super[name];

                        // The method only need to be bound temporarily, so we
                        // remove it when we're done executing
                        var ret = fn.apply(this, arguments);
                        this._super = tmp;

                        return ret;
                    };
                })(name, prop[name]) : prop[name];
        }

        // The dummy class constructor
        function Class() {

            // All construction is actually done in the init method
            if (!initializing && this.__init)
                this.__init.apply(this, arguments);
        }

        // Populate our constructed prototype object
        Class.prototype = prototype;

        // Enforce the constructor to be what we expect
        Class.prototype.constructor = Class;

        // And make this class extendable
        Class.extend = arguments.callee;

        return Class;
    };
})();

;(function () {

    "use strict";

    XEO.utils = XEO.utils || {};

    /**
     * Generic map of IDs to items - can generate own IDs or accept given IDs. IDs should be strings in order to not
     * clash with internally generated IDs, which are numbers.
     */
    XEO.utils.Map = function (items, baseId) {

        /**
         * @property Items in this map
         */
        this.items = items || [];

        baseId = baseId || 0;
        var lastUniqueId = baseId + 1;

        /**
         * Adds an item to the map and returns the ID of the item in the map. If an ID is given, the item is
         * mapped to that ID. Otherwise, the map automatically generates the ID and maps to that.
         *
         * id = myMap.addItem("foo") // ID internally generated
         *
         * id = myMap.addItem("foo", "bar") // ID is "foo"
         *
         */
        this.addItem = function () {
            var item;
            if (arguments.length === 2) {
                var id = arguments[0];
                item = arguments[1];
                if (this.items[id]) { // Won't happen if given ID is string
                    throw "ID clash: '" + id + "'";
                }
                this.items[id] = item;
                return id;

            } else {
                while (true) {
                    item = arguments[0] || {};
                      var findId = lastUniqueId++;
                    if (!this.items[findId]) {
                        this.items[findId] = item;
                        return findId;
                    }
                }
            }
        };

        /**
         * Removes the item of the given ID from the map and returns it
         */
        this.removeItem = function (id) {
            var item = this.items[id];
            delete this.items[id];
            return item;
        };
    };

})();
;/**

 **Component** is the base class for all xeoEngine components.

 ## Contents

 <Ul>
 <li><a href="#ids">Component IDs</a></li>
 <li><a href="#componentProps">Properties</a></li>
 <li><a href="#metadata">Metadata</a></li>
 <li><a href="#logging">Logging</a></li>
 <li><a href="#destruction">Destruction</a></li>
 </ul>

 ## <a name="ids">Component IDs</a>

 Every Component has an ID that's unique within the parent {{#crossLink "Scene"}}{{/crossLink}}. xeoEngine generates
 the IDs automatically by default, however you can also specify them yourself. In the example below, we're creating a
 scene comprised of {{#crossLink "Scene"}}{{/crossLink}}, {{#crossLink "Material"}}{{/crossLink}}, {{#crossLink "Geometry"}}{{/crossLink}} and
 {{#crossLink "GameObject"}}{{/crossLink}} components, while letting xeoEngine generate its own ID for
 the {{#crossLink "Geometry"}}{{/crossLink}}:

 ````javascript
 // The Scene is a Component too
 var scene = new XEO.Scene({
    id: "myScene"
});

 var material = new XEO.PhongMaterial(scene, {
    id: "myMaterial"
});

 var geometry = new XEO.Geometry(scene, {
    id: "myGeometry"
});

 // Let xeoEngine automatically generated the ID for our Object
 var object = new XEO.GameObject(scene, {
    material: material,
    geometry: geometry
});
 ````

 We can then find those components like this:

 ````javascript
 // Find the Scene
 var theScene = XEO.scenes["myScene"];

 // Find the Material
 var theMaterial = theScene.components["myMaterial"];
 ````

 ## <a name="componentProps">Properties</a>

 Almost every property on a xeoEngine Component fires a change event when you update it. For example, we can subscribe
 to the {{#crossLink "PhongMaterial/diffuse:event"}}{{/crossLink}} event that a
 {{#crossLink "Material"}}{{/crossLink}} fires when its {{#crossLink "PhongMaterial/diffuse:property"}}{{/crossLink}}
 property is updated, like so:

 ````javascript
 // Bind a change callback to a property
 var handle = material.on("diffuse", function(diffuse) {
    console.log("Material diffuse color has changed to: [" + diffuse[0] + ", " + diffuse[1] + "," + diffuse[2] + "]");
});

 // Change the property value, which fires the callback
 material.diffuse = [ 0.0, 0.5, 0.5 ];

 // Unsubscribe from the property change event
 material.off(handle);
 ````

 We can also subscribe to changes in the way components are attached to each other, since components are properties
 of other components. For example, we can subscribe to the '{{#crossLink "Object/material:event"}}{{/crossLink}}' event that a
 {{#crossLink "GameObject"}}GameObject{{/crossLink}} fires when its {{#crossLink "Object/material:property"}}{{/crossLink}}
 property is set to a different {{#crossLink "Material"}}Material{{/crossLink}}:

 ```` javascript
 // Bind a change callback to the Object's Material
 object1.on("material", function(material) {
    console.log("Object's Material has changed to: " + material.id);
});

 // Now replace that Material with another
 object1.material = new XEO.PhongMaterial({
    id: "myOtherMaterial",
    diffuse: [ 0.3, 0.3, 0.6 ]
    //..
});
 ````

 ## <a name="metadata">Metadata</a>

 You can set optional **metadata** on your Components, which can be anything you like. These are intended
 to help manage your components within your application code or content pipeline. You could use metadata to attach
 authoring or version information, like this:

 ````javascript
 // Scene with authoring metadata
 var scene = new XEO.Scene({
    id: "myScene",
    metadata: {
        title: "My awesome 3D scene",
        author: "@xeolabs",
        date: "February 13 2015"
    }
});

 // Material with descriptive metadata
 var material = new XEO.PhongMaterial(scene, {
    id: "myMaterial",
    diffuse: [1, 0, 0],
    metadata: {
        description: "Bright red color with no textures",
        version: "0.1",
        foo: "bar"
    }
});
 ````

 As with all properties, you can subscribe and change the metadata like this:

 ````javascript
 // Subscribe to changes to the Material's metadata
 material.on("metadata", function(value) {
    console.log("Metadata changed: " + JSON.stringify(value));
});

 // Change the Material's metadata, firing our change handler
 material.metadata = {
    description: "Bright red color with no textures",
    version: "0.2",
    foo: "baz"
};
 ````

 ## <a name="logging">Logging</a>

 Components have methods to log ID-prefixed messages to the JavaScript console:

 ````javascript
 material.log("Everything is fine, situation normal.");
 material.warn("Wait, whats that red light?");
 material.error("Aw, snap!");
 ````

 The logged messages will look like this in the console:

 ````text
 [LOG]   myMaterial: Everything is fine, situation normal.
 [WARN]  myMaterial: Wait, whats that red light..
 [ERROR] myMaterial: Aw, snap!
 ````

 ## <a name="destruction">Destruction</a>

 Get notification of destruction directly on the Components:

 ````javascript
 material.on("destroyed", function() {
    this.log("Component was destroyed: " + this.id);
});
 ````

 Or get notification of destruction of any Component within its {{#crossLink "Scene"}}{{/crossLink}}, indiscriminately:

 ````javascript
 scene.on("componentDestroyed", function(component) {
    this.log("Component was destroyed: " + component.id);
});
 ````

 Then destroy a component like this:

 ````javascript
 material.destroy();
 ````

 Other Components that are linked to it will fall back on a default of some sort. For example, any
 {{#crossLink "GameObject"}}GameObjects{{/crossLink}} that were linked to our {{#crossLink "Material"}}{{/crossLink}}
 will then automatically link to the {{#crossLink "Scene"}}Scene's{{/crossLink}} default {{#crossLink "Scene/material:property"}}{{/crossLink}}.

 @class Component
 @module XEO
 @constructor
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}Scene{{/crossLink}} - creates this Component
 within the default {{#crossLink "Scene"}}Scene{{/crossLink}} when omitted.
 @param [cfg] {*} DepthBuf configuration
 @param [cfg.id] {String} Optional ID, unique among all components in the parent {{#crossLink "Scene"}}Scene{{/crossLink}}, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this Component.
 @extends Object
 */
(function () {

    "use strict";

    XEO.Component = Class.extend({

        __init: function () {


            var cfg = {};

            var arg1 = arguments[0];
            var arg2 = arguments[1];


            /**
             The parent {{#crossLink "Scene"}}{{/crossLink}} that contains this Component.

             @property scene
             @type {Scene}
             @final
             */
            this.scene = null;

            if (this.type === "XEO.Scene") {

                this.scene = this;

                if (arg1) {
                    cfg = arg1;
                }

            } else {

                if (arg1) {

                    if (arg1.type === "XEO.Scene") {

                        this.scene = arg1;

                        if (arg2) {
                            cfg = arg2;
                        }

                    } else {

                        // Create this component within the default XEO Scene

                        this.scene = XEO.scene;

                        cfg = arg1;
                    }
                } else {

                    // Create this component within the default XEO Scene

                    this.scene = XEO.scene;
                }

                this._renderer = this.scene._renderer;
            }

            /**
             Arbitrary, user-defined metadata on this component.

             @property metadata
             @type Object
             */
            this.metadata = cfg.metadata || {};

            /**
             Unique ID for this Component within its parent {{#crossLink "Scene"}}Scene{{/crossLink}}.

             @property id
             @type String
             @final
             */
            this.id = cfg.id;

            /**
             True as soon as this Component has been destroyed

             @property destroyed
             @type Boolean
             */
            this.destroyed = false;

            // Child components keyed to arbitrary names
            this._children = {};

            // Subscriptions for child component destructions
            this._childDestroySubs = {};

            // Subscriptions to child components needing recompilation
            this._childDirtySubs = {};

            // Pub/sub
            this._handleMap = new XEO.utils.Map(); // Subscription handle pool
            this._eventSubs = {}; // A [handle -> callback] map for each location name
            this._handleLocs = {}; // Maps handles to loc names

            this.props = {}; // Maps locations to publications

            if (this.scene && this.type !== "XEO.Scene") { // HACK: Don't add scene to itself

                // Register this component on its scene
                // Assigns this component an automatic ID if not yet assigned

                this.scene._addComponent(this);
            }

            // Initialize this component using the configs

            if (this._init) {
                this._init(cfg);
            }
        },

        /**
         JavaScript class name for this Component.

         This is used when <a href="Scene.html#savingAndLoading">loading Scenes from JSON</a>, and is included in the JSON
         representation of this Component, so that this class may be instantiated when loading it from the JSON representation.

         For example: "XEO.AmbientLight", "XEO.ColorTarget", "XEO.Lights" etc.

         @property type
         @type String
         @final
         */
        type: "XEO.Component",

        /**
         * Initializes this component
         * @param cfg
         * @private
         */
        _init: function (cfg) {
        },

        /**
         * Fires an event on this component.
         *
         * Notifies existing subscribers to the event, retains the event to give to
         * any subsequent notifications on that location as they are made.
         *
         * @method fire
         * @param {String} event The event type name
         * @param {Object} value The event parameters
         * @param {Boolean} [forget=false] When true, does not retain for subsequent subscribers
         */
        fire: function (event, value, forget) {

            if (forget !== true) {
                this.props[event] = value; // Save notification
            }

            var subs = this._eventSubs[event];
            var sub;

            if (subs) { // Notify subscriptions

                for (var handle in subs) {
                    if (subs.hasOwnProperty(handle)) {

                        sub = subs[handle];

                        sub.callback.call(sub.scope, value);
                    }
                }
            }
        },

        /**
         * Subscribes to an event on this component.
         *
         * The callback is be called with this component as scope.
         *
         * @method on
         * @param {String} event The event
         * @param {Function} callback Called fired on the event
         * @param {Object} [scope=this] Scope for the callback
         * @return {String} Handle to the subscription, which may be used to unsubscribe with {@link #off}.
         */
        on: function (event, callback, scope) {
            var subs = this._eventSubs[event];
            if (!subs) {
                subs = {};
                this._eventSubs[event] = subs;
            }
            var handle = this._handleMap.addItem(); // Create unique handle
            subs[handle] = {
                scope: scope || this,
                callback: callback
            };
            this._handleLocs[handle] = event;
            var value = this.props[event];
            if (value) { // A publication exists, notify callback immediately
                callback.call(scope || this, value);
            }
            return handle;
        },

        /**
         * Cancels an event subscription that was previously made with {{#crossLink "Component/on:method"}}{{/crossLink}} or
         * {{#crossLink "Component/once:method"}}{{/crossLink}}.
         *
         * @method off
         * @param {String} handle Publication handle
         */
        off: function (handle) {
            if (handle === undefined || handle === null) {
                return;
            }
            var event = this._handleLocs[handle];
            if (event) {
                delete this._handleLocs[handle];
                var locSubs = this._eventSubs[event];
                if (locSubs) {
                    delete locSubs[handle];
                }
                this._handleMap.removeItem(handle); // Release handle
            }
        },

        /**
         * Subscribes to the next occurrence of the given event, then un-subscribes as soon as the event is handled.
         *
         * This is equivalent to calling {{#crossLink "Component/on:method"}}{{/crossLink}}, and then calling
         * {{#crossLink "Component/off:method"}}{{/crossLink}} inside the callback function.
         *
         * @method once
         * @param {String} event Data event to listen to
         * @param {Function(data)} callback Called when fresh data is available at the event
         * @param {Object} [scope=this] Scope for the callback
         */
        once: function (event, callback, scope) {
            var self = this;
            var handle = this.on(event,
                function (value) {
                    self.off(handle);
                    callback(value);
                },
                scope);
        },

        /**
         * Logs a console debugging message for this component.
         *
         * The console message will have this format: *````[LOG] [<component type> <component id>: <message>````*
         *
         * Also fires the message as a {{#crossLink "Scene/log:event"}}{{/crossLink}} event on the
         * parent {{#crossLink "Scene"}}Scene{{/crossLink}}.
         *
         * @method log
         * @param {String} message The message to log
         */
        log: function (message) {

            window.console.log("[LOG]" + this._message(message));

            this.scene.fire("log", message);
        },

        _message: function (message) {
            // return " [" + (this.type.indexOf("XEO.") > -1 ? this.type.substring(4) : this.type) + " " + XEO._inQuotes(this.id) + "]: " + message;
            return " [" + this.type + " " + XEO._inQuotes(this.id) + "]: " + message;
        },

        /**
         * Logs an error for this component to the JavaScript console.
         *
         * The console message will have this format: *````[ERROR] [<component type> =<component id>: <message>````*
         *
         * Also fires the message as an {{#crossLink "Scene/error:event"}}{{/crossLink}} event on the
         * parent {{#crossLink "Scene"}}Scene{{/crossLink}}.
         *
         * @method error
         * @param {String} message The message to log
         */
        error: function (message) {

            window.console.error("[ERROR]" + this._message(message));

            this.scene.fire("error", message);
        },

        /**
         * Logs a warning for this component to the JavaScript console.
         *
         * The console message will have this format: *````[WARN] [<component type> =<component id>: <message>````*
         *
         * Also fires the message as a {{#crossLink "Scene/warn:event"}}{{/crossLink}} event on the
         * parent {{#crossLink "Scene"}}Scene{{/crossLink}}.
         *
         * @method warn
         * @param {String} message The message to log
         */
        warn: function (message) {

            window.console.warn("[WARN]" + this._message(message));

            this.scene.fire("warn", message);
        },

        /**
         * Creates a clone of this component.
         *
         * The clone will have the same properties as the original, except where
         * overridden in the given optional configs.
         *
         * The clone will share (by reference) the components of the original, unless overridden.
         *
         * For example, if this component is a {{#crossLink "GameObject"}}{{/crossLink}}, then the clone
         * will be attached to the **same** instances of {{#crossLink "PhoneMaterial"}}{{/crossLink}},
         * {{#crossLink "Camera"}}{{/crossLink}} etc as this component, unless it supplies its own
         * instances for those via the configs.
         *
         * @param {*} [cfg] Configurations to override.
         * @returns {Component} The shallow clone
         */
        clone: function (cfg) {

            if (this.destroyed) {
                this.error("Component has been destroyed - cloning not allowed");
                return;
            }

            cfg = cfg || {};

            var json = this.json;

            delete json.id;

            return new this.constructor(this.scene, XEO._apply(cfg, json));
        },

        /**
         * Adds a child component to this.
         * When component not given, attaches the scene's default instance for the given name.
         * Publishes the new child component on this component, keyed to the given name.
         *
         * @param {string} name component name
         * @param {Component} child The component
         * @private
         */
        _setChild: function (name, child) {

            if (!child) {

                // No child given, fall back on default component class for the given name

                child = this.scene[name];

                if (!child) {
                    this.error("No default component for name '" + name + "'");
                    return;
                }

            } else {

                // Child ID or instance given

                // Both numeric and string IDs are supported

                if (XEO._isNumeric(child) || XEO._isString(child)) {

                    // Child ID given

                    var id = child;

                    child = this.scene.components[id];

                    if (!child) {

                        // Quote string IDs in errors

                        this.error("Component not found: " + XEO._inQuotes(id));
                        return;
                    }
                }
            }

            if (child.scene.id !== this.scene.id) {
                this.error("Not in same scene: " + child.type + " " + XEO._inQuotes(child.id));
                return;
            }

            var oldChild = this._children[name];

            if (oldChild) {

                // Child of given name already attached

                if (oldChild.id === child.id) {

                    // Reject attempt to reattach same child
                    return;
                }

                // Unsubscribe from old child's destruction

                oldChild.off(this._childDestroySubs[name]);
                oldChild.off(this._childDirtySubs[name]);
            }

            // Set and publish the new child on this component

            this._children[name] = child;

            var self = this;

            // Bind destruct listener to new child to remove it
            // from this component when destroyed

            this._childDestroySubs[name] = child.on("destroyed",
                function () {

                    // Child destroyed
                    delete self._children[name];

                    // Try to fall back on default child
                    var defaultComponent = self.scene[name];

                    if (!defaultComponent || child.id === defaultComponent.id) {

                        // Old child was the default,
                        // so publish null child and bail

                        self.fire(name, null);

                        return;
                    }

                    // Set default child
                    self._setChild(name, defaultComponent);
                });

            this._childDirtySubs[name] = child.on("dirty",
                function () {
                    self.fire("dirty", true);
                });

            this.fire("dirty", true);

            this.fire(name, child);

            return child;
        },


        _compile: function () {
        },

        _props: {

            json: {

                get: function () {

                    // Return component's type-specific properties,
                    // augmented with the base component properties

                    var json = {
                        type: this.type,
                        id: this.id // Only output user-defined IDs
                    };

                    if (!XEO._isEmptyObject(this.metadata)) {
                        json.metadata = this.metadata;
                    }

                    return this._getJSON ? XEO._apply(this._getJSON(), json) : json;
                }
            },

            // Experimental - serializes this component to JS code
            // that can be evaluated to recreate this component.

            js: {

                get: function () {
                    return "new " + this.type + "(" + this.string + ");";
                }
            },

            string: {

                get: function () {
                    return JSON.stringify(this.json, null, 4);
                }
            }
        },

        /**
         * Destroys this component.
         *
         * Fires a {{#crossLink "Component/destroyed:event"}}{{/crossLink}} event on this Component.
         *
         * Automatically disassociates this component from other components, causing them to fall back on any
         * defaults that this component overrode on them.
         *
         * @method destroy
         */
        destroy: function () {

            // Unsubscribe from child components

            var child;

            for (var name in this._children) {
                if (this._children.hasOwnProperty(name)) {

                    child = this._children[name];

                    child.off(this._childDestroySubs[name]);
                    child.off(this._childDirtySubs[name]);
                }
            }

            // Execute subclass behaviour

            if (this._destroy) {
                this._destroy();
            }

            /**
             * Fired when this Component is destroyed.
             * @event destroyed
             */

            this.fire("destroyed", this.destroyed = true);
        },

        _destroy: function () {
        }
    });

})()
;/**
 A **Scene** models a 3D scene as a fully-editable and serializable <a href="http://gameprogrammingpatterns.com/component.html" target="_other">component-object</a> graph.

 ## Contents

 <Ul>
    <li><a href="#sceneStructure">Scene Structure</a></li>
    <li><a href="#sceneCanvas">The Scene Canvas</a></li>
    <li><a href="#findingByID">Finding Scenes and Components by ID</a></li>
    <li><a href="#defaults">The Default Scene</a></li>
    <li><a href="#savingAndLoading">Saving and Loading Scenes</a></li>
 </ul>

 ## <a name="sceneStructure">Scene Structure</a>

 A Scene contains a soup of instances of various {{#crossLink "Component"}}Component{{/crossLink}} subtypes, such as
 {{#crossLink "GameObject"}}GameObject{{/crossLink}}, {{#crossLink "Camera"}}Camera{{/crossLink}}, {{#crossLink "Material"}}Material{{/crossLink}},
 {{#crossLink "Lights"}}Lights{{/crossLink}} etc.  Each {{#crossLink "GameObject"}}GameObject{{/crossLink}} has a link to one of each of the other types,
 and the same component instances can be shared among many {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.

 *** Under the hood:*** Within xeoEngine, each {{#crossLink "GameObject"}}GameObject{{/crossLink}} represents a draw call,
 while its components define all the WebGL state that will be bound for that call. To render a Scene, xeoEngine traverses
 the graph to bind the states and make the draw calls, while using many optimizations for efficiency (eg. draw list caching and GL state sorting).

 <img src="../../../assets/images/Scene.png"></img>

 #### Default Components

 A Scene provides its own default *flyweight* instance of each component type
 (except for {{#crossLink "GameObject"}}GameObject{{/crossLink}}). Each {{#crossLink "GameObject"}}GameObject{{/crossLink}} you create
 will implicitly link to a default instance for each type of component that you don't explicitly link it to. For example, when you create a {{#crossLink "GameObject"}}GameObject{{/crossLink}} without
 a {{#crossLink "Lights"}}Lights{{/crossLink}}, the {{#crossLink "GameObject"}}GameObject{{/crossLink}} will link to the
 {{#crossLink "Scene"}}Scene{{/crossLink}}'s default {{#crossLink "Scene/lights:property"}}{{/crossLink}}. This mechanism
 provides ***training wheels*** to help you learn the API, and also helps keep examples simple, where many of the examples in this
 documentation are implicitly using those defaults when they are not central to discussion.

 At the bottom of the diagram above, the blue {{#crossLink "Material"}}Material{{/crossLink}},
 {{#crossLink "Geometry"}}Geometry{{/crossLink}} and {{#crossLink "Camera"}}Camera{{/crossLink}} components
 represent some of the defaults provided by our Scene. For brevity, the diagram only shows those three
 types of component (there are actually around two dozen).

 Note that we did not link the second {{#crossLink "GameObject"}}GameObject{{/crossLink}} to a
 {{#crossLink "Material"}}Material{{/crossLink}}, causing it to be implicitly linked to our Scene's
 default {{#crossLink "Material"}}Material{{/crossLink}}. That {{#crossLink "Material"}}Material{{/crossLink}}
 is the only default our {{#crossLink "GameObject"}}GameObjects{{/crossLink}} are falling back on in this example, with other
 default component types, such as the {{#crossLink "Geometry"}}Geometry{{/crossLink}} and the {{#crossLink "Camera"}}Camera{{/crossLink}},
 hanging around dormant until a {{#crossLink "GameObject"}}GameObject{{/crossLink}} is linked to them.

 Note also how the same {{#crossLink "Camera"}}Camera{{/crossLink}} is linked to both of our
 {{#crossLink "GameObject"}}GameObjects{{/crossLink}}. Whenever we update that
 {{#crossLink "Camera"}}Camera{{/crossLink}}, it's going to affect both of those
 {{#crossLink "GameObject"}}GameObjects{{/crossLink}} in one shot. Think of the defaults as the Scene's ***global*** component
 instances, which you may optionally override on a per-{{#crossLink "GameObject"}}GameObject{{/crossLink}} basis with your own
 component instances. In many Scenes, for example, you might not even bother to create your own {{#crossLink "Camera"}}Camera{{/crossLink}} and just
 let all your {{#crossLink "GameObject"}}GameObjects{{/crossLink}} fall back on the default one.

 ## Example

 Here's the JavaScript for the diagram above. As mentioned earlier, note that we only provide components for our {{#crossLink "GameObject"}}GameObjects{{/crossLink}} when we need to
 override the default components that the Scene would have provided them, and that the same component instances may be shared among multiple Objects.

 ```` javascript
 var scene = new XEO.Scene({
       id: "myScene"   // ID is optional on all components
  });

 var material = new XEO.PhongMaterial(myScene, {
       id: "myMaterial",         // We'll use this ID to show how to find components by ID
       diffuse: [ 0.6, 0.6, 0.7 ],
       specular: [ 1.0, 1.0, 1.0 ]
   });

 var geometry = new XEO.Geometry(myScene, {
       primitive: "triangles",
       positions: [...],
       normals: [...],
       uvs: [...],
       indices: [...]
  });

 var camera = new XEO.Camera(myScene);

 var object1 = new XEO.GameObject(myScene, {
       material: myMaterial,
       geometry: myGeometry,
       camera: myCamera
  });

 // Second object uses Scene's default Material
 var object3 = new XEO.GameObject(myScene, {
       geometry: myGeometry,
       camera: myCamera
  });
 ````

 ## <a name="sceneCanvas">The Scene Canvas</a>

 See the {{#crossLink "Canvas"}}{{/crossLink}} component.

 ## <a name="findingByID">Finding Scenes and Components by ID</a>

 We can have as many Scenes as we want, and can find them by ID on the {{#crossLink "XEO"}}XEO{{/crossLink}} object's {{#crossLink "XEO/scenes:property"}}scenes{{/crossLink}} map:

 ````javascript
 var theScene = XEO.scenes["myScene"];
 ````

 Likewise we can find a Scene's components within the Scene itself, such as the {{#crossLink "Material"}}Material{{/crossLink}} we
 created earlier:

 ````javascript
 var theMaterial = myScene.components["myMaterial"];
 ````

 ## <a name="defaults">The Default Scene</a>

 When you create components without specifying a Scene for them, xeoEngine will put them in its default Scene.

 For example:

 ```` javascript
 var material2 = new XEO.PhongMaterial({
    diffuse: { r: 0.6, g: 0.6, b: 0.7 },
    specular: { 1.0, 1.0, 1.0 }
});

 var geometry2 = new XEO.Geometry({
     primitive: "triangles",
     positions: [...],
     normals: [...],
     uvs: [...],
     indices: [...]
});

 var camera = new XEO.Camera();

 var object1 = new XEO.GameObject({
     material: material2,
     geometry: geometry2,
     camera: camera2
});
 ````

 You can then obtain the default Scene from the {{#crossLink "XEO"}}XEO{{/crossLink}} object's
 {{#crossLink "XEO/scene:property"}}scene{{/crossLink}} property:

 ````javascript
 var theScene = XEO.scene;
 ````

 or from one of the components we just created:
 ````javascript
 var theScene = material2.scene;
 ````

 ***Note:*** xeoEngine creates the default Scene as soon as you either
 create your first Sceneless {{#crossLink "GameObject"}}GameObject{{/crossLink}} or reference the
 {{#crossLink "XEO"}}XEO{{/crossLink}} object's {{#crossLink "XEO/scene:property"}}scene{{/crossLink}} property. Expect to
 see the HTML canvas for the default Scene magically appear in the page when you do that.

 ## <a name="savingAndLoading">Saving and Loading Scenes</a>

 The entire runtime state of a Scene can be serialized and deserialized to and from JSON. This means you can create a
 Scene, then save it and restore it again to exactly how it was when you saved it.

 ````javascript
 // Serialize the scene to JSON
 var json = myScene.json;

 // Create another scene from that JSON, in a fresh canvas:
 var myOtherScene = new XEO.Scene({
      json: json
  });

 ````

 ***Note:*** this will save your {{#crossLink "Geometry"}}Geometry{{/crossLink}}s' array properties
 ({{#crossLink "Geometry/positions:property"}}positions{{/crossLink}}, {{#crossLink "Geometry/normals:property"}}normals{{/crossLink}},
 {{#crossLink "Geometry/indices:property"}}indices{{/crossLink}} etc) as JSON arrays, which may stress your browser
 if those arrays are huge.

 @class Scene
 @module XEO
 @constructor
 @param [cfg] Scene parameters
 @param [cfg.id] {String} Optional ID, unique among all Scenes in xeoEngine, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this Scene.
 @param [cfg.canvasId] {String} ID of existing HTML5 canvas in the DOM - creates a full-page canvas automatically if this is omitted
 @param [cfg.components] {Array(Object)} JSON array containing parameters for {{#crossLink "Component"}}Component{{/crossLink}} subtypes to immediately create within the Scene.
 @extends Component
 */
(function () {

    "use strict";

    /**
     * Fired whenever a debug message logged on a component within this Scene.
     * @event log
     * @param {String} value The debug message
     */

    /**
     * Fired whenever an error is logged on a component within this Scene.
     * @event error
     * @param {String} value The error message
     */

    /**
     * Fired whenever a warning is logged on a component within this Scene.
     * @event warn
     * @param {String} value The warning message
     */

    /**
     * Fired on each frame.
     * @event error
     * @param {String} sceneID The ID of this Scene.
     * @param {Number} startTime The time in seconds since 1970 that this Scene was instantiated.
     * @param {Number} time The time in seconds since 1970 of this "tick" event.
     * @param {Number} prevTime The time of the previous "tick" event from this Scene.
     * @param {Number} deltaTime The time in seconds since the previous "tick" event from this Scene.
     */

    XEO.Scene = XEO.Component.extend({

        type: "XEO.Scene",

        _init: function (cfg) {

            var self = this;

            this._componentIDMap = new XEO.utils.Map();

            /**
             * The epoch time (in milliseconds since 1970) when this Scene was instantiated.
             *
             * @property timeCreated
             * @type {Number}
             */
            this.startTime = (new Date()).getTime();

            /**
             * The {{#crossLink "Component"}}Component{{/crossLink}}s within
             * this Scene, mapped to their IDs.
             *
             * Will also contain the {{#crossLink "GameObject"}}{{/crossLink}}s
             * contained in {{#crossLink "GameObject/components:property"}}{{/crossLink}}.
             *
             * @property components
             * @type {String:XEO.Component}
             */
            this.components = {};

            /**
             * For each {{#crossLink "Component"}}Component{{/crossLink}} type, a map of
             * IDs to instances.
             *
             * @property types
             * @type {String:{String:XEO.Component}}
             */
            this.types = {};

            /**
             * The {{#crossLink "GameObject"}}{{/crossLink}}s within
             * this Scene, mapped to their IDs.
             *
             * The {{#crossLink "GameObject"}}{{/crossLink}}s in this map
             * will also be contained in {{#crossLink "GameObject/components:property"}}{{/crossLink}}.
             *
             * @property objects
             * @type {String:XEO.GameObject}
             */
            this.objects = {};

            // Contains XEO.GameObjects that need to be recompiled back into
            // this._renderer
            this._dirtyObjects = {};

            /**
             * Configurations for this Scene. Set whatever properties on here
             * that will be useful to the components within the Scene.
             * @final
             * @property configs
             * @type {Configs}
             */
            this.configs = new XEO.Configs(this, cfg.configs);

            /**
             * Manages the HTML5 canvas for this Scene.
             * @final
             * @property canvas
             * @type {Canvas}
             */
            this.canvas = new XEO.Canvas(this, {
                canvas: cfg.canvas, // Can be canvas ID, canvas element, or null
                contextAttr: cfg.contextAttr || {}
            });

            this.canvas.on("webglContextFailed",
                function () {
                    alert("xeoEngine failed to find WebGL!");
                });

            // The core WebGL renderer
            this._renderer = new XEO.renderer.Renderer({
                canvas: this.canvas,
                transparent: cfg.transparent
            });

            /**
             * Publishes input events that occur on this Scene's canvas.
             * @final
             * @property input
             * @type {Input}
             * @final
             */
            this.input = new XEO.Input(this, {
                canvas: this.canvas.canvas
            });

            /**
             * Tracks any asynchronous tasks that occur within this Scene.
             * @final
             * @property tasks
             * @type {Tasks}
             * @final
             */
            this.tasks = new XEO.Tasks(this);

            /**
             * Tracks statistics within this Scene, such as numbers of
             * textures, geometries etc.
             * @final
             * @property stats
             * @type {Stats}
             * @final
             */
            this.stats = new XEO.Stats(this, {
                objects: 0,
                geometries: 0,
                textures: 0
            });

            // Register Scene on engine
            // Do this BEFORE we add components below
            XEO._addScene(this);

            // Add components specified as JSON
            // This will also add the default components for this Scene,
            // if this JSON was serialized from a XEO.Scene instance.

            var componentJSONs = cfg.components;

            if (componentJSONs) {

                var componentJSON;
                var type;
                var constructor;

                for (var i = 0, len = componentJSONs.length; i < len; i++) {

                    componentJSON = componentJSONs[i];
                    type = componentJSON.type;

                    if (type) {

                        constructor = window[type];

                        if (constructor) {
                            new constructor(this, componentJSON);
                        }
                    }
                }
            }

            // Create the default components if not already created.
            // These may have already been created in the JSON above.

            this._initDefaults();
        },

        _initDefaults: function() {

            this.view;
            this.project;
            this.camera;
            this.clips;
            this.colorTarget;
            this.colorBuf;
            this.depthTarget;
            this.depthBuf;
            this.visibility;
            this.modes;
            this.geometry;
            this.layer;
            this.lights;
            this.material;
            this.morphTargets;
            this.reflect;
            this.shader;
            this.shaderParams;
            this.stage;
            this.transform;
        },

        // Called by each component that is created with this Scene as parent.
        // Registers the component within this scene.
        _addComponent: function (c) {

            if (c.id) {

                // User-supplied ID

                if (this.components[c.id]) {
                    this.error("Component " + XEO._inQuotes(c.id) + " already exists");
                    return;
                }
            } else {

                // Auto-generated ID

                c.id = this._componentIDMap.addItem(c);
            }

            this.components[c.id] = c;

            // Register for class type

            //var type = c.type.indexOf("XEO.") > -1 ? c.type.substring(4) : c.type;
            var type = c.type;

            var types = this.types[c.type];

            if (!types) {
                types = this.types[type] = {};
            }

            types[c.id] = c;

            var self = this;

            c.on("destroyed",
                function () {

                    self._componentIDMap.removeItem(c.id);

                    delete self.components[c.id];

                    var types = self.types[c.type];

                    if (types) {

                        delete types[c.id];

                        if (XEO._isEmptyObject(types)) {
                            delete self.types[c.type];
                        }
                    }

                    if (c.type === "XEO.GameObject") {

                        // Component is a XEO.GameObject

                        // Update scene statistics,
                        // Unschedule any pending recompilation of
                        // the GameObject into the renderer

                        self.stats.dec("objects");

                        delete self.objects[c.id];

                        delete self._dirtyObjects[c.id];

                        self.fire("dirty", true);
                    }

                    /**
                     * Fired whenever a component within this Scene has been destroyed.
                     * @event componentDestroyed
                     * @param {Component} value The component that was destroyed
                     */
                    self.fire("componentDestroyed", c, true);

                    //self.log("Destroyed " + c.type + " " + XEO._inQuotes(c.id));
                });

            if (c.type === "XEO.GameObject") {

                // Component is a XEO.GameObject

                c.on("dirty",
                    function () {

                        // Whenever the GameObject signals dirty,
                        // schedule its recompilation into the renderer

                        if (!self._dirtyObjects[c.id]) {
                            self._dirtyObjects[c.id] = c;
                        }

                        self.fire("dirty", true);
                    });

                this.objects[c.id] = c;

                // Update scene statistics

                this.stats.inc("objects");
            }

            /**
             * Fired whenever a component has been created within this Scene.
             * @event componentCreated
             * @param {Component} value The component that was created
             */
            this.fire("componentCreated", c, true);

            //self.log("Created " + c.type + " " + XEO._inQuotes(c.id));
        },

        _props: {

            /**
             * The default projection transform provided by this Scene, which is
             * a {{#crossLink "Perspective"}}Perspective{{/crossLink}}.
             *
             * This {{#crossLink "Perspective"}}Perspective{{/crossLink}} has an
             * {{#crossLink "Component/id:property"}}id{{/crossLink}} equal to
             * "default.project", with all other properties set to their default
             * values.
             *
             * {{#crossLink "Camera"}}Cameras{{/crossLink}} within this Scene
             * are attached to this {{#crossLink "Perspective"}}Perspective{{/crossLink}}
             * by default.
             *
             * @property project
             * @final
             * @type Perspective
             */
            project: {

                get: function () {
                    return this.components["default.project"] ||
                        new XEO.Perspective(this, {
                            id: "default.project"
                        });
                }
            },

            /**
             * The default viewing transform provided by this Scene, which is a {{#crossLink "Lookat"}}Lookat{{/crossLink}}.
             *
             * This {{#crossLink "Lookat"}}Lookat{{/crossLink}} has an {{#crossLink "Component/id:property"}}id{{/crossLink}} equal to "default.view",
             * with all other properties initialised to their default values.
             *
             * {{#crossLink "Camera"}}Cameras{{/crossLink}} within this Scene are attached to
             * this {{#crossLink "Lookat"}}Lookat{{/crossLink}} by default.
             * @property view
             * @final
             * @type Lookat
             */
            view: {

                get: function () {
                    return this.components["default.view"] ||
                        new XEO.Lookat(this, {
                            id: "default.view"
                        });
                }
            },

            /**
             * The default {{#crossLink "Camera"}}Camera{{/crossLink}} provided by this Scene.
             *
             * This {{#crossLink "Camera"}}Camera{{/crossLink}} has an {{#crossLink "Component/id:property"}}id{{/crossLink}} equal to "default.camera",
             * with all other properties initialised to their default values.
             *
             * {{#crossLink "GameObject"}}GameObjects{{/crossLink}} within this Scene are attached to
             * this {{#crossLink "Camera"}}Camera{{/crossLink}} by default.
             * @property camera
             * @final
             * @type Camera
             */
            camera: {

                get: function () {
                    return this.components["default.camera"] ||
                        new XEO.Camera(this, {
                            id: "default.camera",
                            project: "default.project",
                            view: "default.view"
                        });
                }
            },

            /**
             * The default modelling {{#crossLink "Transform"}}{{/crossLink}} provided by this Scene.
             *
             * This {{#crossLink "Transform"}}{{/crossLink}} has an {{#crossLink "Component/id:property"}}id{{/crossLink}} equal to "default.transform",
             * with all other properties initialised to their default values (ie. an identity matrix).
             *
             * {{#crossLink "GameObject"}}GameObjects{{/crossLink}} within this Scene are attached to
             * this {{#crossLink "Transform"}}{{/crossLink}} by default.
             *
             * @property transform
             * @final
             * @type Transform
             */
            transform: {

                get: function () {
                    return this.components["default.transform"] ||
                        new XEO.Transform(this, {
                            id: "default.transform"
                        });
                }
            },

            /**
             * The default {{#crossLink "Clips"}}Clips{{/crossLink}} provided by this Scene.
             *
             * This {{#crossLink "Clips"}}Clips{{/crossLink}} has an {{#crossLink "Component/id:property"}}id{{/crossLink}} equal to "default.clips",
             * with all other properties initialised to their default values.
             *
             * {{#crossLink "GameObject"}}GameObjects{{/crossLink}} within this Scene are attached to this
             * {{#crossLink "Clips"}}Clips{{/crossLink}} by default.
             * @property clips
             * @final
             * @type Clips
             */
            clips: {

                get: function () {
                    return this.components["default.clips"] ||
                        new XEO.Clips(this, {
                            id: "default.clips"
                        });
                }
            },

            /**
             * The default {{#crossLink "ColorBuf"}}ColorBuf{{/crossLink}} provided by this Scene.
             *
             * This {{#crossLink "ColorBuf"}}ColorBuf{{/crossLink}} has an {{#crossLink "Component/id:property"}}id{{/crossLink}} equal to "default.colorBuf",
             * with all other properties initialised to their default values.
             *
             * {{#crossLink "GameObject"}}GameObjects{{/crossLink}} within this Scene are attached to this
             * {{#crossLink "ColorBuf"}}ColorBuf{{/crossLink}} by default.
             * @property colorBuf
             * @final
             * @type ColorBuf
             */
            colorBuf: {

                get: function () {
                    return this.components["default.colorBuf"] ||
                        new XEO.ColorBuf(this, {
                            id: "default.colorBuf"
                        });
                }
            },

            /**
             * The default {{#crossLink "ColorTarget"}}ColorTarget{{/crossLink}} provided by this Scene.
             *
             * This {{#crossLink "ColorTarget"}}ColorTarget{{/crossLink}} has an {{#crossLink "Component/id:property"}}id{{/crossLink}} equal to "default.colorTarget",
             * with all other properties initialised to their default values.
             *
             * {{#crossLink "GameObject"}}GameObjects{{/crossLink}} within this Scene are attached to this
             * {{#crossLink "ColorTarget"}}ColorTarget{{/crossLink}} by default.
             * @property colorTarget
             * @final
             * @type ColorTarget
             */
            colorTarget: {
                get: function () {
                    return this.components["default.colorTarget"] ||
                        new XEO.ColorTarget(this, {
                            id: "default.colorTarget"
                        })
                }
            },

            /**
             * The default {{#crossLink "DepthBuf"}}DepthBuf{{/crossLink}} provided by this Scene.
             *
             * This {{#crossLink "DepthBuf"}}DepthBuf{{/crossLink}} has an {{#crossLink "Component/id:property"}}id{{/crossLink}} equal to "default.depthBuf",
             * with all other properties initialised to their default values.
             *
             * {{#crossLink "GameObject"}}GameObjects{{/crossLink}} within this Scene are attached to this
             * {{#crossLink "DepthBuf"}}DepthBuf{{/crossLink}} by default.
             *
             * @property depthBuf
             * @final
             * @type DepthBuf
             */
            depthBuf: {
                get: function () {
                    return this.components["default.depthBuf"] ||
                        new XEO.DepthBuf(this, {
                            id: "default.depthBuf",
                            active: false // Null Object pattern
                        });
                }
            },

            /**
             * The default {{#crossLink "DepthTarget"}}DepthTarget{{/crossLink}} provided by this Scene.
             *
             * This {{#crossLink "DepthTarget"}}DepthTarget{{/crossLink}} has an {{#crossLink "Component/id:property"}}id{{/crossLink}} equal to "default.depthTarget",
             * with all other properties initialised to their default values.
             *
             * {{#crossLink "GameObject"}}GameObjects{{/crossLink}} within this Scene are attached to this
             * {{#crossLink "DepthTarget"}}DepthTarget{{/crossLink}} by default.
             * @property depthTarget
             * @final
             * @type DepthTarget
             */
            depthTarget: {
                get: function () {
                    return this.components["default.depthTarget"] ||
                        new XEO.DepthTarget(this, {
                            id: "default.depthTarget",
                            active: false // Null Object pattern
                        });
                }
            },

            /**
             * The default {{#crossLink "Visibility"}}Visibility{{/crossLink}} provided by this Scene.
             *
             * This {{#crossLink "Visibility"}}Visibility{{/crossLink}} has an {{#crossLink "Component/id:property"}}id{{/crossLink}} equal to "default.visibility",
             * with all other properties initialised to their default values.
             *
             * {{#crossLink "GameObject"}}GameObjects{{/crossLink}} within this Scene are attached to this
             * {{#crossLink "Visibility"}}Visibility{{/crossLink}} by default.
             * @property visibility
             * @final
             * @type Visibility
             */
            visibility: {
                get: function () {
                    return this.components["default.visibility"] ||
                        new XEO.Visibility(this, {
                            id: "default.visibility",
                            visible: true
                        });
                }
            },

            /**
             * The default {{#crossLink "Modes"}}Modes{{/crossLink}} provided by this Scene.
             *
             * This {{#crossLink "Modes"}}Modes{{/crossLink}} has an {{#crossLink "Component/id:property"}}id{{/crossLink}} equal to "default.modes",
             * with all other properties initialised to their default values.
             *
             * {{#crossLink "GameObject"}}GameObjects{{/crossLink}} within this Scene are attached to this
             * {{#crossLink "Modes"}}Modes{{/crossLink}} by default.
             * @property modes
             * @final
             * @type Modes
             */
            modes: {
                get: function () {
                    return this.components["default.modes"] ||
                        new XEO.Modes(this, {
                            id: "default.modes"
                        });
                }
            },

            /**
             * The default {{#crossLink "Geometry"}}Geometry{{/crossLink}} provided by this Scene, which is a 2x2x2 box centered at the World-space origin.
             *
             * This {{#crossLink "Geometry"}}Geometry{{/crossLink}} has an {{#crossLink "Component/id:property"}}id{{/crossLink}} equal to "default.geometry".
             *
             * {{#crossLink "GameObject"}}GameObjects{{/crossLink}} within this Scene are attached to this
             * {{#crossLink "Geometry"}}Geometry{{/crossLink}} by default.
             * @property geometry
             * @final
             * @type Geometry
             */
            geometry: {
                get: function () {
                    return this.components["default.geometry"] ||
                        new XEO.Geometry(this, {
                            id: "default.geometry"
                        });
                }
            },

            /**
             * The default {{#crossLink "Layer"}}Layer{{/crossLink}} provided by this Scene.
             *
             * This {{#crossLink "Layer"}}Layer{{/crossLink}} has an {{#crossLink "Component/id:property"}}id{{/crossLink}} equal to "default.layer",
             * with all other properties initialised to their default values.
             *
             * {{#crossLink "GameObject"}}GameObjects{{/crossLink}} within this Scene are attached to this
             * {{#crossLink "Layer"}}Layer{{/crossLink}} by default.
             * @property layer
             * @final
             * @type Layer
             */
            layer: {
                get: function () {
                    return this.components["default.layer"] ||
                        new XEO.Layer(this, {
                            id: "default.layer",
                            priority: 0
                        });
                }
            },

            /**
             * The default {{#crossLink "Lights"}}Lights{{/crossLink}} provided
             * by this Scene.
             *
             * This {{#crossLink "Lights"}}Lights{{/crossLink}} has an {{#crossLink "Component/id:property"}}id{{/crossLink}} equal to *````"default.lights"````*,
             * with all other properties initialised to their default values (ie. the default set of light sources for a {{#crossLink "Lights"}}Lights{{/crossLink}}).
             *
             * {{#crossLink "GameObject"}}GameObjects{{/crossLink}} within this Scene are attached to this
             * {{#crossLink "Lights"}}Lights{{/crossLink}} by default.
             *
             * @property lights
             * @final
             * @type Lights
             */
            lights: {
                get: function () {
                    return this.components["default.lights"] ||
                        new XEO.Lights(this, {
                            id: "default.lights",

                            // By default a XEO.Lights has an empty lights
                            // property, so we must provide some lights

                            lights: [

                                // Ambient light source #0
                                new XEO.AmbientLight(this, {
                                    id: "default.light0",
                                    color: [0.7, 0.7, 0.7],
                                    intensity: 1.0
                                }),

                                // Directional light source #1
                                new XEO.DirLight(this, {
                                    id: "default.light1",
                                    dir: [-0.5, -0.5, -1.0],
                                    color: [1.0, 1.0, 1.0],
                                    intensity: 1.0,
                                    space: "view"
                                }),

                                // Directional light source #2
                                new XEO.DirLight(this, {
                                    id: "default.light2",
                                    dir: [1.0, -0.9, -0.7],
                                    color: [1.0, 1.0, 1.0],
                                    intensity: 1.0,
                                    space: "view"
                                })
                            ]
                        });
                }
            },

            /**
             * The {{#crossLink "PhongMaterial"}}PhongMaterial{{/crossLink}} provided as the default material by this Scene.
             *
             * This {{#crossLink "PhongMaterial"}}PhongMaterial{{/crossLink}} has
             * an {{#crossLink "Component/id:property"}}id{{/crossLink}} equal to "default.material", with all
             * other properties initialised to their default values.
             *
             * {{#crossLink "GameObject"}}GameObjects{{/crossLink}} within this Scene are attached to this
             * {{#crossLink "PhongMaterial"}}PhongMaterial{{/crossLink}} by default.
             * @property material
             * @final
             * @type PhongMaterial
             */
            material: {
                get: function () {
                    return this.components["default.material"] ||
                        new XEO.PhongMaterial(this, {
                            id: "default.material"
                        });
                }
            },

            /**
             * The default {{#crossLink "MorphTargets"}}MorphTargets{{/crossLink}} provided by this Scene.
             *
             * This {{#crossLink "MorphTargets"}}MorphTargets{{/crossLink}} has an {{#crossLink "Component/id:property"}}id{{/crossLink}} equal to "default.morphTargets",
             * with all other properties initialised to their default values.
             *
             * {{#crossLink "GameObject"}}GameObjects{{/crossLink}} within this Scene are attached to this
             * {{#crossLink "MorphTargets"}}MorphTargets{{/crossLink}} by default.
             * @property morphTargets
             * @final
             * @type MorphTargets
             */
            morphTargets: {
                get: function () {
                    return this.components["default.morphTargets"] ||
                        new XEO.MorphTargets(this, {
                            id: "default.morphTargets"
                        });
                }
            },

            /**
             * The default {{#crossLink "Reflect"}}Reflect{{/crossLink}} provided by this Scene,
             * (which is initially an empty {{#crossLink "Reflect"}}Reflect{{/crossLink}} that has no effect).
             *
             * This {{#crossLink "Reflect"}}Reflect{{/crossLink}} has an {{#crossLink "Component/id:property"}}id{{/crossLink}} equal to "default.reflect",
             * with all other properties initialised to their default values.
             *
             * {{#crossLink "GameObject"}}GameObjects{{/crossLink}} within this Scene are attached to this
             * {{#crossLink "Reflect"}}Reflect{{/crossLink}} by default.
             * @property reflect
             * @final
             * @type Reflect
             */
            reflect: {
                get: function () {
                    return this.components["default.reflect"] ||
                        new XEO.Reflect(this, {
                            id: "default.reflect"
                        });
                }
            },

            /**
             * The default {{#crossLink "Shader"}}Shader{{/crossLink}} provided by this Scene
             * (which is initially an empty {{#crossLink "Shader"}}Shader{{/crossLink}} that has no effect).
             *
             * This {{#crossLink "Shader"}}Shader{{/crossLink}} has an {{#crossLink "Component/id:property"}}id{{/crossLink}} equal to "default.shader",
             * with all other properties initialised to their default values.
             *
             * {{#crossLink "GameObject"}}GameObjects{{/crossLink}} within this Scene are attached to this
             * {{#crossLink "Shader"}}Shader{{/crossLink}} by default.
             * @property shader
             * @final
             * @type Shader
             */
            shader: {
                get: function () {
                    return this.components["default.shader"] ||
                        this.components["default.shader"] || new XEO.Shader(this, {
                            id: "default.shader"
                        });
                }
            },

            /**
             * The default {{#crossLink "ShaderParams"}}ShaderParams{{/crossLink}} provided by this Scene.
             *
             * This {{#crossLink "ShaderParams"}}ShaderParams{{/crossLink}} has an {{#crossLink "Component/id:property"}}id{{/crossLink}} equal to "default.shaderParams",
             * with all other properties initialised to their default values.
             *
             * {{#crossLink "GameObject"}}GameObjects{{/crossLink}} within this Scene are attached to this
             * {{#crossLink "ShaderParams"}}{{/crossLink}} by default.
             *
             * @property shaderParams
             * @final
             * @type ShaderParams
             */
            shaderParams: {
                get: function () {
                    return this.components["default.shaderParams"] ||
                        new XEO.ShaderParams(this, {
                            id: "default.shaderParams"
                        });
                }
            },

            /**
             * The default {{#crossLink "Stage"}}Stage{{/crossLink}} provided by this Scene.
             *
             * This {{#crossLink "Stage"}}Stage{{/crossLink}} has
             * an {{#crossLink "Component/id:property"}}id{{/crossLink}} equal to "default.stage" and
             * a {{#crossLink "Stage/priority:property"}}priority{{/crossLink}} equal to ````0````.
             *
             * {{#crossLink "GameObject"}}GameObjects{{/crossLink}} within this Scene are attached to this
             * {{#crossLink "Stage"}}Stage{{/crossLink}} by default.
             * @property stage
             * @final
             * @type Stage
             */
            stage: {
                get: function () {
                    return this.components["default.stage"] ||
                        new XEO.Stage(this, {
                            id: "default.stage",
                            priority: 0
                        });
                }
            }
        },

        /**
         * Attempts to pick a {{#crossLink "GameObject"}}GameObject{{/crossLink}} at the given Canvas-space coordinates.
         *
         * Ignores {{#crossLink "GameObject"}}GameObjects{{/crossLink}} that are attached
         * to either a {{#crossLink "Stage"}}Stage{{/crossLink}} with {{#crossLink "Stage/pickable:property"}}pickable{{/crossLink}}
         * set *false* or a {{#crossLink "Modes"}}Modes{{/crossLink}} with {{#crossLink "Modes/picking:property"}}picking{{/crossLink}} set *false*.
         *
         * On success, will fire a {{#crossLink "Scene/picked:event"}}{{/crossLink}} event on this Scene, along with
         * a separate {{#crossLink "Object/picked:event"}}{{/crossLink}} event on the target {{#crossLink "GameObject"}}GameObject{{/crossLink}}.
         *
         * @method pick
         * @param {Array of Number} canvasPos Canvas-space coordinates.
         * @param {*} [options] Pick options.
         * @param {Boolean} [options.rayPick=false] Whether to perform a 3D ray-intersect pick.
         * @returns {*} Hit record when a {{#crossLink "GameObject"}}{{/crossLink}} is picked.
         */
        pick: function (canvasPos, options) {

            return this._renderer.pick({
                canvasPos: canvasPos,
                rayPick: options.rayPick
            });
        },


        /**
         * Resets this Scene to its default state.
         *
         * References to any components in this Scene will become invalid.
         */
        clear: function () {

            for (var id in this.components) {
                if (this.components.hasOwnProperty(id)) {

                    // Each component fires "destroyed" as it is destroyed,
                    // which this Scene handles by removing the component

                    this.components[id].destroy();
                }
            }

            // Reinitialise defaults

            this._initDefaults();

            this._dirtyObjects = {};
        },

        testPattern: function () {

            // Clear the scene

            this.clear();

            // Create spinning test object

            var rotate = new XEO.Rotate(this, {
                xyz: [0, .5, .5],
                angle: 0
            });

            var object = new XEO.GameObject(this, {
                transform: rotate
            });

            var angle = 0;

            var spin = this.on("tick",
                function () {
                    object.transform.angle = angle;
                    angle += 0.01;
                });

            var self = this;

            object.on("destroyed",
                function () {
                    self.off(spin);
                });

            // Destroy spinning test object as soon as something
            // is created subsequently in the scene

            this.on("componentCreated",
                function () {
                    object.destroy();
                    rotate.destroy();
                });
        },

        /**
         * Compiles and renders this Scene
         * @private
         */
        _compile: function () {

            // Compile dirty objects into this._renderer

            var countCompiledObjects = 0;

            for (var id in this._dirtyObjects) {
                if (this._dirtyObjects.hasOwnProperty(id)) {

                    this._dirtyObjects[id]._compile();

                    delete this._dirtyObjects[id];

                    countCompiledObjects++;
                }
            }

            if (countCompiledObjects > 0) {
            //    this.log("Compiled " + countCompiledObjects + " XEO.GameObject" + (countCompiledObjects > 1 ? "s" : ""));
            }

            // Render a frame

            this._renderer.render({

                // Clear buffers
                clear: true
            });
        },

        _getJSON: function () {

            // Get list of component JSONs, in ascending order of component
            // creation. We need them in that order so that any dependencies
            // that exist between them are resolved correctly as the
            // components are instantiawhen when we load the JSON again.

            var components = [];
            var component;
            var priorities = [];

            for (var id in this.components) {
                if (this.components.hasOwnProperty(id)) {

                    component = this.components[id];

                    // Don't serialize service components that
                    // will always be created on this Scene

                    if (!component._getJSON) {
                        continue;
                    }

                    // Serialize in same order as creation
                    // in order to resolve inter-component dependencies

                    components.unshift(component);
                }
            }

            components.sort(function (a, b) {
                return a._componentOrder - b._componentOrder
            });

            var componentJSONs = [];

            for (var i = 0, len = components.length; i < len; i++) {
                componentJSONs.push(components[i].json);
            }

            return {
                components: componentJSONs
            };
        },

        _destroy: function () {
            this.clear();
        }
    });

})();
;/**
 * Components for animating state within Scenes.
 *
 * @module XEO
 * @submodule animation
 */;/**
 A **CameraFlight** flies a {{#crossLink "Camera"}}{{/crossLink}} to a given target component, AABB or eye/look/up position.

 ## Overview

 <ul>
 <li>A CameraFlight animates the {{#crossLink "Lookat"}}{{/crossLink}} attached to the {{#crossLink "Camera"}}{{/crossLink}}.
 </ul>

 ## Example

 ````Javascript
 var scene = new XEO.Scene();

 var camera = new XEO.Camera(scene);

 var object = new XEO.GameObject(scene);

 var animation = new XEO.CameraFlight(scene, {
    camera: camera
 });

 animation.flyTo({
    eye: [-5,-5,-5],
    look: [0,0,0]
    up: [0,1,0]
 }, function() {
    // Arrived
 });
 ````

 @class CameraFlight
 @module XEO
 @submodule animation
 @constructor
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}Scene{{/crossLink}}.
 @param [cfg] {*} Fly configuration
 @param [cfg.id] {String} Optional ID, unique among all components in the parent {{#crossLink "Scene"}}Scene{{/crossLink}}, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this CameraFlight.
 @param [cfg.camera] {String|Camera} ID or instance of a {{#crossLink "Camera"}}Camera{{/crossLink}} to control.
 Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this CameraFlight. Defaults to the
 parent {{#crossLink "Scene"}}Scene{{/crossLink}}'s default instance, {{#crossLink "Scene/camera:property"}}camera{{/crossLink}}.
 @extends Component
 */
(function () {

    "use strict";

    XEO.CameraFlight = XEO.Component.extend({

        /**
         JavaScript class name for this Component.

         @property type
         @type String
         @final
         */
        type: "XEO.CameraFlight",

        _init: function (cfg) {

            this._look1 = XEO.math.vec3();
            this._eye1 = XEO.math.vec3();
            this._up1 = XEO.math.vec3();

            this._look2 = XEO.math.vec3();
            this._eye2 = XEO.math.vec3();
            this._up2 = XEO.math.vec3();

            this._vec = XEO.math.vec3();

            this._dist = 0;

            this._flying = false;

            this._ok = null;

            this._onTick = null;

            this._camera = cfg.camera;

            this._tempVec = XEO.math.vec3();

            this._eyeVec = XEO.math.vec3();
            this._lookVec = XEO.math.vec3();

            this._stopFOV = 55;

            this._time1 = null;
            this._time2 = null;

            this.easing = cfg.easing !== false;

            this.duration = cfg.duration || 0.5;

            this.camera = cfg.camera;
        },

        /**
         * Begins flying this CameraFlight's {{#crossLink "Camera"}}{{/crossLink}} to the given target.
         *
         * <ul>
         *     <li>When the target is a boundary, the {{#crossLink "Camera"}}{{/crossLink}} will fly towards the target
         *     and stop when the target fills most of the canvas.</li>
         *     <li>When the target is an explicit {{#crossLink "Camera"}}{{/crossLink}} position, given as ````eye````, ````look```` and ````up````
         *      vectors, then this CameraFlight will interpolate the {{#crossLink "Camera"}}{{/crossLink}} to that target and stop there.</li>
         * @method flyTo
         * @param params  {*} Flight parameters
         * @param[params.arc=0]  {Number} Factor in range [0..1] indicating how much the
         * {{#crossLink "Camera/eye:property"}}Camera's eye{{/crossLink}} position will
         * swing away from its {{#crossLink "Camera/eye:property"}}look{{/crossLink}} position as it flies to the target.
         * @param [params.component] {String|Component} ID or instance of a component to fly to.
         * @param [params.aabb] {*}  World-space axis-aligned bounding box (AABB) target to fly to.
         * @param [params.eye] {Array of Number} Position to fly the eye position to.
         * @param [params.look] {Array of Number} Position to fly the look position to.
         * @param [params.up] {Array of Number} Position to fly the up vector to.
         * @param [ok] {Function} Callback fired on arrival
         */
        flyTo: function (params, ok) {

            if (this._flying) {
                this.stop();
            }

            this._ok = ok;

            this._arc = params.arc === undefined ? 0.0 : params.arc;

            var lookat = this.camera.view;

            // Set up initial camera state

            this._look1 = lookat.look;
            this._eye1 = lookat.eye;
            this._up1 = lookat.up;

            // Get normalized eye->look vector

            this._vec = XEO.math.normalizeVec3(XEO.math.subVec3(this._eye1, this._look1, []));

            // Back-off factor in range of [0..1], when 0 is close, 1 is far

            var backOff = params.backOff || 0.5;

            if (backOff < 0) {
                backOff = 0;

            } else if (backOff > 1) {
                backOff = 1;
            }

            backOff = 1 - backOff;

            var component = params.component;
            var aabb = params.aabb;

            if (component || aabb) {

                if (component) {

                    if (XEO._isNumeric(component) || XEO._isString(component)) {

                        var componentId = component;

                        component = this.scene.components[componentId];

                        if (!component) {
                            this.error("Component not found: " + XEO._inQuotes(componentId));
                            return;
                        }
                    }

                    var worldBoundary = component.worldBoundary;

                    if (!worldBoundary) {
                        this.error("Can't fly to component " + XEO._inQuotes(componentId) + " - does not have a worldBoundary");
                        return;
                    }

                    aabb = worldBoundary.aabb;
                }

                if (aabb.xmax <= aabb.xmin || aabb.ymax <= aabb.ymin || aabb.zmax <= aabb.zmin) {
                    return;
                }

                var dist = params.dist || 2.5;
                var lenVec = Math.abs(XEO.math.lenVec3(this._vec));
                var diag = XEO.math.getAABBDiag(aabb);
                var len = Math.abs((diag / (1.0 + (backOff * 0.8))) / Math.tan(this._stopFOV / 2));  /// Tweak this to set final camera distance on arrival
                var sca = (len / lenVec) * dist;

                this._look2 = XEO.math.getAABBCenter(aabb);
                this._look2 = [this._look2[0], this._look2[1], this._look2[2]];

                if (params.offset) {

                    this._look2[0] += params.offset[0];
                    this._look2[1] += params.offset[1];
                    this._look2[2] += params.offset[2];
                }

                this._eye2 = XEO.math.addVec3(this._look2, XEO.math.mulVec3Scalar(this._vec, sca, []));
                this._up2 = XEO.math.vec3();
                this._up2[1] = 1;

            } else {

                // Zooming to specific look and eye points

                var lookat = params;

                var look = params.look || this._camera.view.look;
                var eye = params.eye || this._camera.view.eye;
                var up = params.up || this._camera.view.up;

                this._look2[0] = look[0];
                this._look2[1] = look[1];
                this._look2[2] = look[2];


                this._eye2[0] = eye[0];
                this._eye2[1] = eye[1];
                this._eye2[2] = eye[2];

                this._up2[0] = up[0];
                this._up2[1] = up[1];
                this._up2[2] = up[2];
            }

            this.fire("started", params, true);

            var self = this;

            this._time1 = (new Date()).getTime();
            this._time2 = this._time1 + this._duration;

            this._tick = this.scene.on("tick",
                function (params) {
                    self._update();
                });

            this._flying = true;
        },

        _update: function () {

            if (!this._flying) {
                return;
            }

            var time = (new Date()).getTime();

            var t = (time - this._time1) / (this._time2 - this._time1);

            if (t > 1) {
                this.stop();
                return;
            }

            t = this.easing ? this._ease(t, 0, 1, 1) : t;

            var view = this._camera.view;

            view.eye = XEO.math.lerpVec3(t, 0, 1, this._eye1, this._eye2, []);
            view.look = XEO.math.lerpVec3(t, 0, 1, this._look1, this._look2, []);
            view.up = XEO.math.lerpVec3(t, 0, 1, this._up1, this._up2, []);
        },

        // Quadratic easing out - decelerating to zero velocity
        // http://gizma.com/easing

        _ease: function (t, b, c, d) {
            t /= d;
            return -c * t * (t - 2) + b;
        },

        stop: function () {

            if (!this._flying) {
                return;
            }

            this.scene.off(this._tick);

            this._flying = false;

            this._time1 = null;
            this._time2 = null;

            this.fire("stopped", true, true);

            var ok = this._ok;

            if (ok) {
                this._ok = false;
                ok();
            }
        },

        _props: {

            camera: {

                set: function (value) {
                    var camera = value || this.scene.camera;
                    if (camera) {
                        if (XEO._isNumeric(camera) || XEO._isString(camera)) {
                            camera = this.scene.components[camera];
                            if (!camera) {
                                this.error("Component not found: " + XEO._inQuotes(value));
                                return;
                            }
                        }
                        if (camera.type != "XEO.Camera") {
                            this.error("Component " + XEO._inQuotes(camera.id) + " is not a XEO.Camera");
                            return;
                        }
                        this._camera = value || this.scene.camera;
                    }
                    this.stop();
                },

                get: function () {
                    return this._camera;
                }
            },

            duration: {

                set: function (value) {
                    this._duration = value * 1000.0;
                    this.stop();
                },

                get: function () {
                    return this._duration * 0.001;
                }
            }
        },

        _getJSON: function () {

            var json = {};

            if (this._children.camera) {
                json.camera = this._children.camera.id;
            }

            return json;
        },

        _destroy: function () {
            this.stop();
        }
    });

})();
;(function () {

    "use strict";


    /**
     A **MorphTargets** defines interpolation targets for morphing {{#crossLink "Geometry"}}Geometry{{/crossLink}}s on
     attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.

     <img src="../../../assets/images/MorphTargets.png"></img>

     ## Example

     TODO

     @class MorphTargets
     @module XEO
     @submodule animation
     @constructor
     @param [scene] {Scene} Parent {{#crossLink "Scene"}}Scene{{/crossLink}} - creates this MorphTarget in the default
     {{#crossLink "Scene"}}Scene{{/crossLink}} when omitted.
     @param [cfg] {*} Configs
     @param [cfg.id] {String} Optional ID, unique among all components in the parent scene, generated automatically when omitted.
     @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this MorphTarget.
     @param [cfg.targets=[]] {Array} The morph targets.
     @param [cfg.factor=0] {Number} The morph factor.
     @extends Component
     */
    XEO.MorphTargets = XEO.Component.extend({

        type: "XEO.MorphTargets",

        _init: function (cfg) {

            this.scene.on("webglContextRestored",
                function () {

                });

            this.targets = cfg.targets;
            this.factor = cfg.factor;
        },


        _props: {

            /**
             * The morph targets.
             *
             *TODO
             *
             * @property targets
             * @default []
             * @type Array
             */
            targets: {

                set: function (value) {

                    /**
                     * Fired whenever this MorphTarget's  {{#crossLink "MorphTargets/targets:property"}}{{/crossLink}} property changes.
                     * @event targets
                     * @param value The property's new value
                     */
                },

                get: function () {

                }
            },

            /**
             * The morph factor
             *
             * @property factor
             * @default 0
             * @type Number
             */
            factor: {

                set: function (value) {

                    /**
                     * Fired whenever this MorphTarget's  {{#crossLink "MorphTargets/factor:property"}}{{/crossLink}} property changes.
                     * @event factor
                     * @param value The property's new value
                     */
                },

                get: function () {
                    return 0;
                    return this._state.factor;
                }
            },

            _compile: function () {
                this._renderer.MorphTargets = this._state;
            }
        },

        /**
         * JSON representation of this component
         * @property json
         * @type Object
         */

        _getJSON: function () {
            return {
                targets: this.targets,
                factor: this.factor
            };
        }
    });

})();


;

/**
 A **Camera** defines a viewpoint on attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.

 ## Overview

 <ul>

 <li> A Camera is composed of a viewing transform and a projection transform.</li>

 <li>The viewing transform is usually a {{#crossLink "Lookat"}}Lookat{{/crossLink}}.</li>

 <li>The projection transform may be an {{#crossLink "Ortho"}}Ortho{{/crossLink}}, {{#crossLink "Frustum"}}Frustum{{/crossLink}}
 or {{#crossLink "Perspective"}}Perspective{{/crossLink}}.</li>

 <li> By default, each Camera is composed of its parent {{#crossLink "Scene"}}Scene{{/crossLink}}'s default {{#crossLink "Scene/view:property"}}{{/crossLink}} transform,
 (which is a {{#crossLink "Lookat"}}Lookat{{/crossLink}}) and default
 {{#crossLink "Scene/project:property"}}{{/crossLink}} transform (which is a {{#crossLink "Perspective"}}Perspective{{/crossLink}}).
 You would override those with your own transform components as necessary.</li>

 </ul>

 <img src="../../../assets/images/Camera.png"></img>

 ## Example

 <iframe style="width: 600px; height: 400px" src="../../examples/camera_perspective.html"></iframe>

 In this example we have

 <ul>
 <li>a {{#crossLink "Lookat"}}{{/crossLink}} view transform,</li>
 <li>a {{#crossLink "Perspective"}}{{/crossLink}} projection transform,</li>
 <li>a Camera attached to the {{#crossLink "Lookat"}}{{/crossLink}} and {{#crossLink "Perspective"}}{{/crossLink}},</li>
 <li>a {{#crossLink "Geometry"}}{{/crossLink}} that is the default box shape, and
 <li>a {{#crossLink "GameObject"}}{{/crossLink}} attached to all of the above.</li>
 </ul>


 ```` javascript
 var scene = new XEO.Scene();

 var lookat = new XEO.Lookat(scene, {
        eye: [0, 0, -10],
        look: [0, 0, 0],
        up: [0, 1, 0]
    });

 var perspective = new XEO.Lookat(scene, {
        fovy: 60,
        near: 0.1,
        far: 1000
    });

 var camera = new XEO.Camera(scene, {
        view: lookat,
        project: perspective
    });

 var geometry = new XEO.Geometry(scene);  // Defaults to a 2x2x2 box

 var object = new XEO.GameObject(scene, {
        camera: camera,
        geometry: geometry
    });

 scene.on("tick", function () {
       camera.view.rotateEyeY(0.5);
       camera.view.rotateEyeX(0.3);
    });
 ````
 @class Camera
 @module XEO
 @submodule camera
 @constructor
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}Scene{{/crossLink}}, creates this Camera within the
 default {{#crossLink "Scene"}}Scene{{/crossLink}} when omitted.
 @param [cfg] {*} Configs
 @param [cfg.id] {String} Optional ID, unique among all components in the parent {{#crossLink "Scene"}}Scene{{/crossLink}}, generated automatically when omitted.
 You only need to supply an ID if you need to be able to find the Camera by ID within its parent {{#crossLink "Scene"}}Scene{{/crossLink}} later.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this Camera.
 @param [cfg.view] {String|XEO.Lookat} ID or instance of a view transform within the parent {{#crossLink "Scene"}}Scene{{/crossLink}}. Defaults to the
 parent {{#crossLink "Scene"}}Scene{{/crossLink}}'s default {{#crossLink "Scene/view:property"}}{{/crossLink}} transform,
 which is a {{#crossLink "Lookat"}}Lookat{{/crossLink}}.
 @param [cfg.project] {String|XEO.Perspective|XEO.Ortho|XEO.Frustum} ID or instance of a projection transform
 within the parent {{#crossLink "Scene"}}Scene{{/crossLink}}. Defaults to the parent
 {{#crossLink "Scene"}}Scene{{/crossLink}}'s default {{#crossLink "Scene/project:property"}}{{/crossLink}} transform,
 which is a {{#crossLink "Perspective"}}Perspective{{/crossLink}}.
 @extends Component
 */
(function () {

    "use strict";

    XEO.Camera = XEO.Component.extend({

        type: "XEO.Camera",

        _init: function (cfg) {

            this.project = cfg.project;

            this.view = cfg.view;
        },

        _props: {

            /**
             * The projection transform component for this Camera.
             *
             * When set to a null or undefined value, will default to the parent {{#crossLink "Scene"}}Scene{{/crossLink}}'s
             * default {{#crossLink "Scene/project:property"}}project{{/crossLink}}, which is
             * a {{#crossLink "Perspective"}}Perspective{{/crossLink}}.
             *
             * Fires a {{#crossLink "Camera/project:event"}}{{/crossLink}} event on change.
             *
             * @property project
             * @type Perspective|XEO.Ortho|XEO.Frustum
             */
            project: {

                set: function (value) {

                    /**
                     * Fired whenever this Camera's {{#crossLink "Camera/project:property"}}{{/crossLink}} property changes.
                     * @event project
                     * @param value The property's new value
                     */
                    this._setChild("project", value);
                },

                get: function () {
                    return this._children.project;
                }
            },

            /**
             * The viewing transform component for this Camera.
             *
             * When set to a null or undefined value, will default to the parent {{#crossLink "Scene"}}Scene{{/crossLink}}'s
             * default {{#crossLink "Scene/view:property"}}view{{/crossLink}}, which is
             * a {{#crossLink "Lookat"}}Lookat{{/crossLink}}.
             *
             * Fires a {{#crossLink "Camera/view:event"}}{{/crossLink}} event on change.
             *
             * @property view
             * @type Lookat
             */
            view: {

                set: function (value) {

                    /**
                     * Fired whenever this Camera's {{#crossLink "Camera/view:property"}}{{/crossLink}} property changes.
                     *
                     * @event view
                     * @param value The property's new value
                     */
                    this._setChild("view", value);
                },

                get: function () {
                    return this._children.view;
                }
            }
        },

        _compile: function () {
            this._children.project._compile();
            this._children.view._compile();
        },

        _getJSON: function () {

            var json = {};

            if (this._children.project) {
                json.project = this._children.project.id;
            }

            if (this._children.view) {
                json.view = this._children.view.id;
            }

            return json;
        }
    });

})();
;/**
 A **Frustum** defines a perspective projection as a frustum-shaped view volume.

 ## Overview

 <ul>
 <li>{{#crossLink "Camera"}}Camera{{/crossLink}} components pair these with viewing transform components, such as
 {{#crossLink "Lookat"}}Lookat{{/crossLink}}, to define viewpoints for attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.</li>
 <li>See <a href="Shader.html#inputs">Shader Inputs</a> for the variables that Ortho components create within xeoEngine's shaders.</li>
 </ul>

 <img src="../../../assets/images/Frustum.png"></img>

 ## Example

 ## Example

 <iframe style="width: 600px; height: 400px" src="../../examples/camera_frustum.html"></iframe>

 In this example we have a {{#crossLink "GameObject"}}GameObject{{/crossLink}} that's attached to a
 {{#crossLink "Camera"}}Camera{{/crossLink}} that has a {{#crossLink "Lookat"}}Lookat{{/crossLink}} view transform and a Frustum
 projection transform.

 ````Javascript

 var scene = new XEO.Scene();

 var lookat = new XEO.Lookat(scene, {
        eye: [0, 0, -4],
        look: [0, 0, 0],
        up: [0, 1, 0]
    });

 var frustum = new XEO.Frustum(scene, {
        left: -0.1,
        right: 0.1,
        bottom: -0.1,
        top: 0.1,
        near: 0.15,
        far: 1000
    });

 var camera = new XEO.Camera(scene, {
        view: lookat,
        project: frustum
    });

 var geometry = new XEO.Geometry(scene);  // Defaults to a 2x2x2 box

 var object = new XEO.GameObject(scene, {
        camera: camera,
        geometry: geometry
    });

 scene.on("tick", function () {
       camera.view.rotateEyeY(0.5);
       camera.view.rotateEyeX(0.3);
    });
 ````

 @class Frustum
 @module XEO
 @submodule camera
 @constructor
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}Scene{{/crossLink}}, creates this Frustum within the
 default {{#crossLink "Scene"}}Scene{{/crossLink}} when omitted.
 @param [cfg] {*} Configs
 @param [cfg.id] {String} Optional ID, unique among all components in the parent scene, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this Frustum.
 @param [cfg.left=-1] {Number} Position of the Frustum's left plane on the View-space X-axis.
 @param [cfg.right=1] {Number} Position of the Frustum's right plane on the View-space X-axis.
 @param [cfg.bottom=-1] {Number} Position of the Frustum's bottom plane on the View-space Y-axis.
 @param [cfg.top=1] {Number} Position of the Frustum's top plane on the View-space Y-axis.
 @param [cfg.near=0.1] {Number} Position of the Frustum's near plane on the View-space Z-axis.
 @param [cfg.far=1000] {Number} Position of the Frustum's far plane on the positive View-space Z-axis.
 @extends Component
 */
(function () {

    "use strict";

    XEO.Frustum = XEO.Component.extend({

        type: "XEO.Frustum",

        _init: function (cfg) {

            this._state = new XEO.renderer.ProjTransform({
                matrix: null
            });

            this._dirty = false;

            this._left = -1.0;
            this._right = 1.0;
            this._bottom = -1.0;
            this._top = 1.0;
            this._near = 0.1;
            this._far = 10000.0;

            // Set component properties

            this.left = cfg.left;
            this.right = cfg.right;
            this.bottom = cfg.bottom;
            this.top = cfg.top;
            this.near = cfg.near;
            this.far = cfg.far;
        },

        // Schedules state rebuild on the next "tick"

        _scheduleBuild: function () {

            if (!this._dirty) {

                this._dirty = true;

                var self = this;

                this.scene.once("tick",
                    function () {
                        self._build();
                    });
            }
        },

        // Rebuilds state

        _build: function () {

            this._state.matrix = XEO.math.frustumMat4(
                this._left,
                this._right,
                this._bottom,
                this._top,
                this._near,
                this._far,
                this._state.matrix);

            this._dirty = false;

            /**
             * Fired whenever this Frustum's  {{#crossLink "Lookat/matrix:property"}}{{/crossLink}} property is regenerated.
             * @event matrix
             * @param value The property's new value
             */
            this.fire("matrix", this._state.matrix);
        },

        _props: {

            /**
             Position of this Frustum's left plane on the View-space X-axis.

             Fires a {{#crossLink "Frustum/left:event"}}{{/crossLink}} event on change.

             @property left
             @default -1.0
             @type Number
             */
            left: {

                set: function (value) {

                    this._left = (value !== undefined && value !== null) ? value : -1.0;

                    this._renderer.imageDirty = true;

                    this._scheduleBuild();

                    /**
                     * Fired whenever this Frustum's {{#crossLink "Frustum/left:property"}}{{/crossLink}} property changes.
                     *
                     * @event left
                     * @param value The property's new value
                     */
                    this.fire("left", this._left);
                },

                get: function () {
                    return this._left;
                }
            },

            /**
             * Position of this Frustum's right plane on the View-space X-axis.
             *
             * Fires a {{#crossLink "Frustum/right:event"}}{{/crossLink}} event on change.
             *
             * @property right
             * @default 1.0
             * @type Number
             */
            right: {

                set: function (value) {

                    this._right = (value !== undefined && value !== null) ? value : 1.0;

                    this._renderer.imageDirty = true;

                    this._scheduleBuild();

                    /**
                     * Fired whenever this Frustum's {{#crossLink "Frustum/right:property"}}{{/crossLink}} property changes.
                     *
                     * @event right
                     * @param value The property's new value
                     */
                    this.fire("right", this._right);
                },

                get: function () {
                    return this._right;
                }
            },

            /**
             * Position of this Frustum's top plane on the View-space Y-axis.
             *
             * Fires a {{#crossLink "Frustum/top:event"}}{{/crossLink}} event on change.
             *
             * @property top
             * @default 1.0
             * @type Number
             */
            top: {

                set: function (value) {

                    this._top = (value !== undefined && value !== null) ? value : 1.0;

                    this._renderer.imageDirty = true;

                    this._scheduleBuild();

                    /**
                     * Fired whenever this Frustum's   {{#crossLink "Frustum/top:property"}}{{/crossLink}} property changes.
                     *
                     * @event top
                     * @param value The property's new value
                     */
                    this.fire("top", this._top);
                },

                get: function () {
                    return this._top;
                }
            },

            /**
             * Position of this Frustum's bottom plane on the View-space Y-axis.
             *
             * Fires a {{#crossLink "Frustum/bottom:event"}}{{/crossLink}} event on change.
             *
             * @property bottom
             * @default -1.0
             * @type Number
             */
            bottom: {

                set: function (value) {

                    this._bottom = (value !== undefined && value !== null) ? value : -1.0;

                    this._renderer.imageDirty = true;

                    this._scheduleBuild();

                    /**
                     * Fired whenever this Frustum's   {{#crossLink "Frustum/bottom:property"}}{{/crossLink}} property changes.
                     *
                     * @event bottom
                     * @param value The property's new value
                     */
                    this.fire("bottom", this._bottom);
                },

                get: function () {
                    return this._bottom;
                }
            },

            /**
             * Position of this Frustum's near plane on the positive View-space Z-axis.
             *
             * Fires a {{#crossLink "Frustum/near:event"}}{{/crossLink}} event on change.
             *
             * @property near
             * @default 0.1
             * @type Number
             */
            near: {

                set: function (value) {

                    this._near = (value !== undefined && value !== null) ? value : 0.1;

                    this._renderer.imageDirty = true;

                    this._scheduleBuild();

                    /**
                     * Fired whenever this Frustum's {{#crossLink "Frustum/near:property"}}{{/crossLink}} property changes.
                     *
                     * @event near
                     * @param value The property's new value
                     */
                    this.fire("near", this._near);
                },

                get: function () {
                    return this._near;
                }
            },

            /**
             * Position of this Frustum's far plane on the positive View-space Z-axis.
             *
             * Fires a {{#crossLink "Frustum/far:event"}}{{/crossLink}} event on change.
             *
             * @property far
             * @default 10000.0
             * @type Number
             */
            far: {

                set: function (value) {

                    this._far = (value !== undefined && value !== null) ? value : 10000.0;

                    this._renderer.imageDirty = true;

                    this._scheduleBuild();

                    /**
                     * Fired whenever this Frustum's  {{#crossLink "Frustum/far:property"}}{{/crossLink}} property changes.
                     *
                     * @event far
                     * @param value The property's new value
                     */
                    this.fire("far", this._far);
                },

                get: function () {
                    return this._far;
                }
            },

            /**
             * The elements of this Frustum's projection transform matrix.
             *
             * Fires a {{#crossLink "Frustum/matrix:event"}}{{/crossLink}} event on change.
             *
             * @property matrix
             * @type {Float64Array}
             */
            matrix: {

                get: function () {

                    if (this._dirty) {
                        this._build();
                    }

                    return this._state.matrix;
                }
            }
        },

        _compile: function () {
            this._renderer.projTransform = this._state;
        },

        _getJSON: function () {
            return {
                left: this._left,
                right: this._right,
                top: this._top,
                bottom: this._bottom,
                near: this._near,
                far: this._far
            };
        },

        _destroy: function () {
            this._state.destroy();
        }
    });

})();
;/**
 A **Lookat** defines a viewing transform as an {{#crossLink "Lookat/eye:property"}}eye{{/crossLink}} position, a
 {{#crossLink "Lookat/look:property"}}look{{/crossLink}} position and an {{#crossLink "Lookat/up:property"}}up{{/crossLink}}
 vector.

 ## Overview

 <ul>
 <li>{{#crossLink "Camera"}}Camera{{/crossLink}} components pair these with projection transforms such as
 {{#crossLink "Perspective"}}Perspective{{/crossLink}}, to define viewpoints on attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.</li>
 <li>See <a href="Shader.html#inputs">Shader Inputs</a> for the variables that Lookat components create within xeoEngine's shaders.</li>
 </ul>

 <img src="../../../assets/images/Lookat.png"></img>

 ## Example

 <iframe style="width: 600px; height: 400px" src="../../examples/camera_perspective.html"></iframe>

 In this example we have a Lookat that positions the eye at -4 on the World-space Z-axis, while looking at the origin.
 Then we attach our Lookat to a {{#crossLink "Camera"}}{{/crossLink}}. which we attach to a {{#crossLink "GameObject"}}{{/crossLink}}.

 ````Javascript
 var scene = new XEO.Scene();

 var lookat = new XEO.Lookat(scene, {
        eye: [0, 0, -4],
        look: [0, 0, 0],
        up: [0, 1, 0]
    });

 var perspective = new XEO.Perspective(scene, {
        fovy: 60,
        near: 0.1,
        far: 1000
    });

 var camera = new XEO.Camera(scene, {
        view: lookat,
        project: perspective
    });

 var geometry = new XEO.Geometry(scene);  // Defaults to a 2x2x2 box

 var object = new XEO.GameObject(scene, {
        camera: camera,
        geometry: geometry
    });

 scene.on("tick", function () {
       camera.view.rotateEyeY(0.5);
       camera.view.rotateEyeX(0.3);
    });
 ````

 @class Lookat
 @module XEO
 @submodule camera
 @constructor
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}Scene{{/crossLink}} - creates this Lookat in the default
 {{#crossLink "Scene"}}Scene{{/crossLink}} when omitted.
 @param [cfg] {*} Configs
 @param [cfg.id] {String} Optional ID, unique among all components in the parent scene, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this Lookat.
 @param [cfg.eye=[0,0,-10]] {Array of Number} Eye position.
 @param [cfg.look=[0,0,0]] {Array of Number} The position of the point-of-interest we're looking at.
 @param [cfg.up=[0,1,0]] {Array of Number} The "up" vector.
 @extends Component
 @author xeolabs / http://xeolabs.com/
 */
(function () {

    "use strict";

    XEO.Lookat = XEO.Component.extend({

        type: "XEO.Lookat",

        _init: function (cfg) {

            this._state = new XEO.renderer.ViewTransform({
                matrix: XEO.math.mat4(),
                normalMatrix: XEO.math.mat4(),
                eye: [0, 0, -10.0],
                look: [0, 0, 0],
                up: [0, 1, 0]
            });

            this._dirty = true;

            this.eye = cfg.eye;
            this.look = cfg.look;
            this.up = cfg.up;
        },

        // Schedules a call to #_build on the next "tick"
        _scheduleBuild: function () {

            if (!this._dirty) {

                this._dirty = true;

                var self = this;

                this.scene.once("tick",
                    function () {
                        self._build();
                    });
            }
        },

        // Rebuilds rendering state
        _build: function () {

            this._state.matrix = new Float32Array(XEO.math.lookAtMat4c(
                this._state.eye[0], this._state.eye[1], this._state.eye[2],
                this._state.look[0], this._state.look[1], this._state.look[2],
                this._state.up[0], this._state.up[1], this._state.up[2],
                this._state.matrix));

            this._state.normalMatrix = new Float32Array(XEO.math.transposeMat4(new Float32Array(XEO.math.inverseMat4(this._state.matrix, this._state.normalMatrix), this._state.normalMatrix)));

            this._dirty = false;

            /**
             * Fired whenever this Lookat's  {{#crossLink "Lookat/matrix:property"}}{{/crossLink}} property is updated.
             *
             * @event matrix
             * @param value The property's new value
             */
            this.fire("matrix", this._state.matrix);
        },

        /**
         * Rotate 'eye' about 'look', around the 'up' vector
         *
         * @param {Number} angle Angle of rotation in degrees
         */
        rotateEyeY: function (angle) {

            // Get 'look' -> 'eye' vector
            var eye2 = XEO.math.subVec3(this._state.eye, this._state.look, []);

            // Rotate 'eye' vector about 'up' vector
            var mat = XEO.math.rotationMat4v(angle * 0.0174532925, this._state.up);
            eye2 = XEO.math.transformPoint3(mat, eye2, []);

            // Set eye position as 'look' plus 'eye' vector
            this.eye = XEO.math.addVec3(eye2, this._state.look, []);
        },

        /**
         * Rotate 'eye' about 'look' around the X-axis
         *
         * @param {Number} angle Angle of rotation in degrees
         */
        rotateEyeX: function (angle) {

            // Get 'look' -> 'eye' vector
            var eye2 = XEO.math.subVec3(this._state.eye, this._state.look, []);

            // Get orthogonal vector from 'eye' and 'up'
            var left = XEO.math.cross3Vec3(XEO.math.normalizeVec3(eye2, []), XEO.math.normalizeVec3(this._state.up, []));

            // Rotate 'eye' vector about orthogonal vector
            var mat = XEO.math.rotationMat4v(angle * 0.0174532925, left);
            eye2 = XEO.math.transformPoint3(mat, eye2, []);

            // Set eye position as 'look' plus 'eye' vector
            this.eye = XEO.math.addVec3(eye2, this._state.look, []);

            // Rotate 'up' vector about orthogonal vector
            this.up = XEO.math.transformPoint3(mat, this._state.up, []);
        },

        /**
         * Rotate 'look' about 'eye', around the 'up' vector
         *
         * <p>Applies constraints added with {@link #addConstraint}.</p>
         *
         * @param {Number} angle Angle of rotation in degrees
         */
        rotateLookY: function (angle) {

            // Get 'look' -> 'eye' vector
            var look2 = XEO.math.subVec3(this._state.look, this._state.eye, []);

            // Rotate 'look' vector about 'up' vector
            var mat = XEO.math.rotationMat4v(angle * 0.0174532925, this._state.up);
            look2 = XEO.math.transformPoint3(mat, look2, []);

            // Set look position as 'look' plus 'eye' vector
            this.look = XEO.math.addVec3(look2, this._state.eye, []);
        },

        /**
         * Rotate 'eye' about 'look' around the X-axis
         *
         * @param {Number} angle Angle of rotation in degrees
         */
        rotateLookX: function (angle) {

            // Get 'look' -> 'eye' vector
            var look2 = XEO.math.subVec3(this._state.look, this._state.eye, []);

            // Get orthogonal vector from 'eye' and 'up'
            var left = XEO.math.cross3Vec3(XEO.math.normalizeVec3(look2, []), XEO.math.normalizeVec3(this._state.up, []));

            // Rotate 'look' vector about orthogonal vector
            var mat = XEO.math.rotationMat4v(angle * 0.0174532925, left);
            look2 = XEO.math.transformPoint3(mat, look2, []);

            // Set eye position as 'look' plus 'eye' vector
            this.look = XEO.math.addVec3(look2, this._state.eye, []);

            // Rotate 'up' vector about orthogonal vector
            this.up = XEO.math.transformPoint3(mat, this._state.up, []);
        },

        /**
         * Pans the camera along X and Y axis.
         * @param pan The pan vector
         */
        pan: function (pan) {

            // Get 'look' -> 'eye' vector
            var eye2 = XEO.math.subVec3(this._state.eye, this._state.look, []);

            // Building this pan vector
            var vec = [0, 0, 0];
            var v;

            if (pan[0] !== 0) {

                // Pan along orthogonal vector to 'look' and 'up'

                var left = XEO.math.cross3Vec3(XEO.math.normalizeVec3(eye2, []), XEO.math.normalizeVec3(this._state.up, []));

                v = XEO.math.mulVec3Scalar(left, pan[0]);

                vec[0] += v[0];
                vec[1] += v[1];
                vec[2] += v[2];
            }

            if (pan[1] !== 0) {

                // Pan along 'up' vector

                v = XEO.math.mulVec3Scalar(XEO.math.normalizeVec3(this._state.up, []), pan[1]);

                vec[0] += v[0];
                vec[1] += v[1];
                vec[2] += v[2];
            }

            if (pan[2] !== 0) {

                // Pan along 'eye'- -> 'look' vector

                v = XEO.math.mulVec3Scalar(XEO.math.normalizeVec3(eye2, []), pan[2]);

                vec[0] += v[0];
                vec[1] += v[1];
                vec[2] += v[2];
            }

            this.eye = XEO.math.addVec3(this._state.eye, vec, []);
            this.look = XEO.math.addVec3(this._state.look, vec, []);
        },

        /**
         * Increments/decrements zoom factor, ie. distance between eye and look.
         * @param delta
         */
        zoom: function (delta) {

            var vec = XEO.math.subVec3(this._state.eye, this._state.look, []); // Get vector from eye to look
            var lenLook = Math.abs(XEO.math.lenVec3(vec, []));    // Get len of that vector
            var newLenLook = Math.abs(lenLook + delta);         // Get new len after zoom

            var dir = XEO.math.normalizeVec3(vec, []);  // Get normalised vector

            this.eye = XEO.math.addVec3(this._state.look, XEO.math.mulVec3Scalar(dir, newLenLook), []);
        },
        
        _props: {

            /**
             * Position of this Lookat's eye.
             *
             * Fires an {{#crossLink "Lookat/eye:event"}}{{/crossLink}} event on change.
             *
             * @property eye
             * @default [0,0,-10]
             * @type Array(Number)
             */
            eye: {

                set: function (value) {

                    value = value || [0, 0, -10];

                    var eye = this._state.eye;

                    eye[0] = value[0];
                    eye[1] = value[1];
                    eye[2] = value[2];

                    this._renderer.imageDirty = true;

                    this._scheduleBuild();

                    /**
                     * Fired whenever this Lookat's  {{#crossLink "Lookat/eye:property"}}{{/crossLink}} property changes.
                     *
                     * @event eye
                     * @param value The property's new value
                     */
                    this.fire("eye", this._state.eye);
                },

                get: function () {
                    return this._state.eye;
                }
            },

            /**
             * Position of this Lookat's point-of-interest.
             *
             * Fires a {{#crossLink "Lookat/look:event"}}{{/crossLink}} event on change.
             *
             * @property look
             * @default [0,0,0]
             * @type Array(Number)
             */
            look: {

                set: function (value) {

                    value = value || [0, 0, 0];

                    var look = this._state.look;

                    look[0] = value[0];
                    look[1] = value[1];
                    look[2] = value[2];

                    this._renderer.imageDirty = true;

                    this._scheduleBuild();

                    /**
                     * Fired whenever this Lookat's  {{#crossLink "Lookat/look:property"}}{{/crossLink}} property changes.
                     *
                     * @event look
                     * @param value The property's new value
                     */
                    this.fire("look", this._state.look);
                },

                get: function () {
                    return this._state.look;
                }
            },

            /**
             * Direction of the "up" vector.
             * Fires an {{#crossLink "Lookat/up:event"}}{{/crossLink}} event on change.
             * @property up
             * @default [0,1,0]
             * @type Array(Number)
             */
            up: {

                set: function (value) {

                    value = value || [0, 1, 0];

                    var up = this._state.up;

                    up[0] = value[0];
                    up[1] = value[1];
                    up[2] = value[2];

                    this._renderer.imageDirty = true;

                    this._scheduleBuild();

                    /**
                     * Fired whenever this Lookat's  {{#crossLink "Lookat/up:property"}}{{/crossLink}} property changes.
                     *
                     * @event up
                     * @param value The property's new value
                     */
                    this.fire("up", this._state.up);
                },

                get: function () {
                    return this._state.up;
                }
            },

            /**
             * The elements of this Lookat's view transform matrix.
             *
             * Fires a {{#crossLink "Lookat/matrix:event"}}{{/crossLink}} event on change.
             *
             * @property matrix
             * @type {Float64Array}
             */
            matrix: {

                get: function () {

                    if (this._dirty) {
                        this._build();
                    }

                    return this._state.matrix;
                }
            }
        },

        _compile: function () {

            if (this._dirty) {
                this._build();
            }

            this._renderer.viewTransform = this._state;
        },

        _getJSON: function () {
            return {
                eye: this._state.eye,
                look: this._state.look,
                up: this._state.up
            };
        },

        _destroy: function () {
            this._state.destroy();
        }
    });

})();
;/**
 An **Ortho** component defines an orthographic projection transform.

 ## Overview

 <ul>
 <li>{{#crossLink "Camera"}}Camera{{/crossLink}} components pair these with viewing transform components, such as
 {{#crossLink "Lookat"}}Lookat{{/crossLink}}, to define viewpoints on attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.</li>
 <li>Alternatively, use {{#crossLink "Perspective"}}{{/crossLink}} if you need perspective projection.</li>
 <li>See <a href="Shader.html#inputs">Shader Inputs</a> for the variables that Ortho components create within xeoEngine's shaders.</li>
 </ul>

 <img src="../../../assets/images/Ortho.png"></img>

 ## Example

 <iframe style="width: 600px; height: 400px" src="../../examples/camera_ortho.html"></iframe>

 In this example we have a {{#crossLink "GameObject"}}GameObject{{/crossLink}} that's attached to a
 {{#crossLink "Camera"}}Camera{{/crossLink}} that has a {{#crossLink "Lookat"}}Lookat{{/crossLink}} view transform and an Ortho
 projection transform.

 ````Javascript
 var scene = new XEO.Scene();

 var lookat = new XEO.Lookat(scene, {
        eye: [0, 0, -4],
        look: [0, 0, 0],
        up: [0, 1, 0]
    });

 var ortho = new XEO.Ortho(scene, {
        left: -3.0,
        right: 3.0,
        bottom: -3.0,
        top: 3.0,
        near: 0.1,
        far: 1000
    });

 var camera = new XEO.Camera(scene, {
        view: lookat,
        project: ortho
    });

 var geometry = new XEO.Geometry(scene);  // Defaults to a 2x2x2 box

 var object = new XEO.GameObject(scene, {
        camera: camera,
        geometry: geometry
    });

 scene.on("tick",
    function () {
                camera.view.rotateEyeY(0.5);
                camera.view.rotateEyeX(0.3);
            });
 ````

 @class Ortho
 @module XEO
 @submodule camera
 @constructor
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}Scene{{/crossLink}}, creates this Ortho within the
 default {{#crossLink "Scene"}}Scene{{/crossLink}} when omitted.
 @param [cfg] {*} Configs
 @param [cfg.id] {String} Optional ID, unique among all components in the parent scene, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this Ortho.
 @param [cfg.left=-1.0] {Number} Position of the left plane on the View-space X-axis.
 @param [cfg.right=1.0] {Number} Position of the right plane on the View-space X-axis.
 @param [cfg.top=1.0] {Number} Position of the top plane on the View-space Y-axis.
 @param [cfg.bottom=-1.0] {Number} Position of the bottom plane on the View-space Y-axis.
 @param [cfg.near=0.1] {Number} Position of the near plane on the View-space Z-axis.
 @param [cfg.far=10000] {Number} Position of the far plane on the positive View-space Z-axis.
 @extends Component
 */
(function () {

    "use strict";

    XEO.Ortho = XEO.Component.extend({

        type: "XEO.Ortho",

        _init: function (cfg) {

            this._state = new XEO.renderer.ProjTransform({
                matrix: null
            });

            // Ortho view volume
            this._dirty = false;
            this._left = -1.0;
            this._right = 1.0;
            this._top = 1.0;
            this._bottom = -1.0;
            this._near = 0.1;
            this._far = 10000.0;

            // Set properties on this component
            this.left = cfg.left;
            this.right = cfg.right;
            this.top = cfg.top;
            this.bottom = cfg.bottom;
            this.near = cfg.near;
            this.far = cfg.far;
        },

        // Schedules a call to #_build on the next "tick"
        _scheduleBuild: function () {
            if (!this._dirty) {
                this._dirty = true;
                var self = this;
                this.scene.once("tick",
                    function () {
                        self._build();
                    });
            }
        },

        // Rebuilds the rendering state from this component
        _build: function () {

            this._state.matrix = XEO.math.orthoMat4c(this._left, this._right, this._bottom, this._top, this._near, this._far, this._state.matrix);

            this._dirty = false;

            /**
             * Fired whenever this Frustum's  {{#crossLink "Lookat/matrix:property"}}{{/crossLink}} property is regenerated.
             * @event matrix
             * @param value The property's new value
             */
            this.fire("matrix", this._state.matrix);
        },

        _props: {

            /**
             * Position of this Ortho's left plane on the View-space X-axis.
             *
             * Fires a {{#crossLink "Ortho/left:event"}}{{/crossLink}} event on change.
             *
             * @property left
             * @default -1.0
             * @type Number
             */
            left: {

                set: function (value) {

                    this._left = (value !== undefined && value !== null) ? value : -1.0;

                    this._renderer.imageDirty = true;

                    this._scheduleBuild();

                    /**
                     * Fired whenever this Ortho's  {{#crossLink "Ortho/left:property"}}{{/crossLink}} property changes.
                     *
                     * @event left
                     * @param value The property's new value
                     */
                    this.fire("left", this._left);
                },

                get: function () {
                    return this._left;
                }
            },

            /**
             * Position of this Ortho's right plane on the View-space X-axis.
             *
             * Fires a {{#crossLink "Ortho/right:event"}}{{/crossLink}} event on change.
             *
             * @property right
             * @default 1.0
             * @type Number
             */
            right: {

                set: function (value) {

                    this._right = (value !== undefined && value !== null) ? value : 1.0;

                    this._renderer.imageDirty = true;

                    this._scheduleBuild();

                    /**
                     * Fired whenever this Ortho's  {{#crossLink "Ortho/right:property"}}{{/crossLink}} property changes.
                     *
                     * @event right
                     * @param value The property's new value
                     */
                    this.fire("right", this._right);
                },

                get: function () {
                    return this._right;
                }
            },

            /**
             * Position of this Ortho's top plane on the View-space Y-axis.
             *
             * Fires a {{#crossLink "Ortho/top:event"}}{{/crossLink}} event on change.
             *
             * @property top
             * @default 1.0
             * @type Number
             */
            top: {

                set: function (value) {

                    this._top = (value !== undefined && value !== null) ? value : 1.0;

                    this._renderer.imageDirty = true;

                    this._scheduleBuild();

                    /**
                     * Fired whenever this Ortho's  {{#crossLink "Ortho/top:property"}}{{/crossLink}} property changes.
                     *
                     * @event top
                     * @param value The property's new value
                     */
                    this.fire("top", this._top);
                },

                get: function () {
                    return this._top;
                }
            },

            /**
             * Position of this Ortho's bottom plane on the View-space Y-axis.
             *
             * Fires a {{#crossLink "Ortho/bottom:event"}}{{/crossLink}} event on change.
             *
             * @property bottom
             * @default -1.0
             * @type Number
             */
            bottom: {

                set: function (value) {

                    this._bottom = (value !== undefined && value !== null) ? value : -1.0;

                    this._renderer.imageDirty = true;

                    this._scheduleBuild();

                    /**
                     * Fired whenever this Ortho's  {{#crossLink "Ortho/bottom:property"}}{{/crossLink}} property changes.
                     *
                     * @event bottom
                     * @param value The property's new value
                     */
                    this.fire("bottom", this._bottom);
                },

                get: function () {
                    return this._bottom;
                }
            },

            /**
             * Position of this Ortho's near plane on the positive View-space Z-axis.
             *
             * Fires a {{#crossLink "Ortho/near:event"}}{{/crossLink}} event on change.
             *
             * @property near
             * @default 0.1
             * @type Number
             */
            near: {

                set: function (value) {

                    this._near = (value !== undefined && value !== null) ? value :  0.1;

                    this._renderer.imageDirty = true;

                    this._scheduleBuild();

                    /**
                     * Fired whenever this Ortho's  {{#crossLink "Ortho/near:property"}}{{/crossLink}} property changes.
                     *
                     * @event near
                     * @param value The property's new value
                     */
                    this.fire("near", this._near);
                },

                get: function () {
                    return this._near;
                }
            },

            /**
             * Position of this Ortho's far plane on the positive View-space Z-axis.
             *
             * Fires a {{#crossLink "Ortho/far:event"}}{{/crossLink}} event on change.
             *
             * @property far
             * @default 10000.0
             * @type Number
             */
            far: {

                set: function (value) {

                    this._far = (value !== undefined && value !== null) ? value :  10000.0;

                    this._renderer.imageDirty = true;

                    this._scheduleBuild();

                    /**
                     * Fired whenever this Ortho's {{#crossLink "Ortho/far:property"}}{{/crossLink}} property changes.
                     *
                     * @event far
                     * @param value The property's new value
                     */
                    this.fire("far", this._far);
                },

                get: function () {
                    return this._far;
                }
            },

            /**
             * The elements of this Ortho's projection transform matrix.
             *
             * Fires a {{#crossLink "Ortho/matrix:event"}}{{/crossLink}} event on change.
             *
             * @property matrix
             * @type {Float64Array}
             */
            matrix: {

                get: function () {

                    if (this._dirty) {
                        this._build();
                    }

                    return this._state.matrix;
                }
            }
        },

        _compile: function () {

            if (this._dirty) {
                this._build();
            }

            this._renderer.projTransform = this._state;
        },

        _getJSON: function () {
            return {
                left: this._left,
                right: this._right,
                top: this._top,
                bottom: this._bottom,
                near: this._near,
                far: this._far
            };
        },

        _destroy: function () {
            this._state.destroy();
        }
    });

})();
;/**
 A **Perspective** component defines a perspective projection transform.

 ## Overview

 <ul>

 <li>{{#crossLink "Camera"}}Camera{{/crossLink}} components pair these with viewing transform components, such as
 {{#crossLink "Lookat"}}Lookat{{/crossLink}}, to define viewpoints on attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.</li>
 <li>Alternatively, use {{#crossLink "Ortho"}}{{/crossLink}} if you need a orthographic projection.</li>
 <li>See <a href="Shader.html#inputs">Shader Inputs</a> for the variables that Perspective components create within xeoEngine's shaders.</li>
 </ul>

 <img src="../../../assets/images/Perspective.png"></img>

 ## Example

 <iframe style="width: 600px; height: 400px" src="../../examples/camera_perspective.html"></iframe>

 In this example we have a {{#crossLink "GameObject"}}GameObject{{/crossLink}} that's attached to a
 {{#crossLink "Camera"}}Camera{{/crossLink}} that has a {{#crossLink "Lookat"}}Lookat{{/crossLink}} view transform and a Perspective
 projection transform.

 ````Javascript
 var scene = new XEO.Scene();

 var lookat = new XEO.Lookat(scene, {
        eye: [0, 0, -4],
        look: [0, 0, 0],
        up: [0, 1, 0]
    });

 var perspective = new XEO.Perspective(scene, {
        fovy: 60,
        near: 0.1,
        far: 1000
    });

 var camera = new XEO.Camera(scene, {
        view: lookat,
        project: perspective
    });

 var geometry = new XEO.Geometry(scene);  // Defaults to a 2x2x2 box

 var object = new XEO.GameObject(scene, {
        camera: camera,
        geometry: geometry
    });

 scene.on("tick", function () {
       camera.view.rotateEyeY(0.5);
       camera.view.rotateEyeX(0.3);
    });
 ````
 @class Perspective
 @module XEO
 @submodule camera
 @constructor
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}Scene{{/crossLink}}, creates this Perspective within the
 default {{#crossLink "Scene"}}Scene{{/crossLink}} when omitted.
 @param [cfg] {*} Configs
 @param [cfg.id] {String} Optional ID, unique among all components in the parent scene, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this Perspective.
 @param [cfg.fovy=60.0] {Number} Field-of-view angle, in degrees, on Y-axis.
 @param [cfg.aspect=1.0] {Number} Aspect ratio.
 @param [cfg.near=0.1] {Number} Position of the near plane on the View-space Z-axis.
 @param [cfg.far=10000] {Number} Position of the far plane on the View-space Z-axis.
 @extends Component
 */
(function () {

    "use strict";

    XEO.Perspective = XEO.Component.extend({

        type: "XEO.Perspective",

        _init: function (cfg) {

            this._state = new XEO.renderer.ProjTransform({
                matrix: null
            });

            this._dirty = false;
            this._fovy = 60.0;
            this._aspect = 1.0;
            this._near = 0.1;
            this._far = 10000.0;

            var self = this;
            var canvas = this.scene.canvas;

            // Recompute aspect from change in canvas size
            this._canvasResized = canvas.on("resized",
                function () {
                    self._aspect = canvas.width / canvas.height;
                });

            this.fovy = cfg.fovy;
            this.aspect = canvas.width / canvas.height;
            this.near = cfg.near;
            this.far = cfg.far;
        },

        // Schedules a call to #_build on the next "tick"
        _scheduleBuild: function () {

            if (!this._dirty) {

                this._dirty = true;

                var self = this;

                this.scene.once("tick",
                    function () {
                        self._build();
                    });
            }
        },

        // Rebuilds renderer state from component state
        _build: function () {

            var canvas = this.scene.canvas.canvas;
            var aspect = canvas.width / canvas.height;

            this._state.matrix = XEO.math.perspectiveMatrix4(this._fovy * (Math.PI / 180.0), aspect, this._near, this._far);

            this._dirty = false;

            /**
             * Fired whenever this Perspective's {{#crossLink "Perspective/matrix:property"}}{{/crossLink}} property changes.
             *
             * @event matrix
             * @param value The property's new value
             */
            this.fire("matrix", this._state.matrix);
        },

        _props: {

            /**
             * The angle, in degrees on the Y-axis, of this Perspective's field-of-view.
             *
             * Fires a {{#crossLink "Perspective/fovy:event"}}{{/crossLink}} event on change.
             *
             * @property fovy
             * @default 60.0
             * @type Number
             */
            fovy: {

                set: function (value) {

                    this._fovy = (value !== undefined && value !== null) ? value : 60.0;

                    this._renderer.imageDirty = true;

                    this._scheduleBuild();

                    /**
                     * Fired whenever this Perspective's {{#crossLink "Perspective/fovy:property"}}{{/crossLink}} property changes.
                     *
                     * @event fovy
                     * @param value The property's new value
                     */
                    this.fire("fovy", this._fovy);
                },

                get: function () {
                    return this._fovy;
                }
            },

            /**
             * Aspect ratio of this Perspective frustum. This is effectively the height of the frustum divided by the width.
             *
             * Fires an {{#crossLink "Perspective/aspect:property"}}{{/crossLink}} event on change.
             *
             * @property aspect
             * @default 60.0
             * @type Number
             */
            aspect: {

                set: function (value) {

                    this._aspect = (value !== undefined && value !== null) ? value : 1.0;

                    this._renderer.imageDirty = true;

                    this._scheduleBuild();

                    /**
                     * Fired whenever this Perspective's {{#crossLink "Perspective/aspect:property"}}{{/crossLink}} property changes.
                     *
                     * @event aspect
                     * @param value The property's new value
                     */
                    this.fire("aspect", this._aspect);
                },

                get: function () {
                    return this._aspect;
                }
            },

            /**
             * Position of this Perspective's near plane on the positive View-space Z-axis.
             *
             * Fires a {{#crossLink "Perspective/near:event"}}{{/crossLink}} event on change.
             *
             * @property near
             * @default 0.1
             * @type Number
             */
            near: {

                set: function (value) {

                    this._near = (value !== undefined && value !== null) ? value : 0.1;

                    this._renderer.imageDirty = true;

                    this._scheduleBuild();

                    /**
                     * Fired whenever this Perspective's   {{#crossLink "Perspective/near:property"}}{{/crossLink}} property changes.
                     * @event near
                     * @param value The property's new value
                     */
                    this.fire("near", this._near);
                },

                get: function () {
                    return this._near;
                }
            },

            /**
             * Position of this Perspective's far plane on the positive View-space Z-axis.
             *
             * Fires a {{#crossLink "Perspective/far:event"}}{{/crossLink}} event on change.
             *
             * @property far
             * @default 10000.0
             * @type Number
             */
            far: {

                set: function (value) {

                    this._far = (value !== undefined && value !== null) ? value : 10000;

                    this._renderer.imageDirty = true;

                    this._scheduleBuild();

                    /**
                     * Fired whenever this Perspective's  {{#crossLink "Perspective/far:property"}}{{/crossLink}} property changes.
                     *
                     * @event far
                     * @param value The property's new value
                     */
                    this.fire("far", this._far);
                },

                get: function () {
                    return this._far;
                }
            },

            /**
             * The elements of this Perspective's projection transform matrix.
             *
             * Fires a {{#crossLink "Perspective/matrix:event"}}{{/crossLink}} event on change.
             *
             * @property matrix
             * @type {Float64Array}
             */
            matrix: {

                get: function () {

                    if (this._dirty) {
                        this._build();
                    }

                    return this._state.matrix;
                }
            }
        },

        _compile: function () {

            if (this._dirty) {
                this._build();
            }

            this._renderer.projTransform = this._state;
        },

        _getJSON: function () {
            return {
                fovy: this._fovy,
                near: this._near,
                far: this._far
            };
        },

        _destroy: function () {

            this.scene.canvas.off(this._canvasResized);

            this._state.destroy();
        }
    });

})();
;/**
 * Components for cross-section views of GameObjects.
 *
 * @module XEO
 * @submodule clipping
 */;

/**
 A **Clip** is an arbitrarily-aligned World-space clipping plane, which may be used to create
 cross-sectional views of attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.

 ## Overview

 <ul>

 <li>These are grouped within {{#crossLink "Clips"}}Clips{{/crossLink}} components, which are attached to
 {{#crossLink "GameObject"}}GameObjects{{/crossLink}}. See the {{#crossLink "Clips"}}Clips{{/crossLink}} documentation
 for more info.</li>

 <li>A Clip is specified in World-space, as being perpendicular to a vector {{#crossLink "Clip/dir:property"}}{{/crossLink}}
 that emanates from the origin, offset at a distance {{#crossLink "Clip/dist:property"}}{{/crossLink}} along that vector. </li>

 <li>You can move a Clip back and forth along its vector by varying {{#crossLink "Clip/dist:property"}}{{/crossLink}}.</li>

 <li>Likewise, you can rotate a Clip about the origin by rotating the {{#crossLink "Clip/dir:property"}}{{/crossLink}} vector.</li>

 <li>A Clip is has a {{#crossLink "Clip/mode:property"}}{{/crossLink}},  which indicates whether it is disabled
 ("disabled"), discarding fragments that fall on the origin-side of the plane ("inside"), or clipping fragments that
 fall on the other side of the plane from the origin ("outside").</li>

 <li>You can update the {{#crossLink "Clip/mode:property"}}{{/crossLink}} of a Clip to activate or deactivate it, or to
 switch which side it discards fragments from.</li>

 <li>Clipping may also be enabled or disabled for specific {{#crossLink "GameObject"}}GameObjects{{/crossLink}}
 via the {{#crossLink "Modes/clipping:property"}}{{/crossLink}} flag on {{#crossLink "Modes"}}Modes{{/crossLink}} components
 attached to those {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.</li>

 <li>See <a href="Shader.html#inputs">Shader Inputs</a> for the variables that Clips create within xeoEngine's shaders.</li>

 </ul>

 <img src="../../../assets/images/Clip.png"></img>

 ## Example

 <ul>

 <li>In this example we have a {{#crossLink "GameObject"}}{{/crossLink}} that's clipped by a {{#crossLink "Clips"}}{{/crossLink}}
 that contains two {{#crossLink "Clip"}}{{/crossLink}} planes.</li>

 <li>The first {{#crossLink "Clip"}}{{/crossLink}} plane is on the
 positive diagonal, while the second is on the negative diagonal.</li>

 <li>The {{#crossLink "GameObject"}}GameObject's{{/crossLink}}
 {{#crossLink "Geometry"}}{{/crossLink}} is the default 2x2x2 box, and the planes will clip off two of the box's corners.</li>

 </ul>

 ````javascript
 var scene = new XEO.Scene();

 // Clip plane on negative diagonal
 var clip1 = new XEO.Clip(scene, {
        dir: [-1.0, -1.0, -1.0], // Direction of Clip from World space origin
        dist: 2.0,               // Distance along direction vector
        mode: "outside"          // Clip fragments that fall beyond the plane
     });

 // Clip plane on positive diagonal
 var clip2 = new XEO.Clip(scene, {
        dir: [1.0, 1.0, 1.0],
        dist: 2.0,
        mode: "outside"
     });

 // Group the planes in a Clips
 var clips = new XEO.Clip(scene, {
        clips: [
            clip1,
            clip2
        ]
     });

 // Geometry defaults to a 2x2x2 box
 var geometry = new XEO.Geometry(scene);

 // Create an Object, which is a box sliced by our clip planes
 var object = new XEO.GameObject(scene, {
        clips: clips,
        geometry: geometry
     });
 ````

 ### Toggling clipping on and off

 Now we'll attach a {{#crossLink "Modes"}}{{/crossLink}} to the {{#crossLink "GameObject"}}{{/crossLink}}, so that we can
 enable or disable clipping of it:

 ```` javascript
 // Create the Modes
 var modes = new XEO.Modes(scene, {
    clipping: true
 });

 // Attach our Object to the Modes
 object.modes = modes;

 // Disable clipping for the Object
 modes.clipping = false;
 ````

 @class Clip
 @module XEO
 @submodule clipping
 @constructor
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}Scene{{/crossLink}} - creates this Clip in the
 default {{#crossLink "Scene"}}Scene{{/crossLink}} when omitted.
 @param [cfg] {*} Clip configuration
 @param [cfg.id] {String} Optional ID, unique among all components in the parent {{#crossLink "Scene"}}Scene{{/crossLink}}, generated automatically when omitted.
 You only need to supply an ID if you need to be able to find the Clip by ID within the {{#crossLink "Scene"}}Scene{{/crossLink}}.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this Clip.
 @param [cfg.mode="disabled"] {String} Clipping mode - "disabled" to clip nothing, "inside" to reject points inside the plane, "outside" to reject points outside the plane.
 @param [dir= [1, 0, 0]] {Array of Number} The direction of the clipping plane from the World-space origin.
 @param [dist=1.0] {Number} Distance to the clipping plane along the direction vector.

 @extends Component
 */
(function () {

    "use strict";

    XEO.Clip = XEO.Component.extend({

        type: "XEO.Clip",

        _init: function (cfg) {

            this._state = {
                mode: "disabled",
                dir: [1,0,0],
                dist: 1.0
            };

            this.mode = cfg.mode;
            this.dir = cfg.dir;
            this.dist = cfg.dist;
        },

        _props: {

            /**
             The current mode of this Clip.

             Possible states are:

             <ul>
             <li>"disabled" - inactive</li>
             <li>"inside" - clipping fragments that fall within the half-space on the origin-side of the Clip plane</li>
             <li>"outside" - clipping fragments that fall on the other side of the Clip plane from the origin</li>
             </ul>

             Fires a {{#crossLink "Clip/mode:event"}}{{/crossLink}} event on change.

             @property mode
             @default "disabled"
             @type String
             */
            mode: {

                set: function (value) {

                    this._state.mode =  value || "disabled";

                    this._renderer.imageDirty = true;

                    /**
                     Fired whenever this Clip's {{#crossLink "Clip/mode:property"}}{{/crossLink}} property changes.

                     @event mode
                     @param value {String} The property's new value
                     */
                    this.fire("mode", this._state.mode);
                },

                get: function () {
                    return this._state.mode;
                }
            },

            /**
             A vector emanating from the World-space origin that indicates the orientation of this Clip plane.

             The Clip plane will be oriented perpendicular to this vector.

             Fires a {{#crossLink "Clip/dir:event"}}{{/crossLink}} event on change.

             @property dir
             @default [1.0, 1.0, 1.0]
             @type Array(Number)
             */
            dir: {

                set: function (value) {

                    this._state.dir =  value || [1, 0, 0];

                    this._renderer.imageDirty = true;

                    /**
                     Fired whenever this Clip's {{#crossLink "Clip/dir:property"}}{{/crossLink}} property changes.

                     @event dir
                     @param  value  {Array(Number)} The property's new value
                     */
                    this.fire("dir", this._state.dir);
                },

                get: function () {
                    return this._state.dir;
                }
            },

            /**
             The position of this Clip along the vector indicated by {{#crossLink "Clip/dir:property"}}{{/crossLink}}.

             This is the distance of the Clip plane from the World-space origin.

             Fires a {{#crossLink "Clip/dist:event"}}{{/crossLink}} event on change.

             @property dist
             @default 1.0
             @type Number
             */
            dist: {

                set: function (value) {

                    this._state.dist = value !== undefined ? value : 1.0;

                    this._renderer.imageDirty = true;

                    /**
                     Fired whenever this Clip's {{#crossLink "Clip/dist:property"}}{{/crossLink}} property changes.

                     @event dist
                     @param  value Number The property's new value
                     */
                    this.fire("dist", this._state.dist);
                },

                get: function () {
                    return this._state.dist;
                }
            }
        },

        _getJSON: function () {
            return {
                mode: this._state.mode,
                dir: this._state.dir,
                dist: this._state.dist
            };
        }
    });

})();
;/**
 A **Clips** is a group of arbitrarily-aligned World-space {{#crossLink "Clip"}}Clip{{/crossLink}} planes, which may be used to create
 cross-sectional views of attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.

 ## Overview

 <ul>

 <li>Each {{#crossLink "Clip"}}Clip{{/crossLink}} is specified in World-space, as being perpendicular to a vector
 {{#crossLink "Clip/dir:property"}}{{/crossLink}} that emanates from the origin, offset at a
 distance {{#crossLink "Clip/dist:property"}}{{/crossLink}} along that vector. </li>

 <li>You can move each {{#crossLink "Clip"}}Clip{{/crossLink}} back and forth along its vector by varying
 its {{#crossLink "Clip/dist:property"}}{{/crossLink}}.</li>

 <li>Likewise, you can rotate each {{#crossLink "Clip"}}Clip{{/crossLink}} about the origin by rotating
 its {{#crossLink "Clip/dir:property"}}{{/crossLink}} vector.</li>

 <li>Each {{#crossLink "Clip"}}Clip{{/crossLink}} is has a {{#crossLink "Clip/mode:property"}}{{/crossLink}}, which indicates whether it is disabled ("disabled"), discarding fragments that fall on the origin-side of the plane ("inside"), or clipping fragments that fall on the other side of the plane from the origin ("outside").</li>

 <li>You can update each {{#crossLink "Clip"}}Clip{{/crossLink}}'s {{#crossLink "Clip/mode:property"}}{{/crossLink}} to
 activate or deactivate it, or to switch which side it discards fragments from.</li>

 <li>Clipping may also be enabled or disabled for specific {{#crossLink "GameObject"}}GameObjects{{/crossLink}}
 via the {{#crossLink "Modes/clipping:property"}}{{/crossLink}} flag on {{#crossLink "Modes"}}Modes{{/crossLink}} components
 attached to those {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.</li>

 <li>See <a href="Shader.html#inputs">Shader Inputs</a> for the variables that Clips create within xeoEngine's shaders.</li>

 </ul>

 <img src="../../../assets/images/Clips.png"></img>

 ## Example

 <ul>

 <li>In this example we have a {{#crossLink "GameObject"}}{{/crossLink}} that's clipped by a {{#crossLink "Clips"}}{{/crossLink}}
 that contains two {{#crossLink "Clip"}}{{/crossLink}} planes.</li>

 <li>The first {{#crossLink "Clip"}}{{/crossLink}} plane is on the
 positive diagonal, while the second is on the negative diagonal.</li>

 <li>The {{#crossLink "GameObject"}}GameObject's{{/crossLink}}
 {{#crossLink "Geometry"}}{{/crossLink}} is the default 2x2x2 box, and the planes will clip off two of the box's corners.</li>

 </ul>

 ````javascript
 var scene = new XEO.Scene();

 // Clip plane on negative diagonal
 var clip1 = new XEO.Clip(scene, {
        dir: [-1.0, -1.0, -1.0], // Direction of Clip from World space origin
        dist: 2.0,               // Distance along direction vector
        mode: "outside"          // Clip fragments that fall beyond the plane
     });

 // Clip plane on positive diagonal
 var clip2 = new XEO.Clip(scene, {
        dir: [1.0, 1.0, 1.0],
        dist: 2.0,
        mode: "outside"
     });

 // Group the planes in a Clips
 var clips = new XEO.Clip(scene, {
        clips: [
            clip1,
            clip2
        ]
     });

 // Geometry defaults to a 2x2x2 box
 var geometry = new XEO.Geometry(scene);

 // Create an Object, which is a box sliced by our clip planes
 var object = new XEO.GameObject(scene, {
        clips: clips,
        geometry: geometry
     });
 ````

 ### Toggling clipping on and off

 Now we'll attach a {{#crossLink "Modes"}}{{/crossLink}} to the {{#crossLink "GameObject"}}{{/crossLink}}, so that we can
 enable or disable clipping of it:

 ```` javascript
 // Create the Modes
 var modes = new XEO.Modes(scene, {
    clipping: true
 });

 // Attach our Object to the Modes
 object.modes = modes;

 // Disable clipping for the Object
 modes.clipping = false;
 ````

 @class Clips
 @module XEO
 @submodule clipping
 @constructor
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}Scene{{/crossLink}} - creates this Clips in the default
 {{#crossLink "Scene"}}Scene{{/crossLink}} when omitted.
 @param [cfg] {*} Configs
 @param [cfg.id] {String} Optional ID, unique among all components in the parent {{#crossLink "Scene"}}Scene{{/crossLink}},
 generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this Clips.
 @param [cfg.clips] {Array(String)|Array(XEO.Clip)} Array containing either IDs or instances of
 {{#crossLink "Clip"}}Clip{{/crossLink}} components within the parent {{#crossLink "Scene"}}Scene{{/crossLink}}.
 @extends Component
 */
(function () {

    "use strict";

    XEO.Clips = XEO.Component.extend({

        type: "XEO.Clips",

        _init: function (cfg) {

            // Renderer state contains the states of the child Clip components
            this._state = new XEO.renderer.Clips({

                clips: [],

                hash: ""
            });

            this._dirty = true;

            // Array of child Clip components
            this._clips = [];

            // Subscriptions to "dirty" events from child Clip components
            this._dirtySubs = [];

            // Subscriptions to "destroyed" events from child Clip components
            this._destroyedSubs = [];

            // Add initial Clip components
            this.clips = cfg.clips;
        },

        _props: {

            /**
             * The clipping planes contained within this Clips.
             *
             * Fires a {{#crossLink "Clips/clips:event"}}{{/crossLink}} event on change.
             *
             * @property clips
             * @default []
             * @type Array(XEO.Clip)
             */
            clips: {

                set: function (value) {

                    value = value || [];

                    var clip;

                    // Unsubscribe from events on old clips
                    for (var i = 0, len = this._clips.length; i < len; i++) {

                        clip = this._clips[i];

                        clip.off(this._dirtySubs[i]);
                        clip.off(this._destroyedSubs[i]);
                    }

                    this._clips = [];

                    this._dirtySubs = [];
                    this._destroyedSubs = [];

                    var self = this;

                    function clipDirty() {
                        self.fire("dirty", true);
                    }

                    function clipDestroyed() {

                        var id = this.id; // Clip ID

                        for (var i = 0, len = self._clips.length; i < len; i++) {

                            if (self._clips[i].id === id) {

                                self._clips = self._clips.slice(i, i + 1);

                                self._dirtySubs = self._dirtySubs.slice(i, i + 1);
                                self._destroyedSubs = self._destroyedSubs.slice(i, i + 1);

                                self._dirty = true;

                                self.fire("dirty", true);
                                self.fire("clips", self._clips);

                                return;
                            }
                        }
                    }

                    for (var i = 0, len = value.length; i < len; i++) {

                        clip = value[i];

                        if (XEO._isString(clip)) {

                            // ID given for clip - find the clip component

                            var id = clip;

                            clip = this.components[id];

                            if (!clip) {
                                this.error("Component not found: " + XEO._inQuotes(id));
                                continue;
                            }
                        }

                        if (clip.type !== "XEO.Clip") {
                            this.error("Component " + XEO._inQuotes(id) + " is not a XEO.Clip");
                            continue;
                        }

                        this._clips.push(clip);

                        this._dirtySubs.push(clip.on("dirty", clipDirty));

                        this._destroyedSubs.push(clip.on("destroyed", clipDestroyed));
                    }

                    this._dirty = true;

                    /**
                     Fired whenever this Clips' {{#crossLink "Clips/clips:property"}}{{/crossLink}} property changes.
                     @event clips
                     @param value {Array of XEO.Clip} The property's new value
                     */
                    this.fire("dirty", true);
                    this.fire("clips", this._clips);
                },

                get: function () {
                    return this._clips.slice(0, this._clips.length);
                }
            }
        },

        _compile: function () {

            var state = this._state;

            if (this._dirty) {

                state.clips = [];

                for (var i = 0, len = this._clips.length; i < len; i++) {
                    state.clips.push(this._clips[i]._state);
                }

                this._makeHash();

                this._dirty = false;
            }

            this._renderer.clips = state;
        },

        _makeHash: function () {

            var clips = this._state.clips;

            if (clips.length === 0) {
                return ";";
            }

            var clip;
            var hash = [];

            for (var i = 0, len = clips.length; i < len; i++) {

                clip = clips[i];

                hash.push(clip._state.mode);
            }

            hash.push(";");

            this._state.hash = hash.join("");
        },

        _getJSON: function () {

            var clipIds = [];

            for (var i = 0, len = this._clips.length; i < len; i++) {
                clipIds.push(this._clips[i].id);
            }

            return {
                clips: clipIds
            };
        },

        _destroy: function () {
            this._state.destroy();
        }
    });

})();
;/**
 * Components for managing Scene configuration.
 *
 * @module XEO
 * @submodule configuration
 */;/**
 A **Configs** holds configuration properties for the parent {{#crossLink "Scene"}}Scene{{/crossLink}}.

 ## Overview

 <ul>
    <li>Each {{#crossLink "Scene"}}Scene{{/crossLink}} provides a Configs on itself as a read-only property.</li>
    <li>Config property values are set on a Configs using its {{#crossLink "Configs/set:method"}}{{/crossLink}} method,
 and changes to properties may be subscribed to using {{#crossLink "Component/on:method"}}{{/crossLink}}.</li>
    <li>You can define your own properties in a Configs, but take care not to clobber the native properties used by
 xeoEngine (see table below).</li>
 </ul>

 <img src="../../../assets/images/Configs.png"></img>

 ## Native xeoEngine config properties

 Don't use the following names for your own Configs properties, because these are already used by xeoEngine:

 | Name  | Description  |
 |---|---|
 | TODO  | TODO  |
 | TODO  | TODO  |


 ## Example

 In this example, we're subscribing to change events for a {{#crossLink "Scene"}}Scene's{{/crossLink}} "foo" configuration property, then updating that
 property, which fires a change event.

 ````Javascript
var scene = new XEO.Scene();

var configs = scene.configs;

// Subscribe to change of a Configs property.
// The subscriber is also immediately notified of the current value via the callback.
configs.on("foo", function(value) {
    console.log("foo = " + value);
});

// Create and set a Configs property, firing our change handler:
configs.set("foo", "Hello!");

// Read the current value of a Configs property.
// Normally we would asynchronously subscribe with #on though, to be sure that
// we're getting the latest changes to the property.
var bar = configs.props["bar"];
 ````

 @class Configs
 @module XEO
 @submodule configuration
 @constructor
 @param [scene] {Scene} Parent scene - creates this component in the default scene when omitted.
 @param {Object} [cfg]  Config values.
 @extends Component
 */
(function () {

    "use strict";

    XEO.Configs = XEO.Component.extend({

        type: "XEO.Configs",

        _init: function (cfg) {
            for (var key in cfg) {
                if (cfg.hasOwnProperty(key)) {
                    this.fire(key, cfg[key]);
                }
            }
        },

        /**
         * Sets a property on this Configs.
         *
         * Fires an event with the same name as the property. Existing subscribers to the event will be
         * notified immediately of the property value. Like all events on a Component, this Configs will
         * retain the event, to notify any subscribers that are attached subsequently.
         *
         * @method set
         * @param {String} name The property name
         * @param {Object} value The property value
         * @param {Boolean} [forget=false] When true, does not retain for subsequent subscribers
         */
        set: function(name, value) {
            this.fire(name, value);
        },

        _toJSON: function () {
            return  XEO._copy(this.props);
        }
    });

})();
;/**
 * Components for controlling the visibility of GameObjects.
 *
 * @module XEO
 * @submodule culling
 */;/**
 A **Visibility** toggles the visibility of attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.

 ## Overview

 <ul>
 <li>A Visibility may be shared among multiple {{#crossLink "GameObject"}}GameObjects{{/crossLink}} to toggle
 their visibility as a group.</li>
 </ul>

 <img src="../../../assets/images/Visibility.png"></img>

 ## Example

 This example creates a Visibility that toggles the visibility of
 two {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.

 ````javascript
var scene = new XEO.Scene();

// Create a Visibility
var visibility = new XEO.Visibility(scene, {
    visible: true
});

// Create two GameObjects whose visibility will be controlled by our Visibility

var object1 = new XEO.GameObject(scene, {
    visibility: visibility
});

var object2 = new XEO.GameObject(scene, {
    visibility: visibility
});

// Subscribe to change on the Visibility's "visible" property
var handle = visibility.on("visible", function(value) {
    //...
});

// Hide our GameObjects by flipping the Visibility's "visible" property,
// which will also call our handler
visibility.visible = false;

// Unsubscribe from the Visibility again
visibility.off(handle);

// When we destroy our Visibility, the GameObjects will fall back
// on the Scene's default Visibility instance
visibility.destroy();
 ````
 @class Visibility
 @module XEO
 @constructor
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}Scene{{/crossLink}} - creates this Visibility in the default
 {{#crossLink "Scene"}}Scene{{/crossLink}} when omitted.
 @param [cfg] {*} Configs
 @param [cfg.id] {String} Optional ID, unique among all components in the parent scene, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this Visibility.
 @param [cfg.visible=true] {Boolean} Flag which controls visibility of the attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}}
 @extends Component
 */
(function () {

    "use strict";

    XEO.Visibility = XEO.Component.extend({

        type: "XEO.Visibility",

        _init: function (cfg) {

            this._state = new XEO.renderer.Visibility({
                visible: true
            });

            this.visible = cfg.visible;
        },

        _props: {

            /**
             Indicates whether this Visibility makes attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}} visible or not.

             Fires a {{#crossLink "Visibility/visible:event"}}{{/crossLink}} event on change.

             @property visible
             @default true
             @type Boolean
             */
            visible: {

                set: function (value) {

                    this._state.visible =  value !== false;

                    this._renderer.drawListDirty = true;

                    /**
                     Fired whenever this Visibility's {{#crossLink "Visibility/visible:property"}}{{/crossLink}} property changes.

                     @event visible
                     @param value {Boolean} The property's new value
                     */
                    this.fire("visible",  this._state.visible);
                },

                get: function () {
                    return this._state.visible;
                }
            }
        },

        _compile: function () {
            this._renderer.visibility = this._state;
        },

        _getJSON: function () {
            return {
                visible: this.visible
            };
        },

        _destroy: function () {
            this._state.destroy();
        }
    });

})();
;/**
 * Components for defining geometry.
 *
 * @module XEO
 * @submodule geometry
 */;/**
 A **Geometry** defines the geometric shape of attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.

 ## Contents

 <ul>
 <li><a href="#overview">Overview</a></li>
 <li><a href="#defaultShape">Default box shape</a></li>
 <li><a href="#sceneDefault">Scene's default Geometry</a></li>
 <li><a href="#sharing">Sharing among GameObjects</a></li>
 <li><a href="#triangles">Defining a triangle mesh</a></li>
 <li><a href="#editing">Editing Geometry</a></li>
 <li><a href="#backfaces">Toggling backfaces on or off</li>
 <li><a href="#frontfaces">Setting frontface vertex winding</li>
 </ul>

 ## <a name="overview">Overview</a>

 <ul>
 <li>Like everything in xeoEngine, all properties on a Geometry are dynamically editable.</li>
 <li>A Geometry's {{#crossLink "Geometry/primitive:property"}}{{/crossLink}} type can be 'points', 'lines', 'line-loop', 'line-strip', 'triangles', 'triangle-strip' or 'triangle-fan'".</li>
 <li>Depending on the {{#crossLink "Geometry/primitive:property"}}{{/crossLink}} type, a Geometry can have {{#crossLink "Geometry/positions:property"}}vertex positions{{/crossLink}},
 {{#crossLink "Geometry/colors:property"}}vertex colors{{/crossLink}}, {{#crossLink "Geometry/uv:property"}}UV coordinates{{/crossLink}},
 {{#crossLink "Geometry/normals:property"}}normal vectors{{/crossLink}}, as well as {{#crossLink "Geometry/indices:property"}}{{/crossLink}},
 which specify how the vertices connect together to form the primitives.</li>
 <li>When no shape is specified (ie. no primitive type, vertex arrays and indices), a Geometry will default to a 2x2x2 box
 made of triangles, with UV coordinates, vertex colors and normals. This default is used for most of the examples in this documentation.</li>
 <li>A {{#crossLink "Scene"}}{{/crossLink}} provides such a box as its default {{#crossLink "Scene/geometry:property"}}{{/crossLink}},
 for {{#crossLink "GameObject"}}GameObjects{{/crossLink}} to fall back on, when they are not explicitly attached to a Geometry.</li>
 <li>See <a href="Shader.html#inputs">Shader Inputs</a> for the variables that Geometries create within xeoEngine's shaders.</li>
 </ul>

 <img src="../../../assets/images/Geometry.png"></img>

 ## <a name="defaultShape">Default box shape</a>

 If you create a Geometry with no specified shape, it will default to a 2x2x2 box defined as a triangle mesh.

 ```` javascript
 var geometry = new XEO.Geometry(scene); // 2x2x2 box

 var object1 = new XEO.GameObject(scene, {
    geometry: geometry
});
 ````

 ## <a name="sceneDefault">Scene's default Geometry</a>

 If you create a {{#crossLink "GameObject"}}GameObject{{/crossLink}} with no Geometry, it will inherit its {{#crossLink "Scene"}}Scene{{/crossLink}}'s
 default {{#crossLink "Scene/geometry:property"}}{{/crossLink}}, which is also a 2x2x2 box:

 ```` javascript
 var scene = new XEO.Scene();

 var object1 = new XEO.GameObject(scene);
 ````

 ## <a name="sharing">Sharing among GameObjects</a>

 xeoEngine components can be shared among multiple {{#crossLink "GameObject"}}GameObjects{{/crossLink}}. For components like
 Geometry and {{#crossLink "Texture"}}{{/crossLink}}, this can provide significant memory
 and performance savings. To render the example below, xeoEngine will issue two draw WebGL calls, one for
 each {{#crossLink "GameObject"}}{{/crossLink}}, but will only need to bind the Geometry's arrays once on WebGL.

 ```` javascript
 var scene = new XEO.Scene();

 var geometry = new XEO.Geometry(scene); // 2x2x2 box by default

 // Create two GameObjects which share our Geometry

 var object1 = new XEO.GameObject(scene, {
    geometry: geometry
});

 // Offset the second Object slightly on the World-space
 // X-axis using a Translate modelling transform

 var translate = new XEO.Translate(scene, {
    xyz: [5, 0, 0
});

 var object2 = new XEO.GameObject(scene, {
    geometry: geometry,
    transform: translate
});
 ````

 ## <a name="triangles">Defining a triangle mesh</a>

 Finally, we'll create a {{#crossLink "GameObject"}}GameObject{{/crossLink}} with a Geometry that we've **explicitly**
 configured as a 2x2x2 box:

 ```` javascript
 var scene = new XEO.Scene();

 // Create a 2x2x2 box centered at the World-space origin
 var geometry = new XEO.Geometry(scene, {

        // Supported primitives are 'points', 'lines', 'line-loop', 'line-strip', 'triangles',
        // 'triangle-strip' and 'triangle-fan'.primitive: "triangles",
        primitive: "triangles",

        // Vertex positions
        positions : [

            // Front face
            -1.0, -1.0, 1.0,
            1.0, -1.0, 1.0,
            1.0, 1.0, 1.0,
            -1.0, 1.0, 1.0,

            // Back face
            -1.0, -1.0, -1.0,
            -1.0, 1.0, -1.0,
             1.0, 1.0, -1.0,
            1.0, -1.0, -1.0,

            // Top face
            -1.0, 1.0, -1.0,
            -1.0, 1.0, 1.0,
            1.0, 1.0, 1.0,
            1.0, 1.0, -1.0,

            // Bottom face
            -1.0, -1.0, -1.0,
            1.0, -1.0, -1.0,
            1.0, -1.0, 1.0,
            -1.0, -1.0, 1.0,

            // Right face
            1.0, -1.0, -1.0,
            1.0, 1.0, -1.0,
            1.0, 1.0, 1.0,
            1.0, -1.0, 1.0,

            // Left face
            -1.0, -1.0, -1.0,
            -1.0, -1.0, 1.0,
            -1.0, 1.0, 1.0,
            -1.0, 1.0, -1.0
        ],

        // Vertex colors
        colors: [
            1.0,  1.0,  1.0,  1.0,    // Front face: white
            1.0,  0.0,  0.0,  1.0,    // Back face: red
            0.0,  1.0,  0.0,  1.0,    // Top face: green
            0.0,  0.0,  1.0,  1.0,    // Bottom face: blue
            1.0,  1.0,  0.0,  1.0,    // Right face: yellow
            1.0,  0.0,  1.0,  1.0     // Left face: purple
        ],

        // Vertex normals
        normals: [
            0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
            1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
            0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
            -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
            0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
            0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1
        ],

        // UV coordinates
        uv: [
            1, 1, 0, 1, 0, 0, 1, 0,
            0, 1, 0, 0, 1, 0, 1, 1,
            1, 0, 1, 1, 0, 1, 0, 0,
            1, 1, 0, 1, 0, 0, 1, 0,
            0, 0, 1, 0, 1, 1, 0, 1,
            0, 0, 1, 0, 1, 1, 0, 1
        ],

        // Triangle indices
        indices: [
            0,  1,  2,      0,  2,  3,    // front
            4,  5,  6,      4,  6,  7,    // back
            8,  9,  10,     8,  10, 11,   // top
            12, 13, 14,     12, 14, 15,   // bottom
            16, 17, 18,     16, 18, 19,   // right
            20, 21, 22,     20, 22, 23    // left
        ]
});

 var object = new XEO.GameObject(scene, {
    geometry: geometry
});
 ````
 ## <a name="editing">Editing Geometry</a>

 Recall that everything in xeoEngine is dynamically editable, including Geometry. Let's remove the front and back faces
 from our triangle mesh Geometry by updating its **indices** array:

 ````javascript
 geometry2.indices = [
 8,  9,  10,     8,  10, 11,   // top
 12, 13, 14,     12, 14, 15,   // bottom
 16, 17, 18,     16, 18, 19,   // right
 20, 21, 22,     20, 22, 23    // left
 ];
 ````

 Now let's make it wireframe by changing its primitive type from **faces** to **lines**:

 ````javascript
 geometry2.primitive = "lines";
 ````

 ## <a name="backfaces">Toggling backfaces on or off</a>

 Now we'll attach a {{#crossLink "Modes"}}{{/crossLink}} to that last {{#crossLink "GameObject"}}{{/crossLink}}, so that
 we can show or hide its {{#crossLink "Geometry"}}Geometry's{{/crossLink}} backfaces:

 ```` javascript
 var modes = new XEO.Modes(scene);

 object.modes = modes;

 // Hide backfaces

 modes.backfaces = false;

 ````

 ## <a name="frontfaces">Setting frontface vertex winding</a>

 The <a href="https://www.opengl.org/wiki/Face_Culling" target="other">vertex winding order</a> of each face determines
 whether it's a frontface or a backface.

 By default, xeoEngine considers faces to be frontfaces if they have a counter-clockwise
 winding order, but we can change that by setting the {{#crossLink "Modes"}}{{/crossLink}}
 {{#crossLink "Modes/frontface:property"}}{{/crossLink}} property, like so:

 ```` javascript
 // Set the winding order for frontfaces to clockwise
 // Options are "ccw" for counter-clockwise or "cw" for clockwise

 object.frontface = "cw";
 ````


 @class Geometry
 @module XEO
 @submodule geometry
 @constructor
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}Scene{{/crossLink}} - creates this Geometry in the default
 {{#crossLink "Scene"}}Scene{{/crossLink}} when omitted.
 @param [cfg] {*} Configs
 @param [cfg.id] {String} Optional ID, unique among all components in the parent {{#crossLink "Scene"}}Scene{{/crossLink}},
 generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this Geometry.
 @param [cfg.primitive="triangles"] {String} The primitive type. Accepted values are 'points', 'lines', 'line-loop', 'line-strip', 'triangles', 'triangle-strip' and 'triangle-fan'.
 @param [cfg.positions] {Array of Number} Positions array.
 @param [cfg.normals] {Array of Number} Normals array.
 @param [cfg.uv] {Array of Number} UVs array.
 @param [cfg.colors] {Array of Number} Vertex colors.
 @param [cfg.indices] {Array of Number} Indices array.
 @extends Component
 */
(function () {

    "use strict";

    XEO.Geometry = XEO.Component.extend({

        type: "XEO.Geometry",

        _init: function (cfg) {

            this._state = new XEO.renderer.Geometry({
                primitive: null, // WebGL enum
                positions: null, // VBOs
                colors: null,
                normals: null,
                uv: null,
                tangents: null,
                indices: null
            });

            this._primitive = null;  // String
            this._positions = null; // Typed data arrays
            this._colors = null;
            this._normals = null;
            this._uv = null;
            this._tangents = null;
            this._indices = null;

            this._dirty = false;
            this._positionsDirty = true;
            this._colorsDirty = true;
            this._normalsDirty = true;
            this._uvDirty = true;
            this._tangentsDirty = true;
            this._indicesDirty = true;


            // Model-space Boundary3D

            this._modelBoundary = null;
            this._modelBoundaryDirty = true;


            var defaultGeometry = (!cfg.positions && !cfg.normals && !cfg.uv && !cfg.indices);

            if (defaultGeometry) {

                this.primitive = "triangles";

                // Call property setters

                this.positions = [
                    -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, // Front face
                    -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, -1.0, -1.0, // Back face
                    -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, // Top face
                    -1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0, // Bottom face
                    1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0, // Right face
                    -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, -1.0 // Left face
                ];

                this.colors = [
                    1.0, 1.0, 1.0, 1.0,    // Front face
                    1.0, 1.0, 1.0, 1.0,    // Back face
                    1.0, 1.0, 1.0, 1.0,    // Top face
                    1.0, 1.0, 1.0, 1.0,    // Bottom face
                    1.0, 1.0, 1.0, 1.0,    // Right face
                    1.0, 1.0, 1.0, 1.0     // Left face
                ];

                this.normals = [
                    0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
                    1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
                    0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
                    -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
                    0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
                    0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1
                ];

                this.uv = [
                    1, 1, 0, 1, 0, 0, 1, 0,
                    0, 1, 0, 0, 1, 0, 1, 1,
                    1, 0, 1, 1, 0, 1, 0, 0,
                    1, 1, 0, 1, 0, 0, 1, 0,
                    0, 0, 1, 0, 1, 1, 0, 1,
                    0, 0, 1, 0, 1, 1, 0, 1
                ];

                // Tangents are lazy-computed from normals and UVs
                // for Normal mapping once we know we have texture

                this.tangents = null;

                this.indices = [
                    0, 1, 2, 0, 2, 3,    // front
                    4, 5, 6, 4, 6, 7,    // back
                    8, 9, 10, 8, 10, 11,   // top
                    12, 13, 14, 12, 14, 15,   // bottom
                    16, 17, 18, 16, 18, 19,   // right
                    20, 21, 22, 20, 22, 23    // left
                ];

            } else {

                // Custom geometry

                this.primitive = cfg.primitive;
                this.positions = cfg.positions;
                this.colors = cfg.colors;
                this.normals = cfg.normals;
                this.uv = cfg.uv;
                this.tangents = cfg.tangents;
                this.indices = cfg.indices;
            }

            var self = this;

            this._webglContextRestored = this.scene.canvas.on(
                "webglContextRestored",
                function () {
                    self._scheduleBuild();
                });

            this.scene.stats.inc("geometries");
        },

        _scheduleBuild: function () {

            if (!this._dirty) {

                this._dirty = true;
                var self = this;

                this.scene.once("tick",
                    function () {
                        self._build();
                    });
            }
        },

        _build: function () {

            var gl = this.scene.canvas.gl;

            switch (this._primitive) {

                case "points":
                    this._state.primitive = gl.POINTS;
                    break;

                case "lines":
                    this._state.primitive = gl.LINES;
                    break;

                case "line-loop":
                    this._state.primitive = gl.LINE_LOOP;
                    break;

                case "line-strip":
                    this._state.primitive = gl.LINE_STRIP;
                    break;

                case "triangles":
                    this._state.primitive = gl.TRIANGLES;
                    break;

                case "triangle-strip":
                    this._state.primitive = gl.TRIANGLE_STRIP;
                    break;

                case "triangle-fan":
                    this._state.primitive = gl.TRIANGLE_FAN;
                    break;

                default:
                    this._state.primitive = gl.TRIANGLES;
            }

            var usage = gl.STATIC_DRAW;

            if (this._positionsDirty) {
                if (this._state.positions) {
                    this.scene.stats.dec("vertices", this._positions.length / 3);
                    this._state.positions.destroy();
                }
                this._state.positions = this._positions ? new XEO.renderer.webgl.ArrayBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(this._positions), this._positions.length, 3, usage) : null;
                this.scene.stats.inc("vertices", this._positions.length / 3);
                this._positionsDirty = false;
            }

            if (this._colorsDirty) {
                if (this._state.colors) {
                    this._state.colors.destroy();
                }
                this._state.colors = this._colors ? new XEO.renderer.webgl.ArrayBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(this._colors), this._colors.length, 4, usage) : null;
                this._colorsDirty = false;
            }

            if (this._normalsDirty) {
                if (this._state.normals) {
                    this._state.normals.destroy();
                }
                this._state.normals = this._normals ? new XEO.renderer.webgl.ArrayBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(this._normals), this._normals.length, 3, usage) : null;
                this._normalsDirty = false;
            }

            if (this._uvDirty) {
                if (this._state.uv) {
                    this._state.uv.destroy();
                }
                this._state.uv = this._uv ? new XEO.renderer.webgl.ArrayBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(this._uv), this._uv.length, 2, usage) : null;
                this._uvDirty = false;
            }

            if (this._tangentsDirty) {
                if (this._state.tangents) {
                    this._state.tangents.destroy();
                }
                this._state.tangents = this._tangents ? new XEO.renderer.webgl.ArrayBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(this._tangents), this._tangents.length, 4, usage) : null;
                this._tangentsDirty = false;
            }

            if (this._indicesDirty) {
                if (this._state.indices) {
                    this._state.indices.destroy();
                }
                this._state.indices = this._indices ? new XEO.renderer.webgl.ArrayBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this._indices), this._indices.length, 1, usage) : null;
                this._indicesDirty = false;
            }

            this._dirty = false;
        },

        _props: {

            /**
             * The Geometry's primitive type.
             *
             * Valid types are: 'points', 'lines', 'line-loop', 'line-strip', 'triangles', 'triangle-strip' and 'triangle-fan'.
             *
             * Fires a {{#crossLink "Geometry/primitive:event"}}{{/crossLink}} event on change.
             *
             * @property primitive
             * @default "triangles"
             * @type String
             */
            primitive: {

                set: function (value) {

                    value = value || "triangles";

                    if (value !== "points" &&
                        value !== "lines" &&
                        value !== "line-loop" &&
                        value !== "line-strip" &&
                        value !== "triangles" &&
                        value !== "triangle-strip" &&
                        value !== "triangle-fan") {

                        this.error("Unsupported value for 'primitive': '" + value +
                            "' - supported values are 'points', 'lines', 'line-loop', 'line-strip', 'triangles', " +
                            "'triangle-strip' and 'triangle-fan'. Defaulting to 'triangles'.");

                        value = "triangles";
                    }

                    this._primitive = value;

                    this.fire("dirty", true);

                    /**
                     * Fired whenever this Geometry's {{#crossLink "Geometry/primitive:property"}}{{/crossLink}} property changes.
                     * @event primitive
                     * @type String
                     * @param value The property's new value
                     */
                    this.fire("primitive", this._primitive);

                    this._scheduleBuild();
                },

                get: function () {
                    return this._primitive;
                }
            },

            /**
             * The Geometry's positions array.
             *
             * Fires a {{#crossLink "Geometry/positions:event"}}{{/crossLink}} event on change.
             *
             * @property positions
             * @default null
             * @type {Array of Number}
             */
            positions: {

                set: function (value) {

                    this._positions = value;
                    this._positionsDirty = true;

                    this._scheduleBuild();

                    this._setModelBoundaryDirty();

                    // Only recompile when adding or removing this property, not when modifying
                    var dirty = (!this._positions !== !value);

                    if (dirty) {
                        this.fire("dirty", true);
                    }

                    /**
                     * Fired whenever this Geometry's {{#crossLink "Geometry/positions:property"}}{{/crossLink}} property changes.
                     * @event positions
                     * @param value The property's new value
                     */
                    this.fire("positions", this._positions);

                    /**
                     * Fired whenever this Geometry's {{#crossLink "Geometry/boundary:property"}}{{/crossLink}} property changes.
                     *
                     * Note that this event does not carry the value of the property. In order to avoid needlessly
                     * calculating unused values for this property, it will be lazy-calculated next time it's referenced
                     * on this Geometry.
                     *
                     * @event positions
                     * @param value The property's new value
                     */
                    this.fire("boundary", true);

                    this._renderer.imageDirty = true;
                },

                get: function () {
                    return this._positions;
                }
            },

            /**
             * The Geometry's normal vectors array.
             *
             * Fires a {{#crossLink "Geometry/normals:event"}}{{/crossLink}} event on change.
             *
             * @property normals
             * @default null
             * @type {Array of Number}
             */
            normals: {

                set: function (value) {

                    this._normals = value;
                    this._normalsDirty = true;

                    this._scheduleBuild();

                    // Only recompile when adding or removing this property, not when modifying
                    var dirty = (!this._normals !== !value);

                    if (dirty) {
                        this.fire("dirty", true);
                    }

                    /**
                     * Fired whenever this Geometry's {{#crossLink "Geometry/ normals:property"}}{{/crossLink}} property changes.
                     * @event  normals
                     * @param value The property's new value
                     */
                    this.fire(" normals", this._normals);

                    this._renderer.imageDirty = true;
                },

                get: function () {
                    return this._normals;
                }
            },

            /**
             * The Geometry's UV coordinate array.
             *
             * Fires a {{#crossLink "Geometry/uv:event"}}{{/crossLink}} event on change.
             *
             * @property uv
             * @default null
             * @type {Array of Number}
             */
            uv: {

                set: function (value) {

                    this._uv = value;
                    this._uvDirty = true;

                    this._scheduleBuild();

                    // Only recompile when adding or removing this property, not when modifying
                    var dirty = (!this._uv !== !value);

                    if (dirty) {
                        this.fire("dirty", true);
                    }

                    /**
                     * Fired whenever this Geometry's {{#crossLink "Geometry/uv:property"}}{{/crossLink}} property changes.
                     * @event uv
                     * @param value The property's new value
                     */
                    this.fire("uv", this._uv);

                    this._renderer.imageDirty = true;
                },

                get: function () {
                    return this._uv;
                }
            },

            /**
             * The Geometry's vertex colors array.
             *
             * Fires a {{#crossLink "Geometry/colors:event"}}{{/crossLink}} event on change.
             *
             * @property colors
             * @default null
             * @type {Array of Number}
             */
            colors: {

                set: function (value) {

                    this._colors = value;
                    this._colorsDirty = true;

                    this._scheduleBuild();

                    // Only recompile when adding or removing this property, not when modifying
                    var dirty = (!this._colors != !value);

                    if (dirty) {
                        this.fire("dirty", true);
                    }

                    /**
                     * Fired whenever this Geometry's {{#crossLink "Geometry/colors:property"}}{{/crossLink}} property changes.
                     * @event colors
                     * @param value The property's new value
                     */
                    this.fire("colors", this._colors);

                    this._renderer.imageDirty = true;
                },

                get: function () {
                    return this._colors;
                }
            },

            /**
             * The Geometry's indices array.
             *
             * Fires a {{#crossLink "Geometry/indices:event"}}{{/crossLink}} event on change.
             *
             * @property indices
             * @default null
             * @type {Array of Number}
             */
            indices: {

                set: function (value) {

                    this._indices = value;
                    this._indicesDirty = true;

                    this._scheduleBuild();

                    // Only recompile when adding or removing this property, not when modifying
                    var dirty = (!this._indices && !value);


                    if (dirty) {
                        this.fire("dirty", true);
                    }

                    /**
                     * Fired whenever this Geometry's {{#crossLink "Geometry/indices:property"}}{{/crossLink}} property changes.
                     * @event indices
                     * @param value The property's new value
                     */
                    this.fire("indices", this._indices);

                    this._renderer.imageDirty = true;
                },

                get: function () {
                    return this._indices;
                }
            },

            /**
             * Model-space 3D boundary.
             *
             * If you call {{#crossLink "Component/destroy:method"}}{{/crossLink}} on this boundary, then
             * this property will be assigned to a fresh {{#crossLink "Boundary3D"}}{{/crossLink}} instance next
             * time you reference it.
             *
             * @property modelBoundary
             * @type Boundary3D
             * @final
             */
            modelBoundary: {

                get: function () {

                    if (!this._modelBoundary) {

                        var self = this;

                        this._modelBoundary = new XEO.Boundary3D(this.scene, {

                            // Inject callbacks through which this Geometry
                            // can manage caching for the boundary

                            getDirty: function () {
                                return self._modelBoundaryDirty;
                            },

                            getPositions: function () {
                                return self._positions
                            }
                        });

                        this._modelBoundary.on("destroyed",
                            function () {
                                self._modelBoundary = null;
                            });

                        this._setModelBoundaryDirty();
                    }

                    return this._modelBoundary;
                }
            }
        },

        _setModelBoundaryDirty: function () {
            this._modelBoundaryDirty = true;
            if (this._modelBoundary) {
                this._modelBoundary.fire("updated", true);
            }
        },

        _compile: function () {

            if (this._dirty) {
                this._build();
            }

            this._renderer.geometry = this._state;
        },

        _getJSON: function () {

            return XEO._apply2({
                primitive: this._primitive,
                positions: this._positions,
                normals: this._normals,
                uv: this._uv,
                colors: this._colors,
                indices: this._indices
            }, {});
        },

        _destroy: function () {

            this.scene.canvas.off(this._webglContextRestored);

            // Destroy VBOs

            if (this._state.positions) {
                this._state.positions.destroy();
            }

            if (this._state.colors) {
                this._state.colors.destroy();
            }

            if (this._state.normals) {
                this._state.normals.destroy();
            }

            if (this._state.uv) {
                this._state.uv.destroy();
            }

            if (this._state.tangents) {
                this._state.tangents.destroy();
            }

            if (this._state.indices) {
                this._state.indices.destroy();
            }

            if (this._modelBoundary) {
                this._modelBoundary.destroy();
            }

            // Destroy state

            this._state.destroy();

            // Decrement geometry statistic

            this.scene.stats.dec("geometries");
        }
    });

})();
;/**
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
;/**
 * Components for managing groups of components.
 *
 * @module XEO
 * @submodule grouping
 */;/**
 A **Group** is a subset of the {{#crossLink "Component"}}Components{{/crossLink}} within a {{#crossLink "Scene"}}{{/crossLink}}.

 ## Overview

 <ul>
 <li>Supports addition and removal of {{#crossLink "Component"}}Components{{/crossLink}} by instance, ID or type.</li>
 </ul>

 <img src="../../../assets/images/Group.png"></img>

 ## Example

 In this example we have:

 <ul>
 <li>a {{#crossLink "Material"}}{{/crossLink}},
 <li>a {{#crossLink "Geometry"}}{{/crossLink}} (that is the default box shape),
 <li>a {{#crossLink "GameObject"}}{{/crossLink}} attached to all of the above,</li>
 <li>two {{#crossLink "Group"}}Groups{{/crossLink}}, each containing a subset of all our components.</li>
 </ul>

 ````javascript
 var scene = new XEO.Scene();

 var material = new XEO.PhongMaterial(scene, {
     id: "myMaterial",
     diffuse: [0.5, 0.5, 0.0]
 });

 var geometry = new XEO.Geometry(scene); // Defaults to a 2x2x2 box

 var gameObject = new XEO.GameObject(scene, {
    id: "myObject",
    material: material,
    geometry: geometry
 });

 // Our first group contains the Material, added by ID,
 // plus the Geometry and GameObject, both added by instance.

 var group1 = new XEO.Group(scene, { // Initialize with three components
    components: [
        "myMaterial",
        geometry,
        gameObject
    ]
 });

 // Our second Group includes the geometry, added by instance,
 // and the GameObject, added by type. If there were more than
 // one GameObject in the scene, then that type would ensure
 // that all the GameObjects were in the Group.

 var group2 = new XEO.Group(scene);

 group2.add([  // Add two components
        geometry,
        "XEO.GameObject",
    ]);

 // We can iterate over the components in a Group like so:

 group1.iterate(
    function(component) {
        //..
    });

 // And remove components from a Group
 // by instance, ID or type:

 group1.remove("myMaterial"); // Remove one component by ID
 group1.remove([geometry, gameObject]); // Remove two components by instance

 group2.remove("XEO.Geometry"); // Remove all Geometries
 ````

 TODO

 @class Group
 @module XEO
 @submodule grouping
 @constructor
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}{{/crossLink}}.
 @param [cfg] {*} Configs
 @param [cfg.id] {String} Optional ID, unique among all components in the parent scene, generated automatically when omitted.
 @param [cfg.meta] {String:Component} Optional map of user-defined metadata to attach to this Group.
 @param [cfg.components] {{Array of String|Component}} Array of {{#crossLink "Component"}}{{/crossLink}} IDs or instances.
 @extends Component
 */
(function () {

    "use strict";

    XEO.Group = XEO.Component.extend({

        /**
         JavaScript class name for this Component.

         @property type
         @type String
         @final
         */
        type: "XEO.Group",

        _init: function (cfg) {

            /**
             * The {{#crossLink "Components"}}{{/crossLink}} within this Group, mapped to their IDs.
             *
             * Fires an {{#crossLink "Group/updated:event"}}{{/crossLink}} event on change.
             *
             * @property components
             * @type {{String:Component}}
             */
            this.components = {};

            /**
             * The number of {{#crossLink "Components"}}{{/crossLink}} within this Group.
             *
             * @property numComponents
             * @type Number
             */
            this.numComponents = 0;

            /**
             * For each {{#crossLink "Component"}}Component{{/crossLink}} type, a map of
             * IDs to instances.
             *
             * @property types
             * @type {String:{String:XEO.Component}}
             */
            this.types = {};

            // Subscriptions to "destroyed" events from components
            this._destroyedSubs = {};

            if (cfg.components) {
                this.add(cfg.components);
            }
        },

        /**
         * Adds one or more {{#crossLink "Component"}}Components{{/crossLink}}s to this Group.
         *
         * The {{#crossLink "Component"}}Component(s){{/crossLink}} may be specified by instance, ID or type.
         *
         * See class comment for usage examples.
         *
         * The {{#crossLink "Component"}}Components{{/crossLink}} must be in the same {{#crossLink "Scene"}}{{/crossLink}} as this Group.
         *
         * Fires an {{#crossLink "Group/updated:event"}}{{/crossLink}} event.
         *
         * @method add
         * @param {Array of Component} components Array of {{#crossLink "Component"}}Components{{/crossLink}} instances.
         */
        add: function (components) {

            components = XEO._isArray(components) ? components : [components];

            for (var i = 0, len = components.length; i < len; i++) {
                this._addComponent(components[i]);
            }
        },

        _addComponent: function (c) {

            var componentId;
            var component;
            var type;
            var types;

            if (c.type) {

                // Component instance

                component = c;

            } else if (XEO._isNumeric(c) || XEO._isString(c)) {

                if (this.scene.types[c]) {

                    // Component type

                    type = c;

                    types = this.scene.types[type];

                    if (!types) {
                        this.warn("Component type not found: '" + type + "'");
                        return;
                    }

                    for (componentId in types) {
                        if (types.hasOwnProperty(componentId)) {
                            this._addComponent(types[componentId]);
                        }
                    }

                    return;

                } else {

                    // Component ID

                    component = this.scene.components[c];

                    if (!component) {
                        this.warn("Component not found: " + XEO._inQuotes(c));
                        return;
                    }
                }

            } else {

                return;
            }

            if (component.scene != this.scene) {

                // Component in wrong Scene

                this.warn("Attempted to add component from different XEO.Scene: " + XEO._inQuotes(component.id));
                return;
            }

            // Add component to this map

            this.components[component.id] = component;

            // Register component for its type

            types = this.types[component.type];

            if (!types) {
                types = this.types[type] = {};
            }

            types[component.id] = component;

            this.numComponents++;

            // Remove component when it's destroyed

            var self = this;

            this._destroyedSubs[component.id] = component.on("destroyed",
                function(component) {
                    self._removeComponent(component);
                });

            this.fire("added", component);
        },

        /**
         * Removes all {{#crossLink "Component"}}Components{{/crossLink}} from this Group.
         *
         * Fires an {{#crossLink "Group/updated:event"}}{{/crossLink}} event.
         *
         * @method clear
         */
        clear: function () {

            this.iterate(function (component) {
                this._removeComponent(component);
            });
        },

        /**
         * Destroys all {{#crossLink "Component"}}Components{{/crossLink}} in this Group.
         *
         * @method destroyAll
         */
        destroyAll: function () {

            this.iterate(function (component) {
                component.destroy();
            });
        },

        /**
         * Removes one or more {{#crossLink "Component"}}Components{{/crossLink}} from this Group.
         *
         * The {{#crossLink "Component"}}Component(s){{/crossLink}} may be specified by instance, ID or type.
         *
         * See class comment for usage examples.
         *
         * Fires an {{#crossLink "Group/updated:event"}}{{/crossLink}} event.
         *
         * @method remove
         * @param {Array of Components} components Array of {{#crossLink "Component"}}Components{{/crossLink}} instances.
         */
        remove: function (components) {

            components = XEO._isArray(components) ? components : [components];

            for (var i = 0, len = components.length; i < len; i++) {
                this._removeComponent(components[i]);
            }
        },

        _removeComponent: function (component) {

            var componentId = component.id;

            if (component.scene != this.scene) {
                this.warn("Attempted to remove component that's not in same XEO.Scene: '" + componentId + "'");
                return;
            }

            delete this.components[componentId];

            // Unsubscribe from component destruction

            component.off(this._destroyedSubs[componentId]);

            delete this._destroyedSubs[componentId];

            // Unregister component for its type

            var types = this.types[component.type];

            if (types) {
                delete types[component.id];
            }

            this.numComponents--;

            this.fire("removed", component);
        },

        /**
         * Iterates with a callback over the {{#crossLink "Component"}}Components{{/crossLink}} in this Group.
         *
         * @method withComponents
         * @param {Function} callback Callback called for each {{#crossLink "Component"}}{{/crossLink}}.
         */
        iterate: function (callback) {
            for (var componentId in this.components) {
                if (this.components.hasOwnProperty(componentId)) {
                    callback.call(this, this.components[componentId]);
                }
            }
        },

        _getJSON: function () {

            var componentIds = [];

            for (var componentId in this.components) {
                if (this.components.hasOwnProperty(componentId)) {
                    componentIds.push(this.components[componentId].id); // Don't convert numbers into strings
                }
            }

            return {
                components: componentIds
            };
        },

        _destroy: function () {

            this.clear();
        }
    });

})();;
/**
 A **GroupBoundary** configures the WebGL color buffer for attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.

 ## Overview

 <ul>

 <li>A GroupBoundary configures **the way** that pixels are written to the WebGL color buffer.</li>
 <li>GroupBoundary is not to be confused with {{#crossLink "ColorTarget"}}ColorTarget{{/crossLink}}, which stores rendered pixel
 colors for consumption by {{#crossLink "Texture"}}Textures{{/crossLink}}, used when performing *render-to-texture*.</li>

 </ul>

 <img src="../../../assets/images/GroupBoundary.png"></img>

 ## Example

 In this example we're configuring the WebGL color buffer for a {{#crossLink "GameObject"}}{{/crossLink}}.

 This example scene contains:

 <ul>
 <li>a GroupBoundary that enables blending and sets the color mask,</li>
 <li>a {{#crossLink "Geometry"}}{{/crossLink}} that is the default box shape, and
 <li>a {{#crossLink "GameObject"}}{{/crossLink}} attached to all of the above.</li>
 </ul>

 ````javascript
 var scene = new XEO.Scene();

 var GroupBoundary = new XEO.GroupBoundary(scene, {
    blendEnabled: true,
    colorMask: [true, true, true, true]
});

 var geometry = new XEO.Geometry(scene); // Defaults to a 2x2x2 box

 var gameObject = new XEO.GameObject(scene, {
    GroupBoundary: GroupBoundary,
    geometry: geometry
});
 ````

 @class GroupBoundary
 @module XEO
 @submodule grouping
 @constructor
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}Scene{{/crossLink}}, creates this GroupBoundary within the
 default {{#crossLink "Scene"}}Scene{{/crossLink}} when omitted.
 @param [cfg] {*} GroupBoundary configuration
 @param [cfg.id] {String} Optional ID, unique among all components in the parent {{#crossLink "Scene"}}Scene{{/crossLink}}, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this GroupBoundary.
 @param [cfg.blendEnabled=false] {Boolean} Indicates if blending is enabled.
 @param [cfg.colorMask=[true, true, true, true]] {Array of Boolean} The color mask,
 @extends Component
 */
(function () {

    "use strict";

    XEO.GroupBoundary = XEO.Component.extend({

        type: "XEO.GroupBoundary",

        _init: function (cfg) {

            this.group = cfg.group;
        },

        _props: {

            /**
             * The {{#crossLink "Group"}}{{/crossLink}} attached to this GameObject.
             *
             * Defaults to an empty internally-managed {{#crossLink "Group"}}{{/crossLink}}.
             *
             * Fires a {{#crossLink "GroupBoundary/group:event"}}{{/crossLink}} event on change.
             *
             * @property group
             * @type Group
             */
            group: {

                set: function (value) {

                    /**
                     * Fired whenever this GroupBoundary's  {{#crossLink "GroupBoundary/group:property"}}{{/crossLink}} property changes.
                     *
                     * @event group
                     * @param value The property's new value
                     */
                    this._setChild("group", value);
                },

                get: function () {
                    return this._children.group;
                }
            },
            
            /**
             * World-space 3D boundary.
             *
             * If you call {{#crossLink "Component/destroy:method"}}{{/crossLink}} on this boundary, then
             * this property will be assigned to a fresh {{#crossLink "Boundary3D"}}{{/crossLink}} instance next
             * time you reference it.
             *
             * @property worldBoundary
             * @type Boundary3D
             * @final
             */
            worldBoundary: {

                get: function () {

                    if (!this._worldBoundary) {

                        var self = this;

                        this._worldBoundary = new XEO.Boundary3D(this.scene, {

                            getDirty: function () {
                                return self._worldBoundaryDirty;
                            },

                            getOBB: function () {

                                // Calls our Geometry's modelBoundary property,
                                // lazy-inits the boundary and its obb

                                return self._children.geometry.modelBoundary.obb;
                            },

                            getMatrix: function () {
                                return self._children.transform.matrix;
                            }
                        });

                        this._worldBoundary.on("destroyed",
                            function () {
                                self._worldBoundary = null;
                            });

                        this._setWorldBoundaryDirty();
                    }

                    return this._worldBoundary;
                }
            },

            /**
             * View-space 3D boundary.
             *
             * If you call {{#crossLink "Component/destroy:method"}}{{/crossLink}} on this boundary, then
             * this property will be assigned to a fresh {{#crossLink "Boundary3D"}}{{/crossLink}} instance
             * next time you reference it.
             *
             * @property viewBoundary
             * @type Boundary3D
             * @final
             */
            viewBoundary: {

                get: function () {

                    if (!this._viewBoundary) {

                        var self = this;

                        this._viewBoundary = new XEO.Boundary3D(this.scene, {

                            getDirty: function () {
                                return self._viewBoundaryDirty;
                            },

                            getOBB: function () {

                                // Calls our worldBoundary property,
                                // lazy-inits the boundary and its obb

                                return self.worldBoundary.obb;
                            },

                            getMatrix: function () {
                                return self._children.camera.view.matrix;
                            }
                        });

                        this._viewBoundary.on("destroyed",
                            function () {
                                self._viewBoundary = null;
                            });

                        this._setViewBoundaryDirty();
                    }

                    return this._viewBoundary;
                }
            }
        },

        _setWorldBoundaryDirty: function () {
            this._worldBoundaryDirty = true;
            this._viewBoundaryDirty = true;
            if (this._worldBoundary) {
                this._worldBoundary.fire("updated", true);
            }
            if (this._viewBoundary) {
                this._viewBoundary.fire("updated", true);
            }
        },

        _setViewBoundaryDirty: function () {
            this._viewBoundaryDirty = true;
            if (this._viewBoundary) {
                this._viewBoundary.fire("updated", true);
            }
        },
        
        _getJSON: function () {
            return {
                
            };
        },

        _destroy: function () {
            this._state.destroy();
        }
    });

})();
;/**
 * Components for capturing user input.
 *
 * @module XEO
 * @submodule input
 */;/**
 Publishes key and mouse events that occur on the parent {{#crossLink "Scene"}}Scene{{/crossLink}}'s {{#crossLink "Canvas"}}Canvas{{/crossLink}}.

 ## Overview

 <ul>
 <li>Each {{#crossLink "Scene"}}{{/crossLink}} provides an Input on itself as a read-only property.</li>
 </ul>

 <img src="../../../assets/images/Input.png"></img>

 ## Example

 In this example, we're subscribing to some mouse and key events that will occur on
 a {{#crossLink "Scene"}}Scene's{{/crossLink}} {{#crossLink "Canvas"}}Canvas{{/crossLink}}.

 ````javascript
var myScene = new XEO.Scene();

 var input = myScene.input;

 // We'll save a handle to this subscription
 // to show how to unsubscribe, further down
 var handle = input.on("mousedown", function(coords) {
       console.log("Mouse down at: x=" + coords[0] + ", y=" + coords[1]);
 });

 input.on("mouseup", function(coords) {
       console.log("Mouse up at: x=" + coords[0] + ", y=" + coords[1]);
 });

 input.on("mouseclicked", function(coords) {
      console.log("Mouse clicked at: x=" + coords[0] + ", y=" + coords[1]);
 });

 input.on("dblclick", function(coords) {
       console.log("Double-click at: x=" + coords[0] + ", y=" + coords[1]);
 });

 input.on("keydown", function(keyCode) {
        switch (keyCode) {

            case this.KEY_A:
               console.log("The 'A' key is down");
               break;

            case this.KEY_B:
               console.log("The 'B' key is down");
               break;

            case this.KEY_C:
               console.log("The 'C' key is down");
               break;

            default:
               console.log("Some other key is down");
       }
     });

 input.on("keyup", function(keyCode) {
        switch (keyCode) {

            case this.KEY_A:
               console.log("The 'A' key is up");
               break;

            case this.KEY_B:
               console.log("The 'B' key is up");
               break;

            case this.KEY_C:
               console.log("The 'C' key is up");
               break;

            default:
               console.log("Some other key is up");
        }
     });

 // TODO: ALT and CTRL keys etc
 ````

 ### Unsubscribing from Events

 In the snippet above, we saved a handle to one of our event subscriptions.

 We can then use that handle to unsubscribe again, like this:

 ````javascript
 input.off(handle);
 ````

 @class Input
 @module XEO
 @submodule input
 @extends Component
 */
(function () {

    "use strict";

    XEO.Input = XEO.Component.extend({

        type: "XEO.Input",

        serializable: false,

        _init: function (cfg) {

            var self = this;

            // True when ALT down
            this.altDown = false;

            /** True whenever CTRL is down
             *
             * @type {boolean}
             */
            this.ctrlDown = false;

            /** True whenever left mouse button is down
             *
             * @type {boolean}
             */
            this.mouseDownLeft = false;

            /** True whenever middle mouse button is down
             *
             * @type {boolean}
             */
            this.mouseDownMiddle = false;

            /** True whenever right mouse button is down
             *
             * @type {boolean}
             */
            this.mouseDownRight = false;

            /** Flag for each key that's down
             *
             * @type {boolean}
             */
            this.keyDown = [];

            /** True while input enabled
             *
             * @type {boolean}
             */
            this.enabled = true;

            // Capture input events and publish them on this component

            document.addEventListener("keydown",
                this._keyDownListener = function (e) {

                    if (!self.enabled) {
                        return;
                    }

                    if (e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {

                        if (e.ctrlKey) {
                            self.ctrlDown = true;

                        } else if (e.altKey) {
                            self.altDown = true;

                        } else {
                            self.keyDown[e.keyCode] = true;

                            /**
                             * Fired whenever a key is pressed while the parent
                             * {{#crossLink "Scene"}}Scene{{/crossLink}}'s {{#crossLink "Canvas"}}Canvas{{/crossLink}} has input focus.
                             * @event keydown
                             * @param value {Number} The key code, for example {{#crossLink "Input/KEY_LEFT_ARROW:property"}}{{/crossLink}},
                             */
                            self.fire("keydown", e.keyCode, true);
                        }
                    }
                }, true);


            document.addEventListener("keyup",
                this._keyUpListener = function (e) {

                    if (!self.enabled) {
                        return;
                    }

                    if (e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {

                        if (e.ctrlKey) {
                            self.ctrlDown = false;

                        } else if (e.altKey) {
                            self.altDown = false;

                        } else {
                            self.keyDown[e.keyCode] = false;

                            /**
                             * Fired whenever a key is released while the parent
                             * {{#crossLink "Scene"}}Scene{{/crossLink}}'s {{#crossLink "Canvas"}}Canvas{{/crossLink}} has input focus.
                             * @event keyup
                             * @param value {Number} The key code, for example {{#crossLink "Input/KEY_LEFT_ARROW:property"}}{{/crossLink}},
                             */
                            self.fire("keyup", e.keyCode, true);
                        }
                    }
                });

            cfg.canvas.addEventListener("mousedown",
                this._mouseDownListener = function (e) {

                    if (!self.enabled) {
                        return;
                    }

                    switch (e.which) {

                        case 1:// Left button
                            self.mouseDownLeft = true;
                            break;

                        case 2:// Middle/both buttons
                            self.mouseDownMiddle = true;
                            break;

                        case 3:// Right button
                            self.mouseDownRight = true;
                            break;

                        default:
                            break;
                    }

                    var coords = self._getClickCoordsWithinElement(e);

                    /**
                     * Fired whenever the mouse is pressed over the parent
                     * {{#crossLink "Scene"}}Scene{{/crossLink}}'s {{#crossLink "Canvas"}}Canvas{{/crossLink}}.
                     * @event mousedown
                     * @param value {[Number, Number]} The mouse coordinates within the {{#crossLink "Canvas"}}Canvas{{/crossLink}},
                     */
                    self.fire("mousedown", coords, true);
                });

            cfg.canvas.addEventListener("mouseup",
                this._mouseUpListener = function (e) {

                    if (!self.enabled) {
                        return;
                    }

                    switch (e.which) {

                        case 1:// Left button
                            self.mouseDownLeft = false;
                            break;

                        case 2:// Middle/both buttons
                            self.mouseDownMiddle = false;
                            break;

                        case 3:// Right button
                            self.mouseDownRight = false;
                            break;

                        default:
                            break;
                    }

                    var coords = self._getClickCoordsWithinElement(e);

                    /**
                     * Fired whenever the mouse is released over the parent
                     * {{#crossLink "Scene"}}Scene{{/crossLink}}'s {{#crossLink "Canvas"}}Canvas{{/crossLink}}.
                     * @event mouseup
                     * @param value {[Number, Number]} The mouse coordinates within the {{#crossLink "Canvas"}}Canvas{{/crossLink}},
                     */
                    self.fire("mouseup", coords, true);
                });

            cfg.canvas.addEventListener("dblclick",
                this._dblClickListener = function (e) {

                    if (!self.enabled) {
                        return;
                    }

                    switch (e.which) {

                        case 1:// Left button
                            self.mouseDownLeft = false;
                            self.mouseDownRight = false;
                            break;

                        case 2:// Middle/both buttons
                            self.mouseDownMiddle = false;
                            break;

                        case 3:// Right button
                            self.mouseDownLeft = false;
                            self.mouseDownRight = false;
                            break;

                        default:
                            break;
                    }

                    var coords = self._getClickCoordsWithinElement(e);

                    /**
                     * Fired whenever the mouse is double-clicked over the parent
                     * {{#crossLink "Scene"}}Scene{{/crossLink}}'s {{#crossLink "Canvas"}}Canvas{{/crossLink}}.
                     * @event dblclick
                     * @param value {[Number, Number]} The mouse coordinates within the {{#crossLink "Canvas"}}Canvas{{/crossLink}},
                     */
                    self.fire("dblclick", coords, true);
                });

            cfg.canvas.addEventListener("mousemove",
                this._mouseMoveListener = function (e) {

                    if (!self.enabled) {
                        return;
                    }

                    var coords = self._getClickCoordsWithinElement(e);

                    /**
                     * Fired whenever the mouse is moved over the parent
                     * {{#crossLink "Scene"}}Scene{{/crossLink}}'s {{#crossLink "Canvas"}}Canvas{{/crossLink}}.
                     * @event mousedown
                     * @param value {[Number, Number]} The mouse coordinates within the {{#crossLink "Canvas"}}Canvas{{/crossLink}},
                     */
                    self.fire("mousemove", coords, true);
                });

            cfg.canvas.addEventListener("mousewheel",
                this._mouseWheelListener = function (e, d) {
                    if (!self.enabled) {
                        return;
                    }

                    var e = window.event || e; // old IE support
                    var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));

                    /**
                     * Fired whenever the mouse wheel is moved over the parent
                     * {{#crossLink "Viewer"}}Viewer{{/crossLink}}'s {{#crossLink "Canvas"}}Canvas{{/crossLink}}.
                     * @event mousewheel
                     * @param delta {Number} The mouse wheel delta,
                     */
                    self.fire("mousewheel", delta, true);
                });

            // mouseclicked

            (function () {

                var downX;
                var downY;

                self.on("mousedown",
                    function (params) {
                        downX = params.x;
                        downY = params.y;
                    });

                self.on("mouseup",
                    function (params) {

                        if (downX === params.x && downY === params.y) {

                            /**
                             * Fired whenever the mouse is clicked over the parent
                             * {{#crossLink "Scene"}}Scene{{/crossLink}}'s {{#crossLink "Canvas"}}Canvas{{/crossLink}}.
                             * @event mouseclicked
                             * @param value {[Number, Number]} The mouse coordinates within the {{#crossLink "Canvas"}}Canvas{{/crossLink}},
                             */
                            self.fire("mouseclicked", params, true);
                        }
                    });
            })();
        },

        _getClickCoordsWithinElement: function (event) {
            var coords = [0,0];
            if (!event) {
                event = window.event;
                coords.x = event.x;
                coords.y = event.y;
            }
            else {
                var element = event.target;
                var totalOffsetLeft = 0;
                var totalOffsetTop = 0;

                while (element.offsetParent) {
                    totalOffsetLeft += element.offsetLeft;
                    totalOffsetTop += element.offsetTop;
                    element = element.offsetParent;
                }
                coords[0] = event.pageX - totalOffsetLeft;
                coords[1] = event.pageY - totalOffsetTop;
            }
            return coords;
        },

        /**
         * Enable or disable all input handlers
         *
         * @param enable
         */
        setEnabled: function (enable) {
            if (this.enabled !== enable) {
                this.fire("enabled", this.enabled = enable);
            }
        },

        // Key codes

        /**
         * Code for the BACKSPACE key.
         * @property KEY_BACKSPACE
         * @final
         * @type Number
         */
        KEY_BACKSPACE: 8,

        /**
         * Code for the TAB key.
         * @property KEY_TAB
         * @final
         * @type Number
         */
        KEY_TAB: 9,

        /**
         * Code for the ENTER key.
         * @property KEY_ENTER
         * @final
         * @type Number
         */
        KEY_ENTER: 13,

        /**
         * Code for the SHIFT key.
         * @property KEY_SHIFT
         * @final
         * @type Number
         */
        KEY_SHIFT: 16,

        /**
         * Code for the CTRL key.
         * @property KEY_CTRL
         * @final
         * @type Number
         */
        KEY_CTRL: 17,

        /**
         * Code for the ALT key.
         * @property KEY_ALT
         * @final
         * @type Number
         */
        KEY_ALT: 18,

        /**
         * Code for the PAUSE_BREAK key.
         * @property KEY_PAUSE_BREAK
         * @final
         * @type Number
         */
        KEY_PAUSE_BREAK: 19,

        /**
         * Code for the CAPS_LOCK key.
         * @property KEY_CAPS_LOCK
         * @final
         * @type Number
         */
        KEY_CAPS_LOCK: 20,

        /**
         * Code for the ESCAPE key.
         * @property KEY_ESCAPE
         * @final
         * @type Number
         */
        KEY_ESCAPE: 27,

        /**
         * Code for the PAGE_UP key.
         * @property KEY_PAGE_UP
         * @final
         * @type Number
         */
        KEY_PAGE_UP: 33,

        /**
         * Code for the PAGE_DOWN key.
         * @property KEY_PAGE_DOWN
         * @final
         * @type Number
         */
        KEY_PAGE_DOWN: 34,

        /**
         * Code for the END key.
         * @property KEY_END
         * @final
         * @type Number
         */
        KEY_END: 35,

        /**
         * Code for the HOME key.
         * @property KEY_HOME
         * @final
         * @type Number
         */
        KEY_HOME: 36,

        /**
         * Code for the LEFT_ARROW key.
         * @property KEY_LEFT_ARROW
         * @final
         * @type Number
         */
        KEY_LEFT_ARROW: 37,

        /**
         * Code for the UP_ARROW key.
         * @property KEY_UP_ARROW
         * @final
         * @type Number
         */
        KEY_UP_ARROW: 38,

        /**
         * Code for the RIGHT_ARROW key.
         * @property KEY_RIGHT_ARROW
         * @final
         * @type Number
         */
        KEY_RIGHT_ARROW: 39,

        /**
         * Code for the DOWN_ARROW key.
         * @property KEY_DOWN_ARROW
         * @final
         * @type Number
         */
        KEY_DOWN_ARROW: 40,

        /**
         * Code for the INSERT key.
         * @property KEY_INSERT
         * @final
         * @type Number
         */
        KEY_INSERT: 45,

        /**
         * Code for the DELETE key.
         * @property KEY_DELETE
         * @final
         * @type Number
         */
        KEY_DELETE: 46,

        /**
         * Code for the 0 key.
         * @property KEY_NUM_0
         * @final
         * @type Number
         */
        KEY_NUM_0: 48,

        /**
         * Code for the 1 key.
         * @property KEY_NUM_1
         * @final
         * @type Number
         */
        KEY_NUM_1: 49,

        /**
         * Code for the 2 key.
         * @property KEY_NUM_2
         * @final
         * @type Number
         */
        KEY_NUM_2: 50,

        /**
         * Code for the 3 key.
         * @property KEY_NUM_3
         * @final
         * @type Number
         */
        KEY_NUM_3: 51,

        /**
         * Code for the 4 key.
         * @property KEY_NUM_4
         * @final
         * @type Number
         */
        KEY_NUM_4: 52,

        /**
         * Code for the 5 key.
         * @property KEY_NUM_5
         * @final
         * @type Number
         */
        KEY_NUM_5: 53,

        /**
         * Code for the 6 key.
         * @property KEY_NUM_6
         * @final
         * @type Number
         */
        KEY_NUM_6: 54,

        /**
         * Code for the 7 key.
         * @property KEY_NUM_7
         * @final
         * @type Number
         */
        KEY_NUM_7: 55,

        /**
         * Code for the 8 key.
         * @property KEY_NUM_8
         * @final
         * @type Number
         */
        KEY_NUM_8: 56,

        /**
         * Code for the 9 key.
         * @property KEY_NUM_9
         * @final
         * @type Number
         */
        KEY_NUM_9: 57,

        /**
         * Code for the A key.
         * @property KEY_A
         * @final
         * @type Number
         */
        KEY_A: 65,

        /**
         * Code for the B key.
         * @property KEY_B
         * @final
         * @type Number
         */
        KEY_B: 66,

        /**
         * Code for the C key.
         * @property KEY_C
         * @final
         * @type Number
         */
        KEY_C: 67,

        /**
         * Code for the D key.
         * @property KEY_D
         * @final
         * @type Number
         */
        KEY_D: 68,

        /**
         * Code for the E key.
         * @property KEY_E
         * @final
         * @type Number
         */
        KEY_E: 69,

        /**
         * Code for the F key.
         * @property KEY_F
         * @final
         * @type Number
         */
        KEY_F: 70,

        /**
         * Code for the G key.
         * @property KEY_G
         * @final
         * @type Number
         */
        KEY_G: 71,

        /**
         * Code for the H key.
         * @property KEY_H
         * @final
         * @type Number
         */
        KEY_H: 72,

        /**
         * Code for the I key.
         * @property KEY_I
         * @final
         * @type Number
         */
        KEY_I: 73,

        /**
         * Code for the J key.
         * @property KEY_J
         * @final
         * @type Number
         */
        KEY_J: 74,

        /**
         * Code for the K key.
         * @property KEY_K
         * @final
         * @type Number
         */
        KEY_K: 75,

        /**
         * Code for the L key.
         * @property KEY_L
         * @final
         * @type Number
         */
        KEY_L: 76,

        /**
         * Code for the M key.
         * @property KEY_M
         * @final
         * @type Number
         */
        KEY_M: 77,

        /**
         * Code for the N key.
         * @property KEY_N
         * @final
         * @type Number
         */
        KEY_N: 78,

        /**
         * Code for the O key.
         * @property KEY_O
         * @final
         * @type Number
         */
        KEY_O: 79,

        /**
         * Code for the P key.
         * @property KEY_P
         * @final
         * @type Number
         */
        KEY_P: 80,

        /**
         * Code for the Q key.
         * @property KEY_Q
         * @final
         * @type Number
         */
        KEY_Q: 81,

        /**
         * Code for the R key.
         * @property KEY_R
         * @final
         * @type Number
         */
        KEY_R: 82,

        /**
         * Code for the S key.
         * @property KEY_S
         * @final
         * @type Number
         */
        KEY_S: 83,

        /**
         * Code for the T key.
         * @property KEY_T
         * @final
         * @type Number
         */
        KEY_T: 84,

        /**
         * Code for the U key.
         * @property KEY_U
         * @final
         * @type Number
         */
        KEY_U: 85,

        /**
         * Code for the V key.
         * @property KEY_V
         * @final
         * @type Number
         */
        KEY_V: 86,

        /**
         * Code for the W key.
         * @property KEY_W
         * @final
         * @type Number
         */
        KEY_W: 87,

        /**
         * Code for the X key.
         * @property KEY_X
         * @final
         * @type Number
         */
        KEY_X: 88,

        /**
         * Code for the Y key.
         * @property KEY_Y
         * @final
         * @type Number
         */
        KEY_Y: 89,

        /**
         * Code for the Z key.
         * @property KEY_Z
         * @final
         * @type Number
         */
        KEY_Z: 90,

        /**
         * Code for the LEFT_WINDOW key.
         * @property KEY_LEFT_WINDOW
         * @final
         * @type Number
         */
        KEY_LEFT_WINDOW: 91,

        /**
         * Code for the RIGHT_WINDOW key.
         * @property KEY_RIGHT_WINDOW
         * @final
         * @type Number
         */
        KEY_RIGHT_WINDOW: 92,

        /**
         * Code for the SELECT key.
         * @property KEY_SELECT
         * @final
         * @type Number
         */
        KEY_SELECT_KEY: 93,

        /**
         * Code for the number pad 0 key.
         * @property KEY_NUMPAD_0
         * @final
         * @type Number
         */
        KEY_NUMPAD_0: 96,

        /**
         * Code for the number pad 1 key.
         * @property KEY_NUMPAD_1
         * @final
         * @type Number
         */
        KEY_NUMPAD_1: 97,

        /**
         * Code for the number pad 2 key.
         * @property KEY_NUMPAD 2
         * @final
         * @type Number
         */
        KEY_NUMPAD_2: 98,

        /**
         * Code for the number pad 3 key.
         * @property KEY_NUMPAD_3
         * @final
         * @type Number
         */
        KEY_NUMPAD_3: 99,

        /**
         * Code for the number pad 4 key.
         * @property KEY_NUMPAD_4
         * @final
         * @type Number
         */
        KEY_NUMPAD_4: 100,

        /**
         * Code for the number pad 5 key.
         * @property KEY_NUMPAD_5
         * @final
         * @type Number
         */
        KEY_NUMPAD_5: 101,

        /**
         * Code for the number pad 6 key.
         * @property KEY_NUMPAD_6
         * @final
         * @type Number
         */
        KEY_NUMPAD_6: 102,

        /**
         * Code for the number pad 7 key.
         * @property KEY_NUMPAD_7
         * @final
         * @type Number
         */
        KEY_NUMPAD_7: 103,

        /**
         * Code for the number pad 8 key.
         * @property KEY_NUMPAD_8
         * @final
         * @type Number
         */
        KEY_NUMPAD_8: 104,

        /**
         * Code for the number pad 9 key.
         * @property KEY_NUMPAD_9
         * @final
         * @type Number
         */
        KEY_NUMPAD_9: 105,

        /**
         * Code for the MULTIPLY key.
         * @property KEY_MULTIPLY
         * @final
         * @type Number
         */
        KEY_MULTIPLY: 106,

        /**
         * Code for the ADD key.
         * @property KEY_ADD
         * @final
         * @type Number
         */
        KEY_ADD: 107,

        /**
         * Code for the SUBTRACT key.
         * @property KEY_SUBTRACT
         * @final
         * @type Number
         */
        KEY_SUBTRACT: 109,

        /**
         * Code for the DECIMAL POINT key.
         * @property KEY_DECIMAL_POINT
         * @final
         * @type Number
         */
        KEY_DECIMAL_POINT: 110,

        /**
         * Code for the DIVIDE key.
         * @property KEY_DIVIDE
         * @final
         * @type Number
         */
        KEY_DIVIDE: 111,

        /**
         * Code for the F1 key.
         * @property KEY_F1
         * @final
         * @type Number
         */
        KEY_F1: 112,

        /**
         * Code for the F2 key.
         * @property KEY_F2
         * @final
         * @type Number
         */
        KEY_F2: 113,

        /**
         * Code for the F3 key.
         * @property KEY_F3
         * @final
         * @type Number
         */
        KEY_F3: 114,

        /**
         * Code for the F4 key.
         * @property KEY_F4
         * @final
         * @type Number
         */
        KEY_F4: 115,

        /**
         * Code for the F5 key.
         * @property KEY_F5
         * @final
         * @type Number
         */
        KEY_F5: 116,

        /**
         * Code for the F6 key.
         * @property KEY_F6
         * @final
         * @type Number
         */
        KEY_F6: 117,

        /**
         * Code for the F7 key.
         * @property KEY_F7
         * @final
         * @type Number
         */
        KEY_F7: 118,

        /**
         * Code for the F8 key.
         * @property KEY_F8
         * @final
         * @type Number
         */
        KEY_F8: 119,

        /**
         * Code for the F9 key.
         * @property KEY_F9
         * @final
         * @type Number
         */
        KEY_F9: 120,

        /**
         * Code for the F10 key.
         * @property KEY_F10
         * @final
         * @type Number
         */
        KEY_F10: 121,

        /**
         * Code for the F11 key.
         * @property KEY_F11
         * @final
         * @type Number
         */
        KEY_F11: 122,

        /**
         * Code for the F12 key.
         * @property KEY_F12
         * @final
         * @type Number
         */
        KEY_F12: 123,

        /**
         * Code for the NUM_LOCK key.
         * @property KEY_NUM_LOCK
         * @final
         * @type Number
         */
        KEY_NUM_LOCK: 144,

        /**
         * Code for the SCROLL_LOCK key.
         * @property KEY_SCROLL_LOCK
         * @final
         * @type Number
         */
        KEY_SCROLL_LOCK: 145,

        /**
         * Code for the SEMI_COLON key.
         * @property KEY_SEMI_COLON
         * @final
         * @type Number
         */
        KEY_SEMI_COLON: 186,

        /**
         * Code for the EQUAL_SIGN key.
         * @property KEY_EQUAL_SIGN
         * @final
         * @type Number
         */
        KEY_EQUAL_SIGN: 187,

        /**
         * Code for the COMMA key.
         * @property KEY_COMMA
         * @final
         * @type Number
         */
        KEY_COMMA: 188,

        /**
         * Code for the DASH key.
         * @property KEY_DASH
         * @final
         * @type Number
         */
        KEY_DASH: 189,

        /**
         * Code for the PERIOD key.
         * @property KEY_PERIOD
         * @final
         * @type Number
         */
        KEY_PERIOD: 190,

        /**
         * Code for the FORWARD_SLASH key.
         * @property KEY_FORWARD_SLASH
         * @final
         * @type Number
         */
        KEY_FORWARD_SLASH: 191,

        /**
         * Code for the GRAVE_ACCENT key.
         * @property KEY_GRAVE_ACCENT
         * @final
         * @type Number
         */
        KEY_GRAVE_ACCENT: 192,

        /**
         * Code for the OPEN_BRACKET key.
         * @property KEY_OPEN_BRACKET
         * @final
         * @type Number
         */
        KEY_OPEN_BRACKET: 219,

        /**
         * Code for the BACK_SLASH key.
         * @property KEY_BACK_SLASH
         * @final
         * @type Number
         */
        KEY_BACK_SLASH: 220,

        /**
         * Code for the CLOSE_BRACKET key.
         * @property KEY_CLOSE_BRACKET
         * @final
         * @type Number
         */
        KEY_CLOSE_BRACKET: 221,

        /**
         * Code for the SINGLE_QUOTE key.
         * @property KEY_SINGLE_QUOTE
         * @final
         * @type Number
         */
        KEY_SINGLE_QUOTE: 222,

        /**
         * Code for the SPACE key.
         * @property KEY_SPACE
         * @final
         * @type Number
         */
        KEY_SPACE: 32,


        _destroy: function () {
            document.removeEventListener("keydown", this._keyDownListener);
            document.removeEventListener("keyup", this._keyUpListener);
        }
    });

})();
;/**
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
;/**
 A **KeyboardAxisCamera** switches a {{#crossLink "Camera"}}{{/crossLink}} between preset left, right, anterior,
 posterior, superior and inferior views using the keyboard.

 ## Overview

 <ul>
 <li>A KeyboardAxisCamera updates the {{#crossLink "Lookat"}}{{/crossLink}} attached to the target {{#crossLink "Camera"}}{{/crossLink}}.
 </ul>

 By default the views are selected by the following keys:

 <ul>
 <li>'1' - left side, viewing center from along -X axis</li>
 <li>'2' - right side, viewing center from along +X axis</li>
 <li>'3' - anterior, viewing center from along -Z axis</li>
 <li>'4' - posterior, viewing center from along +Z axis</li>
 <li>'5' - superior, viewing center from along -Y axis</li>
 <li>'6' - inferior, viewing center from along +Y axis</li>
 </ul>

 ## Example

 ````Javascript
 var scene = new XEO.Scene();

 var camera = new XEO.Camera(scene);

 var control = new XEO.KeyboardAxisCamera(scene, {
        camera: camera
    });

 var object = new XEO.GameObject(scene);
 ````

 @class KeyboardAxisCamera
 @module XEO
 @submodule input
 @constructor
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}{{/crossLink}}.
 @param [cfg] {*} Configs
 @param [cfg.id] {String} Optional ID, unique among all components in the parent scene, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this KeyboardAxisCamera.
 @param [cfg.camera] {String|Camera} ID or instance of a {{#crossLink "Camera"}}Camera{{/crossLink}} to control.
 Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this KeyboardAxisCamera. Defaults to the
 parent {{#crossLink "Scene"}}Scene{{/crossLink}}'s default instance, {{#crossLink "Scene/camera:property"}}camera{{/crossLink}}.
 @param [cfg.active=true] {Boolean} Whether or not this KeyboardAxisCamera is active.
 @extends Component
 */
(function () {

    "use strict";

    XEO.KeyboardAxisCamera = XEO.Component.extend({

        /**
         JavaScript class name for this Component.

         @property type
         @type String
         @final
         */
        type: "XEO.KeyboardAxisCamera",

        _init: function (cfg) {

            // Event handles

            this._onKeyDown = null;

            // Animations

            this._cameraFly = new XEO.CameraFlight(this.scene, {
            });

            // Init properties

            this.camera = cfg.camera;
            this.active = cfg.active !== false;
        },

        _props: {

            /**
             * The {{#crossLink "Camera"}}Camera{{/crossLink}} attached to this KeyboardAxisCamera.
             *
             * Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this KeyboardAxisCamera. Defaults to the parent
             * {{#crossLink "Scene"}}Scene{{/crossLink}}'s default {{#crossLink "Scene/camera:property"}}camera{{/crossLink}} when set to
             * a null or undefined value.
             *
             * Fires a {{#crossLink "KeyboardAxisCamera/camera:event"}}{{/crossLink}} event on change.
             *
             * @property camera
             * @type Camera
             */
            camera: {

                set: function (value) {

                    /**
                     * Fired whenever this KeyboardAxisCamera's {{#crossLink "KeyboardAxisCamera/camera:property"}}{{/crossLink}} property changes.
                     *
                     * @event camera
                     * @param value The property's new value
                     */
                    this._setChild("camera", value);

                    // Update animation

                    this._cameraFly.camera = this._children.camera;
                },

                get: function () {
                    return this._children.camera;
                }
            },

            /**
             * Flag which indicates whether this KeyboardAxisCamera is active or not.
             *
             * Fires an {{#crossLink "KeyboardAxisCamera/active:event"}}{{/crossLink}} event on change.
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

                    this._cameraFly.active = value;

                    var self = this;

                    var input = this.scene.input;

                    if (value) {

                        this._onKeyDown = input.on("keydown",
                            function (keyCode) {

                                if (!self._children.camera) {
                                    return;
                                }

                                var aabb = self.scene.worldAABB;
                                var center = self.scene.worldCenter;

                                switch (keyCode) {

                                    case input.KEY_NUM_1:

                                        // Right view

                                        self._cameraFly.flyTo({
                                            look: center,
                                            eye: [-10, 0, 0],
                                            up: [0, 1, 0]
                                        });


                                        break;

                                    case input.KEY_NUM_2:

                                        // Left view

                                        self._cameraFly.flyTo({
                                            look: center,
                                            eye: [10, 0, 0],
                                            up: [0, 1, 0]
                                        });


                                        break;

                                    case input.KEY_NUM_3:

                                        // Front view

                                        self._cameraFly.flyTo({
                                            look: center,
                                            eye: [0, 0, -10],
                                            up: [0, 1, 0]
                                        });

                                        break;

                                    case input.KEY_NUM_4:

                                        // Back view

                                        self._cameraFly.flyTo({
                                            look: center,
                                            eye: [0, 0, 10],
                                            up: [0, 1, 0]
                                        });

                                        break;

                                    case input.KEY_NUM_5:

                                        // Top view

                                        self._cameraFly.flyTo({
                                            look: center,
                                            eye: [0, -10, 0],
                                            up: [0, 0, -1]
                                        });

                                        break;

                                    case input.KEY_NUM_6:

                                        // Bottom view

                                        self._cameraFly.flyTo({
                                            look: center,
                                            eye: [0, 10, 0],
                                            up: [0, 0, 1]
                                        });

                                        break;
                                }
                            });

                    } else {

                        this.scene.off(this._onKeyDown);
                    }

                    /**
                     * Fired whenever this KeyboardAxisCamera's {{#crossLink "KeyboardAxisCamera/active:property"}}{{/crossLink}} property changes.
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
                active: this._active
            };

            if (this._children.camera) {
                json.camera = this._children.camera.id;
            }

            return json;
        },

        _destroy: function () {

            this.active = false;

            this._cameraFly.destroy();
        }
    });

})();
;/**
 A **KeyboardOrbitCamera** orbits a {{#crossLink "Camera"}}{{/crossLink}} about its point-of-interest using the keyboard's arrow keys.

 ## Overview

 <ul>
 <li>A KeyboardOrbitCamera updates the {{#crossLink "Lookat"}}{{/crossLink}} attached to its target {{#crossLink "Camera"}}{{/crossLink}}.
 <li>The point-of-interest is the {{#crossLink "Lookat"}}Lookat's{{/crossLink}} {{#crossLink "Lookat/look:property"}}{{/crossLink}}.</li>
 <li>Orbiting involves rotating the {{#crossLink "Lookat"}}Lookat's{{/crossLink}} {{#crossLink "Lookat/eye:property"}}{{/crossLink}}
 about {{#crossLink "Lookat/look:property"}}{{/crossLink}}.</li>
 <li>Y-axis rotation is about the {{#crossLink "Lookat"}}Lookat's{{/crossLink}} {{#crossLink "Lookat/up:property"}}{{/crossLink}} vector.</li>
 <li>Z-axis rotation is about the {{#crossLink "Lookat/eye:property"}}{{/crossLink}} -&gt; {{#crossLink "Lookat/look:property"}}{{/crossLink}} vector.</li>
 <li>X-axis rotation is about the vector perpendicular to the {{#crossLink "Lookat/eye:property"}}{{/crossLink}}-&gt;{{#crossLink "Lookat/look:property"}}{{/crossLink}}
 and {{#crossLink "Lookat/up:property"}}{{/crossLink}} vectors.</li>
 <li>In 'first person' mode, the {{#crossLink "Lookat"}}Lookat's{{/crossLink}} {{#crossLink "Lookat/look:property"}}{{/crossLink}}
 position will orbit the {{#crossLink "Lookat/eye:property"}}{{/crossLink}} position, otherwise the {{#crossLink "Lookat/eye:property"}}{{/crossLink}}
 will orbit the {{#crossLink "Lookat/look:property"}}{{/crossLink}}.</li>
 </ul>

 ## Example

 ````Javascript
 var scene = new XEO.Scene();

 var camera = new XEO.Camera(scene);

 var control = new XEO.KeyboardOrbitCamera(scene, {

        camera: camera,

        // "First person" mode rotates look about eye.
        // By default however, we orbit eye about look.
        firstPerson: false
    });

 var object = new XEO.GameObject(scene);
 ````


 @class KeyboardOrbitCamera
 @module XEO
 @submodule input
 @constructor
 @param [viewer] {Viewer} Parent {{#crossLink "Viewer"}}{{/crossLink}}.
 @param [cfg] {*} Configs
 @param [cfg.id] {String} Optional ID, unique among all components in the parent viewer, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this KeyboardAxisCamera.
 @param [cfg.camera] {String|Camera} ID or instance of a {{#crossLink "Camera"}}Camera{{/crossLink}} to control.
 Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this KeyboardOrbitCamera. Defaults to the
 parent {{#crossLink "Scene"}}Scene{{/crossLink}}'s default instance, {{#crossLink "Scene/camera:property"}}camera{{/crossLink}}.
 @param [cfg.sensitivity=1.0] {Number} Orbit sensitivity factor.
 @param [cfg.firstPerson=false] {Boolean}  Indicates whether this KeyboardOrbitCamera is in "first person" mode.
 @param [cfg.active=true] {Boolean} Whether or not this MousePanCamera is active.
 @extends Component
 */
(function () {

    "use strict";

    XEO.KeyboardOrbitCamera = XEO.Component.extend({

        /**
         JavaScript class name for this Component.

         @property type
         @type String
         @final
         */
        type: "XEO.KeyboardOrbitCamera",

        _init: function (cfg) {

            // Event handles
            
            this._onTick = null;

            // Init properties
            
            this.camera = cfg.camera;
            this.active = cfg.active !== false;
        },

        _props: {

            /**
             * The {{#crossLink "Camera"}}Camera{{/crossLink}} attached to this KeyboardOrbitCamera.
             *
             * Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this KeyboardOrbitCamera. Defaults to the parent
             * {{#crossLink "Scene"}}Scene{{/crossLink}}'s default {{#crossLink "Scene/camera:property"}}camera{{/crossLink}} when set to
             * a null or undefined value.
             *
             * Fires a {{#crossLink "KeyboardOrbitCamera/camera:event"}}{{/crossLink}} event on change.
             *
             * @property camera
             * @type Camera
             */
            camera: {

                set: function (value) {

                    /**
                     * Fired whenever this KeyboardOrbitCamera's {{#crossLink "KeyboardOrbitCamera/camera:property"}}{{/crossLink}} property changes.
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
             * Flag which indicates whether this KeyboardOrbitCamera is in "first person" mode.
             *
             * A KeyboardOrbitCamera updates the {{#crossLink "Lookat"}}{{/crossLink}} attached to its
             * target {{#crossLink "Camera"}}{{/crossLink}}. In 'first person' mode, the
             * {{#crossLink "Lookat"}}Lookat's{{/crossLink}} {{#crossLink "Lookat/look:property"}}{{/crossLink}}
             * position orbits the {{#crossLink "Lookat/eye:property"}}{{/crossLink}} position, otherwise
             * the {{#crossLink "Lookat/eye:property"}}{{/crossLink}} orbits {{#crossLink "Lookat/look:property"}}{{/crossLink}}.</li>
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

                    /**
                     * Fired whenever this KeyboardOrbitCamera's {{#crossLink "KeyboardOrbitCamera/firstPerson:property"}}{{/crossLink}} property changes.
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
             * Flag which indicates whether this KeyboardOrbitCamera is active or not.
             *
             * Fires an {{#crossLink "KeyboardOrbitCamera/active:event"}}{{/crossLink}} event on change.
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

                                var yawRate = 50;
                                var pitchRate = 50;

                                if (!input.ctrlDown && !input.altDown) {

                                    var left = input.keyDown[input.KEY_LEFT_ARROW];
                                    var right = input.keyDown[input.KEY_RIGHT_ARROW];
                                    var up = input.keyDown[input.KEY_UP_ARROW];
                                    var down = input.keyDown[input.KEY_DOWN_ARROW];

                                    if (left || right || up || down) {

                                        var yaw = 0;
                                        var pitch = 0;

                                        if (right) {
                                            yaw = -elapsed * yawRate;

                                        } else if (left) {
                                            yaw = elapsed * yawRate;
                                        }

                                        if (down) {
                                            pitch = elapsed * pitchRate;

                                        } else if (up) {
                                            pitch = -elapsed * pitchRate;
                                        }

                                        if (Math.abs(yaw) > Math.abs(pitch)) {
                                            pitch = 0;
                                        } else {
                                            yaw = 0;
                                        }

                                        if (yaw != 0) {
                                            camera.view.rotateEyeY(yaw);
                                        }

                                        if (pitch != 0) {
                                            camera.view.rotateEyeX(pitch);
                                        }
                                    }
                                }
                            });

                    } else {

                        this.scene.off(this._onTick);
                    }

                    /**
                     * Fired whenever this KeyboardOrbitCamera's {{#crossLink "KeyboardOrbitCamera/active:property"}}{{/crossLink}} property changes.
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
            this.active = false; // Unbinds events
        }
    });

})();
;/**
 A **KeyboardPanCamera** pans a {{#crossLink "Camera"}}{{/crossLink}} using the W, S, A and D keys.

 ## Overview

 <ul>
 <li>A KeyboardPanCamera updates the {{#crossLink "Lookat"}}{{/crossLink}} attached to the target {{#crossLink "Camera"}}{{/crossLink}}.
 <li>Panning up and down involves translating the positions of the {{#crossLink "Lookat"}}Lookat's{{/crossLink}}
 {{#crossLink "Lookat/eye:property"}}{{/crossLink}} and {{#crossLink "Lookat/look:property"}}{{/crossLink}} back and forth
 along the {{#crossLink "Lookat"}}Lookat's{{/crossLink}} {{#crossLink "Lookat/up:property"}}{{/crossLink}} vector.</li>
 <li>Panning forwards and backwards involves translating
 {{#crossLink "Lookat/eye:property"}}{{/crossLink}} and {{#crossLink "Lookat/look:property"}}{{/crossLink}} back and forth along the
 {{#crossLink "Lookat/eye:property"}}{{/crossLink}}-&gt;{{#crossLink "Lookat/look:property"}}{{/crossLink}} vector.</li>
 <li>Panning left and right involves translating the {{#crossLink "Lookat/eye:property"}}{{/crossLink}} and
 {{#crossLink "Lookat/look:property"}}{{/crossLink}} along the the vector perpendicular to the {{#crossLink "Lookat/up:property"}}{{/crossLink}}
 and {{#crossLink "Lookat/eye:property"}}{{/crossLink}}-&gt;{{#crossLink "Lookat/look:property"}}{{/crossLink}} vectors.</li>
 </ul>

 ## Example

 ````Javascript
 var scene = new XEO.Scene();

 var camera = new XEO.Camera(scene);

 var control = new XEO.KeyboardPanCamera(scene, {
        camera: camera
    });

 var object = new XEO.GameObject(scene);
 ````

 @class KeyboardPanCamera
 @module XEO
 @submodule input
 @constructor
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}{{/crossLink}}.
 @param [cfg] {*} Configs
 @param [cfg.id] {String} Optional ID, unique among all components in the parent scene, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this KeyboardOrbitCamera.
 @param [cfg.camera] {String|Camera} ID or instance of a {{#crossLink "Camera"}}Camera{{/crossLink}} to control.
 Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this KeyboardPanCamera. Defaults to the
 parent {{#crossLink "Scene"}}Scene{{/crossLink}}'s default instance, {{#crossLink "Scene/camera:property"}}camera{{/crossLink}}.
 @param [cfg.sensitivity=1.0] {Number} Pan sensitivity factor.
 @param [cfg.active=true] {Boolean} Whether or not this KeyboardPanCamera is active.
 @extends Component
 */
(function () {

    "use strict";

    XEO.KeyboardPanCamera = XEO.Component.extend({

        /**
         JavaScript class name for this Component.

         @property type
         @type String
         @final
         */
        type: "XEO.KeyboardPanCamera",

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
             * The {{#crossLink "Camera"}}Camera{{/crossLink}} attached to this KeyboardPanCamera.
             *
             * Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this KeyboardPanCamera. Defaults to the parent
             * {{#crossLink "Scene"}}Scene{{/crossLink}}'s default {{#crossLink "Scene/camera:property"}}camera{{/crossLink}} when set to
             * a null or undefined value.
             *
             * Fires a {{#crossLink "KeyboardPanCamera/camera:event"}}{{/crossLink}} event on change.
             *
             * @property camera
             * @type Camera
             */
            camera: {

                set: function (value) {

                    /**
                     * Fired whenever this KeyboardPanCamera's {{#crossLink "KeyboardPanCamera/camera:property"}}{{/crossLink}} property changes.
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
             * The sensitivity of this KeyboardPanCamera.
             *
             * Fires a {{#crossLink "KeyboardPanCamera/sensitivity:event"}}{{/crossLink}} event on change.
             *
             * @property sensitivity
             * @type Number
             * @default 1.0
             */
            sensitivity: {

                set: function (value) {

                    this._sensitivity = value || 1.0;

                    /**
                     * Fired whenever this KeyboardPanCamera's  {{#crossLink "KeyboardPanCamera/sensitivity:property"}}{{/crossLink}} property changes.
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
             * Flag which indicates whether this KeyboardPanCamera is active or not.
             *
             * Fires an {{#crossLink "KeyboardPanCamera/active:event"}}{{/crossLink}} event on change.
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

                                    var wkey = input.keyDown[input.KEY_W];
                                    var skey = input.keyDown[input.KEY_S];
                                    var akey = input.keyDown[input.KEY_A];
                                    var dkey = input.keyDown[input.KEY_D];
                                    var zkey = input.keyDown[input.KEY_Z];
                                    var xkey = input.keyDown[input.KEY_X];

                                    if (wkey || skey || akey || dkey || xkey || zkey) {

                                        var x = 0;
                                        var y = 0;
                                        var z = 0;

                                        var sensitivity = self.sensitivity;

                                        if (skey) {
                                            y = elapsed * sensitivity;

                                        } else if (wkey) {
                                            y = -elapsed * sensitivity;
                                        }

                                        if (dkey) {
                                            x = elapsed * sensitivity;

                                        } else if (akey) {
                                            x = -elapsed * sensitivity;
                                        }

                                        if (xkey) {
                                            z = elapsed * sensitivity;

                                        } else if (zkey) {
                                            z = -elapsed * sensitivity;
                                        }

                                        camera.view.pan([x, y, z]);
                                    }
                                }
                            });

                    } else {

                        if (this._onTick) {
                            this.scene.off(this._onTick);
                        }
                    }

                    /**
                     * Fired whenever this KeyboardPanCamera's {{#crossLink "KeyboardPanCamera/active:property"}}{{/crossLink}} property changes.
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
;/**
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
;/**
 A **MouseOrbitCamera** orbits a {{#crossLink "Camera"}}{{/crossLink}} about its point-of-interest using the mouse.

 ## Overview

 <ul>
 <li>A MouseOrbitCamera updates the {{#crossLink "Lookat"}}{{/crossLink}} attached to the target {{#crossLink "Camera"}}{{/crossLink}}.
 <li>The point-of-interest is the {{#crossLink "Lookat"}}Lookat's{{/crossLink}} {{#crossLink "Lookat/look:property"}}{{/crossLink}}.</li>
 <li>Orbiting involves rotating the {{#crossLink "Lookat"}}Lookat's{{/crossLink}} {{#crossLink "Lookat/eye:property"}}{{/crossLink}}
 about {{#crossLink "Lookat/look:property"}}{{/crossLink}}.</li>
 <li>Y-axis rotation is about the {{#crossLink "Lookat"}}Lookat's{{/crossLink}} {{#crossLink "Lookat/up:property"}}{{/crossLink}} vector.</li>
 <li>Z-axis rotation is about the {{#crossLink "Lookat/eye:property"}}{{/crossLink}} -&gt; {{#crossLink "Lookat/look:property"}}{{/crossLink}} vector.</li>
 <li>X-axis rotation is about the vector perpendicular to the {{#crossLink "Lookat/eye:property"}}{{/crossLink}}-&gt;{{#crossLink "Lookat/look:property"}}{{/crossLink}}
 and {{#crossLink "Lookat/up:property"}}{{/crossLink}} vectors.</li>
 <li>In 'first person' mode, the {{#crossLink "Lookat"}}Lookat's{{/crossLink}} {{#crossLink "Lookat/look:property"}}{{/crossLink}}
 position will orbit the {{#crossLink "Lookat/eye:property"}}{{/crossLink}} position, otherwise the {{#crossLink "Lookat/eye:property"}}{{/crossLink}}
 will orbit the {{#crossLink "Lookat/look:property"}}{{/crossLink}}.</li>
 </ul>

 ## Example

 ````Javascript
 var scene = new XEO.Scene();

 var camera = new XEO.Camera(scene);

 var control = new XEO.MouseOrbitCamera(scene, {

        camera: camera,

        // "First person" mode rotates look about eye.
        // By default however, we orbit eye about look.
        firstPerson: false
    });

 var object = new XEO.GameObject(scene);
 ````

 @class MouseOrbitCamera
 @module XEO
 @submodule input
 @constructor
 @param [scene] {scene} Parent {{#crossLink "Scene"}}{{/crossLink}}.
 @param [cfg] {*} Configs
 @param [cfg.id] {String} Optional ID, unique among all components in the parent Scene, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this MouseOrbitCamera.
 @param [cfg.camera] {String|Camera} ID or instance of a {{#crossLink "Camera"}}Camera{{/crossLink}} to control.
 Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this MouseOrbitCamera. Defaults to the
 parent {{#crossLink "Scene"}}Scene{{/crossLink}}'s default instance, {{#crossLink "Scene/camera:property"}}camera{{/crossLink}}.
 @param [cfg.sensitivity=1.0] {Number} Mouse drag sensitivity factor.
 @param [cfg.firstPerson=false] {Boolean}  Indicates whether this MouseOrbitCamera is in "first person" mode.
 @param [cfg.active=true] {Boolean} Whether or not this MouseOrbitCamera is active.
 @extends Component
 */
(function () {

    "use strict";

    XEO.MouseOrbitCamera = XEO.Component.extend({

        /**
         JavaScript class name for this Component.

         @property type
         @type String
         @final
         */
        type: "XEO.MouseOrbitCamera",

        _init: function (cfg) {

            // Event handles
            
            this._onTick = null;
            this._onMouseDown = null;
            this._onMouseMove = null;
            this._onMouseUp = null;
            
            // Init properties
            
            this.camera = cfg.camera;
            this.sensitivity = cfg.sensitivity;
            this.active = cfg.active !== false;
        },

        _props: {

            /**
             * The {{#crossLink "Camera"}}Camera{{/crossLink}} attached to this MouseOrbitCamera.
             *
             * Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this MouseOrbitCamera. Defaults to the parent
             * {{#crossLink "Scene"}}Scene{{/crossLink}}'s default {{#crossLink "Scene/camera:property"}}camera{{/crossLink}} when set to
             * a null or undefined value.
             *
             * Fires a {{#crossLink "MouseOrbitCamera/camera:event"}}{{/crossLink}} event on change.
             *
             * @property camera
             * @type Camera
             */
            camera: {

                set: function (value) {

                    /**
                     * Fired whenever this MouseOrbitCamera's {{#crossLink "MouseOrbitCamera/camera:property"}}{{/crossLink}} property changes.
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
             * The sensitivity of this MouseOrbitCamera.
             *
             * Fires a {{#crossLink "MouseOrbitCamera/sensitivity:event"}}{{/crossLink}} event on change.
             *
             * @property sensitivity
             * @type Number
             * @default 1.0
             */
            sensitivity: {

                set: function (value) {

                    this._sensitivity = value || 1.0;

                    /**
                     * Fired whenever this MouseOrbitCamera's  {{#crossLink "MouseOrbitCamera/sensitivity:property"}}{{/crossLink}} property changes.
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
             * Flag which indicates whether this MouseOrbitCamera is in "first person" mode.
             *
             * A MouseOrbitCamera updates the {{#crossLink "Lookat"}}{{/crossLink}} attached to its
             * target {{#crossLink "Camera"}}{{/crossLink}}. In 'first person' mode, the
             * {{#crossLink "Lookat"}}Lookat's{{/crossLink}} {{#crossLink "Lookat/look:property"}}{{/crossLink}}
             * position orbits the {{#crossLink "Lookat/eye:property"}}{{/crossLink}} position, otherwise
             * the {{#crossLink "Lookat/eye:property"}}{{/crossLink}} orbits {{#crossLink "Lookat/look:property"}}{{/crossLink}}.</li>
             *
             * Fires a {{#crossLink "MouseOrbitCamera/firstPerson:event"}}{{/crossLink}} event on change.
             *
             * @property firstPerson
             * @default false
             * @type Boolean
             */
            firstPerson: {

                set: function (value) {

                    value = !!value;

                    this._firstPerson = value;

                    /**
                     * Fired whenever this MouseOrbitCamera's {{#crossLink "MouseOrbitCamera/firstPerson:property"}}{{/crossLink}} property changes.
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
             * Flag which indicates whether this MouseOrbitCamera is active or not.
             *
             * Fires an {{#crossLink "MouseOrbitCamera/active:event"}}{{/crossLink}} event on change.
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
                        
                        var lastX;
                        var lastY;
                        var xDelta = 0;
                        var yDelta = 0;
                        var down = false;

                        var self = this;

                        this._onTick = this.scene.on("tick",
                            function (params) {

                                var camera = self._children.camera;
                                
                                if (!camera) {
                                    return;
                                }
                                
                                if (xDelta != 0) {
                                    camera.view.rotateEyeY(-xDelta * self._sensitivity);
                                    xDelta = 0;
                                }

                                if (yDelta != 0) {
                                    camera.view.rotateEyeX(yDelta * self._sensitivity);
                                    yDelta = 0;
                                }
                            });

                        this._onMouseDown = input.on("mousedown",
                            function (e) {

                                if (input.mouseDownLeft
                                    && !input.mouseDownRight
                                    && !input.keyDown[input.KEY_SHIFT]
                                    && !input.mouseDownMiddle) {

                                    down = true;
                                    lastX = e[0];
                                    lastY = e[1];

                                } else {
                                    down = false;
                                }

                            });

                        this._onMouseUp = input.on("mouseup",
                            function (e) {
                                down = false;
                            });

                        this._onMouseMove = input.on("mousemove",
                            function (e) {
                                if (down) {
                                    xDelta += (e[0] - lastX) * self._sensitivity;
                                    yDelta += (e[1] - lastY) * self._sensitivity;
                                    lastX = e[0];
                                    lastY = e[1];
                                }
                            });

                    } else {

                        input.off(this._onTick);

                        input.off(this._onMouseDown);
                        input.off(this._onMouseUp);
                        input.off(this._onMouseMove);
                    }

                    /**
                     * Fired whenever this MouseOrbitCamera's {{#crossLink "MouseOrbitCamera/active:property"}}{{/crossLink}} property changes.
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
;/**
 A **MousePanCamera** pans a {{#crossLink "Camera"}}{{/crossLink}} using the mouse.

 ## Overview

 <ul>
 <li>A MousePanCamera updates the {{#crossLink "Lookat"}}{{/crossLink}} attached to the target {{#crossLink "Camera"}}{{/crossLink}}.
 <li>Panning is done by dragging the mouse with both the left and right buttons down.</li>
 <li>Panning up and down involves translating the positions of the {{#crossLink "Lookat"}}Lookat's{{/crossLink}}
 {{#crossLink "Lookat/eye:property"}}{{/crossLink}} and {{#crossLink "Lookat/look:property"}}{{/crossLink}} back and forth
 along the {{#crossLink "Lookat"}}Lookat's{{/crossLink}} {{#crossLink "Lookat/up:property"}}{{/crossLink}} vector.</li>
 <li>Panning forwards and backwards involves translating
 {{#crossLink "Lookat/eye:property"}}{{/crossLink}} and {{#crossLink "Lookat/look:property"}}{{/crossLink}} back and forth along the
 {{#crossLink "Lookat/eye:property"}}{{/crossLink}}-&gt;{{#crossLink "Lookat/look:property"}}{{/crossLink}} vector.</li>
 <li>Panning left and right involves translating the {{#crossLink "Lookat/eye:property"}}{{/crossLink}} and
 {{#crossLink "Lookat/look:property"}}{{/crossLink}} along the the vector perpendicular to the {{#crossLink "Lookat/up:property"}}{{/crossLink}}
 and {{#crossLink "Lookat/eye:property"}}{{/crossLink}}-&gt;{{#crossLink "Lookat/look:property"}}{{/crossLink}} vectors.</li>
 </ul>

 ## Example

 ````Javascript
 var scene = new XEO.Scene();

 var camera = new XEO.Camera(scene);

 var control = new XEO.MousePanCamera(scene, {
        camera: camera
    });

 var object = new XEO.GameObject(scene);
 ````

 @class MousePanCamera
 @module XEO
 @submodule input
 @constructor
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}{{/crossLink}}.
 @param [cfg] {*} Configs
 @param [cfg.id] {String} Optional ID, unique among all components in the parent scene, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this MousePanCamera.
 @param [cfg.camera] {String|Camera} ID or instance of a {{#crossLink "Camera"}}Camera{{/crossLink}} to control.
 Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this MousePanCamera. Defaults to the
 parent {{#crossLink "Scene"}}Scene{{/crossLink}}'s default instance, {{#crossLink "Scene/camera:property"}}camera{{/crossLink}}.
 @param [cfg.sensitivity=1.0] {Number} Pan sensitivity factor.
 @param [cfg.active=true] {Boolean} Whether or not this MousePanCamera is active.
 @extends Component
 */
(function () {

    "use strict";

    XEO.MousePanCamera = XEO.Component.extend({

        /**
         JavaScript class name for this Component.

         @property type
         @type String
         @final
         */
        type: "XEO.MousePanCamera",

        _init: function (cfg) {

            // Event handles

            this._onTick = null;
            this._onMouseDown = null;
            this._onMouseMove = null;
            this._onMouseUp = null;

            // Init properties

            this.camera = cfg.camera;
            this.sensitivity = cfg.sensitivity;
            this.active = cfg.active !== false;
        },

        _props: {

            /**
             * The {{#crossLink "Camera"}}Camera{{/crossLink}} attached to this MousePanCamera.
             *
             * Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this MousePanCamera. Defaults to the parent
             * {{#crossLink "Scene"}}Scene{{/crossLink}}'s default {{#crossLink "Scene/camera:property"}}camera{{/crossLink}} when set to
             * a null or undefined value.
             *
             * Fires a {{#crossLink "MousePanCamera/camera:event"}}{{/crossLink}} event on change.
             *
             * @property camera
             * @type Camera
             */
            camera: {

                set: function (value) {

                    /**
                     * Fired whenever this MousePanCamera's {{#crossLink "MousePanCamera/camera:property"}}{{/crossLink}} property changes.
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
             * The sensitivity of this MousePanCamera.
             *
             * Fires a {{#crossLink "MousePanCamera/sensitivity:event"}}{{/crossLink}} event on change.
             *
             * @property sensitivity
             * @type Number
             * @default 1.0
             */
            sensitivity: {

                set: function (value) {

                    this._sensitivity = value ? value * 0.03 : 0.03;

                    /**
                     * Fired whenever this MousePanCamera's  {{#crossLink "MousePanCamera/sensitivity:property"}}{{/crossLink}} property changes.
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
             * Flag which indicates whether this MousePanCamera is active or not.
             *
             * Fires an {{#crossLink "MousePanCamera/active:event"}}{{/crossLink}} event on change.
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

                        var lastX;
                        var lastY;
                        var xDelta = 0;
                        var yDelta = 0;
                        var down = false;

                        var self = this;

                        this._onTick = this.scene.on("tick",
                            function () {

                                var camera = self._children.camera;

                                if (!camera) {
                                    return;
                                }

                                if (xDelta != 0 || yDelta != 0) {

                                    camera.view.pan([xDelta, yDelta, 0]);

                                    xDelta = 0;
                                    yDelta = 0;
                                }
                            });

                        this._onMouseDown = input.on("mousedown",
                            function (e) {

                                if ((input.mouseDownLeft && input.mouseDownRight) ||
                                    (input.mouseDownLeft && input.keyDown[input.KEY_SHIFT]) ||
                                    input.mouseDownMiddle) {

                                    lastX = e[0];
                                    lastY = e[1];

                                    down = true;

                                } else {
                                    down = false;
                                }
                            });

                        this._onMouseUp = input.on("mouseup",
                            function () {
                                down = false;
                            });

                        this._onMouseMove = input.on("mousemove",
                            function (e) {
                                if (down) {
                                    xDelta += (e[0] - lastX) * self.sensitivity;
                                    yDelta += (e[1] - lastY) * self.sensitivity;
                                    lastX = e[0];
                                    lastY = e[1];
                                }
                            });

                    } else {

                        input.off(this._onTick);
                        input.off(this._onMouseDown);
                        input.off(this._onMouseUp);
                        input.off(this._onMouseMove);
                    }

                    /**
                     * Fired whenever this MousePanCamera's {{#crossLink "MousePanCamera/active:property"}}{{/crossLink}} property changes.
                     * @event active
                     * @param value The property's new value
                     */
                    this.fire('active', this._active = value);
                },

                get: function () {
                    return this._active; // Unbinds events
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
;/**
 A **MousePickObject** picks {{#crossLink "GameObject"}}GameObjects{{/crossLink}} with mouse clicks.

 ## Overview

TODO

 ## Example

 ````Javascript
 var scene = new XEO.Scene({ element: "myDiv" });

 // Create some GameObjects

 var object1 = new XEO.GameObject(scene, {
    id: "object1",
    transform: new XEO.Translate(scene, { xyz: [-5, 0, 0] })
 });

 var object2 = new XEO.GameObject(scene, {
    id: "object2",
    transform: new XEO.Translate(scene, { xyz: [0, 0, 0] })
 });

 var object3 = new XEO.GameObject(scene, {
    id: "object3",
    transform: new XEO.Translate(scene, { xyz: [5, 0, 0] })
 });

 // Create a MousePickObject
 var mousePickObject = new XEO.MousePickObject(scene, {

    // We want the 3D World-space coordinates
    // of each location we pick

    rayPick: true
 });

 // Handle picked GameObjects
 mousePickObject.on("pick", function(e) {
    var object = e.object;
    var canvasPos = e.canvasPos;
    var worldPos = e.worldPos;
 });

 // Handle nothing picked
 mousePickObject.on("nopick", function(e) {
    var canvasPos = e.canvasPos;
 });
 ````

 @class MousePickObject
 @module XEO
 @submodule input
 @constructor
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}{{/crossLink}}.
 @param [cfg] {*} Configs
 @param [cfg.id] {String} Optional ID, unique among all components in the parent scene, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this MousePickObject.
 @param [rayPick=false] {Boolean} Indicates whether this MousePickObject will find the 3D ray intersection whenever it picks a
 {{#crossLink "GameObject"}}{{/crossLink}}.
 @param [cfg.active=true] {Boolean} Indicates whether or not this MousePickObject is active.
 @extends Component
 */
(function () {

    "use strict";

    XEO.MousePickObject = XEO.Component.extend({

        /**
         JavaScript class name for this Component.

         @property type
         @type String
         @final
         */
        type: "XEO.MousePickObject",

        _init: function (cfg) {

            this.rayPick = cfg.rayPick;

            this.active = cfg.active !== false;
        },

        _props: {

            /**
             * Flag which indicates whether this MousePickObject is active or not.
             *
             * Fires a {{#crossLink "MousePickObject/active:event"}}{{/crossLink}} event on change.
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

                        this._onMouseUp = input.on("dblclick",
                            function (canvasPos) {

                                var hit = self.scene.pick(canvasPos, {
                                    rayPick: self._rayPick
                                });

                                if (hit) {

                                    /**
                                     * Fired whenever a {{#crossLink "GameObject"}}GameObject{{/crossLink}} is picked.
                                     * @event picked
                                     * @param {String} objectId The ID of the picked {{#crossLink "GameObject"}}GameObject{{/crossLink}} within the parent {{#crossLink "Scene"}}Scene{{/crossLink}}.
                                     * @param {Array of Number} canvasPos The Canvas-space coordinate that was picked.
                                     * @param {Array of Number} worldPos When {{#crossLink "MousePickObject/rayPick"}}{{/crossLink}} is true,
                                     * provides the World-space coordinate that was ray-picked on the surface of the
                                     * {{#crossLink "GameObject"}}GameObject{{/crossLink}}.
                                     */
                                    self.fire("pick", hit);

                                } else {

                                    /**
                                     * Fired whenever an attempt to pick {{#crossLink "GameObject"}}GameObject{{/crossLink}} picks empty space.
                                     * @event nopick
                                     * @param {Array of Number} canvasPos The Canvas-space coordinate at which the pick was attempted.
                                     */
                                    self.fire("nopick", {
                                        canvasPos: canvasPos
                                    });
                                }
                            });

                    } else {

                        input.off(this._onMouseDown);
                        input.off(this._onMouseUp);
                    }

                    /**
                     * Fired whenever this MousePickObject's {{#crossLink "MousePickObject/active:property"}}{{/crossLink}} property changes.
                     * @event active
                     * @param value The property's new value
                     */
                    this.fire('active', this._active = value);
                },

                get: function () {
                    return this._active;
                }
            },

            /**
             * Indicates whether this MousePickObject will find the 3D ray intersection whenever it picks a
             * {{#crossLink "GameObject"}}{{/crossLink}}.
             *
             * When true, this MousePickObject returns the 3D World-space intersection in each
             * {{#crossLink "MousePickObject/picked:event"}}{{/crossLink}} event.
             *
             * Fires a {{#crossLink "MousePickObject/rayPick:event"}}{{/crossLink}} event on change.
             *
             * @property rayPick
             * @type Boolean
             */
            rayPick: {

                set: function (value) {

                    value = !!value;

                    if (this._rayPick === value) {
                        return;
                    }

                    this._dirty = false;

                    /**
                     * Fired whenever this MousePickObject's {{#crossLink "MousePickObject/rayPick:property"}}{{/crossLink}} property changes.
                     * @event rayPick
                     * @param value The property's new value
                     */
                    this.fire('rayPick', this._rayPick = value);
                },

                get: function () {
                    return this._rayPick;
                }
            }
        },

        _getJSON: function () {

            var json = {
                rayPick: this._rayPick,
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
})();;/**
 A **MouseZoomCamera** zooms a {{#crossLink "Camera"}}{{/crossLink}} using the mouse wheel.

 ## Overview

 <ul>
 <li>A MouseZoomCamera updates the {{#crossLink "Lookat"}}{{/crossLink}} attached to the target {{#crossLink "Camera"}}{{/crossLink}}.
 <li>Zooming involves translating the positions of the {{#crossLink "Lookat"}}Lookat's{{/crossLink}}
 {{#crossLink "Lookat/eye:property"}}{{/crossLink}} and {{#crossLink "Lookat/look:property"}}{{/crossLink}} back and forth
 along the {{#crossLink "Lookat/eye:property"}}{{/crossLink}}-&gt;{{#crossLink "Lookat/look:property"}}{{/crossLink}} vector.</li>
 </ul>

 ## Example

 ````Javascript
 var scene = new XEO.Scene();

 var camera = new XEO.Camera(scene);

 var control = new XEO.MouseZoomCamera(scene, {
        camera: camera
    });

 var object = new XEO.GameObject(scene);
 ````

 @class MouseZoomCamera
 @module XEO
 @submodule input
 @constructor
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}{{/crossLink}}.
 @param [cfg] {*} Configs
 @param [cfg.id] {String} Optional ID, unique among all components in the parent scene, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this MouseZoomCamera.
 @param [cfg.camera] {String|Camera} ID or instance of a {{#crossLink "Camera"}}Camera{{/crossLink}} to control.
 Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this MouseZoomCamera. Defaults to the
 parent {{#crossLink "Scene"}}Scene{{/crossLink}}'s default instance, {{#crossLink "Scene/camera:property"}}camera{{/crossLink}}.
 @param [cfg.sensitivity=1.0] {Number} Zoom sensitivity factor.
 @param [cfg.active=true] {Boolean} Whether or not this MouseZoomCamera is active.
 @extends Component
 */
(function () {

    "use strict";

    XEO.MouseZoomCamera = XEO.Component.extend({

        /**
         JavaScript class name for this Component.

         @property type
         @type String
         @final
         */
        type: "XEO.MouseZoomCamera",

        _init: function (cfg) {

            // Event handles

            this._onTick = null;
            this._onMouseWheel = null;

            // Init properties

            this.camera = cfg.camera;
            this.sensitivity = cfg.sensitivity;
            this.active = cfg.active !== false;
        },

        _props: {

            /**
             * The {{#crossLink "Camera"}}Camera{{/crossLink}} attached to this MouseZoomCamera.
             *
             * Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this MouseZoomCamera. Defaults to the parent
             * {{#crossLink "Scene"}}Scene{{/crossLink}}'s default {{#crossLink "Scene/camera:property"}}camera{{/crossLink}} when set to
             * a null or undefined value.
             *
             * Fires a {{#crossLink "MouseZoomCamera/camera:event"}}{{/crossLink}} event on change.
             *
             * @property camera
             * @type Camera
             */
            camera: {

                set: function (value) {

                    /**
                     * Fired whenever this MouseZoomCamera's {{#crossLink "MouseZoomCamera/camera:property"}}{{/crossLink}} property changes.
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
             * The sensitivity of this MouseZoomCamera.
             *
             * Fires a {{#crossLink "MouseZoomCamera/sensitivity:event"}}{{/crossLink}} event on change.
             *
             * @property sensitivity
             * @type Number
             * @default 1.0
             */
            sensitivity: {

                set: function (value) {

                    this._sensitivity = value || 1.0;

                    /**
                     * Fired whenever this MouseZoomCamera's  {{#crossLink "MouseZoomCamera/sensitivity:property"}}{{/crossLink}} property changes.
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
             * Indicates whether this MouseZoomCamera is active or not.
             *
             * Fires an {{#crossLink "MouseZoomCamera/active:event"}}{{/crossLink}} event on change.
             *
             * @property active
             * @type Boolean
             */
            active: {

                set: function (value) {

                    if (this._active === value) {
                        return;
                    }

                    if (value) {

                        var delta = 0;
                        var target = 0;
                        var newTarget = false;
                        var targeting = false;
                        var progress = 0;

                        var eyeVec = XEO.math.vec3();
                        var lookVec = XEO.math.vec3();
                        var tempVec3 = XEO.math.vec3();

                        var self = this;

                        this._onMouseWheel = this.scene.input.on("mousewheel",
                            function (_delta) {

                                delta = _delta;

                                if (delta === 0) {
                                    targeting = false;
                                    newTarget = false;
                                } else {
                                    newTarget = true;
                                }
                            });

                        this._onTick = this.scene.on("tick",
                            function () {

                                var camera = self._children.camera;

                                if (!camera) {
                                    return;
                                }

                                var eye = camera.view.eye;
                                var look = camera.view.look;

                                eyeVec[0] = eye[0];
                                eyeVec[1] = eye[1];
                                eyeVec[2] = eye[2];

                                lookVec[0] = look[0];
                                lookVec[1] = look[1];
                                lookVec[2] = look[2];

                                XEO.math.subVec3(eyeVec, lookVec, tempVec3);

                                var lenLook = Math.abs(XEO.math.lenVec3(tempVec3));
                                var lenLimits = 1000;
                                var f = self._sensitivity * (2.0 + (lenLook / lenLimits));

                                if (newTarget) {
                                    target = delta * f;
                                    progress = 0;
                                    newTarget = false;
                                    targeting = true;
                                }

                                if (targeting) {

                                    if (delta > 0) {

                                        progress += 0.2 * f;

                                        if (progress > target) {
                                            targeting = false;
                                        }

                                    } else if (delta < 0) {

                                        progress -= 0.2 * f;

                                        if (progress < target) {
                                            targeting = false;
                                        }
                                    }

                                    if (targeting) {
                                        camera.view.zoom(progress);
                                    }
                                }
                            });

                    } else {

                        if (this._onTick !== null) {
                            this.scene.off(this._onTick);
                            this.scene.input.off(this._onMouseWheel);
                        }
                    }

                    /**
                     * Fired whenever this MouseZoomCamera's {{#crossLink "MouseZoomCamera/active:property"}}{{/crossLink}} property changes.
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
;/**
 * Components for defining light sources.
 *
 * @module XEO
 * @submodule lighting
 */;/**
 A **Lights** defines a group of light sources that illuminate attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.

 ## Overview

 A Lights may contain a virtually unlimited number of three types of light source:

 <ul>
 <li>{{#crossLink "AmbientLight"}}AmbientLight{{/crossLink}}s, which are fixed-intensity and fixed-color, and
 affect all the {{#crossLink "GameObject"}}GameObjects{{/crossLink}} equally,</li>
 <li>{{#crossLink "PointLight"}}PointLight{{/crossLink}}s, which emit light that
 originates from a single point and spreads outward in all directions, and </li>
 <li>{{#crossLink "DirLight"}}DirLight{{/crossLink}}s, which illuminate all the
 {{#crossLink "GameObject"}}GameObjects{{/crossLink}} equally from a given direction</li>
 </ul>

 <img src="../../../assets/images/Lights.png"></img>

 ## Example

 In this example we have a {{#crossLink "GameObject"}}{{/crossLink}} that has a {{#crossLink "Geometry"}}{{/crossLink}},
 a {{#crossLink "PhongMaterial"}}{{/crossLink}} and a {{#crossLink "Lights"}}{{/crossLink}}. The {{#crossLink "Lights"}}{{/crossLink}}
 contains an {{#crossLink "AmbientLight"}}{{/crossLink}}, a {{#crossLink "DirLight"}}{{/crossLink}} and a {{#crossLink "PointLight"}}{{/crossLink}}.


 ```` javascript
 var scene = new XEO.Scene();

 var material = new XEO.PhongMaterial(scene, {
    ambient:    [0.3, 0.3, 0.3],
    diffuse:    [0.7, 0.7, 0.7],
    specular:   [1. 1, 1],
    shininess:  30
});

 var ambientLight = new XEO.AmbientLight(scene, {
    color: [0.7, 0.7, 0.7],
    intensity:   1.0
});

 var dirLight = new XEO.DirLight(scene, {
    dir:        [-1, -1, -1],
    color:    [0.5, 0.7, 0.5],
    intensity:   1.0,
    space:      "view"
});

 var pointLight = new XEO.PointLight(scene, {
    pos: [0, 100, 100],
    color: [0.5, 0.7, 0.5],
    intensity: [1.0, 1.0, 1.0],
    constantAttenuation: 0,
    linearAttenuation: 0,
    quadraticAttenuation: 0,
    space: "view"
});

 var lights = new XEO.Lights(scene, {
    lights: [
        ambientLight,
        dirLight,
        pointLight
    ]
});

 var geometry = new XEO.Geometry(scene);  // Defaults to a 2x2x2 box

 var object = new XEO.GameObject(scene, {
    lights: lights,
    material: material,
    geometry: geometry
});
 ````


 @class Lights
 @constructor
 @module XEO
 @submodule lighting
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}Scene{{/crossLink}} - creates this Lights in the default
 {{#crossLink "Scene"}}Scene{{/crossLink}} when omitted.
 @param [cfg] {*} Configs
 @param [cfg.id] {String} Optional ID, unique among all components in the parent scene, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this Lights.
 @param [cfg.lights] {{Array of String|GameObject}} Array of light source IDs or instances.
 @extends Component
 */
(function () {

    "use strict";

    XEO.Lights = XEO.Component.extend({

        type: "XEO.Lights",

        _init: function (cfg) {

            // Renderer state contains the states of the child light source components
            this._state = new XEO.renderer.Lights({
                lights: [],
                hash: ""
            });

            this._dirty = true;

            // Array of child light source components
            this._lights = [];

            // Subscriptions to "dirty" events from child light source components
            this._dirtySubs = [];

            // Subscriptions to "destroyed" events from child light source components
            this._destroyedSubs = [];

            // Add initial light source components
            this.lights = cfg.lights;
        },

        _props: {

            /**
             The light sources in this Lights.

             Fires a {{#crossLink "Lights/lights:event"}}{{/crossLink}} event on change.

             @property lights
             @default []
             @type {{Array of AmbientLight, PointLight and DirLight}}
             */
            lights: {

                set: function (value) {

                    value = value || [];

                    var light;

                    // Unsubscribe from events on old lights

                    for (var i = 0, len = this._lights.length; i < len; i++) {

                        light = this._lights[i];

                        light.off(this._dirtySubs[i]);
                        light.off(this._destroyedSubs[i]);
                    }

                    this._lights = [];

                    this._dirtySubs = [];
                    this._destroyedSubs = [];

                    var self = this;

                    function lightDirty() {
                        self.fire("dirty", true);
                    }

                    function lightDestroyed() {

                        var id = this.id; // Light ID

                        for (var i = 0, len = self._lights.length; i < len; i++) {

                            if (self._lights[i].id === id) {

                                self._lights = self._lights.slice(i, i + 1);
                                self._dirtySubs = self._dirtySubs.slice(i, i + 1);
                                self._destroyedSubs = self._destroyedSubs.slice(i, i + 1);

                                self._dirty = true;

                                self.fire("dirty", true);
                                self.fire("lights", self._lights);

                                return;
                            }
                        }
                    }

                    for (var i = 0, len = value.length; i < len; i++) {

                        light = value[i];

                        if (XEO._isNumeric(light) || XEO._isString(light)) {

                            // ID given for light - find the light component

                            var id = light;

                            light = this.scene.components[id];

                            if (!light) {
                                this.error("Component not found: " + XEO._inQuotes(id));
                                continue;
                            }
                        }

                        var type = light.type;

                        if (type !== "XEO.AmbientLight" && type != "XEO.DirLight" && type != "XEO.PointLight") {
                            this.error("Component " + XEO._inQuotes(light.id) + " is not an XEO.AmbientLight, XEO.DirLight or XEO.PointLight ");
                            continue;
                        }

                        this._lights.push(light);

                        this._dirtySubs.push(light.on("dirty", lightDirty));

                        this._destroyedSubs.push(light.on("destroyed", lightDestroyed));
                    }

                    this._dirty = true;

                    this.fire("dirty", true);
                    this.fire("lights", this._lights);
                },

                get: function () {
                    return this._lights.slice(0, this._lights.length);
                }
            }
        },

        _compile: function () {

            var state = this._state;

            if (this._dirty) {

                state.lights = [];

                for (var i = 0, len = this._lights.length; i < len; i++) {
                    state.lights.push(this._lights[i]._state);
                }

                this._makeHash();

                this._dirty = false;
            }

            this._renderer.lights = state;
        },

        _makeHash: function () {

            var lights = this._state.lights;

            if (lights.length === 0) {
                return ";";
            }

            var hash = [];
            var light;

            for (var i = 0, len = lights.length; i < len; i++) {

                light = lights[i];

                hash.push(light.type);
                hash.push((light.space === "world") ? "w" : "v");
            }

            hash.push(";");

            this._state.hash = hash.join("");
        },

        _getJSON: function () {

            var lightIds = [];

            for (var i = 0, len = this._lights.length; i < len; i++) {
                lightIds.push(this._lights[i].id);
            }

            return {
                lights: lightIds
            };
        },

        _destroy: function () {
            this._state.destroy();
        }
    });
})();
;/**

 An **AmbientLight** defines an ambient light source of fixed intensity and color that affects all attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}}
 equally.

 ## Overview

 <ul>
 <li>AmbientLights are grouped, along with other light source types, within
 {{#crossLink "Lights"}}Lights{{/crossLink}} components, which are attached to {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.</li>
 <li>When the {{#crossLink "GameObject"}}GameObjects{{/crossLink}} have {{#crossLink "PhongMaterial"}}PhongMaterials{{/crossLink}},
 AmbientLight {{#crossLink "AmbientLight/color:property"}}color{{/crossLink}} is multiplied by
 {{#crossLink "PhongMaterial"}}PhongMaterial{{/crossLink}} {{#crossLink "PhongMaterial/ambient:property"}}{{/crossLink}}.</li>
 <li>See <a href="Shader.html#inputs">Shader Inputs</a> for the variables that AmbientLights create within xeoEngine's shaders.</li>
 </ul>

 <img src="../../../assets/images/AmbientLight.png"></img>

 ## Example

 In this example we have
 <ul>
 <li>a {{#crossLink "PhongMaterial"}}{{/crossLink}},</li>
 <li>an AmbientLight,</li>
 <li>a {{#crossLink "Lights"}}{{/crossLink}} containing the AmbientLight,</li>
 <li>a {{#crossLink "Geometry"}}{{/crossLink}} that is the default box shape, and
 <li>a {{#crossLink "GameObject"}}{{/crossLink}} attached to all of the above.</li>
 </ul>

 ```` javascript
 var scene = new XEO.Scene();


 var material = new XEO.PhongMaterial(scene, {
    ambient: [0.3, 0.3, 0.3],
    diffuse: [1, 1, 1],
    specular: [1.1, 1],
    shininess: 30
 });


 // Within xeoEngine's lighting calculations, the AmbientLight's
 // ambient color will be multiplied by the Material's ambient color

 var ambientLight = new XEO.AmbientLight(scene, {
    color: [0.7, 0.7, 0.7]
 });


 var lights = new XEO.Lights(scene, {
    lights: [
        ambientLight
    ]
 });


 var geometry = new XEO.Geometry(scene);  // Defaults to a 2x2x2 box


 var object = new XEO.GameObject(scene, {
    lights: lights,
    material: material,
    geometry: geometry
 });

 ````

 As with all components, we can observe and change properties on AmbientLights like so:

 ````Javascript
 // Attach a change listener to a property
 var handle = ambientLight.on("color",
 function(value) {
            // Property value has changed
    });


 ambientLight.color = [0.6, 0.6, 0.6]; // Fires the change listener


 ambientLight.off(handle); // Detach the change listener
 ````

 @class AmbientLight
 @module XEO
 @submodule lighting
 @constructor
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}Scene{{/crossLink}}, creates this AmbientLight within the
 default {{#crossLink "Scene"}}Scene{{/crossLink}} when omitted
 @param [cfg] {*} AmbientLight configuration
 @param [cfg.id] {String} Optional ID, unique among all components in the parent {{#crossLink "Scene"}}Scene{{/crossLink}}, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this AmbientLight.
 @param [cfg.color=[0.7, 0.7, 0.8]] {Array(Number)} The color of this AmbientLight.
 @extends Component
 */
(function () {

    "use strict";

    XEO.AmbientLight = XEO.Component.extend({

        type: "XEO.AmbientLight",

        _init: function (cfg) {

            this._state = {
                type: "ambient",
                color: [0.7, 0.7, 0.7],
                intensity: 1.0
            };

            this.color = cfg.color;
            this.intensity = cfg.intensity;
        },

        _props: {

            /**
             The color of this AmbientLight.

             Fires an {{#crossLink "AmbientLight/color:event"}}{{/crossLink}} event on change.

             @property color
             @default [0.7, 0.7, 0.8]
             @type Array(Number)
             */
            color: {

                set: function (value) {

                    this._state.color = value || [ 0.7, 0.7, 0.8 ];

                    this._renderer.imageDirty = true;

                    /**
                     Fired whenever this AmbientLight's {{#crossLink "AmbientLight/color:property"}}{{/crossLink}} property changes.

                     @event color
                     @param value The property's new value
                     */
                    this.fire("color", this._state.color);
                },

                get: function () {
                    return this._state.color;
                }
            },

            /**
             The intensity of this AmbientLight.

             Fires a {{#crossLink "AmbientLight/intensity:event"}}{{/crossLink}} event on change.

             @property intensity
             @default 1.0
             @type Number
             */
            intensity: {

                set: function (value) {

                    this._state.intensity = value !== undefined ? value :  1.0;

                    this._renderer.imageDirty = true;

                    /**
                     * Fired whenever this AmbientLight's  {{#crossLink "AmbientLight/intensity:property"}}{{/crossLink}} property changes.
                     * @event intensity
                     * @param value The property's new value
                     */
                    this.fire("intensity", this._state.intensity);
                },

                get: function () {
                    return this._state.intensity;
                }
            }
        },

        _getJSON: function () {
            return {
                color: this._state.color,
                intensity: this._state.intensity
            };
        }
    });

})();
;/**
 A **DirLight** is a directional light source that illuminates all attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}} equally
 from a given direction.

 ## Overview

 <ul>
 <li>DirLights are grouped, along with other light source types, within {{#crossLink "Lights"}}Lights{{/crossLink}} components,
 which are attached to {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.</li>
 <li>DirLights have a direction, but no position.</li>
 <li>DirLights may be defined in either **World** or **View** coordinate space. When in World-space, their direction
 is relative to the World coordinate system, and will appear to move as the {{#crossLink "Camera"}}{{/crossLink}} moves.
 When in View-space, their direction is relative to the View coordinate system, and will behave as if fixed to the viewer's
 head as the {{#crossLink "Camera"}}{{/crossLink}} moves.</li>
 <li>See <a href="Shader.html#inputs">Shader Inputs</a> for the variables that DirLights create within xeoEngine's shaders.</li>
 </ul>

 <img src="../../../assets/images/DirLight.png"></img>

 ## Example

 In this example we have:

 <ul>
 <li>a {{#crossLink "PhongMaterial"}}{{/crossLink}},</li>
 <li>a DirLight that points along the negative diagonal of the View coordinate system,</li>
 <li>a {{#crossLink "Lights"}}{{/crossLink}} containing the DirLight,</li>
 <li>a {{#crossLink "Geometry"}}{{/crossLink}} that is the default box shape, and
 <li>a {{#crossLink "GameObject"}}{{/crossLink}} attached to all of the above.</li>
 </ul>

 <iframe style="width: 600px; height: 400px" src="../../examples/light_DirLight.html"></iframe>

 ```` javascript
 var scene = new XEO.Scene();

 // A shiny PhongMaterial with quantities of reflected
 // ambient, diffuse and specular color
 var material = new XEO.PhongMaterial(scene, {
    ambient:    [0.3, 0.3, 0.3],
    diffuse:    [0.7, 0.7, 0.7],
    specular:   [1. 1, 1],
    shininess:  30
});

 // DirLight with color and intensity, pointing along
 // the negative diagonal within the View coordinate system
 var dirLight = new XEO.DirLight(scene, {
    dir:         [-1, -1, -1],
    color:       [0.5, 0.7, 0.5],
    intensity:   1.0,
    space:      "view"  // Other option is "world", for World-space
});

 // Lights which contains our DirLight
 var lights = new XEO.Lights(scene, {
    lights: [
        dirLight
    ]
});

 var geometry = new XEO.Geometry(scene);  // Defaults to a 2x2x2 box

 // Object which renders our Geometry, colored with
 // the Material and illuminated with the DirLight
 var object = new XEO.GameObject(scene, {
    lights: lights,
    material: material,
    geometry: geometry
});
 ````

 As with all components, we can observe and change properties on a DirLights, like so:

 ````Javascript
 // Attach a change listener to a property
 var handle = dirLight.on("color",
 function(value) {
        // Property value has changed
    });

 // Set the property, which fires our change listener
 dirLight.color = [0.0, 0.3, 0.3];

 // Detach the change listener
 dirLight.off(handle);
 ````

 @class DirLight
 @module XEO
 @submodule lighting
 @constructor
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}Scene{{/crossLink}}, creates this DirLight within the
 default {{#crossLink "Scene"}}Scene{{/crossLink}} when omitted
 @param [cfg] {*} The DirLight configuration
 @param [cfg.id] {String} Optional ID, unique among all components in the parent {{#crossLink "Scene"}}Scene{{/crossLink}}, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this DirLight.
 @param [cfg.dir=[1.0, 1.0, 1.0]] {Array(Number)} A unit vector indicating the direction of illumination, given in either World or View space, depending on the value of the **space** parameter.
 @param [cfg.color=[0.7, 0.7, 0.8 ]] {Array(Number)} The color of this DirLight.
 @param [cfg.intensity=1.0 ] {Number} The intensity of this DirLight.
 @param [cfg.space="view"] {String} The coordinate system the DirLight is defined in - "view" or "space".

 @extends Component
 */
(function () {

    "use strict";

    XEO.DirLight = XEO.Component.extend({

        type: "XEO.DirLight",

        _init: function (cfg) {

            this._state = {
                type: "dir",
                dir: [0,0,-1],
                color: [0.7, 0.7, 0.8],
                intensity: 1.0,
                space: "view"
            };

            this.dir = cfg.dir;
            this.color = cfg.color;
            this.intensity = cfg.intensity;
            this.space = cfg.space;
        },

        _props: {

            /**
             The direction of this DirLight.

             Fires a {{#crossLink "DirLight/dir:event"}}{{/crossLink}} event on change.

             @property dir
             @default [1.0, 1.0, 1.0]
             @type Array(Number)
             */
            dir: {

                set: function (value) {

                    value = value || [ 1.0, 1.0, 1.0 ];

                    var dir = this._state.dir;

                    dir[0] = value[0];
                    dir[1] = value[1];
                    dir[2] = value[2];

                    this._renderer.imageDirty = true;

                    /**
                     * Fired whenever this DirLight's  {{#crossLink "DirLight/dir:property"}}{{/crossLink}} property changes.
                     * @event dir
                     * @param value The property's new value
                     */
                    this.fire("dir", dir);
                },

                get: function () {
                    return this._state.dir;
                }
            },

            /**
             The color of this DirLight.

             Fires a {{#crossLink "DirLight/color:event"}}{{/crossLink}} event on change.

             @property color
             @default [0.7, 0.7, 0.8]
             @type Array(Number)
             */
            color: {

                set: function (value) {

                    value = value || [0.7, 0.7, 0.8 ];

                    var color = this._state.color;

                    color[0] = value[0];
                    color[1] = value[1];
                    color[2] = value[2];

                    this._renderer.imageDirty = true;

                    /**
                     * Fired whenever this DirLight's  {{#crossLink "DirLight/color:property"}}{{/crossLink}} property changes.
                     * @event color
                     * @param value The property's new value
                     */
                    this.fire("color", color);
                },

                get: function () {
                    return this._state.color;
                }
            },

            /**
             The intensity of this DirLight.

             Fires a {{#crossLink "DirLight/intensity:event"}}{{/crossLink}} event on change.

             @property intensity
             @default 1.0
             @type Number
             */
            intensity: {

                set: function (value) {

                    value = value !== undefined ? value :  1.0;

                    this._state.intensity = value;

                    this._renderer.imageDirty = true;

                    /**
                     * Fired whenever this DirLight's  {{#crossLink "DirLight/intensity:property"}}{{/crossLink}} property changes.
                     * @event intensity
                     * @param value The property's new value
                     */
                    this.fire("intensity", this._state.intensity);
                },

                get: function () {
                    return this._state.intensity;
                }
            },

            /**
             Specifies which coordinate space this DirLight is in.

             Supported values are:

             <ul>
             <li>"view" - View space, aligned within the view volume as if fixed to the viewer's head</li>
             <li>"world" - World space, fixed within the world, moving within the view volume with respect to camera</li>
             </ul>

             Fires a {{#crossLink "DirLight/space:event"}}{{/crossLink}} event on change.

             @property space
             @default "view"
             @type String
             */
            space: {

                set: function (value) {

                    this._state.space = value || "view";

                    this.fire("dirty", true); // Need to rebuild shader

                    /**
                     * Fired whenever this DirLight's {{#crossLink "DirLight/space:property"}}{{/crossLink}} property changes.
                     * @event space
                     * @param value The property's new value
                     */
                    this.fire("space", this._state.space);
                },

                get: function () {
                    return this._state.space;
                }
            }
        },

        _getJSON: function () {
            return {
                type: this._state.type,
                dir: this._state.dir,
                color: this._state.color,
                intensity: this._state.intensity,
                space: this._state.space
            };
        }
    });

})();
;/**
 A **PointLight** defines a positional light source that originates from a single point and spreads outward in all directions, to illuminate
 attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.

 ## Overview

 <ul>

 <li>PointLights are grouped, along with other light source types, within {{#crossLink "Lights"}}Lights{{/crossLink}} components,
 which are attached to {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.</li>

 <li>PointLights have a position, but no direction.</li>

 <li>PointLights may be defined in either **World** or **View** coordinate space. When in World-space, their position
 is relative to the World coordinate system, and will appear to move as the {{#crossLink "Camera"}}{{/crossLink}} moves.
 When in View-space, their position is relative to the View coordinate system, and will behave as if fixed to the viewer's
 head as the {{#crossLink "Camera"}}{{/crossLink}} moves.</li>

 <li>PointLights have {{#crossLink "PointLight/constantAttenuation:property"}}{{/crossLink}}, {{#crossLink "PointLight/linearAttenuation:property"}}{{/crossLink}} and
 {{#crossLink "PointLight/quadraticAttenuation:property"}}{{/crossLink}} factors, which indicate how their intensity attenuates over distance.</li>

 <li>See <a href="Shader.html#inputs">Shader Inputs</a> for the variables that PointLights create within xeoEngine's shaders.</li>

 </ul>

 <img src="../../../assets/images/PointLight.png"></img>

 ## Example

 In this example we have
 <ul>
 <li>a {{#crossLink "PhongMaterial"}}{{/crossLink}},</li>
 <li>a PointLight,</li>
 <li>a {{#crossLink "Lights"}}{{/crossLink}} containing the PointLight,</li>
 <li>a {{#crossLink "Geometry"}}{{/crossLink}} that is the default box shape, and
 <li>a {{#crossLink "GameObject"}}{{/crossLink}} attached to all of the above.</li>
 </ul>

 <iframe style="width: 600px; height: 400px" src="../../examples/light_PointLight.html"></iframe>

 ```` javascript
 var scene = new XEO.Scene();

 var material = new XEO.PhongMaterial(scene, {
        color: [1, 1, 1],
        intensity: 1
 });

 // Our PointLight's intensity does not attenuate over distance.

 var pointLight = new XEO.PointLight(scene, {
        pos: [0, 100, 100],
        color: [0.5, 0.7, 0.5],
        intensity: 1
        constantAttenuation: 0,
        linearAttenuation: 0,
        quadraticAttenuation: 0,
        space: "view"
 });

 var lights = new XEO.Lights(scene, {
        lights: [
            pointLight
        ]
 });

 var geometry = new XEO.Geometry(scene);  // Defaults to a 2x2x2 box

 var object = new XEO.GameObject(scene, {
        lights: lights,
        material: material,
        geometry: geometry
  });
 ````

 As with all components, we can <a href="XEO.Component.html#changeEvents" class="crosslink">observe and change properties</a> on PointLights like so:

 ````Javascript
 var handle = pointLight.on("color", // Attach a change listener to a property
 function(value) {
        // Property value has changed
    });

 pointLight.color = [0.4, 0.6, 0.4]; // Fires the change listener

 pointLight.off(handle); // Detach the change listener
 ````

 @class PointLight
 @module XEO
 @submodule lighting
 @constructor
 @extends Component
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}Scene{{/crossLink}}, creates this PointLight within the
 default {{#crossLink "Scene"}}Scene{{/crossLink}} when omitted
 @param [cfg] {*} The PointLight configuration
 @param [cfg.id] {String} Optional ID, unique among all components in the parent {{#crossLink "Scene"}}Scene{{/crossLink}}, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this PointLight.
 @param [cfg.pos=[ 1.0, 1.0, 1.0 ]] {Array(Number)} Position, in either World or View space, depending on the value of the **space** parameter.
 @param [cfg.color=[0.7, 0.7, 0.8 ]] {Array(Number)} Color of this PointLight.
 @param [cfg.intensity=1.0] {Number} Intensity of this PointLight.
 @param [cfg.constantAttenuation=0] {Number} Constant attenuation factor.
 @param [cfg.linearAttenuation=0] {Number} Linear attenuation factor.
 @param [cfg.quadraticAttenuation=0] {Number} Quadratic attenuation factor.
 @param [cfg.space="view"] {String} The coordinate system this PointLight is defined in - "view" or "space".
 */
(function () {

    "use strict";

    XEO.PointLight = XEO.Component.extend({

        type: "XEO.PointLight",

        _init: function (cfg) {

            this._state = {
                type: "point",
                pos: [1.0, 1.0, 1.0],
                color: [0.7, 0.7, 0.8],
                intensity:   1.0,

                // Packaging constant, linear and quadratic attenuation terms
                // into an array for easy insertion into shaders as a vec3
                attenuation: [0.0, 0.0, 0.0],
                space: "view"
            };

            this.pos = cfg.pos;
            this.color = cfg.color;
            this.intensity = cfg.intensity;
            this.constantAttenuation = cfg.constantAttenuation;
            this.linearAttenuation = cfg.linearAttenuation;
            this.quadraticAttenuation = cfg.quadraticAttenuation;
            this.space = cfg.space;
        },

        _props: {

            /**
             The position of this PointLight.

             This will be either World- or View-space, depending on the value of {{#crossLink "PointLight/space:property"}}{{/crossLink}}.

             Fires a {{#crossLink "PointLight/pos:event"}}{{/crossLink}} event on change.

             @property pos
             @default [1.0, 1.0, 1.0]
             @type Array(Number)
             */
            pos: {

                set: function (value) {

                    this._state.pos = value || [ 1.0, 1.0, 1.0 ];

                    this._renderer.imageDirty = true;

                    /**
                     Fired whenever this PointLight's  {{#crossLink "PointLight/pos:property"}}{{/crossLink}} property changes.
                     @event pos
                     @param value The property's new value
                     */
                    this.fire("pos", this._state.pos);
                },

                get: function () {
                    return this._state.pos;
                }
            },

            /**
             The color of this PointLight.

             Fires a {{#crossLink "PointLight/color:event"}}{{/crossLink}} event on change.

             @property color
             @default [0.7, 0.7, 0.8]
             @type Array(Number)
             */
            color: {

                set: function (value) {

                    this._state.color = value || [ 0.7, 0.7, 0.8 ];

                    this._renderer.imageDirty = true;

                    /**
                     Fired whenever this PointLight's  {{#crossLink "PointLight/color:property"}}{{/crossLink}} property changes.
                     @event color
                     @param value The property's new value
                     */
                    this.fire("color", this._state.color);
                },

                get: function () {
                    return this._state.color;
                }
            },

            /**
             The intensity of this PointLight.

             Fires a {{#crossLink "PointLight/intensity:event"}}{{/crossLink}} event on change.

             @property intensity
             @default 1.0
             @type Number
             */
            intensity: {

                set: function (value) {

                    value = value !== undefined ? value :  1.0;

                    this._state.intensity = value;

                    this._renderer.imageDirty = true;

                    /**
                     * Fired whenever this PointLight's  {{#crossLink "PointLight/intensity:property"}}{{/crossLink}} property changes.
                     * @event intensity
                     * @param value The property's new value
                     */
                    this.fire("intensity", this._state.intensity);
                },

                get: function () {
                    return this._state.intensity;
                }
            },

            /**
             The constant attenuation factor for this PointLight.

             Fires a {{#crossLink "PointLight/constantAttenuation:event"}}{{/crossLink}} event on change.

             @property constantAttenuation
             @default 0
             @type Number
             */
            constantAttenuation: {

                set: function (value) {

                    this._state.attenuation[0] = value || 0.0;

                    this._renderer.imageDirty = true;

                    /**
                     Fired whenever this PointLight's {{#crossLink "PointLight/constantAttenuation:property"}}{{/crossLink}} property changes.

                     @event constantAttenuation
                     @param value The property's new value
                     */
                    this.fire("constantAttenuation", this._state.attenuation[0]);
                },

                get: function () {
                    return this._state.attenuation[0];
                }
            },

            /**
             The linear attenuation factor for this PointLight.

             Fires a {{#crossLink "PointLight/linearAttenuation:event"}}{{/crossLink}} event on change.

             @property linearAttenuation
             @default 0
             @type Number
             */
            linearAttenuation: {

                set: function (value) {

                    this._state.attenuation[1] = value || 0.0;

                    this._renderer.imageDirty = true;

                    /**
                     Fired whenever this PointLight's  {{#crossLink "PointLight/linearAttenuation:property"}}{{/crossLink}} property changes.

                     @event linearAttenuation
                     @param value The property's new value
                     */
                    this.fire("linearAttenuation", this._state.attenuation[1]);
                },

                get: function () {
                    return this._state.attenuation[1];
                }
            },

            /**
             The quadratic attenuation factor for this Pointlight.

             Fires a {{#crossLink "PointLight/quadraticAttenuation:event"}}{{/crossLink}} event on change.

             @property quadraticAttenuation
             @default 0
             @type Number
             */
            quadraticAttenuation: {

                set: function (value) {

                    this._state.attenuation[2] =  value || 0.0;

                    this._renderer.imageDirty = true;

                    /**
                     Fired whenever this PointLight's {{#crossLink "PointLight/quadraticAttenuation:property"}}{{/crossLink}} property changes.

                     @event quadraticAttenuation
                     @param value The property's new value
                     */
                    this.fire("quadraticAttenuation", this._state.attenuation[2]);
                },

                get: function () {
                    return this._state.attenuation[2];
                }
            },

            /**
             Indicates which coordinate space this PointLight is in.

             Supported values are:

             <ul>
             <li>"view" - View space, aligned within the view volume as if fixed to the viewer's head</li>
             <li>"world" - World space, fixed within the world, moving within the view volume with respect to camera</li>
             </ul>

             Fires a {{#crossLink "PointLight/space:event"}}{{/crossLink}} event on change.

             @property space
             @default "view"
             @type String
             */
            space: {

                set: function (value) {

                    this._state.space = value || "view";

                    this.fire("dirty", true); // Need to rebuild shader

                    /**
                     Fired whenever this Pointlight's  {{#crossLink "PointLight/space:property"}}{{/crossLink}} property changes.

                     @event space
                     @param value The property's new value
                     */
                    this.fire("space", this._state.space);
                },

                get: function () {
                    return this._state.space;
                }
            }
        },

        _getJSON: function () {
            return {
                type: this._state.type,
                pos: this._state.pos,
                color: this._state.color,
                intensity: this._state.intensity,
                constantAttenuation: this._state.attenuation[0],
                linearAttenuation: this._state.attenuation[1],
                quadraticAttenuation: this._state.attenuation[2],
                space: this._state.space
            };
        }
    });

})();
;/**
 * Components to define the surface appearance of GameObjects.
 *
 * @module XEO
 * @submodule materials
 */;/**
 A **Material** defines the surface appearance of attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.

 Material is the base class for:

 <ul>
 <li>{{#crossLink "PBRMaterial"}}{{/crossLink}} - Physically-based rendering (PBR) material.</li>
 <li>{{#crossLink "PhongMaterial"}}{{/crossLink}} - Blinn-Phong shading material.</li>
 <li>(more coming)</li>
 </ul>

 <img src="../../../assets/images/Material.png"></img>

 @class Material
 @module XEO
 @submodule materials
 @constructor
 @extends Component
 */
(function () {

    "use strict";

    XEO.Material = XEO.Component.extend({

        type: "XEO.Material",

        _init: function (cfg) {

        }
    });

})();
;/**
 A **PhongMaterial** is a {{#crossLink "Material"}}{{/crossLink}} that defines the surface appearance of
 attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}} using
 the <a href="http://en.wikipedia.org/wiki/Phong_reflection_model">Phong</a> lighting model.

 ## Overview

 <ul>

 <li>These PhongMaterial properties, along with {{#crossLink "PhongMaterial/emissive:property"}}{{/crossLink}},
 {{#crossLink "PhongMaterial/opacity:property"}}{{/crossLink}} and {{#crossLink "PhongMaterial/reflectivity:property"}}{{/crossLink}},
 specify attributes that are to be **applied uniformly** across the surface of attached {{#crossLink "Geometry"}}Geometries{{/crossLink}}.</li>

 <li>Most of those attributes can be textured, **effectively replacing the values set for those properties**, by
 assigning {{#crossLink "Texture"}}Textures{{/crossLink}} to the PhongMaterial's
 {{#crossLink "PhongMaterial/diffuseMap:property"}}{{/crossLink}}, {{#crossLink "PhongMaterial/specularMap:property"}}{{/crossLink}},
 {{#crossLink "PhongMaterial/emissiveMap:property"}}{{/crossLink}}, {{#crossLink "PhongMaterial/opacityMap:property"}}{{/crossLink}}
 and  {{#crossLink "PhongMaterial/reflectivityMap:property"}}{{/crossLink}} properties.</li>

 <li>For example, the value of {{#crossLink "PhongMaterial/diffuse:property"}}{{/crossLink}} will be ignored if your
 PhongMaterial also has a {{#crossLink "PhongMaterial/diffuseMap:property"}}{{/crossLink}} set to a {{#crossLink "Texture"}}Texture{{/crossLink}}.
 The {{#crossLink "Texture"}}Texture's{{/crossLink}} pixel colors directly provide the diffuse color of each fragment across the
 {{#crossLink "Geometry"}}{{/crossLink}} surface, ie. they are not multiplied by
 the {{#crossLink "PhongMaterial/diffuse:property"}}{{/crossLink}} for each pixel, as is done in many shading systems.</li>

 <li>See <a href="Shader.html#inputs">Shader Inputs</a> for the variables that PhongMaterials create within xeoEngine's shaders.</li>

 </ul>

 <img src="../../../assets/images/Material.png"></img>

 ## Example

 In this example we have

 <ul>
 <li>a {{#crossLink "Texture"}}{{/crossLink}},</li>
 <li>a {{#crossLink "Fresnel"}}{{/crossLink}},</li>
 <li>a {{#crossLink "PhongMaterial"}}{{/crossLink}} which applies the {{#crossLink "Texture"}}{{/crossLink}} as a diffuse map and the {{#crossLink "Fresnel"}}{{/crossLink}} as a specular Fresnel effect,</li>
 <li>a {{#crossLink "Lights"}}{{/crossLink}} containing an {{#crossLink "AmbientLight"}}{{/crossLink}} and a {{#crossLink "DirLight"}}{{/crossLink}},</li>
 <li>a {{#crossLink "Geometry"}}{{/crossLink}} that is the default box shape, and
 <li>a {{#crossLink "GameObject"}}{{/crossLink}} attached to all of the above.</li>
 </ul>

 Note that the value for the {{#crossLink "PhongMaterial"}}PhongMaterial's{{/crossLink}} {{#crossLink "PhongMaterial/diffuse:property"}}{{/crossLink}}
 property is ignored and redundant, since we assign a {{#crossLink "Texture"}}{{/crossLink}} to the
 {{#crossLink "PhongMaterial"}}PhongMaterial's{{/crossLink}} {{#crossLink "PhongMaterial/diffuseMap:property"}}{{/crossLink}} property.
 The {{#crossLink "Texture"}}Texture's{{/crossLink}} pixel colors directly provide the diffuse color of each fragment across the
 {{#crossLink "Geometry"}}{{/crossLink}} surface.

 ```` javascript
 var scene = new XEO.Scene();

 var diffuseMap = new XEO.Texture(scene, {
    src: "diffuseMap.jpg"
 });

 var fresnel = new XEO.Fresnel(scene, {
    leftColor: [1.0, 1.0, 1.0],
    rightColor: [0.0, 0.0, 0.0],
    power: 4
 });

 var material = new XEO.PhongMaterial(scene, {
    ambient:         [0.3, 0.3, 0.3],
    diffuse:         [0.5, 0.5, 0.0],   // Ignored, since we have assigned a Texture to diffuseMap, below
    diffuseMap:      diffuseMap,
    specular:        [1, 1, 1],
    shininess:       30,
    specularFresnel: fresnel
 });

 var ambientLight = new XEO.AmbientLight(scene, {
    color: [0.7, 0.7, 0.7]
 });

 var dirLight = new XEO.DirLight(scene, {
    dir:        [-1, -1, -1],
    color:      [0.5, 0.7, 0.5],
    intensity:  [1.0, 1.0, 1.0],
    space:      "view"
 });

 var lights = new XEO.Lights(scene, {
    lights: [
        ambientLight,
        dirLight
    ]
 });

 var geometry = new XEO.Geometry(scene); // Geometry without parameters will default to a 2x2x2 box.

 var object = new XEO.GameObject(scene, {
    lights: lights,
    material: material,
    geometry: geometry
 });
 ````

 @class PhongMaterial
 @module XEO
 @submodule materials
 @constructor
 @extends Material
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}Scene{{/crossLink}}, creates this PhongMaterial within the
 default {{#crossLink "Scene"}}Scene{{/crossLink}} when omitted
 @param [cfg] {*} The PhongMaterial configuration
 @param [cfg.id] {String} Optional ID, unique among all components in the parent {{#crossLink "Scene"}}Scene{{/crossLink}}, generated automatically when omitted.
 @param [cfg.meta=null] {String:Object} Metadata to attach to this PhongMaterial.
 @param [cfg.ambient=[0.7, 0.7, 0.8 ]] {Array of Number} PhongMaterial ambient color.
 @param [cfg.diffuse=[ 1.0, 1.0, 1.0 ]] {Array of Number} PhongMaterial diffuse color.
 @param [cfg.specular=[ 1.0, 1.0, 1.0 ]] {Array of Number} PhongMaterial specular color.
 @param [cfg.emissive=[ 0.0, 0.0, 0.0 ]] {Array of Number} PhongMaterial emissive color.
 @param [cfg.opacity=1] {Number} Scalar in range 0-1 that controls opacity, where 0 is completely transparent and 1 is completely opaque.
 Only applies while {{#crossLink "Modes"}}Modes{{/crossLink}} {{#crossLink "Modes/transparent:property"}}transparent{{/crossLink}} equals ````true````.
 @param [cfg.shininess=30] {Number} Scalar in range 0-70 that determines the size and sharpness of specular highlights.
 @param [cfg.reflectivity=1] {Number} Scalar in range 0-1 that controls how much {{#crossLink "CubeMap"}}CubeMap{{/crossLink}} is reflected.
 @param [cfg.diffuseMap=null] {Texture} A diffuse map {{#crossLink "Texture"}}Texture{{/crossLink}}, which will override the effect of the diffuse property. Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this PhongMaterial.
 @param [cfg.specularMap=null] {Texture} A specular map {{#crossLink "Texture"}}Texture{{/crossLink}}, which will override the effect of the specular property. Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this PhongMaterial.
 @param [cfg.emissiveMap=null] {Texture} An emissive map {{#crossLink "Texture"}}Texture{{/crossLink}}, which will override the effect of the emissive property. Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this PhongMaterial.
 @param [cfg.normalMap=null] {Texture} A normal map {{#crossLink "Texture"}}Texture{{/crossLink}}. Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this PhongMaterial.
 @param [cfg.opacityMap=null] {Texture} An opacity map {{#crossLink "Texture"}}Texture{{/crossLink}}, which will override the effect of the opacity property. Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this PhongMaterial.
 @param [cfg.reflectivityMap=null] {Texture} A reflectivity control map {{#crossLink "Texture"}}Texture{{/crossLink}}, which will override the effect of the reflectivity property. Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this PhongMaterial.
 @param [cfg.diffuseFresnel=null] {Fresnel} A diffuse {{#crossLink "Fresnel"}}Fresnel{{/crossLink}}.
 @param [cfg.specularFresnel=null] {Fresnel} A specular {{#crossLink "Fresnel"}}Fresnel{{/crossLink}}.
 @param [cfg.emissiveFresnel=null] {Fresnel} An emissive {{#crossLink "Fresnel"}}Fresnel{{/crossLink}}.
 @param [cfg.opacityFresnel=null] {Fresnel} An opacity {{#crossLink "Fresnel"}}Fresnel{{/crossLink}}.
 @param [cfg.reflectivityFresnel=null] {Fresnel} A reflectivity {{#crossLink "Fresnel"}}Fresnel{{/crossLink}}.
 */
(function () {

    "use strict";

    XEO.PhongMaterial = XEO.Material.extend({

        type: "XEO.PhongMaterial",

        _init: function (cfg) {

            this._state = new XEO.renderer.PhongMaterial({

                type: "phongMaterial",

                ambient: [0.7, 0.7, 0.8],
                diffuse: [1.0, 1.0, 1.0],
                specular: [1.0, 1.0, 1.0],
                emissive: [0.0, 0.0, 0.0],

                opacity: 1.0,
                shininess: 30.0,
                reflectivity: 1.0,

                normalMap: null,
                diffuseMap: null,
                specularMap: null,
                emissiveMap: null,
                opacityMap: null,
                reflectivityMap: null,

                diffuseFresnel: null,
                specularFresnel: null,
                emissiveFresnel: null,
                opacityFresnel: null,
                reflectivityFresnel: null,

                hash: null
            });

            this._dirty = true;

            this._components = [];
            this._dirtyComponentSubs = [];
            this._destroyedComponentSubs = [];


            this.ambient = cfg.ambient;
            this.diffuse = cfg.diffuse;
            this.specular = cfg.specular;
            this.emissive = cfg.emissive;

            this.opacity = cfg.opacity;
            this.shininess = cfg.shininess;
            this.reflectivity = cfg.reflectivity;

            this.normalMap = cfg.normalMap;
            this.diffuseMap = cfg.diffuseMap;
            this.specularMap = cfg.specularMap;
            this.emissiveMap = cfg.emissiveMap;
            this.opacityMap = cfg.opacityMap;
            this.reflectivityMap = cfg.reflectivityMap;

            this.diffuseFresnel = cfg.diffuseFresnel;
            this.specularFresnel = cfg.specularFresnel;
            this.emissiveFresnel = cfg.emissiveFresnel;
            this.opacityFresnel = cfg.opacityFresnel;
            this.reflectivityFresnel = cfg.reflectivityFresnel;
        },

        _props: {

            /**
             The PhongMaterial's ambient color.

             Fires a {{#crossLink "PhongMaterial/ambient:event"}}{{/crossLink}} event on change.

             @property ambient
             @default [1.0, 1.0, 1.0]
             @type Array(Number)
             */
            ambient: {

                set: function (value) {

                    this._state.ambient = value || [1.0, 1.0, 1.0];

                    this._renderer.imageDirty = true;

                    /**
                     * Fired whenever this PhongMaterial's {{#crossLink "PhongMaterial/ambient:property"}}{{/crossLink}} property changes.
                     *
                     * @event ambient
                     * @param value {Array(Number)} The property's new value
                     */
                    this.fire("ambient", this._state.ambient);
                },

                get: function () {
                    return this._state.ambient;
                }
            },

            /**
             The PhongMaterial's diffuse color.

             This property may be overridden by {{#crossLink "PhongMaterial/diffuseMap:property"}}{{/crossLink}}.

             Fires a {{#crossLink "PhongMaterial/diffuse:event"}}{{/crossLink}} event on change.

             @property diffuse
             @default [1.0, 1.0, 1.0]
             @type Array(Number)
             */
            diffuse: {

                set: function (value) {

                    this._state.diffuse = value || [1.0, 1.0, 1.0];

                    this._renderer.imageDirty = true;

                    /**
                     * Fired whenever this PhongMaterial's {{#crossLink "PhongMaterial/diffuse:property"}}{{/crossLink}} property changes.
                     *
                     * @event diffuse
                     * @param value {Array(Number)} The property's new value
                     */
                    this.fire("diffuse", this._state.diffuse);
                },

                get: function () {
                    return this._state.diffuse;
                }
            },

            /**
             The material's specular color.

             This property may be overridden by {{#crossLink "PhongMaterial/specularMap:property"}}{{/crossLink}}.

             Fires a {{#crossLink "PhongMaterial/specular:event"}}{{/crossLink}} event on change.

             @property specular
             @default [0.3, 0.3, 0.3]
             @type Array(Number)
             */
            specular: {

                set: function (value) {

                    this._state.specular = value || [0.3, 0.3, 0.3];

                    this._renderer.imageDirty = true;

                    /**
                     Fired whenever this PhongMaterial's {{#crossLink "PhongMaterial/specular:property"}}{{/crossLink}} property changes.

                     @event specular
                     @param value {Array(Number)} The property's new value
                     */
                    this.fire("specular", this._state.specular);
                },

                get: function () {
                    return this._state.specular;
                }
            },

            /**
             The PhongMaterial's emissive color.

             This property may be overridden by {{#crossLink "PhongMaterial/emissiveMap:property"}}{{/crossLink}}.

             Fires a {{#crossLink "PhongMaterial/emissive:event"}}{{/crossLink}} event on change.

             @property emissive
             @default [0.0, 0.0, 0.0]
             @type Array(Number)
             */
            emissive: {

                set: function (value) {

                    this._state.emissive = value || [0.0, 0.0, 0.0];

                    this._renderer.imageDirty = true;

                    /**
                     Fired whenever this PhongMaterial's {{#crossLink "PhongMaterial/emissive:property"}}{{/crossLink}} property changes.

                     @event emissive
                     @param value {Array(Number)} The property's new value
                     */
                    this.fire("emissive", this._state.emissive);
                },

                get: function () {
                    return this._state.emissive;
                }
            },

            /**
             Factor in the range [0..1] indicating how transparent the PhongMaterial is.

             A value of 0.0 indicates fully transparent, 1.0 is fully opaque.

             Attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}} will appear transparent only if they are also attached
             to {{#crossLink "Modes"}}Modes{{/crossLink}} that have {{#crossLink "Modes/transparent:property"}}transparent{{/crossLink}}
             set to **true**.

             This property may be overridden by {{#crossLink "PhongMaterial/opacityMap:property"}}{{/crossLink}}.

             Fires an {{#crossLink "PhongMaterial/opacity:event"}}{{/crossLink}} event on change.

             @property opacity
             @default 1.0
             @type Number
             */
            opacity: {

                set: function (value) {

                    this._state.opacity = (value !== undefined || value !== null) ? value : 1.0;

                    this._renderer.imageDirty = true;

                    /**
                     * Fired whenever this PhongMaterial's {{#crossLink "PhongMaterial/opacity:property"}}{{/crossLink}} property changes.
                     *
                     * @event opacity
                     * @param value {Number} The property's new value
                     */
                    this.fire("opacity", this._state.opacity);
                },

                get: function () {
                    return this._state.opacity;
                }
            },

            /**
             A factor in range [0..128] that determines the size and sharpness of the specular highlights create by this PhongMaterial.

             Larger values produce smaller, sharper highlights. A value of 0.0 gives very large highlights that are almost never
             desirable. Try values close to 10 for a larger, fuzzier highlight and values of 100 or more for a small, sharp
             highlight.

             Fires a {{#crossLink "PhongMaterial/shininess:event"}}{{/crossLink}} event on change.

             @property shininess
             @default 30.0
             @type Number
             */
            shininess: {

                set: function (value) {

                    this._state.shininess = value !== undefined ? value : 30;

                    this._renderer.imageDirty = true;

                    /**
                     Fired whenever this PhongMaterial's {{#crossLink "PhongMaterial/shininess:property"}}{{/crossLink}} property changes.

                     @event shininess
                     @param value Number The property's new value
                     */
                    this.fire("shininess", this._state.shininess);
                },

                get: function () {
                    return this._state.shininess;
                }
            },

            /**
             Scalar in range 0-1 that controls how much {{#crossLink "CubeMap"}}CubeMap{{/crossLink}} is reflected by this PhongMaterial.

             The surface will be non-reflective when this is 0, and completely mirror-like when it is 1.0.

             This property may be overridden by {{#crossLink "PhongMaterial/reflectivityMap:property"}}{{/crossLink}}.

             Fires a {{#crossLink "PhongMaterial/reflectivity:event"}}{{/crossLink}} event on change.

             @property reflectivity
             @default 1.0
             @type Number
             */
            reflectivity: {

                set: function (value) {

                    this._state.reflectivity = value !== undefined ? value : 1.0;

                    this._renderer.imageDirty = true;

                    /**
                     Fired whenever this PhongMaterial's {{#crossLink "PhongMaterial/reflectivity:property"}}{{/crossLink}} property changes.

                     @event reflectivity
                     @param value Number The property's new value
                     */
                    this.fire("reflectivity", this._state.reflectivity);
                },

                get: function () {
                    return this._state.reflectivity;
                }
            },

            /**
             A normal {{#crossLink "Texture"}}{{/crossLink}} attached to this PhongMaterial.

             This property overrides {{#crossLink "PhongMaterial/normalMap:property"}}{{/crossLink}} when not null or undefined.

             Fires a {{#crossLink "PhongMaterial/normalMap:event"}}{{/crossLink}} event on change.

             @property normalMap
             @default null
             @type {Texture}
             */
            normalMap: {

                set: function (texture) {

                    /**
                     Fired whenever this PhongMaterial's {{#crossLink "PhongMaterial/normal:property"}}{{/crossLink}} property changes.

                     @event normalMap
                     @param value Number The property's new value
                     */
                    this._attachComponent("normalMap", texture);
                },

                get: function () {
                    return this._components["normalMap"];
                }
            },

            /**
             A diffuse {{#crossLink "Texture"}}{{/crossLink}} attached to this PhongMaterial.

             This property overrides {{#crossLink "PhongMaterial/diffuseMap:property"}}{{/crossLink}} when not null or undefined.

             Fires a {{#crossLink "PhongMaterial/diffuseMap:event"}}{{/crossLink}} event on change.

             @property diffuseMap
             @default null
             @type {Texture}
             */
            diffuseMap: {

                set: function (texture) {

                    /**
                     Fired whenever this PhongMaterial's {{#crossLink "PhongMaterial/diffuse:property"}}{{/crossLink}} property changes.

                     @event diffuseMap
                     @param value Number The property's new value
                     */
                    this._attachComponent("diffuseMap", texture);
                },

                get: function () {
                    return this._components["diffuseMap"];
                }
            },

            /**
             A specular {{#crossLink "Texture"}}{{/crossLink}} attached to this PhongMaterial.

             This property overrides {{#crossLink "PhongMaterial/specular:property"}}{{/crossLink}} when not null or undefined.

             Fires a {{#crossLink "PhongMaterial/specularMap:event"}}{{/crossLink}} event on change.

             @property specularMap
             @default null
             @type {Texture}
             */
            specularMap: {

                set: function (texture) {

                    /**
                     Fired whenever this PhongMaterial's {{#crossLink "PhongMaterial/specularMap:property"}}{{/crossLink}} property changes.

                     @event specularMap
                     @param value Number The property's new value
                     */
                    this._attachComponent("specularMap", texture);
                },

                get: function () {
                    return this._components["specularMap"];
                }
            },

            /**
             An emissive {{#crossLink "Texture"}}{{/crossLink}} attached to this PhongMaterial.

             This property overrides {{#crossLink "PhongMaterial/emissive:property"}}{{/crossLink}} when not null or undefined.

             Fires an {{#crossLink "PhongMaterial/emissiveMap:event"}}{{/crossLink}} event on change.

             @property emissiveMap
             @default null
             @type {Texture}
             */
            emissiveMap: {

                set: function (texture) {

                    /**
                     Fired whenever this PhongMaterial's {{#crossLink "PhongMaterial/emissiveMap:property"}}{{/crossLink}} property changes.

                     @event emissiveMap
                     @param value Number The property's new value
                     */
                    this._attachComponent("emissiveMap", texture);
                },

                get: function () {
                    return this._components["emissiveMap"];
                }
            },

            /**
             An opacity {{#crossLink "Texture"}}{{/crossLink}} attached to this PhongMaterial.

             This property overrides {{#crossLink "PhongMaterial/opacity:property"}}{{/crossLink}} when not null or undefined.

             Fires an {{#crossLink "PhongMaterial/opacityMap:event"}}{{/crossLink}} event on change.

             @property opacityMap
             @default null
             @type {Texture}
             */
            opacityMap: {

                set: function (texture) {

                    /**
                     Fired whenever this PhongMaterial's {{#crossLink "PhongMaterial/opacityMap:property"}}{{/crossLink}} property changes.

                     @event opacityMap
                     @param value Number The property's new value
                     */
                    this._attachComponent("opacityMap", texture);
                },

                get: function () {
                    return this._components["opacityMap"];
                }
            },

            /**
             A reflectivity {{#crossLink "Texture"}}{{/crossLink}} attached to this PhongMaterial.

             This property overrides {{#crossLink "PhongMaterial/reflectivity:property"}}{{/crossLink}} when not null or undefined.

             Fires a {{#crossLink "PhongMaterial/reflectivityMap:event"}}{{/crossLink}} event on change.

             @property reflectivityMap
             @default null
             @type {Texture}
             */
            reflectivityMap: {

                set: function (texture) {

                    /**
                     Fired whenever this PhongMaterial's {{#crossLink "PhongMaterial/reflectivityMap:property"}}{{/crossLink}} property changes.

                     @event reflectivityMap
                     @param value Number The property's new value
                     */
                    this._attachComponent("reflectivityMap", texture);
                },

                get: function () {
                    return this._components["reflectivityMap"];
                }
            },

            /**
             A diffuse {{#crossLink "Fresnel"}}{{/crossLink}} attached to this PhongMaterial.

             This property overrides {{#crossLink "PhongMaterial/diffuseFresnel:property"}}{{/crossLink}} when not null or undefined.

             Fires a {{#crossLink "PhongMaterial/diffuseFresnel:event"}}{{/crossLink}} event on change.

             @property diffuseFresnel
             @default null
             @type {Fresnel}
             */
            diffuseFresnel: {

                set: function (fresnel) {

                    /**
                     Fired whenever this PhongMaterial's {{#crossLink "PhongMaterial/diffuse:property"}}{{/crossLink}} property changes.

                     @event diffuseFresnel
                     @param value Number The property's new value
                     */
                    this._attachComponent("diffuseFresnel", fresnel);
                },

                get: function () {
                    return this._components["diffuseFresnel"];
                }
            },

            /**
             A specular {{#crossLink "Fresnel"}}{{/crossLink}} attached to this PhongMaterial.

             This property overrides {{#crossLink "PhongMaterial/specular:property"}}{{/crossLink}} when not null or undefined.

             Fires a {{#crossLink "PhongMaterial/specularFresnel:event"}}{{/crossLink}} event on change.

             @property specularFresnel
             @default null
             @type {Fresnel}
             */
            specularFresnel: {

                set: function (fresnel) {

                    /**
                     Fired whenever this PhongMaterial's {{#crossLink "PhongMaterial/specularFresnel:property"}}{{/crossLink}} property changes.

                     @event specularFresnel
                     @param value Number The property's new value
                     */
                    this._attachComponent("specularFresnel", fresnel);
                },

                get: function () {
                    return this._components["specularFresnel"];
                }
            },

            /**
             An emissive {{#crossLink "Fresnel"}}{{/crossLink}} attached to this PhongMaterial.

             This property overrides {{#crossLink "PhongMaterial/emissive:property"}}{{/crossLink}} when not null or undefined.

             Fires an {{#crossLink "PhongMaterial/emissiveFresnel:event"}}{{/crossLink}} event on change.

             @property emissiveFresnel
             @default null
             @type {Fresnel}
             */
            emissiveFresnel: {

                set: function (fresnel) {

                    /**
                     Fired whenever this PhongMaterial's {{#crossLink "PhongMaterial/emissiveFresnel:property"}}{{/crossLink}} property changes.

                     @event emissiveFresnel
                     @param value Number The property's new value
                     */
                    this._attachComponent("emissiveFresnel", fresnel);
                },

                get: function () {
                    return this._components["emissiveFresnel"];
                }
            },

            /**
             An opacity {{#crossLink "Fresnel"}}{{/crossLink}} attached to this PhongMaterial.

             This property overrides {{#crossLink "PhongMaterial/opacity:property"}}{{/crossLink}} when not null or undefined.

             Fires an {{#crossLink "PhongMaterial/opacityFresnel:event"}}{{/crossLink}} event on change.

             @property opacityFresnel
             @default null
             @type {Fresnel}
             */
            opacityFresnel: {

                set: function (fresnel) {

                    /**
                     Fired whenever this PhongMaterial's {{#crossLink "PhongMaterial/opacityFresnel:property"}}{{/crossLink}} property changes.

                     @event opacityFresnel
                     @param value Number The property's new value
                     */
                    this._attachComponent("opacityFresnel", fresnel);
                },

                get: function () {
                    return this._components["opacityFresnel"];
                }
            },

            /**
             A reflectivity {{#crossLink "Fresnel"}}{{/crossLink}} attached to this PhongMaterial.

             This property overrides {{#crossLink "PhongMaterial/reflectivity:property"}}{{/crossLink}} when not null or undefined.

             Fires a {{#crossLink "PhongMaterial/reflectivityFresnel:event"}}{{/crossLink}} event on change.

             @property reflectivityFresnel
             @default null
             @type {Fresnel}
             */
            reflectivityFresnel: {

                set: function (fresnel) {

                    /**
                     Fired whenever this PhongMaterial's {{#crossLink "PhongMaterial/reflectivityFresnel:property"}}{{/crossLink}} property changes.

                     @event reflectivityFresnel
                     @param value Number The property's new value
                     */
                    this._attachComponent("reflectivityFresnel", fresnel);
                },

                get: function () {
                    return this._components["reflectivityFresnel"];
                }
            }
        },

        _attachComponent: function (type, component) {

            if (XEO._isString(component)) {

                // ID given for component - find the component
                var id = component;

                component = this.scene.components[id];

                if (!component) {
                    this.error("Component not found: " + XEO._inQuotes(id));
                    return;
                }
            }

            if (component && component.type !== "XEO.Texture" && component.type !== "XEO.Fresnel") {
                this.error("Component " + XEO._inQuotes(id) + " is not a XEO.Texture or XEO.Fresnel");
                return;
            }

            var oldComponent = this._components[type];

            if (oldComponent) {

                // Replacing old component

                oldComponent.off(this._dirtyComponentSubs[type]);
                oldComponent.off(this._destroyedComponentSubs[type]);

                delete this._components[type];
            }

            var self = this;

            if (component) {

                this._dirtyComponentSubs[type] = component.on("dirty",
                    function () {
                        self.fire("dirty", true);
                    });

                this._destroyedComponentSubs[type] = component.on("destroyed",
                    function () {

                        delete self._dirtyComponentSubs[type];
                        delete self._destroyedComponentSubs[type];

                        self._dirty = true;

                        self.fire("dirty", true);
                        self.fire(type, null);
                    });

                this._components[type] = component;
            }

            this._state[type] = component ? component._state : null;

            this._dirty = true;

            this.fire(type, component || null);
        },

        _compile: function () {

            if (this._dirty) {

                this._makeHash();

                this._dirty = false;
            }

            this._renderer.material = this._state;
        },

        _makeHash: function () {

            var state = this._state;

            var hash = ["/p"]; // 'P' for Phong

            if (state.normalMap) {
                hash.push("/b");
                if (state.normalMap.matrix) {
                    hash.push("/mat");
                }
            }

            if (state.diffuseMap) {
                hash.push("/d");
                if (state.diffuseMap.matrix) {
                    hash.push("/mat");
                }
            }

            if (state.specularMap) {
                hash.push("/s");
                if (state.specularMap.matrix) {
                    hash.push("/mat");
                }
            }

            if (state.emissiveMap) {
                hash.push("/e");
                if (state.emissiveMap.matrix) {
                    hash.push("/mat");
                }
            }

            if (state.opacityMap) {
                hash.push("/o");
                if (state.opacityMap.matrix) {
                    hash.push("/mat");
                }
            }

            if (state.reflectivityMap) {
                hash.push("/r");
                if (state.reflectivityMap.matrix) {
                    hash.push("/mat");
                }
            }

            if (state.diffuseFresnel) {
                hash.push("/df");
            }

            if (state.specularFresnel) {
                hash.push("/sf");
            }

            if (state.emissiveFresnel) {
                hash.push("/ef");
            }

            if (state.opacityFresnel) {
                hash.push("/of");
            }

            if (state.reflectivityFresnel) {
                hash.push("/rf");
            }

            hash.push(";");

            state.hash = hash.join("");
        },

        _getJSON: function () {

            var json = {

                // Colors

                ambient: this._state.ambient,
                diffuse: this._state.diffuse,
                specular: this._state.specular,
                emissive: this._state.emissive,

                // Factors

                opacity: this._state.opacity,
                shininess: this._state.shininess,
                reflectivity: this._state.reflectivity
            };

            // Textures

            var components = this._components;

            if (components.normalMap) {
                json.normalMap = components.normalMap.id;
            }

            if (components.diffuseMap) {
                json.diffuseMap = components.diffuseMap.id;
            }

            if (components.specularMap) {
                json.specularMap = components.specularMap.id;
            }

            if (components.emissiveMap) {
                json.emissiveMap = components.emissiveMap.id;
            }

            if (components.opacityMap) {
                json.opacityMap = components.opacityMap.id;
            }

            if (components.reflectivityMap) {
                json.reflectivityMap = components.reflectivityMap.id;
            }

            if (components.diffuseFresnel) {
                json.diffuseFresnel = components.diffuseFresnel.id;
            }

            if (components.specularFresnel) {
                json.specularFresnel = components.specularFresnel.id;
            }

            if (components.emissiveFresnel) {
                json.emissiveFresnel = components.emissiveFresnel.id;
            }

            if (components.opacityFresnel) {
                json.opacityFresnel = components.opacityFresnel.id;
            }

            if (components.reflectivityFresnel) {
                json.reflectivityFresnel = components.reflectivityFresnel.id;
            }

            return json;
        },

        _destroy: function () {
            this._state.destroy();
        }
    });

})();
;/**
 A **PBRMaterial** is a {{#crossLink "Material"}}{{/crossLink}} that defines the appearance of
 attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}} using a physically-based rendering model.

 ## Overview

 <ul>
 <li>Physically Based Rendering (PBR) is a method of shading and rendering that provides a more accurate representation
 of how light interacts with surfaces. It can be referred to as Physically Based Rendering (PBR) or Physically Based Shading (PBS).
 Depending on what aspect of the pipeline is being discussed, PBS is usually specific to shading concepts and PBR specific
 to rendering and lighting. However, both terms describe on a whole, the process of representing assets from a physically
 accurate standpoint. - *Wes McDermott, Allegorithmic PBR Guide, Vol. 2*</li>
 <li>The xeoEngine PBRMaterial is based on the once used in [Unreal Engine](https://docs.unrealengine.com/latest/INT/Engine/Rendering/Materials/PhysicallyBased/index.html)</li>
 </ul>

 <img src="../../../assets/images/PBRMaterial.png"></img>

 ### Material attributes

 * **{{#crossLink "PBRMaterial/metallic:property"}}{{/crossLink}}** - degree of metallicity in range ````[0..1]````, where ````0```` is fully dialectric (non-metal) and ````1```` is fully metallic.
 * **{{#crossLink "PBRMaterial/color:property"}}{{/crossLink}}** - base color.
 * **{{#crossLink "PBRMaterial/colorMap:property"}}{{/crossLink}}** - color map {{#crossLink "Texture"}}{{/crossLink}} to replace {{#crossLink "PBRMaterial/color:property"}}{{/crossLink}}.
 * **{{#crossLink "PBRMaterial/emissive:property"}}{{/crossLink}}** - emissive color.
 * **{{#crossLink "PBRMaterial/emissiveMap:property"}}{{/crossLink}}** - emissive map {{#crossLink "Texture"}}{{/crossLink}} to replace {{#crossLink "PBRMaterial/emissive:property"}}{{/crossLink}}.
 * **{{#crossLink "PBRMaterial/opacity:property"}}{{/crossLink}}** - opacity in range ````[0..1]````.
 * **{{#crossLink "PBRMaterial/opacityMap:property"}}{{/crossLink}}** - opacity map {{#crossLink "Texture"}}{{/crossLink}} to replace {{#crossLink "PBRMaterial/opacity:property"}}{{/crossLink}}.
 * **{{#crossLink "PBRMaterial/roughness:property"}}{{/crossLink}}** - surface roughness in range ````[0..1]````, where ````0```` is 100% smooth and ````1```` is 100% rough.
 * **{{#crossLink "PBRMaterial/roughnessMap:property"}}{{/crossLink}}** - roughness map {{#crossLink "Texture"}}{{/crossLink}} to replace {{#crossLink "PBRMaterial/roughness:property"}}{{/crossLink}}.
 * **{{#crossLink "PBRMaterial/normalMap:property"}}{{/crossLink}}** - normal map {{#crossLink "Texture"}}{{/crossLink}}.
 * **{{#crossLink "PBRMaterial/specular:property"}}{{/crossLink}}** - specular reflection color.
 * **{{#crossLink "PBRMaterial/specularMap:property"}}{{/crossLink}}** - specular map {{#crossLink "Texture"}}{{/crossLink}} to replace {{#crossLink "PBRMaterial/specular:property"}}{{/crossLink}}.


 ## Example 1: Non-metallic material

 In this example we have

 <ul>
 <li>a dialectric (non-metallic) PBRMaterial,</li>
 <li>a {{#crossLink "Geometry"}}{{/crossLink}} that is the default box shape, and
 <li>a {{#crossLink "GameObject"}}{{/crossLink}} attached to all of the above.</li>
 </ul>


 ```` javascript
 var scene = new XEO.Scene();

 var material1 = new XEO.PBRMaterial(scene, {
    metallic: 0.0, // Default
    color: [1.0, 0.8, 0.0],
    specular: [1.0, 1.0, 1.0]
 });

 var geometry = new XEO.Geometry(scene);  // Default box

 var object = new XEO.GameObject(scene, {
    material: material1,
    geometry: geometry
 });
 ````

 ## Example 2: Metallic material

 ```` javascript
 var material2 = new XEO.PBRMaterial(scene, {
    metallic: 1.0,
    color: [1.0, 0.8, 0.0],
    roughness: 0.3
 });
 ````

 ## Example 3: Metallic material with color map

 ```` javascript
 var colorMap = new XEO.Texture(scene, {
    src: "colorMap.jpg"
 });

 var material3 = new XEO.PBRMaterial(scene, {
    metallic: 1.0,
    colorMap: colorMap,
    roughness: 0.3
 });
 ````

 @class PBRMaterial
 @module XEO
 @submodule materials
 @constructor
 @extends Material
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}Scene{{/crossLink}}, creates this PBRMaterial within the
 default {{#crossLink "Scene"}}Scene{{/crossLink}} when omitted
 @param [cfg] {*} The PBRMaterial configuration
 @param [cfg.id] {String} Optional ID, unique among all components in the parent {{#crossLink "Scene"}}Scene{{/crossLink}}, generated automatically when omitted.
 @param [cfg.meta=null] {String:Object} Metadata to attach to this PBRMaterial.
 @param [cfg.metallic=0.0] {Number} Scalar in range 0-1 that controls how metallic the PBRMaterial is.
 @param [cfg.color=[ 1.0, 1.0, 1.0 ]] {Array of Number} Base color.
 @param [cfg.colorMap=null] {Texture} A color map {{#crossLink "Texture"}}Texture{{/crossLink}}, which will override the effect of the color property. Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this PBRMaterial.
 @param [cfg.emissive=[ 1.0, 1.0, 1.0 ]] {Array of Number} Emissive color.
 @param [cfg.emissiveMap=null] {Texture} An emissive map {{#crossLink "Texture"}}Texture{{/crossLink}}, which will override the effect of the emissive property. Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this PBRMaterial.
 @param [cfg.opacity=1] {Number} Scalar in range 0-1 that controls opacity, where 0 is completely transparent and 1 is completely opaque. Only applies while {{#crossLink "Modes"}}Modes{{/crossLink}} {{#crossLink "Modes/transparent:property"}}transparent{{/crossLink}} equals ````true````.
 @param [cfg.opacityMap=null] {Texture} An opacity map {{#crossLink "Texture"}}Texture{{/crossLink}}, which will override the effect of the opacity property. Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this PBRMaterial.
 @param [cfg.roughness=0.0] {Number} Scalar in range 0-1 that controls roughness, where 0 is 100% glossiness and 1 is 100% roughness.
 @param [cfg.roughnessMap=null] {Texture} A roughness map {{#crossLink "Texture"}}Texture{{/crossLink}}, which will override the effect of the roughness property. Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this PBRMaterial.
 @param [cfg.normalMap=null] {Texture} A normal map {{#crossLink "Texture"}}Texture{{/crossLink}}. Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this PBRMaterial.
 @param [cfg.specular=[ 1.0, 1.0, 1.0 ]] {Array of Number} Specular color.
 @param [cfg.specularMap=null] {Texture} A specular map {{#crossLink "Texture"}}Texture{{/crossLink}}, which will override the effect of the specular property. Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this PBRMaterial.
 */
(function () {

    "use strict";

    XEO.PBRMaterial = XEO.Material.extend({

        type: "XEO.PBRMaterial",

        _init: function (cfg) {

            this._state = new XEO.renderer.PBRMaterial({

                type: "pbrMaterial",

                // (0.0) for non-metal and (1.0) for raw metal
                metallic: 0.0,

                // Base color
                color: [1.0, 1.0, 1.0],
                colorMap: null,

                // Emissive color
                emissive: [1.0, 1.0, 1.0],
                emissiveMap: null,

                // Opacity
                opacity: 1.0,
                opacityMap: null,

                // Roughness
                roughness: 0.0,
                roughnessMap: null,

                // Bumpiness
                normalMap: null,

                // Specular reflectance
                specular: [1.0, 1.0, 1.0],
                specularMap: null,

                // True when state needs rebuild
                dirty: true,

                hash: null
            });


            this._components = [];
            this._dirtyComponentSubs = [];
            this._destroyedComponentSubs = [];

            this.metallic = cfg.metallic;

            this.color = cfg.color;
            this.colorMap = cfg.colorMap;

            this.emissive = cfg.emissive;
            this.emissiveMap = cfg.emissiveMap;

            this.opacity = cfg.opacity;
            this.opacityMap = cfg.opacityMap;

            this.roughness = cfg.roughness;
            this.roughnessMap = cfg.roughnessMap;

            this.normalMap = cfg.normalMap;

            this.specular = cfg.specular;
            this.specularMap = cfg.specularMap;
        },

        _props: {

            /**
             Controls how metallic this material is.

             Nonmetals have a value of ````0````, while metals have a value of ````1````. For pure surfaces, such as
             pure metal, pure stone, pure plastic, etc. this value will be 0 or 1, not anything in between. When
             creating hybrid surfaces like corroded, dusty, or rusty metals, you may find that you need some value
             between 0 and 1.

             Fires a {{#crossLink "PBRMaterial/metallic:event"}}{{/crossLink}} event on change.

             @property metallic
             @default 0.0
             @type Number
             */
            metallic: {

                set: function (value) {

                    this._state.metallic = value !== undefined ? value : 0;

                    this._renderer.imageDirty = true;

                    /**
                     Fired whenever this PBRMaterial's {{#crossLink "PBRMaterial/metallic:property"}}{{/crossLink}} property changes.

                     @event metallic
                     @param value Number The property's new value
                     */
                    this.fire("metallic", this._state.metallic);
                },

                get: function () {
                    return this._state.metallic;
                }
            },

            /**
             Base color of this material.

             This property may be overridden by {{#crossLink "PBRMaterial/colorMap:property"}}{{/crossLink}}.

             Fires a {{#crossLink "PBRMaterial/color:event"}}{{/crossLink}} event on change.

             @property color
             @default [1.0, 1.0, 1.0]
             @type Array(Number)
             */
            color: {

                set: function (value) {

                    this._state.color = value || [1.0, 1.0, 1.0];

                    this._renderer.imageDirty = true;

                    /**
                     * Fired whenever this PBRMaterial's {{#crossLink "PBRMaterial/color:property"}}{{/crossLink}} property changes.
                     *
                     * @event color
                     * @param value {Array(Number)} The property's new value
                     */
                    this.fire("color", this._state.color);
                },

                get: function () {
                    return this._state.color;
                }
            },

            /**
             Color {{#crossLink "Texture"}}{{/crossLink}}, to apply instead of {{#crossLink "PBRMaterial/color:property"}}{{/crossLink}}.

             Fires a {{#crossLink "PBRMaterial/colorMap:event"}}{{/crossLink}} event on change.

             @property colorMap
             @default null
             @type {Texture}
             */
            colorMap: {

                set: function (texture) {

                    /**
                     Fired whenever this PBRMaterial's {{#crossLink "PBRMaterial/color:property"}}{{/crossLink}} property changes.

                     @event colorMap
                     @param value Number The property's new value
                     */
                    this._attachComponent("colorMap", texture);
                },

                get: function () {
                    return this._components["colorMap"];
                }
            },

            /**
             Emissive color of this material.

             This property may be overridden by {{#crossLink "PBRMaterial/emissiveMap:property"}}{{/crossLink}}.

             Fires an {{#crossLink "PBRMaterial/emissive:event"}}{{/crossLink}} event on change.

             @property emissive
             @default [1.0, 1.0, 1.0]
             @type Array(Number)
             */
            emissive: {

                set: function (value) {

                    this._state.emissive = value || [1.0, 1.0, 1.0];

                    this._renderer.imageDirty = true;

                    /**
                     Fired whenever this PBRMaterial's {{#crossLink "PBRMaterial/emissive:property"}}{{/crossLink}} property changes.

                     @event emissive
                     @param value {Array(Number)} The property's new value
                     */
                    this.fire("emissive", this._state.emissive);
                },

                get: function () {
                    return this._state.emissive;
                }
            },

            /**
             Emissive {{#crossLink "Texture"}}{{/crossLink}}, to apply instead of {{#crossLink "PBRMaterial/emissive:property"}}{{/crossLink}}.

             Fires an {{#crossLink "PBRMaterial/emissiveMap:event"}}{{/crossLink}} event on change.

             @property emissiveMap
             @default null
             @type {Texture}
             */
            emissiveMap: {

                set: function (texture) {

                    /**
                     Fired whenever this PBRMaterial's {{#crossLink "PBRMaterial/emissiveMap:property"}}{{/crossLink}} property changes.

                     @event emissiveMap
                     @param value Number The property's new value
                     */
                    this._attachComponent("emissiveMap", texture);
                },

                get: function () {
                    return this._components["emissiveMap"];
                }
            },

            /**
             Opacity of this material.

             Opacity is a value in the range [0..1], in which 0 is fully transparent and 1.0 is fully opaque.

             This property may be overidden by {{#crossLink "PBRMaterial/opacityMap:property"}}{{/crossLink}}.

             Attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}} will appear transparent only if they are also attached
             to {{#crossLink "Modes"}}Modes{{/crossLink}} that have {{#crossLink "Modes/transparent:property"}}transparent{{/crossLink}}
             set to **true**.

             Fires an {{#crossLink "PBRMaterial/opacity:event"}}{{/crossLink}} event on change.

             @property opacity
             @default 1.0
             @type Number
             */
            opacity: {

                set: function (value) {

                    this._state.opacity = (value !== undefined || value !== null) ? value : 1.0;

                    this._renderer.imageDirty = true;

                    /**
                     * Fired whenever this PBRMaterial's {{#crossLink "PBRMaterial/opacity:property"}}{{/crossLink}} property changes.
                     *
                     * @event opacity
                     * @param value {Number} The property's new value
                     */
                    this.fire("opacity", this._state.opacity);
                },

                get: function () {
                    return this._state.opacity;
                }
            },

            /**
             Opacity {{#crossLink "Texture"}}{{/crossLink}}, to apply instead of {{#crossLink "PBRMaterial/opacity:property"}}{{/crossLink}}.

             Fires an {{#crossLink "PBRMaterial/opacityMap:event"}}{{/crossLink}} event on change.

             @property opacityMap
             @default null
             @type {Texture}
             */
            opacityMap: {

                set: function (texture) {

                    /**
                     Fired whenever this PBRMaterial's {{#crossLink "PBRMaterial/opacityMap:property"}}{{/crossLink}} property changes.

                     @event opacityMap
                     @param value Number The property's new value
                     */
                    this._attachComponent("opacityMap", texture);
                },

                get: function () {
                    return this._components["opacityMap"];
                }
            },

            /**
             A factor in range [0..1] that indicates the surface roughness of this PBRMaterial.

             A value of ````0```` is a mirrow reflection, while ````1```` is completely matte.

             This property may be overidden by {{#crossLink "PBRMaterial/roughnessMap:property"}}{{/crossLink}}.

             Fires a {{#crossLink "PBRMaterial/roughness:event"}}{{/crossLink}} event on change.

             @property roughness
             @default 0.0
             @type Number
             */
            roughness: {

                set: function (value) {

                    this._state.roughness = value !== undefined ? value : 0;

                    this._renderer.imageDirty = true;

                    /**
                     Fired whenever this PBRMaterial's {{#crossLink "PBRMaterial/roughness:property"}}{{/crossLink}} property changes.

                     @event roughness
                     @param value Number The property's new value
                     */
                    this.fire("roughness", this._state.roughness);
                },

                get: function () {
                    return this._state.roughness;
                }
            },

            /**
             Roughness {{#crossLink "Texture"}}{{/crossLink}}, to apply instead of {{#crossLink "PBRMaterial/roughness:property"}}{{/crossLink}}.

             Fires an {{#crossLink "PBRMaterial/roughnessMap:event"}}{{/crossLink}} event on change.

             @property roughnessMap
             @default null
             @type {Texture}
             */
            roughnessMap: {

                set: function (texture) {

                    /**
                     Fired whenever this PBRMaterial's {{#crossLink "PBRMaterial/roughnessMap:property"}}{{/crossLink}} property changes.

                     @event roughnessMap
                     @param value Number The property's new value
                     */
                    this._attachComponent("roughnessMap", texture);
                },

                get: function () {
                    return this._components["roughnessMap"];
                }
            },

            /**
             A normal map {{#crossLink "Texture"}}{{/crossLink}}.

             Fires a {{#crossLink "PBRMaterial/normalMap:event"}}{{/crossLink}} event on change.

             @property normalMap
             @default null
             @type {Texture}
             */
            normalMap: {

                set: function (texture) {

                    /**
                     Fired whenever this PBRMaterial's {{#crossLink "PBRMaterial/normal:property"}}{{/crossLink}} property changes.

                     @event normalMap
                     @param value Number The property's new value
                     */
                    this._attachComponent("normalMap", texture);
                },

                get: function () {
                    return this._components["normalMap"];
                }
            },

            /**
             Specular color of this material.

             This property may be overridden by {{#crossLink "PBRMaterial/specularMap:property"}}{{/crossLink}}.

             Fires a {{#crossLink "PBRMaterial/specular:event"}}{{/crossLink}} event on change.

             @property specular
             @default [0.3, 0.3, 0.3]
             @type Array(Number)
             */
            specular: {

                set: function (value) {

                    this._state.specular = value || [0.3, 0.3, 0.3];

                    this._renderer.imageDirty = true;

                    /**
                     Fired whenever this PBRMaterial's {{#crossLink "PBRMaterial/specular:property"}}{{/crossLink}} property changes.

                     @event specular
                     @param value {Array(Number)} The property's new value
                     */
                    this.fire("specular", this._state.specular);
                },

                get: function () {
                    return this._state.specular;
                }
            },


            /**
             Specular {{#crossLink "Texture"}}{{/crossLink}}, to apply instead of {{#crossLink "PBRMaterial/specular:property"}}{{/crossLink}}.

             Fires a {{#crossLink "PBRMaterial/specularMap:event"}}{{/crossLink}} event on change.

             @property specularMap
             @default null
             @type {Texture}
             */
            specularMap: {

                set: function (texture) {

                    /**
                     Fired whenever this PBRMaterial's {{#crossLink "PBRMaterial/specularMap:property"}}{{/crossLink}} property changes.

                     @event specularMap
                     @param value Number The property's new value
                     */
                    this._attachComponent("specularMap", texture);
                },

                get: function () {
                    return this._components["specularMap"];
                }
            }
        },

        _attachComponent: function (type, component) {

            if (XEO._isString(component)) {

                // ID given for component - find the component 
                var id = component;

                component = this.scene.components[id];

                if (!component) {
                    this.error("Component not found: " + XEO._inQuotes(id));
                    return;
                }
            }

            if (component && component.type !== "XEO.Texture" && component.type !== "XEO.Fresnel") {
                this.error("Component " +XEO._inQuotes(id) + " is not a XEO.Texture or XEO.Fresnel");
                return;
            }

            var oldComponent = this._components[type];

            if (oldComponent) {

                // Replacing old component

                oldComponent.off(this._dirtyComponentSubs[type]);
                oldComponent.off(this._destroyedComponentSubs[type]);

                delete this._components[type];
            }

            var self = this;

            if (component) {

                this._dirtyComponentSubs[type] = component.on("dirty",
                    function () {
                        self.fire("dirty", true);
                    });

                this._destroyedComponentSubs[type] = component.on("destroyed",
                    function () {

                        delete self._dirtyComponentSubs[type];
                        delete self._destroyedComponentSubs[type];

                        self._state.dirty = true;

                        self.fire("dirty", true);
                        self.fire(type, null);
                    });

                this._components[type] = component;
            }

            this._state[type] = component ? component._state : null;

            this._state.dirty = true;

            this.fire(type, component || null);
        },

        _compile: function () {

            if (this._state.dirty) {

                this._makeHash();

                this._state.dirty = false;
            }

            this._renderer.material = this._state;
        },

        _makeHash: function () {

            var state = this._state;

            var hash = [];

            if (state.colorMap) {
                hash.push("/c");
                if (state.colorMap.matrix) {
                    hash.push("/anim");
                }
            }

            if (state.emissiveMap) {
                hash.push("/e");
                if (state.emissiveMap.matrix) {
                    hash.push("/anim");
                }
            }

            if (state.opacityMap) {
                hash.push("/o");
                if (state.opacityMap.matrix) {
                    hash.push("/anim");
                }
            }

            if (state.roughnessMap) {
                hash.push("/r");
                if (state.roughnessMap.matrix) {
                    hash.push("/anim");
                }
            }

            if (state.normalMap) {
                hash.push("/b");
                if (state.normalMap.matrix) {
                    hash.push("/anim");
                }
            }

            hash.push(";");

            state.hash = hash.join("");
        },

        _getJSON: function () {

            var components = this._components;

            var json = {};

            // Common

            json.color = this._state.color;

            if (components.colorMap) {
                json.colorMap = components.colorMap.id;
            }

            json.emissive = this._state.emissive;

            if (components.emissiveMap) {
                json.emissiveMap = components.emissiveMap.id;
            }

            json.opacity = this._state.opacity;

            if (components.opacityMap) {
                json.opacityMap = components.opacityMap.id;
            }

            json.roughness = this._state.roughness;

            if (components.roughnessMap) {
                json.roughnessMap = components.roughnessMap.id;
            }

            if (components.normalMap) {
                json.normalMap = components.normalMap.id;
            }

            json.metallic = this._state.metallic;

            json.specular = this.specular;

            if (components.specularMap) {
                json.specularMap = components.specularMap.id;
            }

            return json;
        },

        _destroy: function () {
            this._state.destroy();
        }
    });

})();;/**
 A **Texture** specifies a texture map.

 ## Overview

 <ul>
 <li>Textures are grouped within {{#crossLink "Material"}}Material{{/crossLink}}s, which are attached to
 {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.</li>
 <li>To create a Texture from an image file, set the Texture's {{#crossLink "Texture/src:property"}}{{/crossLink}}
 property to the image file path.</li>
 <li>To create a Texture from an HTML DOM Image object, set the Texture's {{#crossLink "Texture/image:property"}}{{/crossLink}}
 property to the object.</li>
 <li>To render color images of {{#crossLink "GameObject"}}GameObjects{{/crossLink}} to a Texture, set the Texture's {{#crossLink "Texture/target:property"}}{{/crossLink}}
 property to a {{#crossLink "ColorTarget"}}ColorTarget{{/crossLink}} that is attached to those {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.</li>
 <li>Similarly, to render depth images of {{#crossLink "GameObject"}}GameObjects{{/crossLink}} to a Texture, set the Texture's {{#crossLink "Texture/target:property"}}{{/crossLink}}
 property to a {{#crossLink "DepthTarget"}}DepthTarget{{/crossLink}} that is attached to those {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.</li>
 <li>For special effects, we often use rendered Textures in combination with {{#crossLink "Shader"}}Shaders{{/crossLink}} and {{#crossLink "Stage"}}Stages{{/crossLink}}.</li>
 <li>See <a href="Shader.html#inputs">Shader Inputs</a> for the variables that Textures create within xeoEngine's shaders.</li>
 </ul>

 <img src="../../../assets/images/Texture.png"></img>

 ## Example

 The example below has:
 <ul>
 <li>three Textures,</li>
 <li>a {{#crossLink "PhongMaterial"}}{{/crossLink}} which applies the {{#crossLink "Texture"}}{{/crossLink}}s as diffuse, normal and specular maps,</li>
 <li>a {{#crossLink "Lights"}}{{/crossLink}} containing an {{#crossLink "AmbientLight"}}{{/crossLink}} and a {{#crossLink "PointLight"}}{{/crossLink}},</li>
 <li>a {{#crossLink "Geometry"}}{{/crossLink}} that has the default box shape, and
 <li>a {{#crossLink "GameObject"}}{{/crossLink}} attached to all of the above.</li>
 </ul>

 ```` javascript
 var scene = new XEO.Scene();

 var texture1 = new XEO.Texture(scene, {
    src: "diffuseMap.jpg"
});

 var texture2 = new XEO.Texture(scene, {
    src: "normalMap.jpg"
});

 var texture3 = new XEO.Texture(scene, {
    src: "specularMap.jpg"
});

 var material = new XEO.PhongMaterial(scene, {
    ambient: [0.3, 0.3, 0.3],
    shininess: 30,
    diffuseMap: texture1,
    normalMap: texture2,
    specularMap: texture3
});

 var light1 = new XEO.PointLight(scene, {
    pos: [0, 100, 100],
    color: [0.5, 0.7, 0.5]
});

 var light2 = new XEO.AmbientLight(scene, {
    color: [0.5, 0.7, 0.5]
});

 var lights = new XEO.Lights(scene, {
    lights: [
        light1,
        light2
    ]
});

 // Geometry without parameters will default to a 2x2x2 box.
 var geometry = new XEO.Geometry(scene);

 var object = new XEO.GameObject(scene, {
    lights: lights,
    material: material,
    geometry: geometry
});
 ````
 @class Texture
 @module XEO
 @submodule materials
 @constructor
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}Scene{{/crossLink}} - creates this Texture in the default
 {{#crossLink "Scene"}}Scene{{/crossLink}} when omitted.
 @param [cfg] {*} Configs
 @param [cfg.id] {String} Optional ID for this Texture, unique among all components in the parent scene, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this Texture.
 @param [cfg.src=null] {String} Path to image file to load into this Texture. See the {{#crossLink "Texture/src:property"}}{{/crossLink}} property for more info.
 @param [cfg.image=null] {HTMLImageElement} HTML Image object to load into this Texture. See the {{#crossLink "Texture/image:property"}}{{/crossLink}} property for more info.
 @param [cfg.target=null] {String | XEO.ColorTarget | XEO.DepthTarget} Instance or ID of a {{#crossLink "ColorTarget"}}ColorTarget{{/crossLink}} or
 {{#crossLink "DepthTarget"}}DepthTarget{{/crossLink}} to source this Texture from. See the {{#crossLink "Texture/target:property"}}{{/crossLink}} property for more info.
 @param [cfg.minFilter="linearMipmapLinear"] {String} How the texture is sampled when a texel covers less than one pixel. See the {{#crossLink "Texture/minFilter:property"}}{{/crossLink}} property for more info.
 @param [cfg.magFilter="linear"] {String} How the texture is sampled when a texel covers more than one pixel. See the {{#crossLink "Texture/magFilter:property"}}{{/crossLink}} property for more info.
 @param [cfg.wrapS="repeat"] {String} Wrap parameter for texture coordinate *S*. See the {{#crossLink "Texture/wrapS:property"}}{{/crossLink}} property for more info.
 @param [cfg.wrapT="repeat"] {String} Wrap parameter for texture coordinate *S*. See the {{#crossLink "Texture/wrapT:property"}}{{/crossLink}} property for more info.
 @param [cfg.flipY=true] {Boolean} Flips the image's Y axis to match the WebGL texture coordinate space. See the {{#crossLink "Texture/flipY:property"}}{{/crossLink}} property for more info.
 @param [cfg.translate=[0,0]] {Array of Number} 2D translation vector that will be added to texture's *S* and *T* coordinates.
 @param [cfg.scale=[1,1]] {Array of Number} 2D scaling vector that will be applied to texture's *S* and *T* coordinates.
 @param [cfg.rotate=0] {Number} Rotation, in degrees, that will be applied to texture's *S* and *T* coordinates.
 @extends Component
 */
(function () {

    "use strict";

    XEO.Texture = XEO.Component.extend({

        type: "XEO.Texture",

        _init: function (cfg) {

            // Rendering state

            this._state = new XEO.renderer.Texture({
                texture: null,
                matrix: null
            });

            // Data source

            this._src = null;
            this._image = null;
            this._target = null;

            // Transformation

            this._translate = [0, 0];
            this._scale = [1, 1];
            this._rotate = [0, 0];

            // Texture properties

            this._minFilter = null;
            this._magFilter = null;
            this._wrapS = null;
            this._wrapT = null;
            this._flipY = null;

            // Dirty flags

            this._dirty = true;
            this._matrixDirty = true;
            this._srcDirty = false;
            this._imageDirty = false;
            this._targetDirty = false;
            this._propsDirty = true;

            var self = this;

            // Handle WebGL context restore

            this._webglContextRestored = this.scene.canvas.on(
                "webglContextRestored",
                function () {

                    self._state.texture = null;

                    self._matrixDirty = true;
                    self._propsDirty = true;

                    if (self._image) {
                        self._imageDirty = true;

                    } else if (self._src) {
                        self._srcDirty = true;

                    } else if (self._target) {
                        self._targetDirty = true;
                    }

                    self._scheduleBuild();
                });

            // Transform

            this.translate = cfg.translate;
            this.scale = cfg.scale;
            this.rotate = cfg.rotate;

            // Data source

            if (cfg.src) {
                this.src = cfg.src; // Image file

            } else if (cfg.image) {
                this.image = cfg.image; // Image object

            } else if (cfg.target) {
                this.target = cfg.target; // Render target
            }

            // Properties

            this.minFilter = cfg.minFilter;
            this.magFilter = cfg.magFilter;
            this.wrapS = cfg.wrapS;
            this.wrapT = cfg.wrapT;
            this.flipY = cfg.flipY;

            this.scene.stats.inc("textures");
        },

        // Schedules a call to #_build for the next "tick"
        _scheduleBuild: function () {

            if (!this._dirty) {

                this._dirty = true;

                var self = this;

                this.scene.once("tick",
                    function () {
                        self._build();
                    });
            }
        },

        _build: function () {

            var gl = this.scene.canvas.gl;

            var state = this._state;

            if (!state.texture) {
                state.texture = new XEO.renderer.webgl.Texture2D(gl);
            }

            if (this._srcDirty) {
                if (this._src) {
                    this._loadSrc(this._src);
                    this._srcDirty = false;
                    return;
                }
            }

            if (this._imageDirty) {
                if (this._image) {
                    state.texture.setImage(this._image);
                    this._imageDirty = false;
                }
            }

            if (this._targetDirty) {

                // TODO: destroy texture only if created for this state,
                // don't destroy texture belong to a previous target

                this._targetDirty = false;
            }

            if (this._matrixDirty) {

                var matrix;

                var t;

                if (this._translate[0] !== 0 || this._translate[2] !== 0) {
                    matrix = XEO.math.translationMat4v([this._translate[0], this._translate[0], 0]);
                }

                if (this._scale[0] !== 1 || this._scale[1] !== 1) {
                    t = XEO.math.scalingMat4v([this._scale[0], this._scale[1], 1]);
                    matrix = matrix ? XEO.math.mulMat4(matrix, t) : t;
                }

                if (this._rotate !== 0) {
                    t = XEO.math.rotationMat4v(this._rotate * 0.0174532925, [0, 0, 1]);
                    matrix = matrix ? XEO.math.mulMat4(matrix, t) : t;
                }

                if (matrix) {
                    state.matrix = matrix;
                }

                this._matrixDirty = false;
            }

            if (this._propsDirty) {
                state.texture.setProps(state);
                this._propsDirty = false;
            }

            this._renderer.imageDirty = true;

            this._dirty = false;
        },


        _loadSrc: function (src) {

            var task = this.scene.tasks.create({
                description: "Loading texture"
            });

            var self = this;

            var image = new Image();

            image.onload = function () {

                if (self._src === src) {

                    // Ensure data source was not changed while we were loading

                    // Keep self._src because that's where we loaded the image
                    // from, and we may need to save that in JSON later

                    self._image = XEO.renderer.webgl.ensureImageSizePowerOfTwo(image);
                    self._target = null;

                    self._imageDirty = false;
                    self._srcDirty = false;
                    self._targetDirty = false;

                    /**
                     * Fired whenever this Texture's  {{#crossLink "Texture/image:property"}}{{/crossLink}} property changes.
                     * @event image
                     * @param value {HTML Image} The property's new value
                     */
                    self.fire("image", self._image);

                    self._scheduleBuild();
                }

                task.setCompleted();
            };

            image.onerror = function () {
                task.setFailed();
            };

            if (src.indexOf("data") === 0) {

                // Image data
                image.src = src;

            } else {

                // Image file
                image.crossOrigin = "Anonymous";
                image.src = src;
            }
        },

        _props: {

            /**
             * Indicates an HTML DOM Image object to source this Texture from.
             *
             * Alternatively, you could indicate the source via either of properties
             * {{#crossLink "Texture/src:property"}}{{/crossLink}} or {{#crossLink "Texture/target:property"}}{{/crossLink}}.
             *
             * Fires an {{#crossLink "Texture/image:event"}}{{/crossLink}} event on change.
             *
             * Sets the {{#crossLink "Texture/src:property"}}{{/crossLink}} and
             * {{#crossLink "Texture/target:property"}}{{/crossLink}} properties to null.
             *
             * @property image
             * @default null
             * @type {HTMLImageElement}
             */
            image: {

                set: function (value) {

                    this._image = XEO.renderer.webgl.ensureImageSizePowerOfTwo(value);
                    this._src = null;
                    this._target = null;

                    this._imageDirty = true;
                    this._srcDirty = false;
                    this._targetDirty = false;

                    this._scheduleBuild();

                    /**
                     * Fired whenever this Texture's  {{#crossLink "Texture/image:property"}}{{/crossLink}} property changes.
                     * @event image
                     * @param value {HTML Image} The property's new value
                     */
                    this.fire("image", this._image);
                },

                get: function () {
                    return this._state.image;
                }
            },

            /**
             * Indicates a path to an image file to source this Texture from.
             *
             * Alternatively, you could indicate the source via either of properties
             * {{#crossLink "Texture/image:property"}}{{/crossLink}} or {{#crossLink "Texture/target:property"}}{{/crossLink}}.
             *
             * Fires a {{#crossLink "Texture/src:event"}}{{/crossLink}} event on change.
             *
             * Sets the {{#crossLink "Texture/image:property"}}{{/crossLink}} and
             * {{#crossLink "Texture/target:property"}}{{/crossLink}} properties to null.
             *
             * @property src
             * @default null
             * @type String
             */
            src: {

                set: function(value) {

                    this._image = null;
                    this._src = value;
                    this._target = null;

                    this._imageDirty = false;
                    this._srcDirty = true;
                    this._targetDirty = false;

                    this._scheduleBuild();

                    /**
                     * Fired whenever this Texture's {{#crossLink "Texture/src:property"}}{{/crossLink}} property changes.
                     * @event src
                     * @param value The property's new value
                     * @type String
                     */
                    this.fire("src", this._src);
                },

                get: function() {
                    return this._src;
                }
            },

            /**
             * Instance or ID of a {{#crossLink "ColorTarget"}}ColorTarget{{/crossLink}} or
             * {{#crossLink "DepthTarget"}}DepthTarget{{/crossLink}} to source this Texture from.
             *
             * Alternatively, you could indicate the source via either of properties
             * {{#crossLink "Texture/src:property"}}{{/crossLink}} or {{#crossLink "Texture/image:property"}}{{/crossLink}}.
             *
             * Fires a {{#crossLink "Texture/target:event"}}{{/crossLink}} event on change.
             *
             * Sets the {{#crossLink "Texture/src:property"}}{{/crossLink}} and
             * {{#crossLink "Texture/image:property"}}{{/crossLink}} properties to null.
             *
             * @property target
             * @default null
             * @type String | XEO.ColorTarget | XEO.DepthTarget
             */
            target: {

                set: function (value) {

                    this._image = null;
                    this._src = null;
                    this._target = this._setChild("renderBuf", value); // Target is a render buffer;

                    this._imageDirty = false;
                    this._srcDirty = false;
                    this._targetDirty = true;

                    this._scheduleBuild();

                    /**
                     * Fired whenever this Texture's   {{#crossLink "Texture/target:property"}}{{/crossLink}} property changes.
                     * @event target
                     * @param value The property's new value
                     * @type String | XEO.ColorTarget | XEO.DepthTarget
                     */
                    this.fire("target", this._target);
                },

                get: function () {
                    return this._target; // Created by this._setChild()
                }
            },

            /**
             * 2D translation vector that will be added to this Texture's *S* and *T* coordinates.
             *
             * Fires a {{#crossLink "Texture/translate:event"}}{{/crossLink}} event on change.
             *
             * @property translate
             * @default [0, 0]
             * @type Array(Number)
             */
            translate: {

                set: function (value) {

                    value = value || [0, 0];

                    this._translate = value;
                    this._matrixDirty = true;

                    this._scheduleBuild();


                    /**
                     * Fired whenever this Texture's   {{#crossLink "Texture/translate:property"}}{{/crossLink}} property changes.
                     * @event translate
                     * @param value {Array(Number)} The property's new value
                     */
                    this.fire("translate", this._translate);
                },

                get: function () {
                    return this._translate;
                }
            },

            /**
             * 2D scaling vector that will be applied to this Texture's *S* and *T* coordinates.
             *
             * Fires a {{#crossLink "Texture/scale:event"}}{{/crossLink}} event on change.
             *
             * @property scale
             * @default [1, 1]
             * @type Array(Number)
             */
            scale: {

                set: function (value) {

                    value = value || [1, 1];

                    this._scale = value;
                    this._matrixDirty = true;

                    this._scheduleBuild();

                    /**
                     * Fired whenever this Texture's   {{#crossLink "Texture/scale:property"}}{{/crossLink}} property changes.
                     * @event scale
                     * @param value {Array(Number)} The property's new value
                     */
                    this.fire("scale", this._scale);
                },

                get: function () {
                    return this._scale;
                }
            },

            /**
             * Rotation, in degrees, that will be applied to this Texture's *S* and *T* coordinates.
             *
             * Fires a {{#crossLink "Texture/rotate:event"}}{{/crossLink}} event on change.
             *
             * @property rotate
             * @default 0
             * @type Number
             */
            rotate: {

                set: function (value) {

                    value = value || 0;

                    this._rotate = value;
                    this._matrixDirty = true;

                    this._scheduleBuild();

                    /**
                     * Fired whenever this Texture's  {{#crossLink "Texture/rotate:property"}}{{/crossLink}} property changes.
                     * @event rotate
                     * @param value {Number} The property's new value
                     */
                    this.fire("rotate", this._rotate);
                },

                get: function () {
                    return this._rotate;
                }
            },

            /**
             * How this Texture is sampled when a texel covers less than one pixel.
             *
             * Options are:
             *
             * <ul>
             *     <li>**"nearest"** - Uses the value of the texture element that is nearest
             *     (in Manhattan distance) to the center of the pixel being textured.</li>
             *
             *     <li>**"linear"** - Uses the weighted average of the four texture elements that are
             *     closest to the center of the pixel being textured.</li>
             *
             *     <li>**"nearestMipmapNearest"** - Chooses the mipmap that most closely matches the
             *     size of the pixel being textured and uses the "nearest" criterion (the texture
             *     element nearest to the center of the pixel) to produce a texture value.</li>
             *
             *     <li>**"linearMipmapNearest"** - Chooses the mipmap that most closely matches the size of
             *     the pixel being textured and uses the "linear" criterion (a weighted average of the
             *     four texture elements that are closest to the center of the pixel) to produce a
             *     texture value.</li>
             *
             *     <li>**"nearestMipmapLinear"** - Chooses the two mipmaps that most closely
             *     match the size of the pixel being textured and uses the "nearest" criterion
             *     (the texture element nearest to the center of the pixel) to produce a texture
             *     value from each mipmap. The final texture value is a weighted average of those two
             *     values.</li>
             *
             *     <li>**"linearMipmapLinear"** - **(default)** - Chooses the two mipmaps that most closely match the size
             *     of the pixel being textured and uses the "linear" criterion (a weighted average
             *     of the four texture elements that are closest to the center of the pixel) to
             *     produce a texture value from each mipmap. The final texture value is a weighted
             *     average of those two values.</li>
             * </ul>
             *
             * Fires a {{#crossLink "Texture/minFilter:event"}}{{/crossLink}} event on change.
             *
             * @property minFilter
             * @default "linearMipMapLinear"
             * @type String
             */
            minFilter: {

                set: function (value) {

                    value = value || "linearMipMapLinear";

                    this._minFilter = value;
                    this._propsDirty = true;

                    this._scheduleBuild();

                    /**
                     * Fired whenever this Texture's  {{#crossLink "Texture/minFilter:property"}}{{/crossLink}} property changes.
                     * @event minFilter
                     * @param value {String} The property's new value
                     */
                    this.fire("minFilter", this._minFilter);
                },

                get: function () {
                    return this._minFilter;
                }
            },

            /**
             * How this Texture is sampled when a texel covers more than one pixel.
             *
             * Options are:
             *
             * <ul>
             *     <li>**"nearest"** - Uses the value of the texture element that is nearest
             *     (in Manhattan distance) to the center of the pixel being textured.</li>
             *     <li>**"linear"** - **(default)** - Uses the weighted average of the four texture elements that are
             *     closest to the center of the pixel being textured.</li>
             * </ul>
             *
             * Fires a {{#crossLink "Texture/magFilter:event"}}{{/crossLink}} event on change.
             *
             * @property magFilter
             * @default "linear"
             * @type String
             */
            magFilter: {

                set: function (value) {

                    value = value || "linear";

                    this._magFilter = value;
                    this._propsDirty = true;

                    this._scheduleBuild();

                    /**
                     * Fired whenever this Texture's  {{#crossLink "Texture/magFilter:property"}}{{/crossLink}} property changes.
                     * @event magFilter
                     * @param value {String} The property's new value
                     */
                    this.fire("magFilter", this._magFilter);
                },

                get: function () {
                    return this._magFilter;
                }
            },

            /**
             * Wrap parameter for this Texture's *S* coordinate.
             *
             * Options are:
             *
             * <ul>
             *     <li>**"clampToEdge"** -  causes *S* coordinates to be clamped to the size of the texture.</li>
             *     <li>**"mirroredRepeat"** - causes the *S* coordinate to be set to the fractional part of the texture coordinate
             *     if the integer part of *S* is even; if the integer part of *S* is odd, then the *S* texture coordinate is
             *     set to *1 - frac ⁡ S* , where *frac ⁡ S* represents the fractional part of *S*.</li>
             *     <li>**"repeat"** - **(default)** - causes the integer part of the *S* coordinate to be ignored; xeoEngine uses only the
             *     fractional part, thereby creating a repeating pattern.</li>
             * </ul>
             *
             * Fires a {{#crossLink "Texture/wrapS:event"}}{{/crossLink}} event on change.
             *
             * @property wrapS
             * @default "repeat"
             * @type String
             */
            wrapS: {

                set: function (value) {

                    value = value || "repeat";

                    this._wrapS = value;
                    this._propsDirty = true;

                    this._scheduleBuild();

                    /**
                     * Fired whenever this Texture's  {{#crossLink "Texture/wrapS:property"}}{{/crossLink}} property changes.
                     * @event wrapS
                     * @param value {String} The property's new value
                     */
                    this.fire("wrapS", this._wrapS);
                },

                get: function () {
                    return this._wrapS;
                }
            },

            /**
             * Wrap parameter for this Texture's *T* coordinate.
             *
             * Options are:
             *
             * <ul>
             *     <li>**"clampToEdge"** -  Causes *T* coordinates to be clamped to the size of the texture.</li>
             *     <li>**"mirroredRepeat"** - Causes the *T* coordinate to be set to the fractional part of the texture coordinate
             *     if the integer part of *T* is even; if the integer part of *T* is odd, then the *T* texture coordinate is
             *     set to *1 - frac ⁡ S* , where *frac ⁡ S* represents the fractional part of *T*.</li>
             *     <li>**"repeat"** - **(default)** - Causes the integer part of the *T* coordinate to be ignored; xeoEngine uses only the
             *     fractional part, thereby creating a repeating pattern.</li>
             * </ul>
             *
             * Fires a {{#crossLink "Texture/wrapT:event"}}{{/crossLink}} event on change.
             *
             * @property wrapT
             * @default "repeat"
             * @type String
             */
            wrapT: {

                set: function (value) {

                    value = value || "repeat";

                    this._wrapT = value;
                    this._propsDirty = true;

                    this._scheduleBuild();

                    /**
                     * Fired whenever this Texture's  {{#crossLink "Texture/wrapT:property"}}{{/crossLink}} property changes.
                     * @event wrapT
                     * @param value {String} The property's new value
                     */
                    this.fire("wrapT", this._wrapT);
                },

                get: function () {
                    return this._wrapT;
                }
            },


            /**
             * Flips this Texture's Y axis to match the WebGL texture coordinate space.
             *
             * Fires a {{#crossLink "Texture/flipY:event"}}{{/crossLink}} event on change.
             *
             * @property flipY
             * @default true
             * @type Boolean
             */
            flipY: {

                set: function (value) {

                    value = value !== false;

                    this._flipY = value;
                    this._propsDirty = true;

                    this._scheduleBuild();

                    /**
                     * Fired whenever this Texture's  {{#crossLink "Texture/flipY:property"}}{{/crossLink}} property changes.
                     * @event flipY
                     * @param value {Boolean} The property's new value
                     */
                    this.fire("flipY", this._flipY);
                },

                get: function () {
                    return this._flipY;
                }
            }
        },

        _getJSON: function () {

            var json = {
                translate: this._translate,
                scale: this._scale,
                rotate: this._rotate
            };

            if (this._minFilter != "linearMipMapLinear") {
                json.minFilter = this._minFilter;
            }

            if (this._magFilter != "linear") {
                json.magFilter = this._magFilter;
            }

            if (this._wrapS != "repeat") {
                json.wrapS = this._wrapS;
            }

            if (this._wrapT != "repeat") {
                json.wrapT = this._wrapT;
            }

            if (this._flipY !== true) {
                json.flipY = this._flipY;
            }

            if (this._src) {
                json.src = this._src;

            } else if (this._target) {
                json.target = this._target.id;

            } else if (this._image) {
                // TODO: Image data
                // json.src = image.src;
            }

            return json;
        },

        _destroy: function () {

            this.scene.canvas.off(this._webglContextRestored);

            if (this._state.texture) {
                this._state.texture.destroy();
            }

            this.scene.stats.dec("textures");
        }
    });

})();
;(function () {

    "use strict";

    /**
     A **Reflect** defines a reflection as a cubemap that is applied
     to attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.

     TODO

     @class Reflect
     @module XEO
     @submodule materials
     @constructor
     @param [scene] {Scene} Parent {{#crossLink "Scene"}}Scene{{/crossLink}} - creates this Reflect in the default
     {{#crossLink "Scene"}}Scene{{/crossLink}} when omitted.
     @param [cfg] {*} Configs
     @param [cfg.id] {String} Optional ID, unique among all components in the parent scene, generated automatically when omitted.
     @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this Reflect.    
     @extends Component
     */
    XEO.Reflect = XEO.Component.extend({

        type: "XEO.Reflect",

        _init: function (cfg) {
        },

        _compile: function () {
            this._renderer.reflect = this._state;
        },

        _getJSON: function () {
            return {

            };
        }
    });

})();;/**
 * Math utilities.
 *
 * @module XEO
 * @submodule math
 */;(function () {

    "use strict";

    /*
     * Optimizations made based on glMatrix by Brandon Jones
     */

    /*
     * Copyright (c) 2010 Brandon Jones
     *
     * This software is provided 'as-is', without any express or implied
     * warranty. In no event will the authors be held liable for any damages
     * arising from the use of this software.
     *
     * Permission is granted to anyone to use this software for any purpose,
     * including commercial applications, and to alter it and redistribute it
     * freely, subject to the following restrictions:
     *
     *    1. The origin of this software must not be misrepresented; you must not
     *    claim that you wrote the original software. If you use this software
     *    in a product, an acknowledgment in the product documentation would be
     *    appreciated but is not required.
     *
     *    2. Altered source versions must be plainly marked as such, and must not
     *    be misrepresented as being the original software.
     *
     *    3. This notice may not be removed or altered from any source
     *    distribution.
     */


    /**
     * This utility object provides math functions that are used within xeoEngine. These functions are also part xeoEngine's
     * public API and are therefore available for you to use within your application code.
     * @module XEO
     * @submodule math
     * @class math
     * @static
     */
    XEO.math = {

        /**
         * Returns a new, uninitialized two-element vector.
         * @method vec2
         * @static
         * @returns {Float32Array}
         */
        vec2: function () {
            return new Float32Array(2);
        },

        /**
         * Returns a new, uninitialized three-element vector.
         * @method vec3
         * @static
         * @returns {Float32Array}
         */
        vec3: function () {
            return new Float32Array(3);
        },

        /**
         * Returns a new, uninitialized four-element vector.
         * @method vec4
         * @static
         * @returns {Float32Array}
         */
        vec4: function () {
            return new Float32Array(4);
        },

        /**
         * Returns a new, uninitialized 3x3 matrix.
         * @method mat3
         * @static
         * @returns {Float32Array}
         */
        mat3: function () {
            return new Float32Array(9);
        },

        /**
         * Returns a new, uninitialized 4x4 matrix.
         * @method mat4
         * @static
         * @returns {Float32Array}
         */
        mat4: function () {
            return new Float32Array(16);
        },

        /**
         * Returns a new UUID.
         * @method createUUID
         * @static
         * @return string The new UUID
         */
        createUUID: function () {
            // http://www.broofa.com/Tools/Math.uuid.htm
            var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
            var uuid = new Array(36);
            var rnd = 0, r;
            return function () {
                for (var i = 0; i < 36; i++) {
                    if (i === 8 || i === 13 || i === 18 || i === 23) {
                        uuid[i] = '-';
                    } else if (i === 14) {
                        uuid[i] = '4';
                    } else {
                        if (rnd <= 0x02) rnd = 0x2000000 + ( Math.random() * 0x1000000 ) | 0;
                        r = rnd & 0xf;
                        rnd = rnd >> 4;
                        uuid[i] = chars[( i === 19 ) ? ( r & 0x3 ) | 0x8 : r];
                    }
                }
                return uuid.join('');
            };
        }(),

        /**
         * Floating-point modulus
         * @method fmod
         * @static
         * @param {Number} a
         * @param {Number} b
         * @returns {*}
         */
        fmod: function (a, b) {
            if (a < b) {
                console.error("XEO.math.fmod : Attempting to find modulus within negative range - would be infinite loop - ignoring");
                return a;
            }
            while (b <= a) {
                a -= b;
            }
            return a;
        },

        /**
         * Negates a four-element vector.
         * @method negateVec4
         * @static
         * @param {Array(Number)} v Vector to negate
         * @param  {Array(Number)} [dest] Destination vector
         * @return {Array(Number)} dest if specified, v otherwise
         */
        negateVec4: function (v, dest) {
            if (!dest) {
                dest = v;
            }
            dest[0] = -v[0];
            dest[1] = -v[1];
            dest[2] = -v[2];
            dest[3] = -v[3];
            return dest;
        },

        /**
         * Adds one four-element vector to another.
         * @method addVec4
         * @static
         * @param {Array(Number)} u First vector
         * @param {Array(Number)} v Second vector
         * @param  {Array(Number)} [dest] Destination vector
         * @return {Array(Number)} dest if specified, u otherwise
         */
        addVec4: function (u, v, dest) {
            if (!dest) {
                dest = u;
            }
            dest[0] = u[0] + v[0];
            dest[1] = u[1] + v[1];
            dest[2] = u[2] + v[2];
            dest[3] = u[3] + v[3];
            return dest;
        },

        /**
         * Adds a scalar value to each element of a four-element vector.
         * @method addVec4Scalar
         * @static
         * @param {Array(Number)} v The vector
         * @param {Number} s The scalar
         * @param  {Array(Number)} [dest] Destination vector
         * @return {Array(Number)} dest if specified, v otherwise
         */
        addVec4Scalar: function (v, s, dest) {
            if (!dest) {
                dest = v;
            }
            dest[0] = v[0] + s;
            dest[1] = v[1] + s;
            dest[2] = v[2] + s;
            dest[3] = v[3] + s;
            return dest;
        },

        /**
         * Adds one three-element vector to another.
         * @method addVec3
         * @static
         * @param {Array(Number)} u First vector
         * @param {Array(Number)} v Second vector
         * @param  {Array(Number)} [dest] Destination vector
         * @return {Array(Number)} dest if specified, u otherwise
         */
        addVec3: function (u, v, dest) {
            if (!dest) {
                dest = u;
            }
            dest[0] = u[0] + v[0];
            dest[1] = u[1] + v[1];
            dest[2] = u[2] + v[2];
            return dest;
        },

        /**
         * Adds a scalar value to each element of a three-element vector.
         * @method addVec4Scalar
         * @static
         * @param {Array(Number)} v The vector
         * @param {Number} s The scalar
         * @param  {Array(Number)} [dest] Destination vector
         * @return {Array(Number)} dest if specified, v otherwise
         */
        addVec3Scalar: function (v, s, dest) {
            if (!dest) {
                dest = v;
            }
            dest[0] = v[0] + s;
            dest[1] = v[1] + s;
            dest[2] = v[2] + s;
            return dest;
        },

        /**
         * Subtracts one four-element vector from another.
         * @method subVec4
         * @static
         * @param {Array(Number)} u First vector
         * @param {Array(Number)} v Vector to subtract
         * @param  {Array(Number)} [dest] Destination vector
         * @return {Array(Number)} dest if specified, u otherwise
         */
        subVec4: function (u, v, dest) {
            if (!dest) {
                dest = u;
            }
            dest[0] = u[0] - v[0];
            dest[1] = u[1] - v[1];
            dest[2] = u[2] - v[2];
            dest[3] = u[3] - v[3];
            return dest;
        },

        /**
         * Subtracts one three-element vector from another.
         * @method subVec3
         * @static
         * @param {Array(Number)} u First vector
         * @param {Array(Number)} v Vector to subtract
         * @param  {Array(Number)} [dest] Destination vector
         * @return {Array(Number)} dest if specified, u otherwise
         */
        subVec3: function (u, v, dest) {
            if (!dest) {
                dest = u;
            }
            dest[0] = u[0] - v[0];
            dest[1] = u[1] - v[1];
            dest[2] = u[2] - v[2];
            return dest;
        },

        /**
         * Subtracts one two-element vector from another.
         * @method subVec2
         * @static
         * @param {Array(Number)} u First vector
         * @param {Array(Number)} v Vector to subtract
         * @param  {Array(Number)} [dest] Destination vector
         * @return {Array(Number)} dest if specified, u otherwise
         */
        subVec2: function (u, v, dest) {
            if (!dest) {
                dest = u;
            }
            dest[0] = u[0] - v[0];
            dest[1] = u[1] - v[1];
            return dest;
        },

        /**
         * Subtracts a scalar value from each element of a four-element vector.
         * @method subVec4Scalar
         * @static
         * @param {Array(Number)} v The vector
         * @param {Number} s The scalar
         * @param  {Array(Number)} [dest] Destination vector
         * @return {Array(Number)} dest if specified, v otherwise
         */
        subVec4Scalar: function (v, s, dest) {
            if (!dest) {
                dest = v;
            }
            dest[0] = v[0] - s;
            dest[1] = v[1] - s;
            dest[2] = v[2] - s;
            dest[3] = v[3] - s;
            return dest;
        },

        /**
         * Sets each element of a 4-element vector to a scalar value minus the value of that element.
         * @method subScalarVec4
         * @static
         * @param {Array(Number)} v The vector
         * @param {Number} s The scalar
         * @param  {Array(Number)} [dest] Destination vector
         * @return {Array(Number)} dest if specified, v otherwise
         */
        subScalarVec4: function (v, s, dest) {
            if (!dest) {
                dest = v;
            }
            dest[0] = s - v[0];
            dest[1] = s - v[1];
            dest[2] = s - v[2];
            dest[3] = s - v[3];
            return dest;
        },

        /**
         * Multiplies one three-element vector by another.
         * @method mulVec3
         * @static
         * @param {Array(Number)} u First vector
         * @param {Array(Number)} v Second vector
         * @param  {Array(Number)} [dest] Destination vector
         * @return {Array(Number)} dest if specified, u otherwise
         */
        mulVec4: function (u, v, dest) {
            if (!dest) {
                dest = u;
            }
            dest[0] = u[0] * v[0];
            dest[1] = u[1] * v[1];
            dest[2] = u[2] * v[2];
            dest[3] = u[3] * v[3];
            return dest;
        },

        /**
         * Multiplies each element of a four-element vector by a scalar.
         * @method mulVec34calar
         * @static
         * @param {Array(Number)} v The vector
         * @param {Number} s The scalar
         * @param  {Array(Number)} [dest] Destination vector
         * @return {Array(Number)} dest if specified, v otherwise
         */
        mulVec4Scalar: function (v, s, dest) {
            if (!dest) {
                dest = v;
            }
            dest[0] = v[0] * s;
            dest[1] = v[1] * s;
            dest[2] = v[2] * s;
            dest[3] = v[3] * s;
            return dest;
        },

        /**
         * Multiplies each element of a three-element vector by a scalar.
         * @method mulVec3Scalar
         * @static
         * @param {Array(Number)} v The vector
         * @param {Number} s The scalar
         * @param  {Array(Number)} [dest] Destination vector
         * @return {Array(Number)} dest if specified, v otherwise
         */
        mulVec3Scalar: function (v, s, dest) {
            if (!dest) {
                dest = v;
            }
            dest[0] = v[0] * s;
            dest[1] = v[1] * s;
            dest[2] = v[2] * s;
            return dest;
        },

        /**
         * Multiplies each element of a two-element vector by a scalar.
         * @method mulVec2Scalar
         * @static
         * @param {Array(Number)} v The vector
         * @param {Number} s The scalar
         * @param  {Array(Number)} [dest] Destination vector
         * @return {Array(Number)} dest if specified, v otherwise
         */
        mulVec2Scalar: function (v, s, dest) {
            if (!dest) {
                dest = v;
            }
            dest[0] = v[0] * s;
            dest[1] = v[1] * s;
            return dest;
        },

        /**
         * Divides one three-element vector by another.
         * @method divVec3
         * @static
         * @param {Array(Number)} u First vector
         * @param {Array(Number)} v Second vector
         * @param  {Array(Number)} [dest] Destination vector
         * @return {Array(Number)} dest if specified, u otherwise
         */
        divVec3: function (u, v, dest) {
            if (!dest) {
                dest = u;
            }
            dest[0] = u[0] / v[0];
            dest[1] = u[1] / v[1];
            dest[2] = u[2] / v[2];
            return dest;
        },

        /**
         * Divides one four-element vector by another.
         * @method divVec4
         * @static
         * @param {Array(Number)} u First vector
         * @param {Array(Number)} v Second vector
         * @param  {Array(Number)} [dest] Destination vector
         * @return {Array(Number)} dest if specified, u otherwise
         */
        divVec4: function (u, v, dest) {
            if (!dest) {
                dest = u;
            }
            dest[0] = u[0] / v[0];
            dest[1] = u[1] / v[1];
            dest[2] = u[2] / v[2];
            dest[3] = u[3] / v[3];
            return dest;
        },

        /**
         * Divides a scalar by a three-element vector, returning a new vector.
         * @method divScalarVec3
         * @static
         * @param v vec3
         * @param s scalar
         * @param dest vec3 - optional destination
         * @return [] dest if specified, v otherwise
         */
        divScalarVec3: function (s, v, dest) {
            if (!dest) {
                dest = v;
            }
            dest[0] = s / v[0];
            dest[1] = s / v[1];
            dest[2] = s / v[2];
            return dest;
        },

        /**
         * Divides a three-element vector by a scalar.
         * @method divVec3Scalar
         * @static
         * @param v vec3
         * @param s scalar
         * @param dest vec3 - optional destination
         * @return [] dest if specified, v otherwise
         */
        divVec3Scalar: function (v, s, dest) {
            if (!dest) {
                dest = v;
            }
            dest[0] = v[0] / s;
            dest[1] = v[1] / s;
            dest[2] = v[2] / s;
            return dest;
        },

        /**
         * Divides a four-element vector by a scalar.
         * @method divVec4Scalar
         * @static
         * @param v vec4
         * @param s scalar
         * @param dest vec4 - optional destination
         * @return [] dest if specified, v otherwise
         */
        divVec4Scalar: function (v, s, dest) {
            if (!dest) {
                dest = v;
            }
            dest[0] = v[0] / s;
            dest[1] = v[1] / s;
            dest[2] = v[2] / s;
            dest[3] = v[3] / s;
            return dest;
        },


        /**
         * Divides a scalar by a four-element vector, returning a new vector.
         * @method divScalarVec4
         * @static
         * @param s scalar
         * @param v vec4
         * @param dest vec4 - optional destination
         * @return [] dest if specified, v otherwise
         */
        divScalarVec4: function (s, v, dest) {
            if (!dest) {
                dest = v;
            }
            dest[0] = s / v[0];
            dest[1] = s / v[1];
            dest[2] = s / v[2];
            dest[3] = s / v[3];
            return dest;
        },

        /**
         * Returns the dot product of two four-element vectors.
         * @method dotVec4
         * @static
         * @param {Array(Number)} u First vector
         * @param {Array(Number)} v Second vector
         * @return The dot product
         */
        dotVec4: function (u, v) {
            return (u[0] * v[0] + u[1] * v[1] + u[2] * v[2] + u[3] * v[3]);
        },

        /**
         * Returns the cross product of two four-element vectors.
         * @method cross3Vec4
         * @static
         * @param {Array(Number)} u First vector
         * @param {Array(Number)} v Second vector
         * @return The cross product
         */
        cross3Vec4: function (u, v) {
            var u0 = u[0], u1 = u[1], u2 = u[2];
            var v0 = v[0], v1 = v[1], v2 = v[2];
            return [
                u1 * v2 - u2 * v1,
                u2 * v0 - u0 * v2,
                u0 * v1 - u1 * v0,
                0.0];
        },

        /**
         * Returns the cross product of two three-element vectors.
         * @method cross3Vec3
         * @static
         * @param {Array(Number)} u First vector
         * @param {Array(Number)} v Second vector
         * @return The cross product
         */
        cross3Vec3: function (u, v, dest) {
            if (!dest) {
                dest = u;
            }
            var x = u[0], y = u[1], z = u[2];
            var x2 = v[0], y2 = v[1], z2 = v[2];
            dest[0] = y * z2 - z * y2;
            dest[1] = z * x2 - x * z2;
            dest[2] = x * y2 - y * x2;
            return dest;
        },


        sqLenVec4: function (v) { // TODO
            return XEO.math.dotVec4(v, v);
        },

        /**
         * Returns the length of a four-element vector.
         * @method lenVec4
         * @static
         * @param {Array(Number)} v The vector
         * @return The length
         */
        lenVec4: function (v) {
            return Math.sqrt(XEO.math.sqLenVec4(v));
        },

        /**
         * Returns the dot product of two three-element vectors.
         * @method dotVec4
         * @static
         * @param {Array(Number)} u First vector
         * @param {Array(Number)} v Second vector
         * @return The dot product
         */
        dotVec3: function (u, v) {
            return (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]);
        },

        /**
         * Returns the dot product of two two-element vectors.
         * @method dotVec4
         * @static
         * @param {Array(Number)} u First vector
         * @param {Array(Number)} v Second vector
         * @return The dot product
         */
        dotVec2: function (u, v) {
            return (u[0] * v[0] + u[1] * v[1]);
        },


        sqLenVec3: function (v) {
            return XEO.math.dotVec3(v, v);
        },


        sqLenVec2: function (v) {
            return XEO.math.dotVec2(v, v);
        },

        /**
         * Returns the length of a three-element vector.
         * @method lenVec3
         * @static
         * @param {Array(Number)} v The vector
         * @return The length
         */
        lenVec3: function (v) {
            return Math.sqrt(XEO.math.sqLenVec3(v));
        },

        /**
         * Returns the length of a two-element vector.
         * @method lenVec2
         * @static
         * @param {Array(Number)} v The vector
         * @return The length
         */
        lenVec2: function (v) {
            return Math.sqrt(XEO.math.sqLenVec2(v));
        },

        /**
         * @method rcpVec3
         * @static
         * @param v vec3
         * @param dest vec3 - optional destination
         * @return [] dest if specified, v otherwise
         *
         */
        rcpVec3: function (v, dest) {
            return XEO.math.divScalarVec3(1.0, v, dest);
        },

        /**
         * Normalizes a four-element vector
         * @method normalizeVec4
         * @static
         * @param v vec4
         * @param dest vec4 - optional destination
         * @return [] dest if specified, v otherwise
         *
         */
        normalizeVec4: function (v, dest) {
            var f = 1.0 / XEO.math.lenVec4(v);
            return XEO.math.mulVec4Scalar(v, f, dest);
        },

        /**
         * Normalizes a three-element vector
         * @method normalizeVec4
         * @static
         */
        normalizeVec3: function (v, dest) {
            var f = 1.0 / XEO.math.lenVec3(v);
            return XEO.math.mulVec3Scalar(v, f, dest);
        },

        /**
         * Normalizes a two-element vector
         * @method normalizeVec2
         * @static
         */
        normalizeVec2: function (v, dest) {
            var f = 1.0 / XEO.math.lenVec2(v);
            return XEO.math.mulVec2Scalar(v, f, dest);
        },

        /**
         * Duplicates a 4x4 identity matrix.
         * @method dupMat4
         * @static
         */
        dupMat4: function (m) {
            return m.slice(0, 16);
        },

        /**
         * Extracts a 3x3 matrix from a 4x4 matrix.
         * @method mat4To3
         * @static
         */
        mat4To3: function (m) {
            return [
                m[0], m[1], m[2],
                m[4], m[5], m[6],
                m[8], m[9], m[10]
            ];
        },

        /**
         * Returns a 4x4 matrix with each element set to the given scalar value.
         * @method m4s
         * @static
         */
        m4s: function (s) {
            return [
                s, s, s, s,
                s, s, s, s,
                s, s, s, s,
                s, s, s, s
            ];
        },

        /**
         * Returns a 4x4 matrix with each element set to zero.
         * @method setMat4ToZeroes
         * @static
         */
        setMat4ToZeroes: function () {
            return XEO.math.m4s(0.0);
        },

        /**
         * Returns a 4x4 matrix with each element set to 1.0.
         * @method setMat4ToOnes
         * @static
         */
        setMat4ToOnes: function () {
            return XEO.math.m4s(1.0);
        },

        /**
         * Returns a 4x4 matrix with each element set to 1.0.
         * @method setMat4ToOnes
         * @static
         */
        diagonalMat4v: function (v) {
            return [
                v[0], 0.0, 0.0, 0.0,
                0.0, v[1], 0.0, 0.0,
                0.0, 0.0, v[2], 0.0,
                0.0, 0.0, 0.0, v[3]
            ];
        },

        /**
         * Returns a 4x4 matrix with diagonal elements set to the given vector.
         * @method diagonalMat4c
         * @static
         */
        diagonalMat4c: function (x, y, z, w) {
            return XEO.math.diagonalMat4v([x, y, z, w]);
        },

        /**
         * Returns a 4x4 matrix with diagonal elements set to the given scalar.
         * @method diagonalMat4s
         * @static
         */
        diagonalMat4s: function (s) {
            return XEO.math.diagonalMat4c(s, s, s, s);
        },

        /**
         * Returns a 4x4 identity matrix.
         * @method identityMat4
         * @static
         */
        identityMat4: function () {
            return XEO.math.diagonalMat4v([1.0, 1.0, 1.0, 1.0]);
        },

        /**
         * Tests if the given 4x4 matrix is the identity matrix.
         * @method isIdentityMat4
         * @static
         */
        isIdentityMat4: function (m) {
            if (m[0] !== 1.0 || m[1] !== 0.0 || m[2] !== 0.0 || m[3] !== 0.0 ||
                m[4] !== 0.0 || m[5] !== 1.0 || m[6] !== 0.0 || m[7] !== 0.0 ||
                m[8] !== 0.0 || m[9] !== 0.0 || m[10] !== 1.0 || m[11] !== 0.0 ||
                m[12] !== 0.0 || m[13] !== 0.0 || m[14] !== 0.0 || m[15] !== 1.0) {
                return false;
            }
            return true;
        },

        /**
         * Negates the given 4x4 matrix.
         * @method negateMat4
         * @static
         */
        negateMat4: function (m, dest) {
            if (!dest) {
                dest = m;
            }
            dest[0] = -m[0];
            dest[1] = -m[1];
            dest[2] = -m[2];
            dest[3] = -m[3];
            dest[4] = -m[4];
            dest[5] = -m[5];
            dest[6] = -m[6];
            dest[7] = -m[7];
            dest[8] = -m[8];
            dest[9] = -m[9];
            dest[10] = -m[10];
            dest[11] = -m[11];
            dest[12] = -m[12];
            dest[13] = -m[13];
            dest[14] = -m[14];
            dest[15] = -m[15];
            return dest;
        },

        /**
         * Adds the given 4x4 matrices together.
         * @method addMat4
         * @static
         */
        addMat4: function (a, b, dest) {
            if (!dest) {
                dest = a;
            }
            dest[0] = a[0] + b[0];
            dest[1] = a[1] + b[1];
            dest[2] = a[2] + b[2];
            dest[3] = a[3] + b[3];
            dest[4] = a[4] + b[4];
            dest[5] = a[5] + b[5];
            dest[6] = a[6] + b[6];
            dest[7] = a[7] + b[7];
            dest[8] = a[8] + b[8];
            dest[9] = a[9] + b[9];
            dest[10] = a[10] + b[10];
            dest[11] = a[11] + b[11];
            dest[12] = a[12] + b[12];
            dest[13] = a[13] + b[13];
            dest[14] = a[14] + b[14];
            dest[15] = a[15] + b[15];
            return dest;
        },

        /**
         * Adds the given scalar to each element of the given 4x4 matrix.
         * @method addMat4Scalar
         * @static
         */
        addMat4Scalar: function (m, s, dest) {
            if (!dest) {
                dest = m;
            }
            dest[0] = m[0] + s;
            dest[1] = m[1] + s;
            dest[2] = m[2] + s;
            dest[3] = m[3] + s;
            dest[4] = m[4] + s;
            dest[5] = m[5] + s;
            dest[6] = m[6] + s;
            dest[7] = m[7] + s;
            dest[8] = m[8] + s;
            dest[9] = m[9] + s;
            dest[10] = m[10] + s;
            dest[11] = m[11] + s;
            dest[12] = m[12] + s;
            dest[13] = m[13] + s;
            dest[14] = m[14] + s;
            dest[15] = m[15] + s;
            return dest;
        },

        /**
         * Adds the given scalar to each element of the given 4x4 matrix.
         * @method addScalarMat4
         * @static
         */
        addScalarMat4: function (s, m, dest) {
            return XEO.math.addMat4Scalar(m, s, dest);
        },

        /**
         * Subtracts the second 4x4 matrix from the first.
         * @method subMat4
         * @static
         */
        subMat4: function (a, b, dest) {
            if (!dest) {
                dest = a;
            }
            dest[0] = a[0] - b[0];
            dest[1] = a[1] - b[1];
            dest[2] = a[2] - b[2];
            dest[3] = a[3] - b[3];
            dest[4] = a[4] - b[4];
            dest[5] = a[5] - b[5];
            dest[6] = a[6] - b[6];
            dest[7] = a[7] - b[7];
            dest[8] = a[8] - b[8];
            dest[9] = a[9] - b[9];
            dest[10] = a[10] - b[10];
            dest[11] = a[11] - b[11];
            dest[12] = a[12] - b[12];
            dest[13] = a[13] - b[13];
            dest[14] = a[14] - b[14];
            dest[15] = a[15] - b[15];
            return dest;
        },

        /**
         * Subtracts the given scalar from each element of the given 4x4 matrix.
         * @method subMat4Scalar
         * @static
         */
        subMat4Scalar: function (m, s, dest) {
            if (!dest) {
                dest = m;
            }
            dest[0] = m[0] - s;
            dest[1] = m[1] - s;
            dest[2] = m[2] - s;
            dest[3] = m[3] - s;
            dest[4] = m[4] - s;
            dest[5] = m[5] - s;
            dest[6] = m[6] - s;
            dest[7] = m[7] - s;
            dest[8] = m[8] - s;
            dest[9] = m[9] - s;
            dest[10] = m[10] - s;
            dest[11] = m[11] - s;
            dest[12] = m[12] - s;
            dest[13] = m[13] - s;
            dest[14] = m[14] - s;
            dest[15] = m[15] - s;
            return dest;
        },

        /**
         * Subtracts the given scalar from each element of the given 4x4 matrix.
         * @method subScalarMat4
         * @static
         */
        subScalarMat4: function (s, m, dest) {
            if (!dest) {
                dest = m;
            }
            dest[0] = s - m[0];
            dest[1] = s - m[1];
            dest[2] = s - m[2];
            dest[3] = s - m[3];
            dest[4] = s - m[4];
            dest[5] = s - m[5];
            dest[6] = s - m[6];
            dest[7] = s - m[7];
            dest[8] = s - m[8];
            dest[9] = s - m[9];
            dest[10] = s - m[10];
            dest[11] = s - m[11];
            dest[12] = s - m[12];
            dest[13] = s - m[13];
            dest[14] = s - m[14];
            dest[15] = s - m[15];
            return dest;
        },

        /**
         * Multiplies the two given 4x4 matrix by each other.
         * @method mulMat4
         * @static
         */
        mulMat4: function (a, b, dest) {
            if (!dest) {
                dest = a;
            }

            // Cache the matrix values (makes for huge speed increases!)
            var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
            var a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
            var a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
            var a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

            var b00 = b[0], b01 = b[1], b02 = b[2], b03 = b[3];
            var b10 = b[4], b11 = b[5], b12 = b[6], b13 = b[7];
            var b20 = b[8], b21 = b[9], b22 = b[10], b23 = b[11];
            var b30 = b[12], b31 = b[13], b32 = b[14], b33 = b[15];

            dest[0] = b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30;
            dest[1] = b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31;
            dest[2] = b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32;
            dest[3] = b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33;
            dest[4] = b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30;
            dest[5] = b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31;
            dest[6] = b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32;
            dest[7] = b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33;
            dest[8] = b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30;
            dest[9] = b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31;
            dest[10] = b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32;
            dest[11] = b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33;
            dest[12] = b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30;
            dest[13] = b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31;
            dest[14] = b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32;
            dest[15] = b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33;

            return dest;
        },

        /**
         * Multiplies each element of the given 4x4 matrix by the given scalar.
         * @method mulMat4Scalar
         * @static
         */
        mulMat4Scalar: function (m, s, dest) {
            if (!dest) {
                dest = m;
            }
            dest[0] = m[0] * s;
            dest[1] = m[1] * s;
            dest[2] = m[2] * s;
            dest[3] = m[3] * s;
            dest[4] = m[4] * s;
            dest[5] = m[5] * s;
            dest[6] = m[6] * s;
            dest[7] = m[7] * s;
            dest[8] = m[8] * s;
            dest[9] = m[9] * s;
            dest[10] = m[10] * s;
            dest[11] = m[11] * s;
            dest[12] = m[12] * s;
            dest[13] = m[13] * s;
            dest[14] = m[14] * s;
            dest[15] = m[15] * s;
            return dest;
        },

        /**
         * Multiplies the given 4x4 matrix by the given four-element vector.
         * @method mulMat4v4
         * @static
         */
        mulMat4v4: function (m, v) {
            var v0 = v[0], v1 = v[1], v2 = v[2], v3 = v[3];
            return [
                m[0] * v0 + m[4] * v1 + m[8] * v2 + m[12] * v3,
                m[1] * v0 + m[5] * v1 + m[9] * v2 + m[13] * v3,
                m[2] * v0 + m[6] * v1 + m[10] * v2 + m[14] * v3,
                m[3] * v0 + m[7] * v1 + m[11] * v2 + m[15] * v3
            ];
        },

        /**
         * Transposes the given 4x4 matrix.
         * @method transposeMat4
         * @static
         */
        transposeMat4: function (mat, dest) {
            // If we are transposing ourselves we can skip a few steps but have to cache some values
            var m4 = mat[4], m14 = mat[14], m8 = mat[8];
            var m13 = mat[13], m12 = mat[12], m9 = mat[9];
            if (!dest || mat === dest) {
                var a01 = mat[1], a02 = mat[2], a03 = mat[3];
                var a12 = mat[6], a13 = mat[7];
                var a23 = mat[11];
                mat[1] = m4;
                mat[2] = m8;
                mat[3] = m12;
                mat[4] = a01;
                mat[6] = m9;
                mat[7] = m13;
                mat[8] = a02;
                mat[9] = a12;
                mat[11] = m14;
                mat[12] = a03;
                mat[13] = a13;
                mat[14] = a23;
                return mat;
            }
            dest[0] = mat[0];
            dest[1] = m4;
            dest[2] = m8;
            dest[3] = m12;
            dest[4] = mat[1];
            dest[5] = mat[5];
            dest[6] = m9;
            dest[7] = m13;
            dest[8] = mat[2];
            dest[9] = mat[6];
            dest[10] = mat[10];
            dest[11] = m14;
            dest[12] = mat[3];
            dest[13] = mat[7];
            dest[14] = mat[11];
            dest[15] = mat[15];
            return dest;
        },

        /**
         * Returns the determinant of the given 4x4 matrix.
         * @method determinantMat4
         * @static
         */
        determinantMat4: function (mat) {
            // Cache the matrix values (makes for huge speed increases!)
            var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3];
            var a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7];
            var a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11];
            var a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15];
            return a30 * a21 * a12 * a03 - a20 * a31 * a12 * a03 - a30 * a11 * a22 * a03 + a10 * a31 * a22 * a03 +
                a20 * a11 * a32 * a03 - a10 * a21 * a32 * a03 - a30 * a21 * a02 * a13 + a20 * a31 * a02 * a13 +
                a30 * a01 * a22 * a13 - a00 * a31 * a22 * a13 - a20 * a01 * a32 * a13 + a00 * a21 * a32 * a13 +
                a30 * a11 * a02 * a23 - a10 * a31 * a02 * a23 - a30 * a01 * a12 * a23 + a00 * a31 * a12 * a23 +
                a10 * a01 * a32 * a23 - a00 * a11 * a32 * a23 - a20 * a11 * a02 * a33 + a10 * a21 * a02 * a33 +
                a20 * a01 * a12 * a33 - a00 * a21 * a12 * a33 - a10 * a01 * a22 * a33 + a00 * a11 * a22 * a33;
        },

        /**
         * Returns the inverse of the given 4x4 matrix.
         * @method inverseMat4
         * @static
         */
        inverseMat4: function (mat, dest) {
            if (!dest) {
                dest = mat;
            }
            // Cache the matrix values (makes for huge speed increases!)
            var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3];
            var a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7];
            var a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11];
            var a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15];
            var b00 = a00 * a11 - a01 * a10;
            var b01 = a00 * a12 - a02 * a10;
            var b02 = a00 * a13 - a03 * a10;
            var b03 = a01 * a12 - a02 * a11;
            var b04 = a01 * a13 - a03 * a11;
            var b05 = a02 * a13 - a03 * a12;
            var b06 = a20 * a31 - a21 * a30;
            var b07 = a20 * a32 - a22 * a30;
            var b08 = a20 * a33 - a23 * a30;
            var b09 = a21 * a32 - a22 * a31;
            var b10 = a21 * a33 - a23 * a31;
            var b11 = a22 * a33 - a23 * a32;

            // Calculate the determinant (inlined to avoid double-caching)
            var invDet = 1 / (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06);

            dest[0] = (a11 * b11 - a12 * b10 + a13 * b09) * invDet;
            dest[1] = (-a01 * b11 + a02 * b10 - a03 * b09) * invDet;
            dest[2] = (a31 * b05 - a32 * b04 + a33 * b03) * invDet;
            dest[3] = (-a21 * b05 + a22 * b04 - a23 * b03) * invDet;
            dest[4] = (-a10 * b11 + a12 * b08 - a13 * b07) * invDet;
            dest[5] = (a00 * b11 - a02 * b08 + a03 * b07) * invDet;
            dest[6] = (-a30 * b05 + a32 * b02 - a33 * b01) * invDet;
            dest[7] = (a20 * b05 - a22 * b02 + a23 * b01) * invDet;
            dest[8] = (a10 * b10 - a11 * b08 + a13 * b06) * invDet;
            dest[9] = (-a00 * b10 + a01 * b08 - a03 * b06) * invDet;
            dest[10] = (a30 * b04 - a31 * b02 + a33 * b00) * invDet;
            dest[11] = (-a20 * b04 + a21 * b02 - a23 * b00) * invDet;
            dest[12] = (-a10 * b09 + a11 * b07 - a12 * b06) * invDet;
            dest[13] = (a00 * b09 - a01 * b07 + a02 * b06) * invDet;
            dest[14] = (-a30 * b03 + a31 * b01 - a32 * b00) * invDet;
            dest[15] = (a20 * b03 - a21 * b01 + a22 * b00) * invDet;

            return dest;
        },

        /**
         * Returns the trace of the given 4x4 matrix.
         * @method traceMat4
         * @static
         */
        traceMat4: function (m) {
            return (m[0] + m[5] + m[10] + m[15]);
        },

        /**
         * Returns 4x4 translation matrix.
         * @method translationMat4
         * @static
         */
        translationMat4v: function (v, temp) {
            var m = temp || XEO.math.identityMat4();
            m[12] = v[0];
            m[13] = v[1];
            m[14] = v[2];
            return m;
        },

        /**
         * Returns 4x4 translation matrix.
         * @method translationMat4c
         * @static
         */
        translationMat4c: function (x, y, z) {
            return XEO.math.translationMat4v([x, y, z]);
        },

        /**
         * Returns 4x4 translation matrix.
         * @method translationMat4s
         * @static
         */
        translationMat4s: function (s) {
            return XEO.math.translationMat4c(s, s, s);
        },

        /**
         * Returns 4x4 rotation matrix.
         * @method rotationMat4v
         * @static
         */
        rotationMat4v: function (anglerad, axis) {
            var ax = XEO.math.normalizeVec4([axis[0], axis[1], axis[2], 0.0], []);
            var s = Math.sin(anglerad);
            var c = Math.cos(anglerad);
            var q = 1.0 - c;

            var x = ax[0];
            var y = ax[1];
            var z = ax[2];

            var xy, yz, zx, xs, ys, zs;

            //xx = x * x; used once
            //yy = y * y; used once
            //zz = z * z; used once
            xy = x * y;
            yz = y * z;
            zx = z * x;
            xs = x * s;
            ys = y * s;
            zs = z * s;

            var m = XEO.math.mat4();

            m[0] = (q * x * x) + c;
            m[1] = (q * xy) + zs;
            m[2] = (q * zx) - ys;
            m[3] = 0.0;

            m[4] = (q * xy) - zs;
            m[5] = (q * y * y) + c;
            m[6] = (q * yz) + xs;
            m[7] = 0.0;

            m[8] = (q * zx) + ys;
            m[9] = (q * yz) - xs;
            m[10] = (q * z * z) + c;
            m[11] = 0.0;

            m[12] = 0.0;
            m[13] = 0.0;
            m[14] = 0.0;
            m[15] = 1.0;

            return m;
        },

        /**
         * Returns 4x4 rotation matrix.
         * @method rotationMat4c
         * @static
         */
        rotationMat4c: function (anglerad, x, y, z) {
            return XEO.math.rotationMat4v(anglerad, [x, y, z]);
        },

        /**
         * Returns 4x4 scale matrix.
         * @method scalingMat4v
         * @static
         */
        scalingMat4v: function (v) {
            var m = XEO.math.identityMat4();
            m[0] = v[0];
            m[5] = v[1];
            m[10] = v[2];
            return m;
        },

        /**
         * Returns 4x4 scale matrix.
         * @method scalingMat4c
         * @static
         */
        scalingMat4c: function (x, y, z) {
            return XEO.math.scalingMat4v([x, y, z]);
        },

        /**
         * Returns 4x4 scale matrix.
         * @method scalingMat4s
         * @static
         */
        scalingMat4s: function (s) {
            return XEO.math.scalingMat4c(s, s, s);
        },

        /**
         * Returns a 4x4 'lookat' viewing transform matrix.
         * @method lookAtMat4v
         * @param pos vec3 position of the viewer
         * @param target vec3 point the viewer is looking at
         * @param up vec3 pointing "up"
         * @param dest mat4 Optional, mat4 frustum matrix will be written into
         *
         * @return {mat4} dest if specified, a new mat4 otherwise
         */
        lookAtMat4v: function (pos, target, up, dest) {
            if (!dest) {
                dest = XEO.math.mat4();
            }

            var posx = pos[0],
                posy = pos[1],
                posz = pos[2],
                upx = up[0],
                upy = up[1],
                upz = up[2],
                targetx = target[0],
                targety = target[1],
                targetz = target[2];

            if (posx === targetx && posy === targety && posz === targetz) {
                return XEO.math.identityMat4();
            }

            var z0, z1, z2, x0, x1, x2, y0, y1, y2, len;

            //vec3.direction(eye, center, z);
            z0 = posx - targetx;
            z1 = posy - targety;
            z2 = posz - targetz;

            // normalize (no check needed for 0 because of early return)
            len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
            z0 *= len;
            z1 *= len;
            z2 *= len;

            //vec3.normalize(vec3.cross(up, z, x));
            x0 = upy * z2 - upz * z1;
            x1 = upz * z0 - upx * z2;
            x2 = upx * z1 - upy * z0;
            len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
            if (!len) {
                x0 = 0;
                x1 = 0;
                x2 = 0;
            } else {
                len = 1 / len;
                x0 *= len;
                x1 *= len;
                x2 *= len;
            }

            //vec3.normalize(vec3.cross(z, x, y));
            y0 = z1 * x2 - z2 * x1;
            y1 = z2 * x0 - z0 * x2;
            y2 = z0 * x1 - z1 * x0;

            len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
            if (!len) {
                y0 = 0;
                y1 = 0;
                y2 = 0;
            } else {
                len = 1 / len;
                y0 *= len;
                y1 *= len;
                y2 *= len;
            }

            dest[0] = x0;
            dest[1] = y0;
            dest[2] = z0;
            dest[3] = 0;
            dest[4] = x1;
            dest[5] = y1;
            dest[6] = z1;
            dest[7] = 0;
            dest[8] = x2;
            dest[9] = y2;
            dest[10] = z2;
            dest[11] = 0;
            dest[12] = -(x0 * posx + x1 * posy + x2 * posz);
            dest[13] = -(y0 * posx + y1 * posy + y2 * posz);
            dest[14] = -(z0 * posx + z1 * posy + z2 * posz);
            dest[15] = 1;

            return dest;
        },

        /**
         * Returns a 4x4 'lookat' viewing transform matrix.
         * @method lookAtMat4c
         */
        lookAtMat4c: function (posx, posy, posz, targetx, targety, targetz, upx, upy, upz) {
            return XEO.math.lookAtMat4v([posx, posy, posz], [targetx, targety, targetz], [upx, upy, upz], []);
        },

        /**
         * Returns a 4x4 orthographic projection matrix.
         * @method orthoMat4c
         */
        orthoMat4c: function (left, right, bottom, top, near, far, dest) {
            if (!dest) {
                dest = XEO.math.mat4();
            }
            var rl = (right - left);
            var tb = (top - bottom);
            var fn = (far - near);

            dest[0] = 2.0 / rl;
            dest[1] = 0.0;
            dest[2] = 0.0;
            dest[3] = 0.0;

            dest[4] = 0.0;
            dest[5] = 2.0 / tb;
            dest[6] = 0.0;
            dest[7] = 0.0;

            dest[8] = 0.0;
            dest[9] = 0.0;
            dest[10] = -2.0 / fn;
            dest[11] = 0.0;

            dest[12] = -(left + right) / rl;
            dest[13] = -(top + bottom) / tb;
            dest[14] = -(far + near) / fn;
            dest[15] = 1.0;

            return dest;
        },

        /**
         * Returns a 4x4 perspective projection matrix.
         * @method frustumMat4v
         */
        frustumMat4v: function (fmin, fmax) {
            var fmin4 = [fmin[0], fmin[1], fmin[2], 0.0];
            var fmax4 = [fmax[0], fmax[1], fmax[2], 0.0];
            var vsum = XEO.math.mat4();
            XEO.math.addVec4(fmax4, fmin4, vsum);
            var vdif = XEO.math.mat4();
            XEO.math.subVec4(fmax4, fmin4, vdif);
            var t = 2.0 * fmin4[2];

            var m = XEO.math.mat4();
            var vdif0 = vdif[0], vdif1 = vdif[1], vdif2 = vdif[2];

            m[0] = t / vdif0;
            m[1] = 0.0;
            m[2] = 0.0;
            m[3] = 0.0;

            m[4] = 0.0;
            m[5] = t / vdif1;
            m[6] = 0.0;
            m[7] = 0.0;

            m[8] = vsum[0] / vdif0;
            m[9] = vsum[1] / vdif1;
            m[10] = -vsum[2] / vdif2;
            m[11] = -1.0;

            m[12] = 0.0;
            m[13] = 0.0;
            m[14] = -t * fmax4[2] / vdif2;
            m[15] = 0.0;

            return m;
        },

        /**
         * Returns a 4x4 perspective projection matrix.
         * @method frustumMat4v
         */
        frustumMat4: function (left, right, bottom, top, near, far, dest) {
            if (!dest) {
                dest = XEO.math.mat4();
            }
            var rl = (right - left);
            var tb = (top - bottom);
            var fn = (far - near);
            dest[0] = (near * 2) / rl;
            dest[1] = 0;
            dest[2] = 0;
            dest[3] = 0;
            dest[4] = 0;
            dest[5] = (near * 2) / tb;
            dest[6] = 0;
            dest[7] = 0;
            dest[8] = (right + left) / rl;
            dest[9] = (top + bottom) / tb;
            dest[10] = -(far + near) / fn;
            dest[11] = -1;
            dest[12] = 0;
            dest[13] = 0;
            dest[14] = -(far * near * 2) / fn;
            dest[15] = 0;
            return dest;
        },

        /**
         * Returns a 4x4 perspective projection matrix.
         * @method perspectiveMatrix4v
         */
        perspectiveMatrix4: function (fovyrad, aspectratio, znear, zfar) {
            var pmin = [];
            var pmax = [];

            pmin[2] = znear;
            pmax[2] = zfar;

            pmax[1] = pmin[2] * Math.tan(fovyrad / 2.0);
            pmin[1] = -pmax[1];

            pmax[0] = pmax[1] * aspectratio;
            pmin[0] = -pmax[0];

            return XEO.math.frustumMat4v(pmin, pmax);
        },

        /**
         * Transforms a three-element position by a 4x4 matrix.
         * @method transformPoint3
         */
        transformPoint3: function (m, p) {
            var p0 = p[0], p1 = p[1], p2 = p[2];
            return [
                (m[0] * p0) + (m[4] * p1) + (m[8] * p2) + m[12],
                (m[1] * p0) + (m[5] * p1) + (m[9] * p2) + m[13],
                (m[2] * p0) + (m[6] * p1) + (m[10] * p2) + m[14],
                (m[3] * p0) + (m[7] * p1) + (m[11] * p2) + m[15]
            ];
        },


        /**
         * Transforms an array of three-element positions by a 4x4 matrix.
         * @method transformPoints3
         */
        transformPoints3: function (m, points, points2) {
            var result = points2 || [];
            var len = points.length;
            var p0, p1, p2;
            var pi;

            // cache values
            var m0 = m[0], m1 = m[1], m2 = m[2], m3 = m[3];
            var m4 = m[4], m5 = m[5], m6 = m[6], m7 = m[7];
            var m8 = m[8], m9 = m[9], m10 = m[10], m11 = m[11];
            var m12 = m[12], m13 = m[13], m14 = m[14], m15 = m[15];

            for (var i = 0; i < len; ++i) {
                // cache values
                pi = points[i];
                p0 = pi[0];
                p1 = pi[1];
                p2 = pi[2];

                result[i] = [
                    (m0 * p0) + (m4 * p1) + (m8 * p2) + m12,
                    (m1 * p0) + (m5 * p1) + (m9 * p2) + m13,
                    (m2 * p0) + (m6 * p1) + (m10 * p2) + m14,
                    (m3 * p0) + (m7 * p1) + (m11 * p2) + m15
                ];
            }

            return result;
        },

        /**
         * Transforms a three-element vector by a 4x4 matrix.
         * @method transformVec3
         */
        transformVec3: function (m, v) {
            var v0 = v[0], v1 = v[1], v2 = v[2];
            return [
                (m[0] * v0) + (m[4] * v1) + (m[8] * v2),
                (m[1] * v0) + (m[5] * v1) + (m[9] * v2),
                (m[2] * v0) + (m[6] * v1) + (m[10] * v2)
            ];
        },

        /**
         * Transforms a four-element vector by a 4x4 matrix.
         * @method transformVec4
         */
        transformVec4: function (m, v) {
            var v0 = v[0], v1 = v[1], v2 = v[2], v3 = v[3];
            return [
                m[0] * v0 + m[4] * v1 + m[8] * v2 + m[12] * v3,
                m[1] * v0 + m[5] * v1 + m[9] * v2 + m[13] * v3,
                m[2] * v0 + m[6] * v1 + m[10] * v2 + m[14] * v3,
                m[3] * v0 + m[7] * v1 + m[11] * v2 + m[15] * v3
            ];
        },

        /**
         * Transforms a four-element vector by a 4x4 projection matrix.
         * @method projectVec4
         */
        projectVec4: function (v) {
            var f = 1.0 / v[3];
            return [v[0] * f, v[1] * f, v[2] * f, 1.0];
        },

        /**
         * Linearly interpolates between two 3D vectors.
         * @method lerpVec3
         */
        lerpVec3: function (t, t1, t2, p1, p2, dest) {
            var result = dest || this.vec3();
            var f = (t - t1) / (t2 - t1);
            result[0] = p1[0] + (f * (p2[0] - p1[0]));
            result[1] = p1[1] + (f * (p2[1] - p1[1]));
            result[2] = p1[2] + (f * (p2[2] - p1[2]));
            return result;
        },

        /**
         * Gets the diagonal size of a boundary given as minima and maxima.
         * @method getAABBDiag
         */
        getAABBDiag: function (boundary) {

            var min = this.vec3();
            var max = this.vec3();

            min[0] = boundary.xmin;
            min[1] = boundary.ymin;
            min[2] = boundary.zmin;

            max[0] = boundary.xmax;
            max[1] = boundary.ymax;
            max[2] = boundary.zmax;

            var tempVec = this.vec3();
            this.subVec3(max, min, tempVec);

            return Math.abs(this.lenVec3(tempVec));
        },

        /**
         * Gets the center of a boundary given as minima and maxima.
         * @method getAABBCenter
         */
        getAABBCenter: function (boundary, dest) {
            var r = dest || this.vec3();

            r[0] = (boundary.xmax + boundary.xmin ) * 0.5;
            r[1] = (boundary.ymax + boundary.ymin ) * 0.5;
            r[2] = (boundary.zmax + boundary.zmin ) * 0.5;

            return r;
        },

        /**
         * Converts an axis-aligned boundary into an oriented boundary consisting of
         * an array of eight 3D positions, one for each corner of the boundary.
         *
         * @method AABB3ToOBB3
         * @param {*} aabb Axis-aligned boundary.
         * @param {Array} [obb] Oriented bounding box.
         * @returns {*} Oriented bounding box.
         */
        AABB3ToOBB3: function (aabb, obb) {

            obb = obb || [];

            if (!obb[0]) {
                obb[0] = [];
            }

            obb[0][0] = aabb.xmin;
            obb[0][1] = aabb.ymin;
            obb[0][2] = aabb.zmin;

            if (!obb[1]) {
                obb[1] = [];
            }

            obb[1][0] = aabb.xmax;
            obb[1][1] = aabb.ymin;
            obb[1][2] = aabb.zmin;

            if (!obb[2]) {
                obb[2] = [];
            }

            obb[2][0] = aabb.xmax;
            obb[2][1] = aabb.ymax;
            obb[2][2] = aabb.zmin;

            if (!obb[3]) {
                obb[3] = [];
            }

            obb[3][0] = aabb.xmin;
            obb[3][1] = aabb.ymax;
            obb[3][2] = aabb.zmin;

            if (!obb[4]) {
                obb[4] = [];
            }

            obb[4][0] = aabb.xmin;
            obb[4][1] = aabb.ymin;
            obb[4][2] = aabb.zmax;

            if (!obb[5]) {
                obb[5] = [];
            }

            obb[5][0] = aabb.xmax;
            obb[5][1] = aabb.ymin;
            obb[5][2] = aabb.zmax;

            if (!obb[6]) {
                obb[6] = [];
            }

            obb[6][0] = aabb.xmax;
            obb[6][1] = aabb.ymax;
            obb[6][2] = aabb.zmax;

            if (!obb[7]) {
                obb[7] = [];
            }

            obb[7][0] = aabb.xmin;
            obb[7][1] = aabb.ymax;
            obb[7][2] = aabb.zmax;

            return obb;
        },

        /**
         * Finds the minimum axis-aligned boundary enclosing the 3D points given in a flattened,  1-dimensional array.
         *
         * @method positions3ToAABB3
         * @param {Array} positions Oriented bounding box.
         * @param {*} [aabb] Axis-aligned bounding box.
         * @returns {*} Axis-aligned bounding box.
         */
        positions3ToAABB3: function (points, aabb) {

            aabb = aabb || {
                    xmin: 0,
                    ymin: 0,
                    zmin: 0,
                    xmax: 0,
                    ymax: 0,
                    zmax: 0
                };

            var xmin = 100000;
            var ymin = 100000;
            var zmin = 100000;
            var xmax = -100000;
            var ymax = -100000;
            var zmax = -100000;

            var x, y, z;

            for (var i = 0, len = points.length; i < len; i += 3) {

                x = points[i + 0];
                y = points[i + 1];
                z = points[i + 2];

                if (x < xmin) {
                    xmin = x;
                }

                if (y < ymin) {
                    ymin = y;
                }

                if (z < zmin) {
                    zmin = z;
                }

                if (x > xmax) {
                    xmax = x;
                }

                if (y > ymax) {
                    ymax = y;
                }

                if (z > zmax) {
                    zmax = z;
                }
            }

            aabb.xmin = xmin;
            aabb.ymin = ymin;
            aabb.zmin = zmin;
            aabb.xmax = xmax;
            aabb.ymax = ymax;
            aabb.zmax = zmax;

            return aabb;
        },

        /**
         * Finds the minimum axis-aligned boundary enclosing the given 3D points.
         *
         * @method points3ToAABB3
         * @param {Array} points Oriented bounding box.
         * @param {*} [aabb] Axis-aligned bounding box.
         * @returns {*} Axis-aligned bounding box.
         */
        points3ToAABB3: function (points, aabb) {

            aabb = aabb || {
                    xmin: 0,
                    ymin: 0,
                    zmin: 0,
                    xmax: 0,
                    ymax: 0,
                    zmax: 0
                };

            var xmin = 100000;
            var ymin = 100000;
            var zmin = 100000;
            var xmax = -100000;
            var ymax = -100000;
            var zmax = -100000;

            var x, y, z;

            for (var i = 0, len = points.length; i < len; i++) {

                x = points[i][0];
                y = points[i][1];
                z = points[i][2];

                if (x < xmin) {
                    xmin = x;
                }

                if (y < ymin) {
                    ymin = y;
                }

                if (z < zmin) {
                    zmin = z;
                }

                if (x > xmax) {
                    xmax = x;
                }

                if (y > ymax) {
                    ymax = y;
                }

                if (z > zmax) {
                    zmax = z;
                }
            }

            aabb.xmin = xmin;
            aabb.ymin = ymin;
            aabb.zmin = zmin;
            aabb.xmax = xmax;
            aabb.ymax = ymax;
            aabb.zmax = zmax;

            return aabb;
        }
    };

})();;/**
 * Builds normal vectors from positions and indices
 * @private
 */
XEO.math.buildNormals = function (positions, indices) {

    var nvecs = new Array(positions.length / 3);
    var j0;
    var j1;
    var j2;
    var v1;
    var v2;
    var v3;

    for (var i = 0, len = indices.length - 3; i < len; i += 3) {
        j0 = indices[i + 0];
        j1 = indices[i + 1];
        j2 = indices[i + 2];

        v1 = [positions[j0 * 3 + 0], positions[j0 * 3 + 1], positions[j0 * 3 + 2]];
        v2 = [positions[j1 * 3 + 0], positions[j1 * 3 + 1], positions[j1 * 3 + 2]];
        v3 = [positions[j2 * 3 + 0], positions[j2 * 3 + 1], positions[j2 * 3 + 2]];

        v2 = XEO.math.subVec4(v2, v1, [0, 0, 0, 0]);
        v3 = XEO.math.subVec4(v3, v1, [0, 0, 0, 0]);

        var n = XEO.math.normalizeVec4(XEO.math.cross3Vec4(v2, v3, [0, 0, 0, 0]), [0, 0, 0, 0]);

        if (!nvecs[j0]) nvecs[j0] = [];
        if (!nvecs[j1]) nvecs[j1] = [];
        if (!nvecs[j2]) nvecs[j2] = [];

        nvecs[j0].push(n);
        nvecs[j1].push(n);
        nvecs[j2].push(n);
    }

    var normals = new Array(positions.length);

    // now go through and average out everything
    for (var i = 0, len = nvecs.length; i < len; i++) {
        var count = nvecs[i].length;
        var x = 0;
        var y = 0;
        var z = 0;
        for (var j = 0; j < count; j++) {
            x += nvecs[i][j][0];
            y += nvecs[i][j][1];
            z += nvecs[i][j][2];
        }
        normals[i * 3 + 0] = (x / count);
        normals[i * 3 + 1] = (y / count);
        normals[i * 3 + 2] = (z / count);
    }

    return normals;
};


/**
 * Builds vertex tangent vectors from positions, UVs and indices
 *
 * Based on code by @rollokb, in his fork of webgl-obj-loader:
 * https://github.com/rollokb/webgl-obj-loader
 *
 * @private
 **/
XEO.math.buildTangents = function (positions, indices, uv) {

    var tangents = [];

    // The vertex arrays needs to be calculated
    // before the calculation of the tangents

    for (var location = 0; location < indices.length; location += 3) {

        // Recontructing each vertex and UV coordinate into the respective vectors

        var index = indices[location];

        var v0 = [positions[index * 3], positions[(index * 3) + 1], positions[(index * 3) + 2]];
        var uv0 = [uv[index * 2], uv[(index * 2) + 1]];

        index = indices[location + 1];

        var v1 = [positions[index * 3], positions[(index * 3) + 1], positions[(index * 3) + 2]];
        var uv1 = [uv[index * 2], uv[(index * 2) + 1]];

        index = indices[location + 2];

        var v2 = [positions[index * 3], positions[(index * 3) + 1], positions[(index * 3) + 2]];
        var uv2 = [uv[index * 2], uv[(index * 2) + 1]];

        var deltaPos1 = XEO.math.subVec3(v1, v0, []);
        var deltaPos2 = XEO.math.subVec3(v2, v0, []);

        var deltaUV1 = XEO.math.subVec2(uv1, uv0, []);
        var deltaUV2 = XEO.math.subVec2(uv2, uv0, []);

        var r = 1.0 / ((deltaUV1[0] * deltaUV2[1]) - (deltaUV1[1] * deltaUV2[0]));

        var tangent = XEO.math.mulVec3Scalar(
            XEO.math.subVec3(
                XEO.math.mulVec3Scalar(deltaPos1, deltaUV2[1], []),
                XEO.math.mulVec3Scalar(deltaPos2, deltaUV1[1], []),
                []
            ),
            r,
            []
        );

        // Average the value of the vectors outs
        for (var v = 0; v < 3; v++) {
            var addTo = indices[location + v];
            if (typeof tangents[addTo] !== "undefined") {
                tangents[addTo] = XEO.math.addVec3(tangents[addTo], tangent, []);
            } else {
                tangents[addTo] = tangent;
            }
        }
    }

    // Deconstruct the vectors back into 1D arrays for WebGL

    var tangents2 = [];

    for (var i = 0; i < tangents.length; i++) {
        tangents2 = tangents2.concat(tangents[i]);
    }

    return tangents2;
};

;/**
 * Game object components.
 *
 * @module XEO
 * @submodule objects
 */;/**
 A **GameObject** is an entity within a xeoEngine {{#crossLink "Scene"}}Scene{{/crossLink}}.

 ## Overview

 See the {{#crossLink "Scene"}}Scene{{/crossLink}} class documentation for more information on GameObjects.</li>

 <img src="../../../assets/images/GameObject.png"></img>


 ## Boundaries

 #### World-space

 A GameObject provides its World-space boundary as a {{#crossLink "Boundary3D"}}{{/crossLink}} that encloses
 the {{#crossLink "Geometry"}}{{/crossLink}} {{#crossLink "Geometry/positions:property"}}{{/crossLink}} after
 transformation by the GameObject's {{#crossLink "GameObject/transform:property"}}Modelling transform{{/crossLink}}.</li>


 ```` javascript
 var scene = new XEO.Scene();

 var geometry = new XEO.Geometry(myScene, {
      //...
  });

 var translate = new XEO.Translate(scene, {
    xyz: [-5, 0, 0] // Translate along -X axis
 });

 var object = new XEO.GameObject(myScene, {
       geometry: myGeometry,
       transform: translate
  });

 // Get the World-space Boundary3D
 var worldBoundary = object.worldBoundary();

 // Get World-space object-aligned bounding box (OBB),
 // which is an array of eight vertices that describes
 // the box that is aligned with the GameObjectbject
 var obb = worldBoundary.obb;

 // Get the World-space axis-aligned bounding box (ABB),
 // which contains the extents of the boundary on each axis
 var aabb = worldBoundary.aabb;

 // get the World-space center of the GameObject:
 var center = worldBoundary.center;

 ````

 #### View-space

 A GameObject also provides its View-space boundary as a {{#crossLink "Boundary3D"}}{{/crossLink}} that encloses
 the {{#crossLink "Geometry/positions:property"}}Geometry positions{{/crossLink}} after
 their transformation by the {{#crossLink "Camera/view:property"}}View{{/crossLink}} and
 {{#crossLink "GameObject/transform:property"}}Modelling{{/crossLink}} transforms.</li>

 ```` javascript
 // Get the View-space Boundary3D
 var viewBoundary = object.viewBoundary();

 // Get View-space object-aligned bounding box (OBB),
 // which is an array of eight vertices that describes
 // the box that is aligned with the GameObjectbject
 var obb = viewBoundary.obb;

 // Get the View-space axis-aligned bounding box (ABB),
 // which contains the extents of the boundary on each axis
 var aabb = viewBoundary.aabb;

 // get the View-space center of the GameObject:
 var center = viewBoundary.center;

 ````

 @class GameObject
 @module XEO
 @submodule objects
 @constructor
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}Scene{{/crossLink}} - creates this GameObject within xeoEngine's default {{#crossLink "XEO/scene:property"}}scene{{/crossLink}} by default.
 @param [cfg] {*} Configs
 @param [cfg.id] {String} Optional ID, unique among all components in the parent {{#crossLink "Scene"}}Scene{{/crossLink}}, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this GameObject.
 @param [cfg.camera] {String|Camera} ID or instance of a {{#crossLink "Camera"}}Camera{{/crossLink}} to attach to this GameObject.  Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this GameObject. Defaults to the
 parent {{#crossLink "Scene"}}Scene{{/crossLink}}'s default instance, {{#crossLink "Scene/camera:property"}}camera{{/crossLink}}.
 @param [cfg.clips] {String|Clips} ID or instance of a {{#crossLink "Clips"}}Clips{{/crossLink}} to attach to this GameObject. Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this GameObject. Defaults to the
 parent {{#crossLink "Scene"}}Scene{{/crossLink}}'s default instance, {{#crossLink "Scene/clips:property"}}clips{{/crossLink}}.
 @param [cfg.colorTarget] {String|ColorTarget} ID or instance of a {{#crossLink "ColorTarget"}}ColorTarget{{/crossLink}} to attach to this GameObject. Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this GameObject. Defaults to the
 parent {{#crossLink "Scene"}}Scene{{/crossLink}}'s default instance, {{#crossLink "Scene/colorTarget:property"}}colorTarget{{/crossLink}}.
 @param [cfg.depthTarget] {String|DepthTarget} ID or instance of a {{#crossLink "DepthTarget"}}DepthTarget{{/crossLink}} to attach to this GameObject. Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this GameObject. Defaults to the
 parent {{#crossLink "Scene"}}Scene{{/crossLink}}'s default instance, {{#crossLink "Scene/depthTarget:property"}}depthTarget{{/crossLink}}.
 @param [cfg.depthBuf] {String|DepthBuf} ID or instance of a {{#crossLink "DepthBuf"}}DepthBuf{{/crossLink}} to attach to this GameObject. Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this GameObject. Defaults to the
 parent {{#crossLink "Scene"}}Scene{{/crossLink}}'s default instance, depth {{#crossLink "Scene/depthBuf:property"}}depthBuf{{/crossLink}}.
 @param [cfg.visibility] {String|Visibility} ID or instance of a {{#crossLink "Visibility"}}Visibility{{/crossLink}} to attach to this GameObject. Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this GameObject. Defaults to the
 parent {{#crossLink "Scene"}}Scene{{/crossLink}}'s default instance, {{#crossLink "Scene/visibility:property"}}visibility{{/crossLink}}.
 @param [cfg.modes] {String|Modes} ID or instance of a {{#crossLink "Modes"}}Modes{{/crossLink}} to attach to this GameObject. Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this GameObject. Defaults to the
 parent {{#crossLink "Scene"}}Scene{{/crossLink}}'s default instance, {{#crossLink "Scene/modes:property"}}modes{{/crossLink}}.
 @param [cfg.geometry] {String|Geometry} ID or instance of a {{#crossLink "Geometry"}}Geometry{{/crossLink}} to attach to this GameObject. Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this GameObject. Defaults to the
 parent {{#crossLink "Scene"}}Scene{{/crossLink}}'s default instance, {{#crossLink "Scene/geometry:property"}}geometry{{/crossLink}}, which is a 2x2x2 box.
 @param [cfg.layer] {String|Layer} ID or instance of a {{#crossLink "Layer"}}Layer{{/crossLink}} to attach to this GameObject. Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this GameObject. Defaults to the
 parent {{#crossLink "Scene"}}Scene{{/crossLink}}'s default instance, {{#crossLink "Scene/layer:property"}}layer{{/crossLink}}.
 @param [cfg.lights] {String|Lights} ID or instance of a {{#crossLink "Lights"}}Lights{{/crossLink}} to attach to this GameObject. Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this GameObject. Defaults to the
 parent {{#crossLink "Scene"}}Scene{{/crossLink}}'s default instance, {{#crossLink "Scene/lights:property"}}lights{{/crossLink}}.
 @param [cfg.material] {String|Material} ID or instance of a {{#crossLink "Material"}}Material{{/crossLink}} to attach to this GameObject. Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this GameObject. Defaults to the
 parent {{#crossLink "Scene"}}Scene{{/crossLink}}'s default instance, {{#crossLink "Scene/material:property"}}material{{/crossLink}}.
 @param [cfg.morphTargets] {String|MorphTargets} ID or instance of a {{#crossLink "MorphTargets"}}MorphTargets{{/crossLink}} to attach to this GameObject. Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this GameObject. Defaults to the parent {{#crossLink "Scene"}}Scene{{/crossLink}}'s
 default instance, {{#crossLink "Scene/morphTargets:property"}}morphTargets{{/crossLink}}.
 @param [cfg.reflect] {String|Reflect} ID or instance of a {{#crossLink "CubeMap"}}CubeMap{{/crossLink}} to attach to this GameObject. Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this GameObject. Defaults to the parent {{#crossLink "Scene"}}Scene{{/crossLink}}'s default instance,
 {{#crossLink "Scene/reflect:property"}}reflection{{/crossLink}}.
 @param [cfg.shader] {String|Shader} ID or instance of a {{#crossLink "Shader"}}Shader{{/crossLink}} to attach to this GameObject. Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this GameObject. Defaults to the parent {{#crossLink "Scene"}}Scene{{/crossLink}}'s default instance,
 {{#crossLink "Scene/shader:property"}}shader{{/crossLink}}.
 @param [cfg.shaderParams] {String|ShaderParams} ID or instance of a {{#crossLink "ShaderParams"}}ShaderParams{{/crossLink}} to attach to this GameObject. Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this GameObject. Defaults to the parent {{#crossLink "Scene"}}Scene{{/crossLink}}'s default instance,
 {{#crossLink "Scene/shaderParams:property"}}shaderParams{{/crossLink}}.
 @param [cfg.stage] {String|Stage} ID or instance of of a {{#crossLink "Stage"}}Stage{{/crossLink}} to attach to this GameObject. Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this GameObject. Defaults to the parent {{#crossLink "Scene"}}Scene{{/crossLink}}'s default instance,
 {{#crossLink "Scene/stage:property"}}stage{{/crossLink}}.
 @param [cfg.transform] {String|Transform} ID or instance of a modelling transform to attach to this GameObject. Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this GameObject. Defaults to the parent {{#crossLink "Scene"}}Scene{{/crossLink}}'s default instance,
 {{#crossLink "Scene/transform:property"}}transform{{/crossLink}} (which is an identity matrix which performs no transformation).
 @extends Component
 */

/**
 * Fired when this GameObject is *picked* via a call to the {{#crossLink "Canvas/pick:method"}}{{/crossLink}} method
 * on the parent {{#crossLink "Scene"}}Scene{{/crossLink}}'s {{#crossLink "Canvas"}}Canvas {{/crossLink}}.
 * @event picked
 * @param {String} objectId The ID of this GameObject.
 * @param {Number} canvasX The X-axis Canvas coordinate that was picked.
 * @param {Number} canvasY The Y-axis Canvas coordinate that was picked.
 */
(function () {

    "use strict";

    XEO.GameObject = XEO.Component.extend({

        type: "XEO.GameObject",

        _init: function (cfg) {

            this.camera = cfg.camera;
            this.clips = cfg.clips;
            this.colorTarget = cfg.colorTarget;
            this.colorBuf = cfg.colorBuf;
            this.depthTarget = cfg.depthTarget;
            this.depthBuf = cfg.depthBuf;
            this.visibility = cfg.visibility;
            this.modes = cfg.modes;
            this.geometry = cfg.geometry;
            this.layer = cfg.layer;
            this.lights = cfg.lights;
            this.material = cfg.material;
            this.morphTargets = cfg.morphTargets;
            this.reflect = cfg.reflect;
            this.shader = cfg.shader;
            this.shaderParams = cfg.shaderParams;
            this.stage = cfg.stage;
            this.transform = cfg.transform;

            // Cached boundary for each coordinate space

            this._worldBoundary = null;
            this._viewBoundary = null;
            this._canvasBoundary = null;

            this._worldBoundaryDirty = true;
            this._viewBoundaryDirty = true;
            this._canvasBoundaryDirty = true;
        },

        _props: {

            /**
             * The {{#crossLink "Camera"}}Camera{{/crossLink}} attached to this GameObject.
             *
             * Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this GameObject. Defaults to the parent
             * {{#crossLink "Scene"}}Scene{{/crossLink}}'s default {{#crossLink "Scene/camera:property"}}camera{{/crossLink}} when set to
             * a null or undefined value.
             *
             * Fires a {{#crossLink "GameObject/camera:event"}}{{/crossLink}} event on change.
             *
             * @property camera
             * @type Camera
             */
            camera: {

                set: function (value) {

                    // Invalidate cached World-space bounding boxes

                    this._setWorldBoundaryDirty();

                    // Unsubscribe from old Cameras's events

                    var oldCamera = this._children.camera;

                    if (oldCamera && (!value || (value.id !== undefined ? value.id : value) !== oldCamera.id)) {
                        oldCamera.off(this._onCameraDestroyed);
                        oldCamera.off(this._onCameraView);
                        oldCamera.off(this._onCameraViewMatrix);
                    }

                    /**
                     * Fired whenever this GameObject's  {{#crossLink "GameObject/camera:property"}}{{/crossLink}} property changes.
                     *
                     * @event camera
                     * @param value The property's new value
                     */
                    this._setChild("camera", value);

                    var newCamera = this._children.camera;

                    if (newCamera) {

                        // Subscribe to new Camera's events

                        // World-space boundary is dirty when new Camera's - (TODO)

                        var self = this;

                        this._onCameraView = newCamera.on("view",
                            function () {
                                self._setWorldBoundaryDirty();
                            });

                        this._onCameraDestroyed = newCamera.on("destroyed",
                            function () {
                                self._setWorldBoundaryDirty();
                            });
                    }
                },

                get: function () {
                    return this._children.camera;
                }
            },

            /**
             * The {{#crossLink "Clips"}}Clips{{/crossLink}} attached to this GameObject.
             *
             * Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this GameObject. Defaults to the parent
             * {{#crossLink "Scene"}}Scene{{/crossLink}}'s default {{#crossLink "Scene/clips:property"}}clips{{/crossLink}} when set to
             * a null or undefined value.
             *
             * Fires a {{#crossLink "GameObject/clips:event"}}{{/crossLink}} event on change.
             *
             * @property clips
             * @type Clips
             */
            clips: {

                set: function (value) {

                    /**
                     * Fired whenever this GameObject's  {{#crossLink "GameObject/clips:property"}}{{/crossLink}} property changes.
                     * @event clips
                     * @param value The property's new value
                     */
                    this._setChild("clips", value);
                },

                get: function () {
                    return this._children.clips;
                }
            },

            /**
             * The {{#crossLink "ColorTarget"}}ColorTarget{{/crossLink}} attached to this GameObject.
             *
             * Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this GameObject. Defaults to the parent
             * {{#crossLink "Scene"}}Scene{{/crossLink}}'s default {{#crossLink "Scene/colorTarget:property"}}colorTarget{{/crossLink}} when set to
             * a null or undefined value.
             *
             * Fires a {{#crossLink "GameObject/colorTarget:event"}}{{/crossLink}} event on change.
             *
             * @property colorTarget
             * @type ColorTarget
             */
            colorTarget: {

                set: function (value) {

                    /**
                     * Fired whenever this GameObject's  {{#crossLink "GameObject/colorTarget:property"}}{{/crossLink}} property changes.
                     * @event colorTarget
                     * @param value The property's new value
                     */
                    this._setChild("colorTarget", value);
                },

                get: function () {
                    return this._children.colorTarget;
                }
            },

            /**
             * The {{#crossLink "ColorBuf"}}ColorBuf{{/crossLink}} attached to this GameObject.
             *
             * Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this GameObject. Defaults to the parent
             * {{#crossLink "Scene"}}Scene{{/crossLink}}'s default {{#crossLink "Scene/colorBuf:property"}}colorBuf{{/crossLink}} when set to
             * a null or undefined value.
             *
             * Fires a {{#crossLink "GameObject/colorBuf:event"}}{{/crossLink}} event on change.
             *
             * @property colorBuf
             * @type ColorBuf
             */
            colorBuf: {

                set: function (value) {

                    /**
                     * Fired whenever this GameObject's  {{#crossLink "GameObject/colorBuf:property"}}{{/crossLink}} property changes.
                     *
                     * @event colorBuf
                     * @param value The property's new value
                     */
                    this._setChild("colorBuf", value);
                },

                get: function () {
                    return this._children.colorBuf;
                }
            },

            /**
             * The {{#crossLink "DepthTarget"}}DepthTarget{{/crossLink}} attached to this GameObject.
             *
             * Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this GameObject. Defaults to the parent
             * {{#crossLink "Scene"}}Scene{{/crossLink}}'s default {{#crossLink "Scene/depthTarget:property"}}depthTarget{{/crossLink}} when set to
             * a null or undefined value.
             *
             * Fires a {{#crossLink "GameObject/depthTarget:event"}}{{/crossLink}} event on change.
             *
             * @property depthTarget
             * @type DepthTarget
             */
            depthTarget: {

                set: function (value) {

                    /**
                     * Fired whenever this GameObject's  {{#crossLink "GameObject/depthTarget:property"}}{{/crossLink}} property changes.
                     *
                     * @event depthTarget
                     * @param value The property's new value
                     */
                    this._setChild("depthTarget", value);
                },

                get: function () {
                    return this._children.depthTarget;
                }
            },

            /**
             * The {{#crossLink "DepthBuf"}}DepthBuf{{/crossLink}} attached to this GameObject.
             *
             * Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this GameObject. Defaults to the
             * parent {{#crossLink "Scene"}}Scene{{/crossLink}}'s default {{#crossLink "Scene/depthBuf:property"}}depthBuf{{/crossLink}} when set to
             * a null or undefined value.
             *
             * Fires a {{#crossLink "GameObject/depthBuf:event"}}{{/crossLink}} event on change.
             *
             * @property depthBuf
             * @type DepthBuf
             */
            depthBuf: {

                set: function (value) {

                    /**
                     * Fired whenever this GameObject's  {{#crossLink "GameObject/depthBuf:property"}}{{/crossLink}} property changes.
                     *
                     * @event depthBuf
                     * @param value The property's new value
                     */
                    this._setChild("depthBuf", value);
                },

                get: function () {
                    return this._children.depthBuf;
                }
            },

            /**
             * The {{#crossLink "Visibility"}}Visibility{{/crossLink}} attached to this GameObject.
             *
             * Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this GameObject. Defaults to the parent
             * {{#crossLink "Scene"}}Scene{{/crossLink}}'s default {{#crossLink "Scene/visibility:property"}}visibility{{/crossLink}} when set to
             * a null or undefined value.
             *
             * Fires a {{#crossLink "GameObject/visibility:event"}}{{/crossLink}} event on change.
             *
             * @property visibility
             * @type Visibility
             */
            visibility: {

                set: function (value) {

                    /**
                     * Fired whenever this GameObject's  {{#crossLink "GameObject/visibility:property"}}{{/crossLink}} property changes.
                     *
                     * @event visibility
                     * @param value The property's new value
                     */
                    this._setChild("visibility", value);
                },

                get: function () {
                    return this._children.visibility;
                }
            },

            /**
             * The {{#crossLink "Modes"}}Modes{{/crossLink}} attached to this GameObject.
             *
             * Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this GameObject. Defaults to the parent
             * {{#crossLink "Scene"}}Scene{{/crossLink}}'s default {{#crossLink "Scene/modes:property"}}modes{{/crossLink}} when set to
             * a null or undefined value.
             *
             * Fires a {{#crossLink "GameObject/modes:event"}}{{/crossLink}} event on change.
             *
             * @property modes
             * @type Modes
             */
            modes: {

                set: function (value) {

                    /**
                     * Fired whenever this GameObject's {{#crossLink "GameObject/modes:property"}}{{/crossLink}} property changes.
                     *
                     * @event modes
                     * @param value The property's new value
                     */
                    this._setChild("modes", value);
                },

                get: function () {
                    return this._children.modes;
                }
            },

            /**
             * The {{#crossLink "Geometry"}}Geometry{{/crossLink}} attached to this GameObject.
             *
             * Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this GameObject. Defaults to the parent
             * {{#crossLink "Scene"}}Scene{{/crossLink}}'s default {{#crossLink "Scene/geometry:property"}}camera{{/crossLink}}
             * (a simple box) when set to a null or undefined value.
             *
             * Fires a {{#crossLink "GameObject/geometry:event"}}{{/crossLink}} event on change.
             *
             * Updates {{#crossLink "GameObject/boundary"}}{{/crossLink}},
             * {{#crossLink "GameObject/worldObb"}}{{/crossLink}} and
             * {{#crossLink "GameObject/center"}}{{/crossLink}}
             *
             * @property geometry
             * @type Geometry
             */
            geometry: {

                set: function (value) {

                    // Invalidate cached World-space bounding boxes

                    this._setWorldBoundaryDirty();

                    // Unsubscribe from old Geometry's events

                    var oldGeometry = this._children.geometry;

                    if (oldGeometry) {

                        if (!value || (value.id !== undefined ? value.id : value) != oldGeometry.id) {

                            oldGeometry.off(this._onGeometryDirty);
                            oldGeometry.off(this._onGeometryPositions);
                            oldGeometry.off(this._onGeometryDestroyed);
                        }
                    }

                    /**
                     * Fired whenever this GameObject's  {{#crossLink "GameObject/geometry:property"}}{{/crossLink}} property changes.
                     *
                     * @event geometry
                     * @param value The property's new value
                     */
                    this._setChild("geometry", value);

                    var newGeometry = this._children.geometry;

                    if (newGeometry) {

                        // Subscribe to new Geometry's events

                        // World-space boundary is dirty when new Geometry's
                        // positions are updated or Geometry is destroyed.

                        var self = this;

                        this._onGeometryDirty = newGeometry.on("dirty",
                            function () {
                                self.fire("dirty", true);
                            });

                        this._onGeometryPositions = newGeometry.on("positions",
                            function () {
                                self._setWorldBoundaryDirty();
                            });

                        this._onGeometryDestroyed = newGeometry.on("destroyed",
                            function () {
                                self._setWorldBoundaryDirty();
                            });
                    }
                },

                get: function () {
                    return this._children.geometry;
                }
            },

            /**
             * The {{#crossLink "Layer"}}Layer{{/crossLink}} attached to this GameObject.
             *
             * Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this GameObject. Defaults to the parent
             * {{#crossLink "Scene"}}Scene{{/crossLink}}'s default {{#crossLink "Scene/layer:property"}}layer{{/crossLink}} when set to
             * a null or undefined value.
             *
             * Fires a {{#crossLink "GameObject/layer:event"}}{{/crossLink}} event on change.
             *
             * @property layer
             * @type Layer
             */
            layer: {

                set: function (value) {

                    /**
                     * Fired whenever this GameObject's  {{#crossLink "GameObject/layer:property"}}{{/crossLink}} property changes.
                     *
                     * @event layer
                     * @param value The property's new value
                     */
                    this._setChild("layer", value);
                },

                get: function () {
                    return this._children.layer;
                }
            },

            /**
             * The {{#crossLink "Lights"}}Lights{{/crossLink}} attached to this GameObject.
             *
             * Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this GameObject. Defaults to the parent
             * {{#crossLink "Scene"}}Scene{{/crossLink}}'s default {{#crossLink "Scene/lights:property"}}lights{{/crossLink}} when set to
             * a null or undefined value.
             *
             * Fires a {{#crossLink "GameObject/lights:event"}}{{/crossLink}} event on change.
             *
             * @property lights
             * @type Lights
             */
            lights: {

                set: function (value) {

                    /**
                     * Fired whenever this GameObject's  {{#crossLink "GameObject/lights:property"}}{{/crossLink}} property changes.
                     *
                     * @event lights
                     * @param value The property's new value
                     */
                    this._setChild("lights", value);
                },

                get: function () {
                    return this._children.lights;
                }
            },

            /**
             * The {{#crossLink "Material"}}Material{{/crossLink}} attached to this GameObject.
             *
             * Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this GameObject. Defaults to the parent
             * {{#crossLink "Scene"}}Scene{{/crossLink}}'s default {{#crossLink "Scene/material:property"}}material{{/crossLink}} when set to
             * a null or undefined value.
             *
             * Fires a {{#crossLink "GameObject/material:event"}}{{/crossLink}} event on change.
             *
             * @property material
             * @type Material
             */
            material: {

                set: function (value) {

                    /**
                     * Fired whenever this GameObject's  {{#crossLink "GameObject/material:property"}}{{/crossLink}} property changes.
                     *
                     * @event material
                     * @param value The property's new value
                     */
                    this._setChild("material", value);
                },

                get: function () {
                    return this._children.material;
                }
            },

            /**
             * The {{#crossLink "MorphTargets"}}MorphTargets{{/crossLink}} attached to this GameObject.
             *
             * Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this GameObject. Defaults to the parent
             * {{#crossLink "Scene"}}Scene{{/crossLink}}'s default {{#crossLink "Scene/morphTargets:property"}}morphTargets{{/crossLink}} when set to
             * a null or undefined value.
             *
             * Fires a {{#crossLink "GameObject/morphTargets:event"}}{{/crossLink}} event on change.
             *
             * @property morphTargets
             * @type MorphTargets
             */
            morphTargets: {

                set: function (value) {

                    /**
                     * Fired whenever this GameObject's  {{#crossLink "GameObject/morphTargets:property"}}{{/crossLink}} property changes.
                     * @event morphTargets
                     * @param value The property's new value
                     */
                    this._setChild("morphTargets", value);
                },

                get: function () {
                    return this._children.morphTargets;
                }
            },

            /**
             * The {{#crossLink "Reflect"}}Reflect{{/crossLink}} attached to this GameObject.
             *
             * Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this GameObject. Defaults to the parent
             * {{#crossLink "Scene"}}Scene{{/crossLink}}'s default {{#crossLink "Scene/reflect:property"}}reflect{{/crossLink}} when set to
             * a null or undefined value.
             *
             * Fires a {{#crossLink "GameObject/reflect:event"}}{{/crossLink}} event on change.
             *
             * @property reflect
             * @type Reflect
             */
            reflect: {

                set: function (value) {

                    /**
                     * Fired whenever this GameObject's  {{#crossLink "GameObject/reflect:property"}}{{/crossLink}} property changes.
                     *
                     * @event reflect
                     * @param value The property's new value
                     */
                    this._setChild("reflect", value);
                },

                get: function () {
                    return this._children.reflect;
                }
            },

            /**
             * The {{#crossLink "Shader"}}Shader{{/crossLink}} attached to this GameObject.
             *
             * Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this GameObject. Defaults to the parent
             * {{#crossLink "Scene"}}Scene{{/crossLink}}'s default {{#crossLink "Scene/shader:property"}}shader{{/crossLink}} when set to
             * a null or undefined value.
             *
             * Fires a {{#crossLink "GameObject/shader:event"}}{{/crossLink}} event on change.
             *
             * @property shader
             * @type Shader
             */
            shader: {

                set: function (value) {

                    /**
                     * Fired whenever this GameObject's  {{#crossLink "GameObject/shader:property"}}{{/crossLink}} property changes.
                     * @event shader
                     * @param value The property's new value
                     */
                    this._setChild("shader", value);
                },

                get: function () {
                    return this._children.shader;
                }
            },

            /**
             * The {{#crossLink "ShaderParams"}}ShaderParams{{/crossLink}} attached to this GameObject.
             *
             * Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this GameObject. Defaults to the parent
             * {{#crossLink "Scene"}}Scene{{/crossLink}}'s default {{#crossLink "Scene/shaderParams:property"}}shaderParams{{/crossLink}} when set to
             * a null or undefined value.
             *
             * Fires a {{#crossLink "GameObject/shaderParams:event"}}{{/crossLink}} event on change.
             *
             * @property shaderParams
             * @type ShaderParams
             */
            shaderParams: {

                set: function (value) {

                    /**
                     * Fired whenever this GameObject's  {{#crossLink "GameObject/shaderParams:property"}}{{/crossLink}} property changes.
                     *
                     * @event shaderParams
                     * @param value The property's new value
                     */
                    this._setChild("shaderParams", value);
                },

                get: function () {
                    return this._children.shaderParams;
                }
            },

            /**
             * The {{#crossLink "Stage"}}Stage{{/crossLink}} attached to this GameObject.
             *
             * Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this GameObject. Defaults to the parent
             * {{#crossLink "Scene"}}Scene{{/crossLink}}'s default {{#crossLink "Scene/stage:property"}}stage{{/crossLink}} when set to
             * a null or undefined value.
             *
             * Fires a {{#crossLink "GameObject/stage:event"}}{{/crossLink}} event on change.
             *
             * @property stage
             * @type Stage
             */
            stage: {

                set: function (value) {

                    /**
                     * Fired whenever this GameObject's  {{#crossLink "GameObject/stage:property"}}{{/crossLink}} property changes.
                     *
                     * @event stage
                     * @param value The property's new value
                     */
                    this._setChild("stage", value);
                },

                get: function () {
                    return this._children.stage;
                }
            },

            /**
             * The Model-to-World-space transform attached to this GameObject.
             *
             * Must be within the same {{#crossLink "Scene"}}Scene{{/crossLink}} as this GameObject. Defaults to the parent
             * {{#crossLink "Scene"}}Scene{{/crossLink}}'s default {{#crossLink "Scene/transform:property"}}transform{{/crossLink}}
             * (an identity matrix) when set to a null or undefined value.
             *
             * Fires a {{#crossLink "GameObject/transform:event"}}{{/crossLink}} event on change.
             *
             * Updates {{#crossLink "GameObject/boundary"}}{{/crossLink}},
             * {{#crossLink "GameObject/worldObb"}}{{/crossLink}} and
             * {{#crossLink "GameObject/center"}}{{/crossLink}}
             *
             * @property transform
             * @type Component
             */
            transform: {

                set: function (value) {

                    // Invalidate cached World-space bounding boxes

                    this._setWorldBoundaryDirty();

                    // Unsubscribe from old Transform's events

                    var oldTransform = this._children.transform;

                    if (oldTransform && (!value || value.id !== oldTransform.id)) {
                        oldTransform.off(this._onTransformMatrix);
                        oldTransform.off(this._onTransformDestroyed);
                    }

                    /**
                     * Fired whenever this GameObject's {{#crossLink "GameObject/transform:property"}}{{/crossLink}}
                     * property changes.
                     *
                     * @event transform
                     * @param value The property's new value
                     */
                    this._setChild("transform", value);

                    // Subscribe to new Transform's events

                    var newTransform = this._children.transform;

                    if (newTransform) {

                        // World-space boundary is dirty when Transform's
                        // matrix is updated or Transform is destroyed.

                        var self = this;

                        this._onTransformMatrix = newTransform.on("matrix",
                            function () {
                                self._setWorldBoundaryDirty();
                            });

                        this._onTransformDestroyed = newTransform.on("destroyed",
                            function () {
                                self._setWorldBoundaryDirty();
                            });
                    }
                },

                get: function () {
                    return this._children.transform;
                }
            },

            /**
             * World-space 3D boundary.
             *
             * If you call {{#crossLink "Component/destroy:method"}}{{/crossLink}} on this boundary, then
             * this property will be assigned to a fresh {{#crossLink "Boundary3D"}}{{/crossLink}} instance next
             * time you reference it.
             *
             * @property worldBoundary
             * @type Boundary3D
             * @final
             */
            worldBoundary: {

                get: function () {

                    if (!this._worldBoundary) {

                        var self = this;

                        this._worldBoundary = new XEO.Boundary3D(this.scene, {

                            getDirty: function () {
                                return self._worldBoundaryDirty;
                            },

                            getOBB: function () {

                                // Calls our Geometry's modelBoundary property,
                                // lazy-inits the boundary and its obb

                                return self._children.geometry.modelBoundary.obb;
                            },

                            getMatrix: function () {
                                return self._children.transform.matrix;
                            }
                        });

                        this._worldBoundary.on("destroyed",
                            function () {
                                self._worldBoundary = null;
                            });

                        this._setWorldBoundaryDirty();
                    }

                    return this._worldBoundary;
                }
            },

            /**
             * View-space 3D boundary.
             *
             * If you call {{#crossLink "Component/destroy:method"}}{{/crossLink}} on this boundary, then
             * this property will be assigned to a fresh {{#crossLink "Boundary3D"}}{{/crossLink}} instance
             * next time you reference it.
             *
             * @property viewBoundary
             * @type Boundary3D
             * @final
             */
            viewBoundary: {

                get: function () {

                    if (!this._viewBoundary) {

                        var self = this;

                        this._viewBoundary = new XEO.Boundary3D(this.scene, {

                            getDirty: function () {
                                return self._viewBoundaryDirty;
                            },

                            getOBB: function () {

                                // Calls our worldBoundary property,
                                // lazy-inits the boundary and its obb

                                return self.worldBoundary.obb;
                            },

                            getMatrix: function () {
                                return self._children.camera.view.matrix;
                            }
                        });

                        this._viewBoundary.on("destroyed",
                            function () {
                                self._viewBoundary = null;
                            });

                        this._setViewBoundaryDirty();
                    }

                    return this._viewBoundary;
                }
            }
        },

        _setWorldBoundaryDirty: function () {
            this._worldBoundaryDirty = true;
            this._viewBoundaryDirty = true;
            if (this._worldBoundary) {
                this._worldBoundary.fire("updated", true);
            }
            if (this._viewBoundary) {
                this._viewBoundary.fire("updated", true);
            }
        },

        _setViewBoundaryDirty: function () {
            this._viewBoundaryDirty = true;
            if (this._viewBoundary) {
                this._viewBoundary.fire("updated", true);
            }
        },

        _compile: function () {

            var children = this._children;

            children.camera._compile();
            children.clips._compile();
            children.colorTarget._compile();
            children.colorBuf._compile();
            children.depthTarget._compile();
            children.depthBuf._compile();
            children.visibility._compile();
            children.modes._compile();
            children.geometry._compile();
            children.layer._compile();
            children.lights._compile();
            children.material._compile();
            //children.morphTargets._compile();
            children.reflect._compile();
            children.shader._compile();
            children.shaderParams._compile();
            children.stage._compile();
            children.transform._compile();

            // (Re)build this GameObject in the renderer

            this._renderer.buildObject(this.id);
        },

        _getJSON: function () {
            return {
                camera: this.camera.id,
                clips: this.clips.id,
                colorTarget: this.colorTarget.id,
                colorBuf: this.colorBuf.id,
                depthTarget: this.depthTarget.id,
                depthBuf: this.depthBuf.id,
                visibility: this.visibility.id,
                modes: this.modes.id,
                geometry: this.geometry.id,
                layer: this.layer.id,
                lights: this.lights.id,
                material: this.material.id,
                //  morphTargets: this.morphTargets.id,
                reflect: this.reflect.id,
                shader: this.shader.id,
                shaderParams: this.shaderParams.id,
                stage: this.stage.id,
                transform: this.transform.id
            };
        },

        _destroy: function () {

            if (this._children.transform) {
                this._children.transform.off(this._onTransformMatrix);
                this._children.transform.off(this._onTransformDestroyed);
            }

            if (this._children.geometry) {
                this._children.geometry.off(this._onGeometryDirty);
                this._children.geometry.off(this._onGeometryPositions);
                this._children.geometry.off(this._onGeometryDestroyed);
            }

            if (this._worldBoundary) {
                this._worldBoundary.destroy();
            }

            if (this._viewBoundary) {
                this._viewBoundary.destroy();
            }

            this._renderer.removeObject(this.id);
        }
    });

})();
;/**
 * Components that influence the way objects are rendered on WebGL.
 *
 * @module XEO
 * @submodule rendering
 */;/**
 A **Canvas** manages a {{#crossLink "Scene"}}Scene{{/crossLink}}'s HTML canvas and its WebGL context.

 ## Overview

 <ul>

 <li>Each {{#crossLink "Scene"}}Scene{{/crossLink}} provides a Canvas as a read-only property on itself.</li>

 <li>When a {{#crossLink "Scene"}}Scene{{/crossLink}} is configured with the ID of
 an existing <a href="http://www.w3.org/TR/html5/scripting-1.html#the-canvas-element">HTMLCanvasElement</a>, then
 the Canvas will bind to that, otherwise the Canvas will automatically create its own.</li>

 <li>A Canvas will fire a {{#crossLink "Canvas/resized:event"}}{{/crossLink}} event whenever
 the <a href="http://www.w3.org/TR/html5/scripting-1.html#the-canvas-element">HTMLCanvasElement</a> resizes.</li>

 <li>A Canvas is responsible for obtaining a WebGL context from
 the <a href="http://www.w3.org/TR/html5/scripting-1.html#the-canvas-element">HTMLCanvasElement</a>.</li>

 <li>A Canvas also fires a {{#crossLink "Canvas/webglContextLost:event"}}{{/crossLink}} event when the WebGL context is
 lost, and a {{#crossLink "Canvas/webglContextRestored:event"}}{{/crossLink}} when it is restored again.</li>

 <li>The various components within the parent {{#crossLink "Scene"}}Scene{{/crossLink}} will transparently recover on
 the {{#crossLink "Canvas/webglContextRestored:event"}}{{/crossLink}} event.</li>

 </ul>

 <img src="../../../assets/images/Canvas.png"></img>

 ## Example

 In the example below, we're creating a {{#crossLink "Scene"}}Scene{{/crossLink}} without specifying an HTML canvas element
 for it. This causes the {{#crossLink "Scene"}}Scene{{/crossLink}}'s Canvas component to create its own default element
 within the page. Then we subscribe to various events fired by that Canvas component.

 ```` javascript
 var scene = new XEO.Scene();

 // Get the Canvas off the Scene
 // Since we did not configure the Scene with the ID of a DOM canvas element,
 // the Canvas will create its own canvas element in the DOM
 var canvas = scene.canvas;

 // Get the WebGL context off the Canvas
 var gl = canvas.gl;

 // Subscribe to Canvas resize events
 canvas.on("resize", function(e) {
        var width = e.width;
        var height = e.height;
        var aspect = e.aspect;
        //...
     });

 // Subscribe to WebGL context loss events on the Canvas
 canvas.on("webglContextLost", function() {
        //...
     });

 // Subscribe to WebGL context restored events on the Canvas
 canvas.on("webglContextRestored", function(gl) {
        var newContext = gl;
        //...
     });
 ````

 When we want to bind the Canvas to an existing HTML canvas element, configure the
 {{#crossLink "Scene"}}{{/crossLink}} with the ID of the element, like this:

 ```` javascript
 // Create a Scene, this time configuting it with the
 // ID of an existing DOM canvas element
 var scene = new XEO.Scene({
          canvasId: "myCanvas"
     });

 // ..and the rest of this example can be the same as the previous example.

 ````
 @class Canvas
 @module XEO
 @submodule rendering
 @static
 @param {Scene} scene Parent scene
 @extends Component
 */
(function () {

    "use strict";

    var canvases = {};

    XEO.Canvas = XEO.Component.extend({

        type: "XEO.Canvas",

        serializable: false,

        // Names of recognised WebGL contexts
        _WEBGL_CONTEXT_NAMES: [
            "webgl",
            "experimental-webgl",
            "webkit-3d",
            "moz-webgl",
            "moz-glweb20"
        ],

        _init: function (cfg) {

            /**
             * The HTML canvas. When the {{#crossLink "Viewer"}}{{/crossLink}} was configured with the ID of an existing canvas within the DOM,
             * then this property will be that element, otherwise it will be a full-page canvas that this Canvas has
             * created by default.
             *
             * @property canvas
             * @type {HTMLCanvasElement}
             * @final
             */
            this.canvas = null;

            /**
             * The WebGL rendering context, obtained by this Canvas from the HTML 5 canvas.
             *
             * @property gl
             * @type {WebGLRenderingContext}
             * @final
             */
            this.gl = null;

            /**
             * Attributes for the WebGL context
             *
             * @type {{}|*}
             */
            this.contextAttr = cfg.contextAttr || {};

            if (!cfg.canvas) {

                // Canvas not supplied, create one automatically

                this._createCanvas();

            } else {

                // Canvas supplied

                if (XEO._isString(cfg.canvas)) {

                    // Canvas ID supplied - find the canvas

                    this.canvas = document.getElementById(cfg.canvas);

                    if (!this.canvas) {

                        // Canvas not found - create one automatically

                        this.error("Canvas element not found: " + XEO._inQuotes(cfg.canvas)
                            + " - creating default canvas instead.");

                        this._createCanvas();
                    }

                } else {

                    this.error("Config 'canvasId' should be a string - "
                        + "creating default canvas instead.");

                    this._createCanvas();
                }
            }

            if (!this.canvas) {

                this.error("Faied to create canvas");

                return;
            }

            // If the canvas uses css styles to specify the sizes make sure the basic
            // width and height attributes match or the WebGL context will use 300 x 150

            this.canvas.width = this.canvas.clientWidth;
            this.canvas.height = this.canvas.clientHeight;

            // Get WebGL context

            this._initWebGL();

            // Bind context loss and recovery handlers

            var self = this;

            this.canvas.addEventListener("webglcontextlost",
                function () {

                    /**
                     * Fired wheneber the WebGL context has been lost
                     * @event webglContextLost
                     */
                    self.fire("webglContextLost");
                },
                false);

            this.canvas.addEventListener("webglcontextrestored",
                function () {
                    self._initWebGL();
                    if (self.gl) {

                        /**
                         * Fired whenever the WebGL context has been restored again after having previously being lost
                         * @event webglContextRestored
                         * @param value The WebGL context object
                         */
                        self.fire("webglContextRestored", self.gl);
                    }
                },
                false);

            // Publish canvas size changes on each scene tick

            var lastWidth = this.canvas.width;
            var lastHeight = this.canvas.height;

            this._tick = this.scene.on("tick",
                function () {

                    var canvas = self.canvas;

                    if (canvas.width !== lastWidth || canvas.height !== lastHeight) {

                        lastWidth = canvas.width;
                        lastHeight = canvas.height;

                        /**
                         * Fired whenever the canvas has resized
                         * @event resized
                         * @param width {Number} The new canvas width
                         * @param height {Number} The new canvas height
                         * @param aspect {Number} The new canvas aspect ratio
                         */
                        self.fire("resized", {
                            width: canvas.width,
                            height: canvas.height,
                            aspect: canvas.height / canvas.width
                        });
                    }
                });

            this.canvas.oncontextmenu = function (e) {
                e.preventDefault();
            };
        },

        /**
         * Creates a canvas in the DOM
         * @private
         */
        _createCanvas: function () {

            var canvasId = "XEO-canvas-" + XEO.math.createUUID();
            var body = document.getElementsByTagName("body")[0];
            var div = document.createElement('div');

            var style = div.style;
            style.height = "600px";
            style.width = "600px";
            style.padding = "0";
            style.margin = "0";
            style.background = "black";
            style.float = "left";
            //style.left = "0";
            //style.top = "0";
            // style.position = "absolute";
            // style["z-index"] = "10000";

            div.innerHTML += '<canvas id="' + canvasId + '" style="width: 100%; height: 100%; float: left; margin: 0; padding: 0;"></canvas>';

            body.appendChild(div);

            this.canvas = document.getElementById(canvasId);
        },

        /**
         * Initialises the WebGL context
         */
        _initWebGL: function () {

            for (var i = 0; !this.gl && i < this._WEBGL_CONTEXT_NAMES.length; i++) {
                try {
                    this.gl = this.canvas.getContext(this._WEBGL_CONTEXT_NAMES[i], this.contextAttr);
                } catch (e) { // Try with next context name
                }
            }

            if (!this.gl) {

                this.error('Failed to get a WebGL context');

                /**
                 * Fired whenever the canvas failed to get a WebGL context, which probably means that WebGL
                 * is either unsupported or has been disabled.
                 * @event webglContextFailed
                 */
                this.fire("webglContextFailed", true, true);

                // TODO: render message in canvas


            }
        },

        _destroy: function () {
            this.scene.off(this._tick);
        }
    });

})();
;/**
 A **ColorBuf** configures the WebGL color buffer for attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.

 ## Overview

 <ul>

 <li>A ColorBuf configures **the way** that pixels are written to the WebGL color buffer.</li>
 <li>ColorBuf is not to be confused with {{#crossLink "ColorTarget"}}ColorTarget{{/crossLink}}, which stores rendered pixel
 colors for consumption by {{#crossLink "Texture"}}Textures{{/crossLink}}, used when performing *render-to-texture*.</li>

 </ul>

 <img src="../../../assets/images/ColorBuf.png"></img>

 ## Example

 In this example we're configuring the WebGL color buffer for a {{#crossLink "GameObject"}}{{/crossLink}}.

 This example scene contains:

 <ul>
 <li>a ColorBuf that enables blending and sets the color mask,</li>
 <li>a {{#crossLink "Geometry"}}{{/crossLink}} that is the default box shape, and
 <li>a {{#crossLink "GameObject"}}{{/crossLink}} attached to all of the above.</li>
 </ul>

 ````javascript
 var scene = new XEO.Scene();

 var colorBuf = new XEO.ColorBuf(scene, {
    blendEnabled: true,
    colorMask: [true, true, true, true]
});

 var geometry = new XEO.Geometry(scene); // Defaults to a 2x2x2 box

 var gameObject = new XEO.GameObject(scene, {
    colorBuf: colorBuf,
    geometry: geometry
});
 ````

 @class ColorBuf
 @module XEO
 @submodule rendering
 @constructor
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}Scene{{/crossLink}}, creates this ColorBuf within the
 default {{#crossLink "Scene"}}Scene{{/crossLink}} when omitted.
 @param [cfg] {*} ColorBuf configuration
 @param [cfg.id] {String} Optional ID, unique among all components in the parent {{#crossLink "Scene"}}Scene{{/crossLink}}, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this ColorBuf.
 @param [cfg.blendEnabled=false] {Boolean} Indicates if blending is enabled.
 @param [cfg.colorMask=[true, true, true, true]] {Array of Boolean} The color mask,
 @extends Component
 */
(function () {

    "use strict";

    XEO.ColorBuf = XEO.Component.extend({

        type: "XEO.ColorBuf",

        _init: function (cfg) {

            this._state = new XEO.renderer.ColorBuf({
                blendEnabled: false,
                colorMask: [true, true, true, true]
            });

            this.blendEnabled = cfg.blendEnabled;
            this.colorMask = cfg.colorMask;
        },

        _props: {

            /**
             * Indicates if blending is enabled for this ColorBuf.
             *
             * Fires a {{#crossLink "ColorBuf/blendEnabled:event"}}{{/crossLink}} event on change.
             *
             * @property blendEnabled
             * @default false
             * @type Boolean
             */
            blendEnabled: {

                set: function (value) {

                    this._state.blendEnabled = value === true;

                    this._renderer.imageDirty = true;

                    /**
                     Fired whenever this ColorBuf's {{#crossLink "ColorBuf/blendEnabled:property"}}{{/crossLink}} property changes.

                     @event blendEnabled
                     @param value {Boolean} The property's new value
                     */
                    this.fire("blendEnabled", this._state.blendEnabled);
                },

                get: function () {
                    return this._state.blendEnabled;
                }
            },

            /**
             * Specifies whether red, green, blue, and alpha can or cannot be written into the frame buffer.
             *
             * Fires a {{#crossLink "ColorBuf/colorMask:event"}}{{/crossLink}} event on change.
             *
             * @property colorMask
             * @default [true, true, true, true]
             * @type {Four element array of Boolean}
             */
            colorMask: {

                set: function (value) {

                    this._state.colorMask = value || [true, true, true, true];

                    this._renderer.imageDirty = true;

                    /**
                     Fired whenever this ColorBuf's {{#crossLink "ColorBuf/colorMask:property"}}{{/crossLink}} property changes.

                     @event colorMask
                     @param value {Four element array of Boolean} The property's new value
                     */
                    this.fire("colorMask", this._state.colorMask);
                },

                get: function () {
                    return this._state.colorMask;
                }
            }
        },

        _compile: function () {
            this._renderer.colorBuf = this._state;
        },

        _getJSON: function () {
            return {
                blendEnabled: this._state.blendEnabled,
                colorMask: this._state.colorMask
            };
        },

        _destroy: function () {
            this._state.destroy();
        }
    });

})();
;/**
 A **DepthBuf** configures the WebGL depth buffer for attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.

 ## Overview

 <ul>
 <li>A DepthBuf configures **the way** that pixel depths are written to the WebGL depth buffer</li>
 <li>DepthBuf is not to be confused with {{#crossLink "DepthTarget"}}DepthTarget{{/crossLink}}, which stores rendered pixel
 depths for consumption by {{#crossLink "Texture"}}Textures{{/crossLink}}, used when performing *render-to-texture*.</li>
 </ul>

 <img src="../../../assets/images/DepthBuf.png"></img>

 ## Example

 In this example we're configuring the WebGL depth buffer for a {{#crossLink "GameObject"}}{{/crossLink}}.

 The scene contains:

 <ul>
 <li>a DepthBuf that configures the clear depth and depth comparison function,</li>
 <li>a {{#crossLink "Geometry"}}{{/crossLink}} that is the default box shape and
 <li>a {{#crossLink "GameObject"}}{{/crossLink}} attached to all of the above.</li>
 </ul>

 ````javascript
 var scene = new XEO.Scene();

 // Create a DepthBuf that configures the WebGL depth buffer to set pixels depths to 0.5
 // whenever it is cleared, and to use the "less" depth comparison function
 var depthBuf = new XEO.DepthBuf(scene, {
    clearDepth: 0.5,
    depthFunc: "less"
});

 var geometry = new XEO.Geometry(scene); // Defaults to a 2x2x2 box

 // Create a Object that renders the Geometry to the depth buffer,
 // as configured by our DepthBuf
 var gameObject = new XEO.GameObject(scene, {
    depthBuf: depthBuf,
    geometry: geometry
});
 ````

 @class DepthBuf
 @module XEO
 @submodule rendering
 @constructor
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}Scene{{/crossLink}} - creates this DepthBuf
 within the default {{#crossLink "Scene"}}Scene{{/crossLink}} when omitted.
 @param [cfg] {*} DepthBuf configuration
 @param [cfg.id] {String} Optional ID, unique among all components in the parent {{#crossLink "Scene"}}Scene{{/crossLink}}, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this DepthBuf.
 @param [cfg.clearDepth=1.0] {Number} The clear depth.
 @param [cfg.depthFunc="less"] {String} The depth function.
 @param [cfg.active=true] {Boolean} True when this DepthBuf is active.
 @extends Component
 */
(function () {

    "use strict";

    XEO.DepthBuf = XEO.Component.extend({

        type: "XEO.DepthBuf",

        _init: function (cfg) {

            this._state = new XEO.renderer.DepthBuf({
                clearDepth: null,
                depthFunc: null,
                active: null
            });

            this.clearDepth = cfg.clearDepth;
            this.depthFunc = cfg.depthFunc;
            this.active = cfg.active;
        },

        _props: {

            /**
             * The clear depth for this DepthBuf.
             *
             * Fires a {{#crossLink "DepthBuf/clearDepth:event"}}{{/crossLink}} event on change.
             *
             * @property clearDepth
             * @default 1.0
             * @type Number
             */
            clearDepth: {

                set: function (value) {

                    this._state.clearDepth = value !== undefined ? value : 1.0;

                    this._renderer.imageDirty = true;

                    /**
                     Fired whenever this DepthBuf's {{#crossLink "DepthBuf/clearDepth:property"}}{{/crossLink}} property changes.

                     @event clearDepth
                     @param value {Number} The property's new value
                     */
                    this.fire("clearDepth",  this._state.clearDepth);
                },

                get: function () {
                    return this._state.clearDepth;
                }
            },

            /**
             * The depth function for this DepthBuf.
             *
             * Accepted values are:
             *
             * <ul>
             *     <li>"less"</li>
             *     <li>"equal"</li>
             *     <li>"lequal"</li>
             *     <li>"greater"</li>
             *     <li>"notequal"</li>
             *     <li>"gequal"</li>
             * </ul>
             *
             * Fires a {{#crossLink "DepthBuf/depthFunc:event"}}{{/crossLink}} event on change.
             *
             * @property depthFunc
             * @default "less"
             * @type Number
             */
            depthFunc: {

                set: function (value) {

                    value = value || "less";

                    var enumName = this._depthFuncNames[value];

                    if (enumName === undefined) {
                        this.error("Unsupported value for 'clearFunc': '" + value +
                            "' - supported values are 'less', 'equal', 'lequal', 'greater', 'notequal' and 'gequal. " +
                            "Defaulting to 'less'.");

                        enumName = "less";
                    }

                    this._state.depthFunc = this.scene.canvas.gl[enumName];
                    this._state.depthFuncName = value;

                    this._renderer.imageDirty = true;

                    /**
                     Fired whenever this DepthBuf's {{#crossLink "DepthBuf/depthFunc:property"}}{{/crossLink}} property changes.
                     @event depthFunc
                     @param value {String} The property's new value
                     */
                    this.fire("depthFunc", this._state.depthFuncName);
                },

                get: function () {
                    return this._state.depthFuncName;
                }
            },

            /**
             * Flag which indicates whether this DepthBuf is active or not.
             *
             * Fires an {{#crossLink "DepthBuf/active:event"}}{{/crossLink}} event on change.
             *
             * @property active
             * @type Boolean
             */
            active: {

                set: function (value) {

                    if (this._state.active === value) {
                        return;
                    }
                    
                    this._state.active = value;
                    
                    /**
                     * Fired whenever this DepthBuf's {{#crossLink "DepthBuf/active:property"}}{{/crossLink}} property changes.
                     * @event active
                     * @param value The property's new value
                     */
                    this.fire('active', this._state.active);
                },

                get: function () {
                    return this._state.active;
                }
            }
        },

        /**
         * Lookup GL depth function enums
         * @private
         */
        _depthFuncNames: {
            less: "LESS",
            equal: "EQUAL",
            lequal: "LEQUAL",
            greater: "GREATER",
            notequal: "NOTEQUAL",
            gequal: "GEQUAL"
        },

        _compile: function () {
            this._renderer.depthBuf = this._state;
        },

        _getJSON: function () {
            return {
                clearDepth: this._state.clearDepth,
                depthFunc: this._state.depthFuncName,
                active: this._state.active
            };
        },

        _destroy: function () {
            this._state.destroy();
        }
    });

})();
;
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
;/**
 A **ColorTarget** captures the colors of the pixels that xeoEngine renders for the attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.
 These provide a virtual, software-based <a href="http://en.wikipedia.org/wiki/Render_Target" target="other">render target</a> that is typically used when performing *render-to-texture*.

 ## Overview

 <ul>
 <li>A ColorTarget provides the pixel colors as a dynamic color image that may be consumed by {{#crossLink "Texture"}}Textures{{/crossLink}}.</li>
 <li>ColorTarget is not to be confused with {{#crossLink "ColorBuf"}}ColorBuf{{/crossLink}}, which configures ***how*** the pixel colors are written with respect to the WebGL color buffer.</li>
 <li>Use {{#crossLink "Stage"}}Stages{{/crossLink}} when you need to ensure that a ColorTarget is rendered before
 the {{#crossLink "Texture"}}Textures{{/crossLink}} that consume it.</li>
 <li>For special effects, we often use ColorTargets and {{#crossLink "Texture"}}Textures{{/crossLink}} in combination
 with {{#crossLink "DepthTarget"}}DepthTargets{{/crossLink}} and {{#crossLink "Shader"}}Shaders{{/crossLink}}.</li>
 </ul>

 <img src="../../../assets/images/ColorTarget.png"></img>

 ## Example

 In this example we essentially have one {{#crossLink "GameObject"}}{{/crossLink}}
 that's rendered to a {{#crossLink "Texture"}}{{/crossLink}}, which is then applied to a second {{#crossLink "GameObject"}}{{/crossLink}}.

 The scene contains:

 <ul>
 <li>a ColorTarget,</li>
 <li>a {{#crossLink "Geometry"}}{{/crossLink}} that is the default box shape,
 <li>a {{#crossLink "GameObject"}}{{/crossLink}} that renders the {{#crossLink "Geometry"}}{{/crossLink}} pixel color values to the ColorTarget,</li>
 <li>a {{#crossLink "Texture"}}{{/crossLink}} that sources its pixels from the ColorTarget,</li>
 <li>a {{#crossLink "Material"}}{{/crossLink}} that includes the {{#crossLink "Texture"}}{{/crossLink}}, and</li>
 <li>a second {{#crossLink "GameObject"}}{{/crossLink}} that renders the {{#crossLink "Geometry"}}{{/crossLink}}, with the {{#crossLink "Material"}}{{/crossLink}} applied to it.</li>
 </ul>


 ````javascript
 var scene = new XEO.Scene();

 var colorTarget = new XEO.ColorTarget(scene);

 var geometry = new XEO.Geometry(scene); // Defaults to a 2x2x2 box

 // First Object renders to the ColorTarget

 var object1 = new XEO.GameObject(scene, {
    geometry: geometry,
    colorTarget: colorTarget
});

 var texture = new XEO.Texture(scene, {
    target: colorTarget
});

 var material = new XEO.PhongMaterial(scene, {
    textures: [
        texture
    ]
});

 // Second Object is textured with the
 // image of the first Object

 var object2 = new XEO.GameObject(scene, {
    geometry: geometry,  // Reuse our simple box geometry
    material: material
});
 ````

 @class ColorTarget
 @module XEO
 @submodule rendering
 @constructor
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}Scene{{/crossLink}}, creates this ColorTarget within the
 default {{#crossLink "Scene"}}Scene{{/crossLink}} when omitted.
 @param [cfg] {*} ColorTarget configuration
 @param [cfg.id] {String} Optional ID, unique among all components in the parent {{#crossLink "Scene"}}Scene{{/crossLink}}, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this ColorTarget.
 @extends Component
 */
(function () {

    "use strict";

    XEO.ColorTarget = XEO.Component.extend({

        type: "XEO.ColorTarget",

        _init: function () {

          var canvas = this.scene.canvas;

          this._state = new XEO.renderer.RenderTarget({

              type: XEO.renderer.RenderTarget.COLOR,

              renderBuf: new XEO.renderer.webgl.RenderBuffer({
                  canvas: canvas.canvas,
                  gl: canvas.gl
              })
          });

          var self = this;

          this._webglContextRestored = canvas.on("webglContextRestored",
              function () {
                  self._state.renderBuf.webglRestored(canvas.gl);
              });
        },

        _compile: function () {
            this._renderer.colorTarget = this._state;
        },

        _getJSON: function () {
            return {};
        },

        _destroy: function () {

            this.scene.canvas.off(this._webglContextRestored);

            this._state.renderBuf.destroy();

            this._state.destroy();
        }
    });

})();
;/**
 A **DepthTarget** captures the Z-depths of the pixels that xeoEngine renders for the attached
 {{#crossLink "GameObject"}}GameObjects{{/crossLink}}. These provide a virtual, software-based
 <a href="http://en.wikipedia.org/wiki/Render_Target" target="other">render target</a> that is typically used when
 performing *render-to-texture* as part of some post-processing effect that requires the pixel depth values.

 ## Overview

 <ul>
 <li>A DepthTarget provides the pixel depths as a dynamic color-encoded image that may be fed into {{#crossLink "Texture"}}Textures{{/crossLink}}.</li>
 <li>DepthTarget is not to be confused with {{#crossLink "DepthBuf"}}DepthBuf{{/crossLink}}, which configures ***how*** the pixel depths are written with respect to the WebGL depth buffer.</li>
 <li>Use {{#crossLink "Stage"}}Stages{{/crossLink}} when you need to ensure that a DepthTarget is rendered before
 the {{#crossLink "Texture"}}Textures{{/crossLink}} that consume it.</li>
 <li>For special effects, we often use DepthTargets and {{#crossLink "Texture"}}Textures{{/crossLink}} in combination
 with {{#crossLink "ColorTarget"}}ColorTargets{{/crossLink}} and {{#crossLink "Shader"}}Shaders{{/crossLink}}.</li>
 </ul>

 <img src="../../../assets/images/DepthTarget.png"></img>

 ## Example

 In the example below, we essentially have one {{#crossLink "GameObject"}}{{/crossLink}}
 that renders its pixel Z-depth values to a {{#crossLink "Texture"}}{{/crossLink}}, which is then applied
 to a second {{#crossLink "GameObject"}}{{/crossLink}}.

 The scene contains:

 <ul>
 <li>a DepthTarget,</li>
 <li>a {{#crossLink "Geometry"}}{{/crossLink}} that is the default box shape,
 <li>a {{#crossLink "GameObject"}}{{/crossLink}} that renders the {{#crossLink "Geometry"}}{{/crossLink}} fragment depth values to the DepthTarget,</li>
 <li>a {{#crossLink "Texture"}}{{/crossLink}} that sources its pixels from the DepthTarget,</li>
 <li>a {{#crossLink "PhongMaterial"}}{{/crossLink}} that includes the {{#crossLink "Texture"}}{{/crossLink}}, and</li>
 <li>a second {{#crossLink "GameObject"}}{{/crossLink}} that renders the {{#crossLink "Geometry"}}{{/crossLink}}, with the {{#crossLink "Material"}}{{/crossLink}} applied to it.</li>
 </ul>

 The pixel colours in the DepthTarget will be depths encoded into RGBA, so will look a little weird when applied directly to the second
 {{#crossLink "GameObject"}}{{/crossLink}} as a {{#crossLink "Texture"}}{{/crossLink}}. In practice the {{#crossLink "Texture"}}{{/crossLink}}
 would carry the depth values into a custom {{#crossLink "Shader"}}{{/crossLink}}, which would then be applied to the second {{#crossLink "GameObject"}}{{/crossLink}}.

 ````javascript
 var scene = new XEO.Scene();

 var geometry = new XEO.Geometry(scene); // Defaults to a 2x2x2 box.

 var depthTarget = new XEO.DepthTarget(scene);

 // First Object renders its pixel depth values to our DepthTarget
 var object1 = new XEO.GameObject(scene, {
    depthTarget: depthTarget
});

 // Texture consumes our DepthTarget
 var texture = new XEO.Texture(scene, {
    target: depthTarget
});

 // Material contains our Texture
 var material = new XEO.PhongMaterial(scene, {
    textures: [
        texture
    ]
});

 // Second Object is effectively textured with the color-encoded
 // pixel depths of the first Object
 var object2 = new XEO.GameObject(scene, {
    geometry: geometry,  // Reuse our simple box geometry
    material: material
});
 ````
 @class DepthTarget
 @module XEO
 @submodule rendering
 @constructor
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}Scene{{/crossLink}}, creates this DepthTarget within the
 default {{#crossLink "Scene"}}Scene{{/crossLink}} when omitted.
 @param [cfg] {*} DepthTarget configuration
 @param [cfg.id] {String} Optional ID, unique among all components in the parent {{#crossLink "Scene"}}Scene{{/crossLink}}, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this DepthTarget.

 @extends Component
 */
(function () {

    "use strict";

    XEO.DepthTarget = XEO.Component.extend({

        type: "XEO.DepthTarget",

        _init: function () {

            var canvas = this.scene.canvas;

            this._state = new XEO.renderer.RenderTarget({

                type: XEO.renderer.RenderTarget.DEPTH,

                renderBuf: new XEO.renderer.webgl.RenderBuffer({
                    canvas: canvas.canvas,
                    gl: canvas.gl
                })
            });

            var self = this;

            this._webglContextRestored = canvas.on("webglContextRestored",
                function () {
                    self._state.renderBuf.webglRestored(canvas.gl);
                });
        },

        _compile: function () {
            this._renderer.depthTarget = this._state;
        },

        _getJSON: function () {
            return {};
        },

        _destroy: function () {

            this.scene.canvas.off(this._webglContextRestored);

            this._state.renderBuf.destroy();

            this._state.destroy();
        }
    });

})();
;/**
 A **Modes** toggles various xeoEngine rendering modes for attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.

 ## Overview

 <ul>

 <li>Though the rendering modes are defined by various different components attached to the {{#crossLink "GameObject"}}GameObjects{{/crossLink}},
 Modes components provide a single point through which you can toggle them on or off.</li>

 <li>A Modes may be shared among multiple {{#crossLink "GameObject"}}GameObjects{{/crossLink}} to toggle
 rendering modes for them as a group.</li>

 <li>See <a href="Shader.html#inputs">Shader Inputs</a> for the variables that Modes create within xeoEngine's shaders.</li>

 </ul>

 <img src="../../../assets/images/Modes.png"></img>

 ## Example

 In this example we have a Modes that toggles rendering modes for
 two {{#crossLink "GameObject"}}GameObjects{{/crossLink}}. The properties of the Modes are initialised to their
 default values.

 ````javascript
 var scene = new XEO.Scene();

 // Create a Modes with default properties
 var modes = new XEO.Modes(scene, {
    picking: true,              // Enable picking
    clipping true,              // Enable effect of XEO.Clip components
    transparent : false,        // Disable transparency
    backfaces : true,           // Render backfaces
    frontface : "ccw"
 });

 // Create two GameObjects whose rendering modes will be controlled by our Modes

 var object1 = new XEO.GameObject(scene, {
       modes: modes
 });

 var object2 = new XEO.GameObject(scene, {
       modes: modes
 });

 // Subscribe to change on the Modes' "backfaces" property
 var handle = modes.on("backfaces", function(value) {
       //...
 });

 // Hide backfaces on our GameObjects by flipping the Modes' "backfaces" property,
 // which will also call our handler
 modes.backfaces = false;

 // Unsubscribe from the Modes again
 modes.off(handle);

 // When we destroy our Modes, the GameObjects will fall back
 // on the Scene's default Modes instance
 modes.destroy();

 ````

 @class Modes
 @module XEO
 @submodule rendering
 @constructor
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}Scene{{/crossLink}} - creates this Modes in the default {{#crossLink "Scene"}}Scene{{/crossLink}} when omitted.
 @param [cfg] {*} Configs
 @param [cfg.id] {String} Optional ID, unique among all components in the parent {{#crossLink "Scene"}}Scene{{/crossLink}}, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this Modes.
 @param [cfg.picking=true] {Boolean}  Whether to enable picking.
 @param [cfg.clipping=true] {Boolean} Whether to enable clipping by {{#crossLink "Clips"}}{{/crossLink}}.
 @param [cfg.transparent=false] {Boolean} Whether to enable the transparency effect created by {{#crossLink "Material"}}Material{{/crossLink}}s when they have
 {{#crossLink "PhongMaterial/opacity:property"}}{{/crossLink}} < 1.0. This mode will set attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}} transparent (ie. to be rendered in a
 transparency pass with blending enabled etc), while
 the {{#crossLink "PhongMaterial/opacity:property"}}{{/crossLink}} will indicate the **degree** of their transparency
 (ie. where opacity of 0.0 indicates maximum translucency and opacity of 1.0 indicates minimum translucency).
 @param [cfg.backfaces=true] {Boolean} Whether to render {{#crossLink "Geometry"}}Geometry{{/crossLink}} backfaces.
 @param [cfg.frontface="ccw"] {Boolean} The winding order for {{#crossLink "Geometry"}}Geometry{{/crossLink}} front faces - "cw" for clockwise, or "ccw" for counter-clockwise.
 @extends Component
 */
(function () {

    "use strict";

    XEO.Modes = XEO.Component.extend({

        type: "XEO.Modes",

        _init: function (cfg) {

            this._state = new XEO.renderer.Modes({
                picking: true,
                clipping: true,
                transparent: false,
                backfaces: false,
                frontface: true // Boolean for speed; true == "ccw", false == "cw"
            });

            this.picking = cfg.picking;
            this.clipping = cfg.clipping;
            this.transparent = cfg.transparent;
            this.backfaces = cfg.backfaces;
            this.frontface = cfg.frontface;
        },

        _props: {

            /**
             Whether this Modes enables picking of attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.

             Picking is performed via calls to {{#crossLink "Canvas/pick:method"}}Canvas#pick{{/crossLink}}.

             Fires a {{#crossLink "Modes/picking:event"}}{{/crossLink}} event on change.

             @property picking
             @default true
             @type Boolean
             */
            picking: {

                set: function (value) {

                    this._state.picking = value !== false;

                    this._renderer.drawListDirty = true;

                    /**
                     * Fired whenever this Modes' {{#crossLink "Modes/picking:property"}}{{/crossLink}} property changes.
                     *
                     * @event picking
                     * @param value The property's new value
                     */
                    this.fire("picking", this._state.picking);
                },

                get: function () {
                    return this._state.picking;
                }
            },

            /**
             Whether this Modes enables clipping of attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.

             Clipping is done by {{#crossLink "Clips"}}{{/crossLink}} that are also attached to
             the {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.

             Fires a {{#crossLink "Modes/clipping:event"}}{{/crossLink}} event on change.

             @property clipping
             @default true
             @type Boolean
             */
            clipping: {

                set: function (value) {

                    this._state.clipping = value !== false;

                    this._renderer.imageDirty = true;

                    /**
                     Fired whenever this Modes' {{#crossLink "Modes/clipping:property"}}{{/crossLink}} property changes.

                     @event clipping
                     @param value The property's new value
                     */
                    this.fire("clipping", this._state.clipping);
                },

                get: function () {
                    return this._state.clipping;
                }
            },

            /**
             Whether this Modes sets attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}} transparent.

             When true. this property will set attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}} transparent (ie. to be rendered in a
             transparency pass with blending enabled etc), while
             the {{#crossLink "PhongMaterial/opacity:property"}}{{/crossLink}} will be used to indicate the **degree** of their transparency
             (ie. where opacity of 0.0 indicates maximum translucency and opacity of 1.0 indicates minimum translucency).

             Fires a {{#crossLink "Modes/transparent:event"}}{{/crossLink}} event on change.

             @property transparent
             @default false
             @type Boolean
             */
            transparent: {

                set: function (value) {

                    this._state.transparent = !!value;

                    this._renderer.stateOrderDirty = true;

                    /**
                     Fired whenever this Modes' {{#crossLink "Modes/transparent:property"}}{{/crossLink}} property changes.

                     @event transparent
                     @param value The property's new value
                     */
                    this.fire("transparent", this._state.transparent);
                },

                get: function () {
                    return this._state.transparent;
                }
            },

            /**
             Whether this Modes enables backfaces to be visible on attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.

             The backfaces will belong to {{#crossLink "Geometry"}}{{/crossLink}} compoents that are also attached to
             the {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.

             Fires a {{#crossLink "Modes/backfaces:event"}}{{/crossLink}} event on change.

             @property backfaces
             @default true
             @type Boolean
             */
            backfaces: {

                set: function (value) {

                    this._state.backfaces = value !== false;

                    this._renderer.imageDirty = true;

                    /**
                     Fired whenever this Modes' {{#crossLink "Modes/backfaces:property"}}{{/crossLink}} property changes.

                     @event backfaces
                     @param value The property's new value
                     */
                    this.fire("backfaces", this._state.backfaces);
                },

                get: function () {
                    return this._state.backfaces;
                }
            },

            /**
             Indicates the winding direction of front faces on attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.

             The faces will belong to {{#crossLink "Geometry"}}{{/crossLink}} components that are also attached to
             the {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.

             Fires a {{#crossLink "Modes/frontface:event"}}{{/crossLink}} event on change.

             @property frontface
             @default "ccw"
             @type String
             */
            frontface: {

                set: function (value) {

                    this._state.frontface = value !== "cw";

                    this._renderer.imageDirty = true;

                    /**
                     Fired whenever this Modes' {{#crossLink "Modes/frontface:property"}}{{/crossLink}} property changes.

                     @event frontface
                     @param value The property's new value
                     */
                    this.fire("frontface", this._state.frontface ? "ccw" : "cw");
                },

                get: function () {
                    return this._state.frontface ? "ccw" : "cw";
                }
            }
        },

        _compile: function () {
            this._renderer.modes = this._state;
        },

        _getJSON: function () {
            return {
                picking: this._state.picking,
                clipping: this._state.clipping,
                transparent: this._state.transparent,
                backfaces: this._state.backfaces,
                frontface: this._state.frontface
            };
        },

        _destroy: function () {
            this._state.destroy();
        }
    });

})();
;/**
 A **Shader** specifies a custom GLSL shader to apply when rendering attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.

 ## Overview

 <ul>
 <li>Normally you would rely on xeoEngine to automatically generate shaders for you, however the Shader component allows you to author them manually.</li>
 <li>You can use xeoEngine's reserved uniform and variable names in your Shaders to read all the WebGL state that's set by other
 components on the attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.</li>
 <li>Use Shaders in combination with {{#crossLink "ShaderParams"}}ShaderParams{{/crossLink}} components when you need to share
 the same Shaders among multiple {{#crossLink "GameObject"}}GameObjects{{/crossLink}} while setting the Shaders' uniforms
 differently for each {{#crossLink "GameObject"}}GameObject{{/crossLink}}.</li>
 <li>Use {{#crossLink "ColorTarget"}}ColorTarget{{/crossLink}}, {{#crossLink "DepthTarget"}}DepthTarget{{/crossLink}}
 and {{#crossLink "Texture"}}Texture{{/crossLink}} components to connect the output of one Shader as input into another Shader.</li>
 </ul>

 <img src="../../../assets/images/Shader.png"></img>

 ## Example

 This example shows the simplest way to use a Shader, where we're just going to render a ripply water
 pattern to a screen-aligned quad.

 <img src="../../assets/images/shaderExample1.png"></img>

 In our scene definition, we have an  {{#crossLink "GameObject"}}GameObject{{/crossLink}} that has a {{#crossLink "Geometry"}}Geometry{{/crossLink}} that is our
 screen-aligned quad, plus a Shader that will render the fragments of that quad with our cool rippling water pattern.
 Finally, we animate the rippling by periodically updating the Shader's "time" uniform.

 ````javascript

 var scene = new XEO.Scene();

 // Shader that's used by our Object. Note the 'xeo_aPosition' and 'xeo_aUV attributes',
 // which will receive the positions and UVs from the Geometry. Also note the 'time'
 // uniform, which we'll be animating via Shader#setParams.

 var shader = new XEO.Shader(scene, {

       // Vertex shading stage
       vertex: [
           "attribute vec3 xeo_aPosition;",
           "attribute vec2 xeo_aUV;",
           "varying vec2 vUv;",
           "void main () {",
           "    gl_Position = vec4(xeo_aPosition, 1.0);",
           "    vUv = xeo_aUV;",
           "}"
       ],

       // Fragment shading stage
       fragment: [
           "precision mediump float;",

           "uniform float time;",
           "varying vec2 vUv;",

           "void main( void ) {",
           "    vec2 sp = vUv;",
           "    vec2 p = sp*5.0 - vec2(10.0);",
           "    vec2 i = p;",
           "    float c = 1.0;",
           "    float inten = 0.10;",
           "    for (int n = 0; n < 10; n++) {",
           "        float t = time * (1.0 - (3.0 / float(n+1)));",
           "        i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));",
           "        c += 1.0/length(vec2(p.x / (sin(i.x+t)/inten),p.y / (cos(i.y+t)/inten)));",
           "    }",
           "    c /= float(10);",
           "    c = 1.5-sqrt(c);",
           "    gl_FragColor = vec4(vec3(c*c*c*c), 999.0) + vec4(0.0, 0.3, 0.5, 1.0);",
           "}"
       ],

       // Initial value for the 'time' uniform in the fragment stage.
       params: {
           time: 0.0
       }
  });

 // A screen-aligned quad
 var quad = new XEO.Geometry(scene, {
       primitive:"triangles",
       positions:[ 1, 1, 0, -1, 1, 0, -1, -1, 0, 1, -1, 0 ],
       normals:[ -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0 ],
       uv:[ 1, 1, 0, 1, 0, 0, 1, 0 ],
       indices:[ 0, 1, 2, 0, 2, 3 ]
  });

 var object = new XEO.GameObject(scene, {
       shader: shader,
       geometry: quad
  });

 ````
 Now let's animate the "time" parameter on the Shader, to make the water ripple:

 ```` javascript
 scene.on("tick", function(params) {
            shader.setParams({
                time: params.timeElapsed
            });
        });
 ````

 ## <a name="inputs">Shader Inputs</a>

 xeoEngine provides the following inputs for your shaders.

 #### Attributes

 *Attributes are used only in vertex shaders*

 | Attribute  | Description | Depends on  |
 |---|---|
 | attribute vec3 xeo_aPosition   | Geometry vertex positions | {{#crossLink "Geometry"}}Geometry{{/crossLink}} {{#crossLink "Geometry/positions:property"}}{{/crossLink}} |
 | attribute vec2 xeo_aUV         | Geometry vertex UV coordinates | {{#crossLink "Geometry"}}Geometry{{/crossLink}} {{#crossLink "Geometry/uv:property"}}{{/crossLink}}  |
 | attribute vec3 xeo_aNormal     | Geometry vertex normals | {{#crossLink "Geometry"}}Geometry{{/crossLink}} {{#crossLink "Geometry/normals:property"}}{{/crossLink}}  |
 | attribute vec4 xeo_aColor      | Geometry vertex colors  | {{#crossLink "Geometry"}}Geometry{{/crossLink}} {{#crossLink "Geometry/colors:property"}}{{/crossLink}}  |
 | attribute vec4 xeo_aTangent    | Geometry vertex tangents, for normal mapping | {{#crossLink "Geometry"}}Geometry{{/crossLink}} {{#crossLink "Geometry/normals:property"}}{{/crossLink}} and {{#crossLink "Geometry/uv:property"}}{{/crossLink}}  |

 #### Uniforms

 *Uniforms are used in vertex and fragment shaders*

 | Uniform  | Description | Depends on  |
 |---|---|
 | uniform mat4  xeo_uModelMatrix                                   | Modelling transform matrix | {{#crossLink "Transform"}}{{/crossLink}} |
 | uniform mat4  xeo_uModelNormalMatrix                             | Modelling transform normal matrix | {{#crossLink "Geometry/normals:property"}}Geometry normals{{/crossLink}} and {{#crossLink "Transform"}}{{/crossLink}} |
 | uniform mat4  xeo_uViewMatrix                                    | View transform matrix | {{#crossLink "Lookat"}}Lookat{{/crossLink}} |
 | uniform mat4  xeo_uViewNormalMatrix                              | View transform normal matrix | {{#crossLink "Geometry/normals:property"}}Geometry normals{{/crossLink}} and {{#crossLink "Lookat"}}Lookat{{/crossLink}} |
 | uniform mat4  xeo_uProjMatrix                                    | Projection transform matrix | {{#crossLink "Ortho"}}Ortho{{/crossLink}}, {{#crossLink "Frustum"}}Frustum{{/crossLink}} or {{#crossLink "Perspective"}}Perspective{{/crossLink}} |
 | uniform float xeo_uZNear                                         | Near clipping plane |{{#crossLink "Ortho"}}Ortho{{/crossLink}}, {{#crossLink "Frustum"}}Frustum{{/crossLink}} or {{#crossLink "Perspective"}}Perspective{{/crossLink}} |
 | uniform float xeo_uZFar                                          | Far clipping plane |{{#crossLink "Ortho"}}Ortho{{/crossLink}}, {{#crossLink "Frustum"}}Frustum{{/crossLink}} or {{#crossLink "Perspective"}}Perspective{{/crossLink}} |
 |---|---|
 | uniform vec3  xeo_uLightAmbientColor                             | Color of the first {{#crossLink "AmbientLight"}}{{/crossLink}} in {{#crossLink "Lights"}}{{/crossLink}}| {{#crossLink "AmbientLight"}}{{/crossLink}} |
 | uniform vec3 xeo_uLightColor&lt;***N***&gt;                    | Diffuse color of {{#crossLink "DirLight"}}{{/crossLink}} or {{#crossLink "PointLight"}}{{/crossLink}} at index ***N*** in {{#crossLink "Lights"}}{{/crossLink}} | {{#crossLink "DirLight"}}{{/crossLink}} or {{#crossLink "PointLight"}}{{/crossLink}} |
 | uniform vec3 xeo_uLightIntensity&lt;***N***&gt;                   | Specular color of {{#crossLink "DirLight"}}{{/crossLink}} or {{#crossLink "PointLight"}}{{/crossLink}} at index ***N*** in {{#crossLink "Lights"}}{{/crossLink}} | {{#crossLink "DirLight"}}{{/crossLink}} or {{#crossLink "PointLight"}}{{/crossLink}} |
 | uniform vec3 xeo_uLightDir&lt;***N***&gt;                        | Direction of {{#crossLink "DirLight"}}{{/crossLink}} at index ***N*** in {{#crossLink "Lights"}}{{/crossLink}} | {{#crossLink "DirLight"}}{{/crossLink}} |
 | uniform vec3 xeo_uLightPos&lt;***N***&gt;                        | Position of {{#crossLink "PointLight"}}{{/crossLink}} at index ***N*** in {{#crossLink "Lights"}}{{/crossLink}} | {{#crossLink "PointLight"}}{{/crossLink}} |
 | uniform vec3 xeo_uLightConstantAttenuation&lt;***N***&gt;        | Constant attenuation factor for {{#crossLink "PointLight"}}{{/crossLink}} at index ***N*** in {{#crossLink "Lights"}}{{/crossLink}} | {{#crossLink "PointLight"}}{{/crossLink}} |
 | uniform vec3 xeo_uLightLinearAttenuation&lt;***N***&gt;          | Linear attenuation factor for {{#crossLink "PointLight"}}{{/crossLink}} at index ***N*** in {{#crossLink "Lights"}}{{/crossLink}} | {{#crossLink "PointLight"}}{{/crossLink}} |
 | uniform vec3 xeo_uLightQuadraticAttenuation&lt;***N***&gt;       | Quadratic attenuation factor for {{#crossLink "PointLight"}}{{/crossLink}} at index ***N*** in {{#crossLink "Lights"}}{{/crossLink}} | {{#crossLink "PointLight"}}{{/crossLink}} |
 |---|---|
 | uniform vec3 xeo_uMaterialDiffuse;       |  | {{#crossLink "PhongMaterial/diffuse:property"}}{{/crossLink}} |
 | uniform vec3 xeo_uMaterialSpecular;       |  | {{#crossLink "PhongMaterial/specular:property"}}{{/crossLink}} |
 | uniform vec3 xeo_uMaterialEmissive;       |  | {{#crossLink "PhongMaterial/emissive:property"}}{{/crossLink}} |
 | uniform float xeo_uMaterialOpacity;       |  | {{#crossLink "PhongMaterial/opacity:property"}}{{/crossLink}} |
 | uniform float xeo_uMaterialShininess;       |  | {{#crossLink "PhongMaterial/shininess:property"}}{{/crossLink}} |
 | uniform float xeo_uMaterialDiffuseFresnelBias;       |  | {{#crossLink "Fresnel/bias:property"}}{{/crossLink}} |

 #### Varying

 *Varying types are used in fragment shaders*

 | Varying | Description | Depends on  |
 |---|---|
 | varying vec4 xeo_vWorldPosition | |
 | varying vec4 xeo_vViewPosition | |
 | varying vec4 xeo_vColor | |

 #### Samplers

 *Samplers are used in fragment shaders*

 | Varying | Description | Depends on  |
 |---|---|



 @class Shader
 @module XEO
 @submodule rendering
 @constructor
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}Scene{{/crossLink}} - creates this Shader in the default
 {{#crossLink "Scene"}}Scene{{/crossLink}} when omitted.
 @param [cfg] {*} Configs
 @param [cfg.id] {String} Optional ID, unique among all components in the parent scene, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this Shader.
 @param [cfg.vertex=null] {String} GLSL Depends on code for the vertex shading staging.
 @param [cfg.fragment=null] {String} GLSL source code for the fragment shading staging.
 @param [cfg.params={}] {Object} Values for uniforms defined in the vertex and/or fragment stages.
 @extends Component
 */
(function () {

    "use strict";

    XEO.Shader = XEO.Component.extend({

        type: "XEO.Shader",

        _init: function (cfg) {

            this._state = new XEO.renderer.Shader({
                vertex: null,
                fragment: null,
                params: {}
            });

            this.vertex = cfg.vertex;

            this.fragment = cfg.fragment;

            this.setParams(cfg.params);
        },

        _props: {

            /**
             * GLSL source code for this Shader's vertex stage.
             *
             * Fires a {{#crossLink "Shader/vertex:event"}}{{/crossLink}} event on change.
             *
             * @property vertex
             * @default null
             * @type String
             */
            vertex: {

                set: function (value) {

                    this._state.vertex = value;

                    // Trigger recompile
                    this.fire("dirty", true);

                    /**
                     * Fired whenever this Shader's {{#crossLink "Shader/vertex:property"}}{{/crossLink}} property changes.
                     *
                     * @event vertex
                     * @param value The property's new value
                     */
                    this.fire("vertex", this._state.vertex);
                },

                get: function () {
                    return this._state.vertex;
                }
            },

            /**
             * GLSL source code for this Shader's fragment stage.
             *
             * Fires a {{#crossLink "Shader/fragment:event"}}{{/crossLink}} event on change.
             *
             * @property fragment
             * @default null
             * @type String
             */
            fragment: {

                set: function (value) {

                    this._state.fragment = value;

                    // Trigger recompile
                    this.fire("dirty", true);

                    /**
                     * Fired whenever this Shader's {{#crossLink "Shader/fragment:property"}}{{/crossLink}} property changes.
                     *
                     * @event fragment
                     * @param value The property's new value
                     */
                    this.fire("fragment", this._state.fragment);
                },

                get: function () {
                    return this._state.fragment;
                }
            },

            /**
             * Params for this Shader.
             *
             * Fires a {{#crossLink "Shader/params:event"}}{{/crossLink}} event on change.
             *
             * @property params
             * @default {}
             * @type {}
             */
            params: {

                get: function () {
                    return this._state.params;
                }
            }
        },

        /**
         * Sets one or more params for this Shader.
         *
         * These will be individually overridden by any {{#crossLink "ShaderParams/setParams:method"}}params subsequently specified{{/crossLink}} on
         * {{#crossLink "ShaderParams"}}ShaderParams{{/crossLink}} on attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.
         *
         * Fires a {{#crossLink "Shader/params:event"}}{{/crossLink}} event on change.
         *
         * @method setParams
         * @param {} [params={}] Values for params to set on this Shader, keyed to their names.
         */
        setParams: function (params) {

            for (var name in params) {
                if (params.hasOwnProperty(name)) {
                    this._state.params[name] = params[name];
                }
            }

            this._renderer.imageDirty = true;

            /**
             * Fired whenever this Shader's  {{#crossLink "Shader/params:property"}}{{/crossLink}}
             * property has been updated.
             *
             * @event params
             * @param value The property's new value
             */
            this.fire("params", this._state.params);
        },

        _compile: function () {
            this._renderer.shader = this._state;
        },

        _getJSON: function () {

            var json = {
                params: this._state.params
            };

            if (this._state.vertex) {
                json.vertex = this._state.vertex;
            }

            if (this._state.fragment) {
                json.fragment = this._state.fragment;
            }

            return json;
        }
    });

})();
;/**
 A **ShaderParams** sets uniform values for {{#crossLink "Shader"}}Shaders{{/crossLink}} on attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.

 ## Overview

 <ul>
 <li>Use ShaderParams components when you need to share the same {{#crossLink "Shader"}}Shaders{{/crossLink}} among multiple {{#crossLink "GameObject"}}GameObjects{{/crossLink}},
 while setting the {{#crossLink "Shader"}}Shaders{{/crossLink}}' uniforms differently for each {{#crossLink "GameObject"}}GameObject{{/crossLink}}.</li>
 </ul>

 <img src="../../../assets/images/ShaderParams.png"></img>

 ## Example

 This example shows the simplest way to use a {{#crossLink "Shader"}}Shader{{/crossLink}}, where we're just going to render a ripply water
 pattern to a screen-aligned quad. As with all our examples, we're just creating the
 essential components while falling back on the <a href="XEO.Scene.html#defaults" class="crosslink">Scene's default components</a>
 for everything else.

 <img src="../../assets/images/shaderParamsExample1.png"></img>

 In our scene definition, we have an  {{#crossLink "GameObject"}}GameObject{{/crossLink}} that has a {{#crossLink "Geometry"}}Geometry{{/crossLink}} that is our
 screen-aligned quad, plus a {{#crossLink "Shader"}}Shader{{/crossLink}} that will render the fragments of that quad with our cool rippling water pattern.
 Finally, we animate the rippling by periodically updating the {{#crossLink "Shader"}}Shader{{/crossLink}}'s "time" uniform.

 ````javascript
 var scene = new XEO.Scene();

 // Shader that's shared by both our GameObjects. Note the 'xeo_aPosition' and 'xeo_aUV attributes',
 // which will receive the positions and UVs from the Geometry components. Also note the 'time'
 // uniform, which we'll be animating via the ShaderParams components.

 var shader = new XEO.Shader(scene, {

       // Vertex shading stage
       vertex: [
           "attribute vec3 xeo_aPosition;",
           "attribute vec2 xeo_aUV;",
           "varying vec2 vUv;",
           "void main () {",
           "    gl_Position = vec4(xeo_aPosition, 1.0);",
           "    vUv = xeo_aUV;",
           "}"
       ],

       // Fragment shading stage
       fragment: [
           "precision mediump float;",

           "uniform float time;",
           "varying vec2 vUv;",

           "void main( void ) {",
           "    vec2 sp = vUv;",
           "    vec2 p = sp*5.0 - vec2(10.0);",
           "    vec2 i = p;",
           "    float c = 1.0;",
           "    float inten = 0.10;",
           "    for (int n = 0; n < 10; n++) {",
           "        float t = time * (1.0 - (3.0 / float(n+1)));",
           "        i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));",
           "        c += 1.0/length(vec2(p.x / (sin(i.x+t)/inten),p.y / (cos(i.y+t)/inten)));",
           "    }",
           "    c /= float(10);",
           "    c = 1.5-sqrt(c);",
           "    gl_FragColor = vec4(vec3(c*c*c*c), 999.0) + vec4(0.0, 0.3, 0.5, 1.0);",
           "}"
       ],

       // Initial values for the 'time' uniform in the fragment stage.
       params: {
           time: 0.0
       }
  });

 // First Object using our Shader, with a quad covering the left half of the canvas,
 // along with its own ShaderParams to independently set its own values for the Shader's uniforms.

 var quad1 = new XEO.Geometry(scene, {
       primitive:"triangles",
       positions:[ 1, 1, 0, 0, 1, 0, 0, -1, 0, 1, -1, 0 ],
       normals:[ -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0 ],
       uv:[ 1, 1, 0, 1, 0, 0, 1, 0 ],
       indices:[ 0, 1, 2, 0, 2, 3 ]
  });

 var shaderParams1 = new XEO.ShaderParams(scene, {
       params: {
           time: 0.0
       }
  });

 var object1 = new XEO.GameObject(scene, {
       shader: shader,
       geometry: quad1,
       shaderParams1: shaderParams1
  });

 // Second Object using the Shader, with a quad covering the right half of the canvas,
 // along with its own ShaderParams to independently set its own values for the Shader's uniforms.

 var quad2 = new XEO.Geometry(scene, {
       primitive:"triangles",
       positions:[ 1, 1, 0, 0, 1, 0, 0, -1, 0, 1, -1, 0 ],
       normals:[ -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0 ],
       uv:[ 1, 1, 0, 1, 0, 0, 1, 0 ],
       indices:[ 0, 1, 2, 0, 2, 3 ]
  });

 var shaderParams2 = new XEO.ShaderParams(scene, {
       params: {
           time: 0.0
       }
  });

 var object2 = new XEO.GameObject(scene, {
       shader: shader,
       geometry2: quad2,
       shaderParams2: shaderParams2
  });

 ````
 Now let's animate the "time" parameter on the Shader, for each Object independently:

 ```` javascript
 scene.on("tick", function(params) {

            shaderParams1.setParams({
                time: params.timeElapsed
            });

            shaderParams2.setParams({
                time: params.timeElapsed  * 0.5
            });
        });
 ````
 @class ShaderParams
 @module XEO
 @submodule rendering
 @constructor
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}Scene{{/crossLink}} - creates this ShaderParams in the default
 {{#crossLink "Scene"}}Scene{{/crossLink}} when omitted.
 @param [cfg] {*} Configs
 @param [cfg.id] {String} Optional ID, unique among all components in the parent scene, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this ShaderParams.
 @param [cfg.params={}] {Object} The {{#crossLink "Shader"}}Shader{{/crossLink}} parameter values.
 @extends Component
 */
(function () {

    "use strict";

    XEO.ShaderParams = XEO.Component.extend({

        type: "XEO.ShaderParams",

        _init: function (cfg) {

            this._state = new XEO.renderer.ShaderParams({
                params: {}
            });

            this.setParams(cfg.params);
        },

        _props: {

            /**
             * Params for {{#crossLink "Shader"}}Shaders{{/crossLink}} on attached
             * {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.
             *
             * Fires a {{#crossLink "Shader/params:event"}}{{/crossLink}} event on change.
             *
             * @property params
             * @default {}
             * @type {}
             */
            params: {

                get: function () {
                    return this._state.params;
                }
            }
        },

        /**
         * Sets one or more params for {{#crossLink "Shader"}}Shaders{{/crossLink}} on attached
         * {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.
         *
         * These will individually override any params of the same names that are {{#crossLink "Shader/setParams:method"}}already specified{{/crossLink}} on
         * those {{#crossLink "Shader"}}Shaders{{/crossLink}}.
         *
         * Fires a {{#crossLink "ShaderParams/params:event"}}{{/crossLink}} event on change.
         *
         * @method setParams
         * @param {} [params={}] Values for params to set on the {{#crossLink "Shader"}}Shaders{{/crossLink}}, keyed to their names.
         */
        setParams: function (params) {

            for (var name in params) {
                if (params.hasOwnProperty(name)) {
                    this._state.params[name] = params[name];
                }
            }

            this._renderer.imageDirty = true;

            /**
             * Fired whenever this ShaderParams' {{#crossLink "ShaderParams/params:property"}}{{/crossLink}} property has been updated.
             * @event params
             * @param value The property's new value
             */
            this.fire("params", this._state.params);
        },

        _compile: function () {
            this._renderer.shaderParams = this._state;
        },

        _getJSON: function () {
            return {
                params: this._state.params
            };
        }
    });

})();
;/**
 A **Stage** is a bin of {{#crossLink "GameObject"}}GameObjects{{/crossLink}} that is rendered in a specified priority with respect to
 other Stages in the same {{#crossLink "Scene"}}{{/crossLink}}.

 ## Overview

 <ul>
 <li>When the parent {{#crossLink "Scene"}}Scene{{/crossLink}} renders, each Stage renders its bin
 of {{#crossLink "GameObject"}}GameObjects{{/crossLink}} in turn, from the lowest priority Stage to the highest.</li>

 <li>Stages are typically used for ordering the render-to-texture steps in posteffects pipelines.</li>

 <li>You can control the render order of the individual {{#crossLink "GameObject"}}GameObjects{{/crossLink}} ***within*** a Stage
 by associating them with {{#crossLink "Layer"}}Layers{{/crossLink}}.</li>

 <li>{{#crossLink "Layer"}}Layers{{/crossLink}} are typically used to <a href="https://www.opengl.org/wiki/Transparency_Sorting" target="_other">transparency-sort</a> the
 {{#crossLink "GameObject"}}GameObjects{{/crossLink}} within Stages.</li>

 <li>{{#crossLink "GameObject"}}GameObjects{{/crossLink}} not explicitly attached to a Stage are implicitly
 attached to the {{#crossLink "Scene"}}Scene{{/crossLink}}'s default
 {{#crossLink "Scene/stage:property"}}stage{{/crossLink}}. which has
 a {{#crossLink "Stage/priority:property"}}{{/crossLink}} value of zero.</li>

 </ul>

 <img src="../../../assets/images/Stage.png"></img>

 ## Example

 In this example we're performing render-to-texture using {{#crossLink "ColorTarget"}}ColorTarget{{/crossLink}} and
 {{#crossLink "Texture"}}Texture{{/crossLink}} components.

 Note how we use two prioritized Stages, to ensure that the {{#crossLink "ColorTarget"}}ColorTarget{{/crossLink}} is
 rendered ***before*** the {{#crossLink "Texture"}}Texture{{/crossLink}} that consumes it.

 ````javascript
 var scene = new XEO.Scene();

 // First stage: an Object that renders to a ColorTarget

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


 // Second stage: an Object with a Texture that sources from the ColorTarget

 var stage2 = new XEO.Stage(scene, {
       priority: 1
  });

 var texture = new XEO.Texture(scene, {
       target: colorTarget
  });

 var material = new XEO.PhongMaterial(scene, {
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
 @submodule rendering
 @constructor
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}Scene{{/crossLink}} - creates this Stage in the default
 {{#crossLink "Scene"}}Scene{{/crossLink}} when omitted.
 @param [cfg] {*} Configs
 @param [cfg.id] {String} Optional ID, unique among all components in the parent scene, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this Stage.
 @param [cfg.priority=0] {Number} The rendering priority for the attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.
 @param [cfg.pickable=true] {Boolean} Indicates whether attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}} are pickable.
 @extends Component
 */
(function () {

    "use strict";

    XEO.Stage = XEO.Component.extend({

        type: "XEO.Stage",

        _init: function (cfg) {

            this._state = new XEO.renderer.Stage({
                priority: 0,
                pickable: true
            });

            this.priority = cfg.priority;
            this.pickable = cfg.pickable;
        },

        _props: {

            priority: {

                /**
                 * Indicates the rendering priority for the
                 * {{#crossLink "GameObject"}}GameObjects{{/crossLink}} in
                 * this Stage.
                 *
                 * Fires a {{#crossLink "Stage/priority:event"}}{{/crossLink}}
                 * event on change.
                 *
                 * @property priority
                 * @default 0
                 * @type Number
                 */
                set: function (value) {

                    this._state.priority = value || 0;

                    this._renderer.stateOrderDirty = true;

                    /**
                     * Fired whenever this Stage's
                     * {{#crossLink "Stage/priority:property"}}{{/crossLink}}
                     * property changes.
                     *
                     * @event priority
                     * @param value The property's new value
                     */
                    this.fire("priority", this._state.priority);
                },

                get: function () {
                    return this._state.priority;
                }
            },

            /**
             * Indicates whether the attached
             * {{#crossLink "GameObject"}}GameObjects{{/crossLink}} are
             * pickable (see {{#crossLink "Canvas/pick:method"}}Canvas#pick{{/crossLink}}).
             *
             * Fires a {{#crossLink "Stage/pickable:event"}}{{/crossLink}} event on change.
             *
             * @property pickable
             * @default true
             * @type Boolean
             */
            pickable: {

                set: function (value) {

                    this._state.pickable = value !== false;

                    this._renderer.drawListDirty = true;

                    /**
                     * Fired whenever this Stage's
                     * {{#crossLink "Stage/pickable:pickable"}}{{/crossLink}}
                     * property changes.
                     *
                     * @event pickable
                     * @param value The property's new value
                     */
                    this.fire("pickable", this._state.pickable);
                },

                get: function () {
                    return this._state.pickable;
                }
            }
        },

        _compile: function () {
            this._renderer.stage = this._state;
        },

        _getJSON: function () {
            return {
                priority: this.priority,
                pickable: this.pickable
            };
        },

        _destroy: function () {
            this._state.destroy();
        }
    });

})();
;(function () {

    "use strict";

    XEO.renderer = XEO.renderer || {};

    /**
     * @class Renderer compiled from a {@link SceneJS.Scene}, providing methods to render and pick.
     *
     * <p>A Renderer is a container of {@link XEO.renderer.Object}s which are created (or updated) by a depth-first
     * <b>compilation traversal</b> of a {@link SceneJS.Scene}.</b>
     *
     * <h2>Rendering Pipeline</h2>
     *
     * <p>Conceptually, a Renderer implements a pipeline with the following stages:</p>
     *
     * <ol>
     * <li>Create or update {@link XEO.renderer.Object}s during scene compilation</li>
     * <li>Organise the {@link XEO.renderer.Object} into an <b>object list</b></li>
     * <li>Determine the GL state sort order for the object list</li>
     * <li>State sort the object list</li>
     * <li>Create a <b>draw list</b> containing {@link XEO.renderer.Chunk}s belonging to the {@link XEO.renderer.Object}s in the object list</li>
     * <li>Render the draw list to draw the image</li>
     * </ol>
     *
     * <p>An update to the scene causes the pipeline to be re-executed from one of these stages, and SceneJS is designed
     * so that the pipeline is always re-executed from the latest stage possible to avoid redoing work.</p>
     *
     * <p>For example:</p>
     *
     * <ul>
     * <li>when an object is created or updated, we need to (re)do stages 2, 3, 4, 5 and 6</li>
     * <li>when an object is made invisible, we need to redo stages 5 and 6</li>
     * <li>when an object is assigned to a different scene render layer (works like a render bin), we need to redo
     *   stages 3, 4, 5, and 6</li>
     *<li>when the colour of an object changes, or maybe when the viewpoint changes, we simplt redo stage 6</li>
     * </ul>
     *
     * <h2>Object Creation</h2>
     * <p>The object soup (stage 1) is constructed by a depth-first traversal of the scene graph, which we think of as
     * "compiling" the scene graph into the Renderer. As traversal visits each scene component, the component's state core is
     * set on the Renderer (such as {@link #flags}, {@link #layer}, {@link #renderer} etc), which we think of as the
     * cores that are active at that instant during compilation. Each of the scene's leaf components is always
     * a {@link SceneJS.Geometry}, and when traversal visits one of those it calls {@link #buildObject} to create an
     * object in the soup. For each of the currently active cores, the object is given a {@link XEO.renderer.Chunk}
     * containing the WebGL calls for rendering it.</p>
     *
     * <p>The object also gets a shader (implemented by {@link XEO.renderer.Program}), taylored to render those state cores.</p>
     *
     * <p>Limited re-compilation may also be done on portions of a scene that have been added or sufficiently modified. When
     * traversal visits a {@link SceneJS.Geometry} for which an object already exists in the display, {@link #buildObject}
     * may update the {@link XEO.renderer.Chunk}s on the object as required for any changes in the core soup since the
     * last time the object was built. If differences among the cores require it, then {@link #buildObject} may also replace
     * the object's {@link XEO.renderer.Program} in order to render the new core soup configuration.</p>
     *
     * <p>So in summary, to each {@link XEO.renderer.Object} it builds, {@link #buildObject} creates a list of
     * {@link XEO.renderer.Chunk}s to render the set of component state cores that are currently set on the {@link XEO.Renderer}.
     * When {@link #buildObject} is re-building an existing object, it may replace one or more {@link XEO.renderer.Chunk}s
     * for state cores that have changed from the last time the object was built or re-built.</p>

     * <h2>Object Destruction</h2>
     * <p>Destruction of a scene graph branch simply involves a call to {@link #removeObject} for each {@link SceneJS.Geometry}
     * in the branch.</p>
     *
     * <h2>Draw List</h2>
     * <p>The draw list is actually comprised of two lists of state chunks: a "pick" list to render a pick buffer
     * for colour-indexed GPU picking, along with a "draw" list for normal image rendering. The chunks in these lists
     * are held in the state-sorted order of their objects in #_objectList, with runs of duplicate states removed.</p>
     *
     * <p>After a scene update, we set a flag on the display to indicate the stage we will need to redo from. The pipeline is
     * then lazy-redone on the next call to #render or #pick.</p>
     */
    XEO.renderer.Renderer = function (cfg) {

        // Renderer is bound to the lifetime of an HTML5 canvas
        this._canvas = cfg.canvas;

        // Factory which creates and recycles XEO.renderer.Program instances
        this._programFactory = new XEO.renderer.ProgramFactory({
            canvas: cfg.canvas
        });

        // Factory which creates and recycles XEO.renderer.Object instances
        this._objectFactory = new XEO.renderer.ObjectFactory();

        // Factory which creates and recycles XEO.renderer.Chunk instances
        this._chunkFactory = new XEO.renderer.ChunkFactory();

        /**
         * Indicates if the canvas is transparent
         * @type {boolean}
         */
        this.transparent = cfg.transparent === true;

        // The objects in the render
        this._objects = {};

        // Ambient color
        this._ambientColor = [0, 0, 0, 1.0];

        // The object list, containing all elements of #_objects, kept in GL state-sorted order
        this._objectList = [];
        this._objectListLen = 0;

        // The "draw list", comprised collectively of three lists of state chunks belong to visible objects
        // within #_objectList: a "pick" list to render a pick buffer for colour-indexed GPU picking, along with an
        // "draw" list for normal image rendering.  The chunks in these lists are held in the state-sorted order of
        // their objects in #_objectList, with runs of duplicate states removed.

        this._drawList = [];      // State chunk list to render all objects
        this._drawListLen = 0;

        this._pickDrawList = [];  // State chunk list to render scene to pick buffer
        this._pickDrawListLen = 0;


        // The frame context holds state shared across a single render of the
        // draw list, along with any results of the render, such as pick hits
        this._frameCtx = {
            pickObjects: [], // Pick names of objects hit during pick render
            canvas: this._canvas
        };

        //----------------- Render states --------------------------------------

        /**
         Visibility render state.
         @property visibility
         @type {renderer.Visibility}
         */
        this.visibility = null;

        /**
         Modes render state.
         @property modes
         @type {renderer.Modes}
         */
        this.modes = null;

        /**
         Render state for an effects layer.
         @property layer
         @type {renderer.Layer}
         */
        this.layer = null;

        /**
         Render state for an effects pipeline stage.
         @property stage
         @type {renderer.Layer}
         */
        this.stage = null;

        /**
         Depth buffer render state.
         @property depthBuf
         @type {renderer.DepthBuf}
         */
        this.depthBuf = null;

        /**
         Color buffer render state.
         @property colorBuf
         @type {renderer.ColorBuf}
         */
        this.colorBuf = null;

        /**
         Lights render state.
         @property lights
         @type {renderer.Lights}
         */
        this.lights = null;

        /**
         Material render state.
         @property material
         @type {renderer.Material}
         */
        this.material = null;

        /**
         Environmental reflection render state.
         @property reflection
         @type {renderer.Reflect}
         */
        this.reflect = null;

        /**
         Modelling transform render state.
         @property modelTransform
         @type {renderer.ModelTransform}
         */
        this.modelTransform = null;

        /**
         View transform render state.
         @property viewTransform
         @type {renderer.ViewTransform}
         */
        this.viewTransform = null;

        /**
         Projection transform render state.
         @property projTransform
         @type {renderer.ProjTransform}
         */
        this.projTransform = null;

        /**
         Color target render state.
         @property colorTarget
         @type {renderer.RenderTarget}
         */
        this.colorTarget = null;

        /**
         Depth target render state.
         @property depthTarget
         @type {renderer.RenderTarget}
         */
        this.depthTarget = null;

        /**
         Cross-section planes render state.
         @property clips
         @type {renderer.Clips}
         */
        this.clips = null;

        /**
         Morph targets render state.
         @property morphTargets
         @type {renderer.MorphTargets}
         */
        this.morphTargets = null;

        /**
         Custom shader render state.
         @property shader
         @type {renderer.Shader}
         */
        this.shader = null;

        /**
        Render state providing custom shader params.
         @property shaderParams
         @type {renderer.Shader}
         */
        this.shaderParams = null;

        /**
         Geometry render state.
         @property geometry
         @type {renderer.Geometry}
         */
        this.geometry = null;


        //----------------- Renderer dirty flags -------------------------------

        /**
         * Flags the object list as needing to be rebuilt from renderer objects
         * on the next call to {@link #render} or {@link #pick}. Setting this
         * will cause the rendering pipeline to be executed from stage #2
         * (see class comment), causing object list rebuild, state order
         * determination, state sort, draw list construction and image render.
         * @type Boolean
         */
        this.objectListDirty = true;

        /**
         * Flags the object list as needing state orders to be (re)computed on the
         * next call to {@link #render} or {@link #pick}. Setting this will cause
         * the rendering pipeline to be executed from stage #3 (see class comment),
         * causing state order determination, state sort, draw list construction
         * and image render.
         * @type Boolean
         */
        this.stateOrderDirty = true;

        /**
         * Flags the object list as needing to be state-sorted on the next call
         * to {@link #render} or {@link #pick}.Setting this will cause the
         * rendering pipeline to be executed from stage #4 (see class comment),
         * causing state sort, draw list construction and image render.
         * @type Boolean
         */
        this.stateSortDirty = true;

        /**
         * Flags the draw list as needing to be rebuilt from the object list on
         * the next call to {@link #render} or {@link #pick}.  Setting this will
         * cause the rendering pipeline to be executed from stage #5
         * (see class comment), causing draw list construction and image render.
         * @type Boolean
         */
        this.drawListDirty = true;

        /**
         * Flags the image as needing to be redrawn from the draw list on the
         * next call to {@link #render} or {@link #pick}. Setting this will
         * cause the rendering pipeline to be executed from stage #6
         * (see class comment), causing the image render.
         * @type Boolean
         */
        this.imageDirty = true;

        /**
         * Flags the neccessity for the pick buffer to be re-rendered from the
         * draw list.
         * @type Boolean
         */
        this.pickBufDirty = true;

        /**
         * Flags the neccessity for the ray-pick depth buffer to be re-rendered
         * from the draw list.
         * @type Boolean
         */
        this.rayPickBufDirty = true;
    };

    /**
     * Reallocates WebGL resources for objects within this renderer.
     */
    XEO.renderer.Renderer.prototype.webglRestored = function () {

        // Re-allocate programs
        this._programFactory.webglRestored();

        // Re-bind chunks to the programs
        this._chunkFactory.webglRestored();

        var gl = this._canvas.gl;

        // Rebuild pick buffers

        if (this.pickBuf) {
            this.pickBuf.webglRestored(gl);
        }

        if (this.rayPickBuf) {
            this.rayPickBuf.webglRestored(gl);
        }

        // Need redraw

        this.imageDirty = true;
    };

    /**
     * Internally creates (or updates) a {@link XEO.renderer.Object} of the given
     * ID from whatever component state cores are currently set on this {@link XEO.Renderer}.
     * The object is created if it does not already exist in the display, otherwise
     * it is updated with the current states, possibly replacing states already
     * referenced by the object.
     *
     * @param {String} objectId ID of object to create or update
     */
    XEO.renderer.Renderer.prototype.buildObject = function (objectId) {

        var object = this._objects[objectId];

        if (!object) {

            // Create the object

            object = this._objects[objectId] = this._objectFactory.get(objectId);

            this.objectListDirty = true;
        }

        // Attach to the object any states that we need to get off it later.
        // Most of these will be used when composing the object's shader.

        object.stage = this.stage;
        object.layer = this.layer;
        object.colorTarget = this.colorTarget;
        object.depthTarget = this.depthTarget;
        object.material = this.material;
        object.reflect = this.reflect;
        object.geometry = this.geometry;
        object.visibility = this.visibility;
        object.modes = this.modes;

        // Build hash of the object's state configuration. This is used
        // to hash the object's shader so that it may be reused by other
        // objects that have the same state configuration.

        var hash = ([

            // Make sure that every state type
            // with a hash is concatenated here

            this.geometry.hash,
            this.shader.hash,
            this.clips.hash,
            //this.morphTargets.hash,
            this.material.hash,
            //this.reflect.hash,
            this.lights.hash

        ]).join(";");

        if (!object.program || hash !== object.hash) {

            // Get new program for object if needed

            if (object.program) {
                this._programFactory.put(object.program);
            }

            object.program = this._programFactory.get(hash, this);

            object.hash = hash;
        }

        // Build sequence of draw chunks on the object

        // The order of some of these is important because some chunks will set
        // state on this._framectx to be consumed by other chunks downstream.

        this._setChunk(object, 0, "program"); // Must be first
        this._setChunk(object, 1, "modelTransform", this.modelTransform);
        this._setChunk(object, 2, "viewTransform", this.viewTransform);
        this._setChunk(object, 3, "projTransform", this.projTransform);
        this._setChunk(object, 4, "modes", this.modes);
        this._setChunk(object, 5, "shader", this.shader);
        this._setChunk(object, 6, "shaderParams", this.shaderParams);
        this._setChunk(object, 7, "depthBuf", this.depthBuf);
        this._setChunk(object, 8, "colorBuf", this.colorBuf);
        this._setChunk(object, 9, "lights", this.lights);
        this._setChunk(object, 10, this.material.type, this.material); // Supports different material systems
        this._setChunk(object, 11, "clips", this.clips);
        this._setChunk(object, 12, "geometry", this.geometry);
        this._setChunk(object, 13, "draw", this.geometry); // Must be last

        // At the very least, the object sort order
        // will need be recomputed

        this.stateOrderDirty = true;
    };

    /** Adds a render state chunk to a render graph object.
    */
    XEO.renderer.Renderer.prototype._setChunk = function (object, order, chunkType, state) {

        var oldChunk = object.chunks[order];

        if (oldChunk) {

          oldChunk.init(oldChunk.id, object, object.program, state);

          return;
        }

        // Attach new chunk

        object.chunks[order] = this._chunkFactory.getChunk(chunkType, object, object.program, state);

        // Ambient light is global across everything in display, and
        // can never be disabled, so grab it now because we want to
        // feed it to gl.clearColor before each display list render

        if (chunkType === "lights") {
            this._setAmbient(state);
        }
    };

    // Sets the singular ambient light.
    XEO.renderer.Renderer.prototype._setAmbient = function (state) {

        var lights = state.lights;
        var light;

        for (var i = 0, len = lights.length; i < len; i++) {

            light = lights[i];

            if (light.type === "ambient") {
                this._ambientColor[0] = light.color[0];
                this._ambientColor[1] = light.color[1];
                this._ambientColor[2] = light.color[2];
            }
        }
    };

    /**
     * Removes an object from this Renderer
     *
     * @param {String} objectId ID of object to remove
     */
    XEO.renderer.Renderer.prototype.removeObject = function (objectId) {

        var object = this._objects[objectId];

        if (!object) {
            return;
        }

        // Release object's shader
        this._programFactory.put(object.program);

        object.program = null;
        object.hash = null;

        // Release object
        this._objectFactory.put(object);

        delete this._objects[objectId];

        // Need to repack object map into fast iteration list
        this.objectListDirty = true;
    };


    /**
     * Renders a new frame, if neccessary.
     */
    XEO.renderer.Renderer.prototype.render = function (params) {

        params = params || {};

        if (this.objectListDirty) {
            this._buildObjectList();        // Build the scene object list
            this.objectListDirty = false;
            this.stateOrderDirty = true;    // Now needs state ordering
        }

        if (this.stateOrderDirty) {
            this._makeStateSortKeys();      // Determine the state sort order
            this.stateOrderDirty = false;
            this.stateSortDirty = true;     // Now needs state sorting
        }

        if (this.stateSortDirty) {
            this._stateSort();              // State sort the scene object list
            this.stateSortDirty = false;
            this.drawListDirty = true;      // Now need to build object draw list
        }

        if (this.drawListDirty) {           // Build draw list from object list
            this._buildDrawList();
            this.imageDirty = true;         // Now need to render the draw list
        }

        if (this.imageDirty || params.force) {

            // Render the draw list

            this._doDrawList({
                clear: (params.clear !== false) // Clear buffers by default
            });

            this.imageDirty = false;
            this.pickBufDirty = true;      // Pick buffer now needs redraw on next pick
        }
    };

    /**
     * (Re)builds the object list from the object soup.
     */
    XEO.renderer.Renderer.prototype._buildObjectList = function () {

        this._objectListLen = 0;

        for (var objectId in this._objects) {
            if (this._objects.hasOwnProperty(objectId)) {

                this._objectList[this._objectListLen++] = this._objects[objectId];
            }
        }
    };

    /**
     * (Re)generates each object's state sort key from it's states.
     */
    XEO.renderer.Renderer.prototype._makeStateSortKeys = function () {

        //  console.log("--------------------------------------------------------------------------------------------------");
        // console.log("XEO.Renderer_makeSortKeys");

        var object;

        for (var i = 0, len = this._objectListLen; i < len; i++) {

            object = this._objectList[i];

            if (!object.program) {

                // Non-visual object (eg. sound)
                object.sortKey = -1;

            } else {

                object.sortKey =
                    ((object.stage.priority + 1) * 1000000000000)
                    + ((object.modes.transparent ? 2 : 1) * 1000000000)
                    + ((object.layer.priority + 1) * 1000000)
                    + ((object.program.id + 1) * 1000)
                    + object.material.id;
            }
        }
        //  console.log("--------------------------------------------------------------------------------------------------");
    };

    /**
     * State-sorts the object list in ascending order of the object's state sort keys.
     */
    XEO.renderer.Renderer.prototype._stateSort = function () {

        this._objectList.length = this._objectListLen;

        this._objectList.sort(function (a, b) {
            return a.sortKey - b.sortKey;
        });
    };

    /**
     * Logs the object to the console for debugging
     */
    XEO.renderer.Renderer.prototype._logObjectList = function () {
        console.log("--------------------------------------------------------------------------------------------------");
        console.log(this._objectListLen + " objects");
        for (var i = 0, len = this._objectListLen; i < len; i++) {
            var object = this._objectList[i];
            console.log("XEO.Renderer : object[" + i + "] sortKey = " + object.sortKey);
        }
        console.log("--------------------------------------------------------------------------------------------------");
    };

    /**
     * Builds the draw list, which is the list of draw state-chunks to apply to WebGL
     * to render the visible objects in the object list for the next frame.
     * Preserves the state sort order of the object list among the draw chunks.
     */
    XEO.renderer.Renderer.prototype._buildDrawList = function () {

        this._lastChunkId = this._lastChunkId || [];
        this._lastPickChunkId = this._lastPickChunkId || [];

        for (var i = 0; i < 20; i++) {
            this._lastChunkId[i] = null;
            this._lastPickChunkId[i] = null;
        }

        this._drawListLen = 0;
        this._pickDrawListLen = 0;

        // For each render target, a list of objects to render to that target
        var targetObjectLists = {};

        // A list of all the render target object lists
        var targetListList = [];

        // List of all targets
        var targetList = [];

        var object;
        var targets;
        var target;
        var list;


        this._objectDrawList = this._objectDrawList || [];
        this._objectDrawListLen = 0;

        for (var i = 0, len = this._objectListLen; i < len; i++) {

            object = this._objectList[i];

            // Cull invisible objects

            if (object.visibility.visible === false) {
                continue;
            }

            // Put objects with render targets into a bin for each target

            if (object.colorTarget || object.depthTarget) {

                if (object.colorTarget) {

                    target = object.colorTarget;

                    list = targetObjectLists[target.id];

                    if (!list) {

                        list = [];

                        targetObjectLists[target.id] = list;

                        targetListList.push(list);

                        targetList.push(this._chunkFactory.getChunk("renderTarget", object, object.program, target));
                    }

                    list.push(object);
                }

                if (object.depthTarget) {

                    target = object.colorTarget;

                    list = targetObjectLists[target.id];

                    if (!list) {

                        list = [];

                        targetObjectLists[target.id] = list;

                        targetListList.push(list);

                        targetList.push(this._chunkFactory.getChunk("renderTarget", object, object.program, target));
                    }

                    list.push(object);
                }

            } else {

                // Put objects without render targets into their own list

                this._objectDrawList[this._objectDrawListLen++] = object;
            }
        }

        // Append chunks for objects within render targets first

        var pickable;

        for (var i = 0, len = targetListList.length; i < len; i++) {

            list = targetListList[i];
            target = targetList[i];

            this._appendRenderTargetChunk(target);

            for (var j = 0, lenj = list.length; j < lenj; j++) {

                object = list[j];

                pickable = object.stage && object.stage.pickable; // We'll only pick objects in pickable stages

                this._appendObjectToDrawLists(object, pickable);
            }
        }

        if (object) {

            // Unbinds any render target bound previously

            this._appendRenderTargetChunk(this._chunkFactory.getChunk("renderTarget", object, object.program, {}));
        }

        // Append chunks for objects not in render targets

        for (var i = 0, len = this._objectDrawListLen; i < len; i++) {

            object = this._objectDrawList[i];

            pickable = !object.stage || (object.stage && object.stage.pickable); // We'll only pick objects in pickable stages

            this._appendObjectToDrawLists(object, pickable);
        }

        // Draw list is now up to date.

        this.drawListDirty = false;
    };


    XEO.renderer.Renderer.prototype._appendRenderTargetChunk = function (chunk) {
        this._drawList[this._drawListLen++] = chunk;
    };

    /**
     * Appends an object to the draw and pick lists.
     * @param object
     * @param pickable
     * @private
     */
    XEO.renderer.Renderer.prototype._appendObjectToDrawLists = function (object, pickable) {

        var chunks = object.chunks;
        var picking = object.modes.picking;
        var chunk;

        for (var i = 0, len = chunks.length; i < len; i++) {

            chunk = chunks[i];

            if (chunk) {

                // As we apply the state chunk lists we track the ID of most types
                // of chunk in order to cull redundant re-applications of runs
                // of the same chunk - except for those chunks with a 'unique' flag,
                // because we don't want to collapse runs of draw chunks because
                // they contain the GL drawElements calls which render the objects.

                if (chunk.draw) {

                  // Rendering pass

                    if (chunk.unique || this._lastChunkId[i] !== chunk.id) {

                        // Don't reapply repeated chunks

                        this._drawList[this._drawListLen++] = chunk;
                        this._lastChunkId[i] = chunk.id;
                    }
                }

                if (chunk.pick) {

                   // Picking pass

                    if (pickable !== false) {

                        // Don't pick objects in unpickable stages

                        if (picking) {

                            // Don't pick unpickable objects

                            if (chunk.unique || this._lastPickChunkId[i] !== chunk.id) {

                                // Don't reapply repeated chunks

                                this._pickDrawList[this._pickDrawListLen++] = chunk;
                                this._lastPickChunkId[i] = chunk.id;
                            }
                        }
                    }
                }
            }
        }
    };

    /**
     * Logs the contents of the draw list to the console.
     *
     * @private
     */
    XEO.renderer.Renderer.prototype._logDrawList = function () {

        console.log("--------------------------------------------------------------------------------------------------");
        console.log(this._drawListLen + " draw list chunks");

        for (var i = 0, len = this._drawListLen; i < len; i++) {

            var chunk = this._drawList[i];

            console.log("[chunk " + i + "] type = " + chunk.type);

            switch (chunk.type) {
                case "draw":
                    console.log("\n");
                    break;

                case "renderTarget":
                    console.log(" type = renderTarget");
                    break;
            }
        }

        console.log("--------------------------------------------------------------------------------------------------");
    };

    /**
     * Logs the contents of the pick list to the console.
     *
     * @private
     */
    XEO.renderer.Renderer.prototype._logPickList = function () {

        console.log("--------------------------------------------------------------------------------------------------");
        console.log(this._pickDrawListLen + " pick list chunks");

        for (var i = 0, len = this._pickDrawListLen; i < len; i++) {

            var chunk = this._pickDrawList[i];

            console.log("[chunk " + i + "] type = " + chunk.type);

            switch (chunk.type) {
                case "draw":
                    console.log("\n");
                    break;
                case "renderTarget":
                    console.log(" type = renderTarget");
                    break;
            }
        }

        console.log("--------------------------------------------------------------------------------------------------");
    };

    /**
     * Attempts to pick a renderer object at the given canvas coordinates.
     *
     * @param {*} params Picking params.
     * @returns {*} Hit result, if any.
     */
    XEO.renderer.Renderer.prototype.pick = function (params) {

        var canvas = this._canvas.canvas;

        var hit = null;

        var canvasX = params.canvasPos[0];
        var canvasY = params.canvasPos[1];

        var pickBuf = this.pickBuf;

        // Lazy-create the pick buffer

        if (!pickBuf) {

            pickBuf = new XEO.renderer.webgl.RenderBuffer({
                gl: this._canvas.gl,
                canvas: this._canvas
            });

            this.pickBuf = pickBuf;

            this.pickBufDirty = true;
        }

        // Do any pending render

        this.render();

        // Colour-index pick to find the picked object

        pickBuf.bind();

        // Re-render the pick buffer if the image
        // was updated by the render we just did

        if (this.pickBufDirty) {

            pickBuf.clear();

            // Do a color-index picking pass over the draw list

            this._doDrawList({
                pick: true,
                clear: true
            });

            this._canvas.gl.finish();

            this.pickBufDirty = false;

            // Because the image was updated, we'll also need
            // to re-render the ray-pick depth buffer

            this.rayPickBufDirty = true;
        }

        // Read pixel color in pick buffer at given coordinates,
        // convert to an index into the pick name list

        var pix = pickBuf.read(canvasX, canvasY);
        var pickedObjectIndex = pix[0] + pix[1] * 256 + pix[2] * 65536;
        var pickIndex = (pickedObjectIndex >= 1) ? pickedObjectIndex - 1 : -1;

        pickBuf.unbind();

        // Look up pick name from index

        var object = this._frameCtx.pickObjects[pickIndex];

        if (object) {

            // Object was picked
            // Build hit report

            hit = {
                  object: object,
                  canvasPos: [
                    canvasX,
                    canvasY
                  ]
            };

            // Now do a ray-pick if requested

            if (params.rayPick) {

                // Lazy-create ray pick depth buffer

                var rayPickBuf = this.rayPickBuf;

                if (!rayPickBuf) {

                    rayPickBuf = new XEO.renderer.webgl.RenderBuffer({
                        gl: this._canvas.gl,
                        canvas: this._canvas
                    });

                    this.rayPickBuf = rayPickBuf;

                    this.rayPickBufDirty = true;
                }

                // Render depth values to the ray-pick depth buffer

                rayPickBuf.bind();

                if (this.rayPickBufDirty) {

                    rayPickBuf.clear();

                    this._doDrawList({
                        object: object,  // Render just the picked object
                        pick: true,
                        rayPick: true,
                        clear: true
                    });

                    this.rayPickBufDirty = false;
                }

                // Read pixel from depth buffer, convert to normalised device Z coordinate,
                // which will be in range of [0..1] with z=0 at front

                pix = rayPickBuf.read(canvasX, canvasY);

                rayPickBuf.unbind();

                // Get World-space ray-intersect position

                var screenZ = this._unpackDepth(pix);
                var w = canvas.width;
                var h = canvas.height;
                // Calculate clip space coordinates, which will be in range
                // of x=[-1..1] and y=[-1..1], with y=(+1) at top
                var x = (canvasX - w / 2) / (w / 2);           // Calculate clip space coordinates
                var y = -(canvasY - h / 2) / (h / 2);
                var projMat = this._frameCtx.projMatrix;
                var viewMat = this._frameCtx.viewMatrix;
                var pvMat = XEO.math.mulMat4(projMat, viewMat, []);
                var pvMatInverse = XEO.math.inverseMat4(pvMat, []);
                var world1 = XEO.math.transformVec4(pvMatInverse, [x, y, -1, 1]);
                world1 = XEO.math.mulVec4Scalar(world1, 1 / world1[3]);
                var world2 = XEO.math.transformVec4(pvMatInverse, [x, y, 1, 1]);
                world2 = XEO.math.mulVec4Scalar(world2, 1 / world2[3]);
                var dir = XEO.math.subVec3(world2, world1, []);
                var vWorld = XEO.math.addVec3(world1, XEO.math.mulVec4Scalar(dir, screenZ, []), []);

                // Got World-space intersect with surface of picked geometry

                hit.worldPos = vWorld;
            }
        }

        return hit;
    };

    /**
     * Unpacks a color-encoded depth
     * @param {Array(Number)} depthZ Depth encoded as an RGBA color value
     * @returns {Number}
     * @private
     */
    XEO.renderer.Renderer.prototype._unpackDepth = function (depthZ) {
        var vec = [depthZ[0] / 256.0, depthZ[1] / 256.0, depthZ[2] / 256.0, depthZ[3] / 256.0];
        var bitShift = [1.0 / (256.0 * 256.0 * 256.0), 1.0 / (256.0 * 256.0), 1.0 / 256.0, 1.0];
        return XEO.math.dotVec4(vec, bitShift);
    };

    /** Renders either the draw or pick list.
     *
     * @param {*} params
     * @param {Boolean} params.clear Set true to clear the color, depth and stencil buffers first
     * @param {Boolean} params.pick Set true to render for picking
     * @param {Boolean} params.rayPick Set true to render for ray-picking
     * @private
     */
    XEO.renderer.Renderer.prototype._doDrawList = function (params) {

        var gl = this._canvas.gl;

        // Initialize the renderer frame context.
        // The frame context holds state that will be used by draw list
        // chunks as they are rendered for this frame. Some of the frame context
        // state will also be updated by chunks as they are rendered.

        var frameCtx = this._frameCtx;

        frameCtx.pick = !!params.pick;
        frameCtx.rayPick = !!params.rayPick;
        frameCtx.renderTarget = null;
        frameCtx.renderBuf = null;
        frameCtx.viewMatrix = null;
        frameCtx.projMatrix = null;
        frameCtx.depthbufEnabled = null;
        frameCtx.clearDepth = null;
        frameCtx.depthFunc = gl.LESS;
        frameCtx.blendEnabled = false;
        frameCtx.backfaces = true;
        frameCtx.frontface = true; // true == "ccw" else "cw"
        frameCtx.pickIndex = 0; // Indexes this._pickObjects
        frameCtx.textureUnit = 0;
        frameCtx.lineWidth = 1;
        frameCtx.transparent = false; // True while rendering transparency bin
        frameCtx.ambientColor = this._ambientColor;

        // Set the viewport to the extents of the drawing buffer

        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

        gl.enable(gl.DEPTH_TEST);

        if (this.transparent) {

            // Canvas is transparent - set clear color with zero alpha
            // to allow background to show through

            gl.clearColor(0, 0, 0, 0);

        } else {

            // Canvas is opaque - set clear color to the current ambient
            // color, which can be provided by an ambient light source

            gl.clearColor(this._ambientColor[0], this._ambientColor[1], this._ambientColor[2], 1.0);
        }

        if (params.clear) {

            // Clear the various buffers for this frame

            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
        }

        // "modes" chunks set the backface winding direction
        gl.frontFace(gl.CCW);

        // "modes" chunks set backface culling on/off
        gl.disable(gl.CULL_FACE);

        // Last "modes" chunk in draw list with
        // transparent == true will enable blend
        gl.disable(gl.BLEND);

        if (params.pick) {

            // Pick render

            if (params.object) {

                // Render the pick chunks for a given object
                // TODO

            } else {

                // Render all pick chunks in the draw list

                for (var i = 0, len = this._pickDrawListLen; i < len; i++) {
                    this._pickDrawList[i].pick(frameCtx);
                }
            }

        } else {

            // Render the draw chunk list

            for (var i = 0, len = this._drawListLen; i < len; i++) {
                this._drawList[i].draw(frameCtx);
            }
        }

        gl.flush();

        if (frameCtx.renderBuf) {
    //        frameCtx.renderBuf.unbind();
        }

//
//    var numTextureUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
//    for (var ii = 0; ii < numTextureUnits; ++ii) {
//        gl.activeTexture(gl.TEXTURE0 + ii);
//        gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
//        gl.bindTexture(gl.TEXTURE_2D, null);
//    }
    };

    /**
     * Destroys this Renderer.
     */
    XEO.renderer.Renderer.prototype.destroy = function () {
        this._programFactory.destroy();
    };

})();
;/**
 * Renderer states
 */
(function () {

    "use strict";

    XEO.renderer = XEO.renderer || {};

    var states = new XEO.utils.Map({});

    /**

     Base class for Renderer states.

     @class renderer.State
     @module XEO
     @submodule renderer
     @constructor
     @param cfg {*} Configs
     */
    XEO.renderer.State = Class.extend({

        __init: function (cfg) {

            this.id = states.addItem({});

            this.hash = cfg.hash || "" + this.id;

            for (var key in cfg) {
                if (cfg.hasOwnProperty(key)) {
                    this[key] = cfg[key];
                }
            }
        },

        destroy: function () {
            states.removeItem(this.id);
        }
    });

    //XEO.renderer.State.prototype.destroy = function () {
    //    states.removeItem(this.id);
    //};

    /**

     Visibility state.

     @class renderer.Visibility
     @module XEO
     @submodule renderer
     @constructor
     @param cfg {*} Configs
     @param cfg.visible {Boolean} Flag which controls visibility of the associated render objects.
     @extends renderer.State
     */
    XEO.renderer.Visibility = XEO.renderer.State.extend({});

    /**

     Modes state.

     @class renderer.Mode
     @module XEO
     @submodule renderer
     @constructor
     @param cfg {*} Configs
     @param cfg.picking {Boolean} Flag which controls pickability of the associated render objects.
     @param cfg.clipping {Boolean} Flag which controls whether associated render objects are clippable.
     @param cfg.transparent {Boolean} Flag which controls transparency of the associated render objects.
     @param cfg.frontFace {Boolean} Flag which determines winding order of backfaces on the associated render objects - true == "ccw", false == "cw".
     @extends renderer.State
     */
    XEO.renderer.Modes = XEO.renderer.State.extend({});

    /**

     Layer state.

     @class renderer.Layer
     @module XEO
     @submodule renderer
     @constructor
     @param cfg {*} Configs
     @param cfg.priority {Number} Layer render priority.
     @extends renderer.State
     */
    XEO.renderer.Layer = XEO.renderer.State.extend({});

    /**

     Stage state.

     @class renderer.Stage
     @module XEO
     @submodule renderer
     @constructor
     @param cfg {*} Configs
     @param cfg.priority {Number} Stage render priority.
     @extends renderer.State
     */
    XEO.renderer.Stage = XEO.renderer.State.extend({});

    /**

     Depth buffer state.

     @class renderer.DepthBuf
     @module XEO
     @submodule renderer
     @constructor
     @param cfg {*} Configs
     @param cfg.clearDepth {Number} Clear depth
     @param cfg.depthBuf {String} Depth function
     @extends renderer.State
     */
    XEO.renderer.DepthBuf = XEO.renderer.State.extend({});

    /**

     Color buffer state.

     @class renderer.ColorBuf
     @module XEO
     @submodule renderer
     @constructor
     @param cfg {*} Configs
     @param cfg.blendEnabled {Boolean} Indicates if blending is enebled for
     @param cfg.colorMask {Array of String} The color mask
     @extends renderer.State
     */
    XEO.renderer.ColorBuf = XEO.renderer.State.extend({});

    /**

     Renderer lights state.

     @class renderer.Lights
     @module XEO
     @submodule renderer
     @constructor
     @param cfg {*} Configs
     @param cfg.colorMask {Array of Object} The light sources
     @extends renderer.State
     */
    XEO.renderer.Lights = XEO.renderer.State.extend({});

    /**

     PhongMaterial state.

     @class renderer.PhongMaterial
     @module XEO
     @submodule renderer
     @constructor
     @param cfg {*} Configs
     @extends renderer.State
     */
    XEO.renderer.PhongMaterial = XEO.renderer.State.extend({});

    /**

     Environmental reflection state.

     @class renderer.Reflect
     @module XEO
     @submodule renderer
     @constructor
     @param cfg {*} Configs
     @extends renderer.State
     */
    XEO.renderer.Reflect = XEO.renderer.State.extend({});

    /**

     Modelling transform state.

     @class renderer.ModelTransform
     @module XEO
     @submodule renderer
     @constructor
     @param cfg {*} Configs
     @extends renderer.State
     */
    XEO.renderer.ModelTransform = XEO.renderer.State.extend({});

    /**

     Viewing transform state.

     @class renderer.ViewTransform
     @module XEO
     @submodule renderer
     @constructor
     @param cfg {*} Configs
     @extends renderer.State
     */
    XEO.renderer.ViewTransform = XEO.renderer.State.extend({});

    /**

     Projection transform state.

     @class renderer.ProjTransform
     @module XEO
     @submodule renderer
     @constructor
     @param cfg {*} Configs
     @extends renderer.State
     */
    XEO.renderer.ProjTransform = XEO.renderer.State.extend({});

    /**

     Render target state.

     @class renderer.RenderTarget
     @module XEO
     @submodule renderer
     @constructor
     @param cfg {*} Configs
     @extends renderer.State
     */
    XEO.renderer.RenderTarget = XEO.renderer.State.extend({});

    XEO.renderer.RenderTarget.DEPTH = 0;
    XEO.renderer.RenderTarget.COLOR = 1;

    /**

     Clip planes state.

     @class renderer.Clips
     @module XEO
     @submodule renderer
     @constructor
     @param cfg {*} Configs
     @extends renderer.State
     */
    XEO.renderer.Clips = XEO.renderer.State.extend({});

    /**

     Renderer morph targets state.

     @class renderer.MorphTargets
     @module XEO
     @submodule renderer
     @constructor
     @param cfg {*} Configs
     @extends renderer.State
     */
    XEO.renderer.MorphTargets = XEO.renderer.State.extend({});

    /**

     Shader state.

     @class renderer.Shader
     @module XEO
     @submodule renderer
     @constructor
     @param cfg {*} Configs
     @extends renderer.State
     */
    XEO.renderer.Shader = XEO.renderer.State.extend({});

    /**

     Shader parameters state.

     @class renderer.ShaderParams
     @module XEO
     @submodule renderer
     @constructor
     @param cfg {*} Configs
     @extends renderer.State
     */
    XEO.renderer.ShaderParams = XEO.renderer.State.extend({});

    /**

     Texture state.

     @class renderer.Texture
     @module XEO
     @submodule renderer
     @constructor
     @param cfg {*} Configs
     @extends renderer.State
     */
    XEO.renderer.Texture = XEO.renderer.State.extend({});


    /**

     Geometry state.

     @class renderer.Geometry
     @module XEO
     @submodule renderer
     @constructor
     @param cfg {*} Configs
     @extends renderer.State
     */
    XEO.renderer.Geometry = XEO.renderer.State.extend({});

})();


;(function () {

    "use strict";

    /**
     * @class An object within a XEO.renderer.Renderer
     */
    XEO.renderer.Object = function (id) {

        /**
         * ID for this object, unique among all objects in the Renderer
         */
        this.id = id;

        /**
         * Hash code for this object, unique among all objects in the Renderer
         */
        this.hash = null;

        /**
         * State sort key, computed from #layer, #program and #material
         * @type Number
         */
        this.sortKey = null;

        /**
         * Sequence of state chunks applied to render this object
         */
        this.chunks = [];

        /**
         * Number of state chunks applied to render this object
         */
        this.chunksLen = 0;

        /**
         * Shader programs that render this object, also used for (re)computing #sortKey
         */
        this.program = null;

        /**
         * State for the XEO.renderer.Stage that this object was compiled from, used for (re)computing #sortKey and visibility cull
         */
        this.stage = null;

        /**
         * State for the XEO.renderer.Modes that this object was compiled from, used for visibility cull
         */
        this.modes = null;

        /**
         * State for the XEO.renderer.Layer that this object was compiled from, used for (re)computing #sortKey and visibility cull
         */
        this.layer = null;

        /**
         * State for the XEO.renderer.Material that this object was compiled from, used for (re)computing #sortKey
         */
        this.material = null;
    };
})();;(function () {

    "use strict";

    XEO.renderer.ObjectFactory = function () {

        var freeObjects = [];
        var numFreeObjects = 0;

        this.get = function (id) {

            var object;

            if (numFreeObjects > 0) {

                object = freeObjects[--numFreeObjects];

                object.id = id;

                return object;
            }

            return new XEO.renderer.Object(id);
        };

        this.put = function (object) {
            freeObjects[numFreeObjects++] = object;
        };
    };

})();


;(function () {

    "use strict";

    XEO.renderer = XEO.renderer || {};

    /**
     * @class Vertex and fragment shaders for pick and draw
     *
     * @param {Number} id ID unique among all programs in the owner {@link XEO.renderer.ProgramFactory}
     * @param {String} hash Hash code which uniquely identifies the capabilities of the program, computed from hashes on the {@link Scene_Core}s that the {@link XEO.renderer.ProgramSource} composed to render
     * @param {XEO.renderer.ProgramSource} source Sourcecode from which the the program is compiled in {@link #build}
     * @param {WebGLRenderingContext} gl WebGL context
     */
    XEO.renderer.Program = function (id, hash, source, gl) {

        /**
         * ID for this program, unique among all programs in the display
         * @type Number
         */
        this.id = id;

        /**
         * Hash code for this program's capabilities, same as the hash on {@link #source}
         * @type String
         */
        this.hash = source.hash;

        /**
         * Source code for this program's shaders
         * @type renderer.ProgramSource
         */
        this.source = source;

        /**
         * WebGL context on which this program's shaders are allocated
         * @type WebGLRenderingContext
         */
        this.gl = gl;

        /**
         * The drawing program
         * @type webgl.Program
         */
        this.draw = null;

        /**
         * The picking program
         * @type webgl.Program
         */
        this.pick = null;

        /**
         * The count of display objects using this program
         * @type Number
         */
        this.useCount = 0;

        this.build(gl);
    };

    /**
     *  Creates the render and pick programs.
     * This is also re-called to re-create them after WebGL context loss.
     */
    XEO.renderer.Program.prototype.build = function (gl) {

        this.gl = gl;

        this.draw = new XEO.renderer.webgl.Program(gl, this.source.drawVertex, this.source.drawFragment);
        this.pick = new XEO.renderer.webgl.Program(gl, this.source.pickVertex, this.source.pickFragment);
    };

})();
;(function () {

    "use strict";

    /**
     * @class Manages {@link XEO.renderer.Program} instances.
     */
    XEO.renderer.ProgramFactory = function (cfg) {

        this._canvas = cfg.canvas;

        this._programs = {};

        this._nextProgramId = 0;
    };


    /**
     * Get a program that fits the given set of states.
     * Reuses any free program in the pool that matches the given hash.
     */
    XEO.renderer.ProgramFactory.prototype.get = function (hash, states) {

        var program = this._programs[hash];

        if (!program) {

            // No program exists for the states

            // Create it and map it to the hash

            var source = XEO.renderer.ProgramSourceFactory.getSource(hash, states);

            program = new XEO.renderer.Program(this._nextProgramId++, hash, source, this._canvas.gl);

            this._programs[hash] = program;
        }

        program.useCount++;

        return program;
    };

    /**
     * Release a program back to the pool.
     */
    XEO.renderer.ProgramFactory.prototype.put = function (program) {

        if (--program.useCount <= 0) {

            program.draw.destroy();
            program.pick.destroy();

            XEO.renderer.ProgramSourceFactory.putSource(program.hash);

            this._programs[program.hash] = null;
        }
    };

    /**
     * Rebuild all programs in the pool after WebGL context was lost and restored.
     */
    XEO.renderer.ProgramFactory.prototype.webglRestored = function () {

        var gl = this._canvas.gl;

        for (var id in this._programs) {
            if (this._programs.hasOwnProperty(id)) {

                this._programs[id].build(gl);
            }
        }
    };

    XEO.renderer.ProgramFactory.prototype.destroy = function () {
    };

})();
;(function () {

    "use strict";

    /**
     * @class Source code for pick and draw shader programs, to be compiled into one or more {@link XEO.renderer.Program}s
     *
     * @param {String} hash Hash code identifying the rendering capabilities of the programs
     * @param {String} pickVertex Source code of the pick vertex shader
     * @param {String} pickFragment Source code of the pick fragment shader
     * @param {String} drawVertex Source code of the draw vertex shader
     * @param {String} drawFragment Source code of the draw fragment shader
     */
    XEO.renderer.ProgramSource = function (hash, pickVertex, pickFragment, drawVertex, drawFragment) {

        /**
         * Hash code identifying the capabilities of the {@link XEO.renderer.Program} that is compiled from this source
         * @type String
         */
        this.hash = hash;

        /**
         * Source code for pick vertex shader
         * @type String
         */
        this.pickVertex = pickVertex;

        /**
         * Source code for pick fragment shader
         * @type String
         */
        this.pickFragment = pickFragment;

        /**
         * Source code for draw vertex shader
         * @type String
         */
        this.drawVertex = drawVertex;

        /**
         * Source code for draw fragment shader
         * @type String
         */
        this.drawFragment = drawFragment;

        /**
         * Count of {@link XEO.renderer.Program}s compiled from this program source code
         * @type Number
         */
        this.useCount = 0;
    };

})();

;(function () {

    "use strict";

    /**
     * @class Manages creation, sharing and recycle of {@link XEO.renderer.ProgramSource} instances
     */
    XEO.renderer.ProgramSourceFactory = new (function () {

        var cache = {}; // Caches source code against hashes

        var src = ""; // Accumulates source code as it's being built

        var states; // Cache rendering state
        var texturing; // True when rendering state contains textures
        var normals; // True when rendering state contains normals
        var tangents; // True when rendering state contains tangents
        var clipping; // True when rendering state contains clip planes
        var morphing; // True when rendering state contains morph targets
        var reflection; // True when rendering state contains reflections
        var depthTarget; // True when rendering state contains a depth target

        /**
         * Get source code for a program to render the given states.
         * Attempts to reuse cached source code for the given hash.
         */
        this.getSource = function (hash, _states) {

            var source = cache[hash];

            if (source) {
                source.useCount++;
                return source;
            }

            states = _states;

            texturing = isTexturing();
            normals = hasNormals();
            tangents = hasTangents();
            clipping = states.clips.clips.length > 0;
            //morphing = !!states.morphTargets.targets;
            morphing = false;
            reflection = hasReflection();
            depthTarget = hasDepthTarget();

            source = new XEO.renderer.ProgramSource(
                hash,
                composePickingVertexShader(),
                composePickingFragmentShader(),
                composeRenderingVertexShader(),
                composeRenderingFragmentShader()
            );

            cache[hash] = source;

            return source;
        };

        // Returns true if texturing

        function isTexturing() {

            if (!states.geometry.uv) {
                return false;
            }

            var material = states.material;

            if (material.type === "phongMaterial") {

                if (material.diffuseMap || material.specularMap || material.emissiveMap || material.opacityMap || material.reflectivityMap) {
                    return true;
                }
            }

            return false;
        }

        // Returns true if rendering reflections
        function hasReflection(states) {
            return false;
            //return (states.cubemap.layers && states.cubemap.layers.length > 0 && states.geometry.normalBuf);
        }

        // Returns true if normals exist on geometry
        function hasNormals() {

            if (states.geometry.normals) {
                return true;
            }

            //if (states.MorphTargets.targets && states.MorphTargets.targets[0].normalBuf) {
            //    return true;
            //}

            return false;
        }

        // Returns true if geometry has tangents for normal mapping
        function hasTangents() {

            //if (states.texture) {
            //
            //    var layers = states.texture.layers;
            //
            //    if (!layers) {
            //        return false;
            //    }
            //
            //    for (var i = 0, len = layers.length; i < len; i++) {
            //        if (layers[i].applyTo === "normals") {
            //            return true;
            //        }
            //    }
            //}
            //
            return false;
        }

        // Returns true if renderer state set contains a depth target
        function hasDepthTarget() {
            return !!states.depthTarget;
        }

        /**
         * Releases program source code back to this factory.
         */
        this.putSource = function (hash) {

            var source = cache[hash];

            if (source) {
                if (--source.useCount === 0) {
                    cache[source.hash] = null;
                }
            }
        };

        // Returns GLSL for a picking mode vertex shader
        //
        function composePickingVertexShader() {

            begin();

            add("attribute vec3 xeo_aPosition;");

            add("uniform mat4 xeo_uModelMatrix;");
            add("uniform mat4 xeo_uViewMatrix;");
            add("uniform mat4 xeo_uViewNormalMatrix;");
            add("uniform mat4 xeo_uProjMatrix;");

            add("varying vec4 xeo_vWorldPosition;");
            add("varying vec4 xeo_vViewPosition;");

//            if (morphing) {
//                add("uniform float xeo_uMorphFactor;");       // LERP factor for morph
//                if (states.MorphTargets.targets[0].vertexBuf) {      // target2 has these arrays also
//                    add("attribute vec3 xeo_aMorphVertex;");
//                }
//            }

            add("void main(void) {");

            add("vec4 tmpVertex = vec4(xeo_aPosition, 1.0); ");

//            if (morphing) {
//                if (states.MorphTargets.targets[0].vertexBuf) {
//                    add("  tmpVertex = vec4(mix(tmpVertex.xyz, xeo_aMorphVertex, xeo_uMorphFactor), 1.0); ");
//                }
//            }

            add("xeo_vWorldPosition = xeo_uModelMatrix * tmpVertex; ");

            add("xeo_vViewPosition = xeo_uViewMatrix * xeo_vWorldPosition;");

            add("gl_Position = xeo_uProjMatrix * xeo_vViewPosition;");

            add("}");

            return end();
        }

        function composePickingFragmentShader() {

            begin();

            add("precision " + getFSFloatPrecision(states._canvas.gl) + " float;");

            add("varying vec4 xeo_vWorldPosition;");
            add("varying vec4 xeo_vViewPosition;");

            add("uniform bool  xeo_uRayPickMode;");
            add("uniform vec3  xeo_uPickColor;");

            // Clipping

            if (clipping) {
                for (var i = 0; i < states.clips.clips.length; i++) {
                    add("uniform float xeo_uClipMode" + i + ";");
                    add("uniform vec4  xeo_uClipPlane" + i + ";");
                }
            }

            // Pack depth function for ray-pick

            add("vec4 packDepth(const in float depth) {");
            add("  const vec4 bitShift = vec4(256.0*256.0*256.0, 256.0*256.0, 256.0, 1.0);");
            add("  const vec4 bitMask  = vec4(0.0, 1.0/256.0, 1.0/256.0, 1.0/256.0);");
            add("  vec4 res = fract(depth * bitShift);");
            add("  res -= res.xxyz * bitMask;");
            add("  return res;");
            add("}");

            // main

            add("void main(void) {");

            // Clipping logic

            if (clipping) {
                add("if (SCENEJS_uModesClipping) {");
                add("float dist = 0.0;");
                for (var i = 0; i < states.clips.clips.length; i++) {
                    add("if (xeo_uClipMode" + i + " != 0.0) {");
                    add("   dist += clamp(dot(xeo_vWorldPosition.xyz, xeo_uClipPlane" + i + ".xyz) - xeo_uClipPlane" + i + ".w, 0.0, 1000.0);");
                    add("}");
                }
                add("if (dist > 0.0) { discard; }");
                add("}");
            }

            add("if (xeo_uRayPickMode) {");

            // Output color-encoded depth value for ray-pick

            add("   gl_FragColor = packDepth(gl_Position.z); ");

            add("} else {");

            // Output indexed color value for normal pick

            add("   gl_FragColor = vec4(xeo_uPickColor.rgb, 1.0);  ");

            add("}");
            add("}");

            return end();
        }


        function composeRenderingVertexShader() {

            var vertex = states.shader.vertex;

            if (vertex) {

                // Custom vertex shader
                return vertex;
            }

            begin();

            // Matrix uniforms

            add("uniform mat4 xeo_uModelMatrix;");
            add("uniform mat4 xeo_uViewMatrix;");
            add("uniform mat4 xeo_uProjMatrix;");

            // World-space eye position

            add("uniform vec3 xeo_uEye;");

            // Model-space vertex position

            add("attribute vec3 xeo_aPosition;");

            // View-space fragment position

            add("varying vec4 xeo_vViewPosition;");

            // View-space vector from fragment position to eye

            add("varying vec3 xeo_vViewEyeVec;");

            if (normals) {

                // Normals

                add("attribute vec3 xeo_aNormal;");

                // Modelling and View normal transform matrix

                add("uniform mat4 xeo_uModelNormalMatrix;");
                add("uniform mat4 xeo_uViewNormalMatrix;");

                // View-space normal

                add("varying vec3 xeo_vViewNormal;");

                if (tangents) {
                    add("attribute vec4 xeo_aTangent;");
                }

                // Lights

                for (var i = 0; i < states.lights.lights.length; i++) {

                    var light = states.lights.lights[i];

                    if (light.type === "ambient") {
                        continue;
                    }

                    // Directional

                    if (light.type === "dir") {
                        add("uniform vec3 xeo_uLightDir" + i + ";");
                    }

                    // Point

                    if (light.type === "point") {
                        add("uniform vec3 xeo_uLightPos" + i + ";");
                    }

                    // Spot

                    if (light.type === "spot") {
                        add("uniform vec3 xeo_uLightPos" + i + ";");
                    }

                    // Vector from vertex to light, packaged with the pre-computed length of that vector
                    add("varying vec4 xeo_vViewLightVecAndDist" + i + ";");
                }
            }

            if (clipping) {

                // World-space fragment position

                add("varying vec4 xeo_vWorldPosition;");
            }

            if (texturing) {

                // Vertex UV coordinate

                add("attribute vec2 xeo_aUV;");

                // Fragment UV coordinate

                add("varying vec2 xeo_vUV;");
            }

            if (states.geometry.colorBuf) {

                // Vertex color

                add("attribute vec4 xeo_aColor;"); // Vertex colors

                // Fragment color

                add("varying vec4 xeo_vColor;"); // Varying for fragment texturing
            }

            //if (morphing) {
            //    add("uniform float xeo_uMorphFactor;");// LERP factor for morph
            //    if (states.MorphTargets.targets[0].vertexBuf) {  // target2 has these arrays also
            //        add("attribute vec3 xeo_aMorphVertex;");
            //    }
            //    if (normals) {
            //        if (states.MorphTargets.targets[0].normalBuf) {
            //            add("attribute vec3 xeo_aMorphNormal;");
            //        }
            //    }
            //}

            add("void main(void) {");

            add("vec4 modelPosition = vec4(xeo_aPosition, 1.0); ");

            if (normals) {
                add("vec4 modelNormal = vec4(xeo_aNormal, 0.0); ");
            }

            //if (morphing) {
            //    if (states.MorphTargets.targets[0].vertexBuf) {
            //        add("vec4 vMorphVertex = vec4(xeo_aMorphVertex, 1.0); ");
            //        add("modelPosition = vec4(mix(modelPosition.xyz, vMorphVertex.xyz, xeo_uMorphFactor), 1.0); ");
            //    }
            //    if (normals) {
            //        if (states.MorphTargets.targets[0].normalBuf) {
            //            add("vec4 vMorphNormal = vec4(xeo_aMorphNormal, 1.0); ");
            //            add("modelNormal = vec4( mix(modelNormal.xyz, vMorphNormal.xyz, xeo_uMorphFactor), 1.0); ");
            //        }
            //    }
            //}

            add("vec4 worldPosition = xeo_uModelMatrix * modelPosition;");

            add("vec4 viewPosition  = xeo_uViewMatrix * worldPosition; ");

            if (normals) {
                add("vec3 worldNormal = (xeo_uModelNormalMatrix * modelNormal).xyz; ");
                add("xeo_vViewNormal = (xeo_uViewNormalMatrix * vec4(worldNormal, 1.0)).xyz;");
            }

            if (clipping) {
                add("  xeo_vWorldPosition = worldPosition;");
            }

            add("xeo_vViewPosition = viewPosition;");

            if (tangents) {

                // Compute tangent-bitangent-normal matrix

                add("vec3 tangent = normalize((xeo_uViewNormalMatrix * xeo_uModelNormalMatrix * xeo_aTangent).xyz);");
                add("vec3 bitangent = cross(xeo_vViewNormal, tangent);");
                add("mat3 TBM = mat3(tangent, bitangent, xeo_vViewNormal);");
            }

            add("  vec3 tmpVec3;");

            if (normals) {

                for (var i = 0; i < states.lights.lights.length; i++) {

                    light = states.lights.lights[i];

                    if (light.type === "ambient") {
                        continue;
                    }

                    if (light.type === "dir") {

                        // Directional light

                        if (light.space === "world") {

                            // World space light

                            add("tmpVec3 = normalize(xeo_uLightDir" + i + ");");

                            // Transform to View space
                            add("tmpVec3 = vec3(xeo_uViewMatrix * vec4(tmpVec3, 0.0)).xyz;");

                            if (tangents) {

                                // Transform to Tangent space
                                add("tmpVec3 *= TBM;");
                            }

                        } else {

                            // View space light

                            add("tmpVec3 = normalize(xeo_uLightDir" + i + ");");

                            if (tangents) {

                                // Transform to Tangent space
                                add("tmpVec3 *= TBM;");
                            }
                        }

                        // Output
                        add("xeo_vViewLightVecAndDist" + i + " = vec4(-tmpVec3, 0.0);");
                    }

                    if (light.type === "point") {

                        // Positional light

                        if (light.space === "world") {

                            // World space

                            // Transform into View space

                            add("tmpVec3 = xeo_uLightPos" + i + " - worldPosition.xyz;"); // Vector from World coordinate to light pos

                            // Transform to View space
                            add("tmpVec3 = vec3(xeo_uViewMatrix * vec4(tmpVec3, 0.0)).xyz;");

                            if (tangents) {

                                // Transform to Tangent space
                                add("tmpVec3 *= TBM;");
                            }

                        } else {

                            // View space

                            add("tmpVec3 = xeo_uLightPos" + i + ".xyz - viewPosition.xyz;"); // Vector from View coordinate to light pos

                            if (tangents) {

                                // Transform to tangent space
                                add("tmpVec3 *= TBM;");
                            }
                        }

                        // Output
                        add("xeo_vViewLightVecAndDist" + i + " = vec4(tmpVec3, length(xeo_uLightPos" + i + ".xyz - worldPosition.xyz));");
                    }
                }
            }

            add("xeo_vViewEyeVec = ((xeo_uViewMatrix * vec4(xeo_uEye, 0.0)).xyz  - viewPosition.xyz);");

            if (tangents) {

                add("xeo_vViewEyeVec *= TBM;");
            }

            if (texturing) {

                if (states.geometry.uv) {
                    add("xeo_vUV = xeo_aUV;");
                }
            }

            if (states.geometry.colorBuf) {
                add("xeo_vColor = xeo_aColor;");
            }

            add("gl_Position = xeo_uProjMatrix * xeo_vViewPosition;");

            add("}");

            return end();
        }


        function composeRenderingFragmentShader() {

            var fragment = states.shader.fragment;
            if (fragment) {
                // Custom fragment shader
                return fragment;
            }

            begin();

            add("precision " + getFSFloatPrecision(states._canvas.gl) + " float;");

            add("varying vec4 xeo_vViewPosition;");

            add("uniform float xeo_uZNear;");
            add("uniform float xeo_uZFar;");

            if (clipping) {

                add("varying vec4 xeo_vWorldPosition;");

                for (var i = 0; i < states.clips.clips.length; i++) {
                    add("uniform float xeo_uClipMode" + i + ";");
                    add("uniform vec4  xeo_uClipPlane" + i + ";");
                }
            }

            var flatMaterial = (states.material.type === "flatMaterial");
            var phongMaterial = !flatMaterial && (states.material.type === "phongMaterial");
            var pbrMaterial = !flatMaterial && !phongMaterial && (states.material.type === "pbrMaterial");

            if (phongMaterial) {

                add("uniform vec3 xeo_uMaterialDiffuse;");
                add("uniform vec3 xeo_uMaterialSpecular;");
                add("uniform vec3 xeo_uMaterialEmissive;");
                add("uniform float xeo_uMaterialOpacity;");
                add("uniform float xeo_uMaterialShininess;");
                add("uniform float xeo_uMaterialReflectivity;");

                if (texturing) {

                    if (states.geometry.uv) {
                        add("varying vec2 xeo_vUV;");
                    }

                    if (states.material.diffuseMap) {
                        add("uniform sampler2D xeo_uTextureDiffuse;");
                        if (states.material.diffuseMap.matrix) {
                            add("uniform mat4 xeo_uTextureDiffuseMatrix;");
                        }
                    }

                    if (states.material.specularMap) {
                        add("uniform sampler2D xeo_uTextureSpecular;");
                        if (states.material.specularMap.matrix) {
                            add("uniform mat4 xeo_uTextureSpecularMatrix;");
                        }
                    }

                    if (states.material.emissiveMap) {
                        add("uniform sampler2D xeo_uTextureEmissive;");
                        if (states.material.emissiveMap.matrix) {
                            add("uniform mat4 xeo_uTextureEmissiveMatrix;");
                        }
                    }

                    if (states.material.emissiveMap) {
                        add("uniform sampler2D xeo_uTextureEmissive;");
                        if (states.material.emissiveMap.matrix) {
                            add("uniform mat4 xeo_uTextureEmissiveMatrix;");
                        }
                    }

                    if (states.material.opacityMap) {
                        add("uniform sampler2D xeo_uTextureOpacity;");
                        if (states.material.opacityMap.matrix) {
                            add("uniform mat4 xeo_uTextureOpacityMatrix;");
                        }
                    }

                    if (states.material.reflectivityMap) {
                        add("uniform sampler2D xeo_uTextureReflectivity;");
                        if (states.material.reflectivityMap.matrix) {
                            add("uniform mat4 xeo_uTextureReflectivityMatrix;");
                        }
                    }
                }
            }

            //if (normals && reflection) {
            //    var layer;
            //    for (var i = 0, len = states.cubemap.layers.length; i < len; i++) {
            //        layer = states.cubemap.layers[i];
            //        add("uniform samplerCube xeo_uCubeMapSampler" + i + ";");
            //        add("uniform float xeo_uCubeMapIntensity" + i + ";");
            //    }
            //}


            add("uniform bool xeo_uDepthMode;");

            if (states.geometry.colorBuf) {
                add("varying vec4 xeo_vColor;");
            }

            // Global, ambient colour - taken from clear colour

            add("uniform vec3 xeo_uLightAmbientColor;");

            // World-space vector from fragment to eye

            add("varying vec3 xeo_vViewEyeVec;");

            if (normals) {

                // View-space fragment normal

                add("varying vec3 xeo_vViewNormal;");

                // Light sources

                var light;

                for (var i = 0; i < states.lights.lights.length; i++) {

                    light = states.lights.lights[i];

                    if (light.type === "ambient") {
                        continue;
                    }

                    add("uniform vec3 xeo_uLightColor" + i + ";");

                    add("uniform float xeo_uLightIntensity" + i + ";");

                    if (light.type === "point") {
                        add("uniform vec3 xeo_uLightAttenuation" + i + ";");
                    }

                    add("varying vec4 xeo_vViewLightVecAndDist" + i + ";");         // Vector from light to vertex
                }
            }

            add("void main(void) {");

            if (clipping) {

                // World-space fragment clipping

                add("if (SCENEJS_uModesClipping) {");

                add("float dist = 0.0;");

                for (var i = 0; i < states.clips.clips.length; i++) {
                    add("if (xeo_uClipMode" + i + " != 0.0) {");
                    add("dist += clamp(dot(xeo_vWorldPosition.xyz, xeo_uClipPlane" + i + ".xyz) - xeo_uClipPlane" + i + ".w, 0.0, 1000.0);");
                    add("}");
                }
                add("if (dist > 0.0) { discard; }");

                add("}");
            }

            add("vec3 ambient = xeo_uLightAmbientColor;");


            // ------------------- PhongMaterial Shading

            if (phongMaterial) {

                if (states.geometry.colorBuf) {

                    // Fragment diffuse color from geometry vertex colors

                    add("vec3 diffuse = xeo_vColor.rgb;");
                } else {

                    // Fragment diffuse color from material

                    add("vec3 diffuse = xeo_uMaterialDiffuse;")
                }

                // These may be overridden by textures later

                add("vec3 specular = xeo_uMaterialSpecular;");
                add("vec3 emissive = xeo_uMaterialEmissive;");
                add("float opacity = xeo_uMaterialOpacity;");
                add("float shininess  = xeo_uMaterialShininess;");
                add("float reflectivity  = xeo_uMaterialReflectivity;");

                if (normals) {

                    if (tangents) {

                        add("vec3 viewNormalVec = vec3(0.0, 1.0, 0.0);");

                    } else {

                        // Normalize the interpolated normals in the per-fragment-fragment-shader,
                        // because if we linear interpolated two nonparallel normalized vectors, the resulting vector won’t be of length 1
                        add("vec3 viewNormalVec = normalize(xeo_vViewNormal);");
                    }
                }

                if (texturing) {

                    // Textures

                    add("vec4 texturePos = vec4(xeo_vUV.s, xeo_vUV.t, 1.0, 1.0);");
                    add("vec2 textureCoord = texturePos.xy;");

                    add("textureCoord.y = -textureCoord.y;");

                    var material = states.material;

                    if (material.diffuseMap) {

                        // Diffuse map

                        if (material.diffuseMap.matrix) {
                            add("textureCoord = (xeo_uMaterialDiffuseTextureMatrix * texturePos).xy;");
                        } else {
                            add("textureCoord = texturePos.xy;");
                        }

                        add("diffuse = texture2D(xeo_uMaterialDiffuseTexture, textureCoord).rgb);");
                    }

                    if (material.specularMap) {

                        // Specular map

                        if (material.specularMap.matrix) {
                            add("textureCoord = (xeo_uSpecularTextureMatrix * texturePos).xy;");
                        } else {
                            add("textureCoord = texturePos.xy;");
                        }

                        add("specular = texture2D(xeo_uSpecularTexture, textureCoord).rgb;");
                    }

                    if (material.emissiveMap) {

                        // Emissive map

                        if (material.emissiveMap.matrix) {
                            add("textureCoord = (xeo_uEmissiveTextureMatrix * texturePos).xy;");
                        } else {
                            add("textureCoord = texturePos.xy;");
                        }

                        add("emissive = texture2D(xeo_uEmissiveTexture, textureCoord).rgb;");
                    }

                    if (material.opacityMap) {

                        // Opacity map

                        if (material.opacityMap.matrix) {
                            add("textureCoord = (xeo_uOpacityTextureMatrix * texturePos).xy;");
                        } else {
                            add("textureCoord = texturePos.xy;");
                        }

                        add("opacity = texture2D(xeo_uOpacityTexture, textureCoord).b;");
                    }

                    if (material.reflectivityMap) {

                        // Reflectivity map

                        if (material.reflectivityMap.matrix) {
                            add("textureCoord = (xeo_uReflectivityTextureMatrix * texturePos).xy;");
                        } else {
                            add("textureCoord = texturePos.xy;");
                        }

                        add("reflectivity = texture2D(xeo_uReflectivityTexture, textureCoord).b;");
                    }
                }

                if (normals && reflection) {

                    add("vec3 envLookup = reflect(xeo_vViewEyeVec, viewNormalVec);");
                    add("envLookup.y = envLookup.y * -1.0;"); // Need to flip textures on Y-axis for some reason
                    add("vec4 envColor;");

                    //for (var i = 0, len = states.cubemap.layers.length; i < len; i++) {
                    //    layer = states.cubemap.layers[i];
                    //    add("envColor = textureCube(xeo_uCubeMapSampler" + i + ", envLookup);");
                    //    add("color = mix(color, envColor.rgb, specular * xeo_uCubeMapIntensity" + i + ");");
                    //}
                }

                add("vec4 fragColor;");

                if (normals) {

                    add("vec3  diffuseLight = vec3(0.0, 0.0, 0.0);");
                    add("vec3  specularLight = vec3(0.0, 0.0, 0.0);");
                    add("vec3  viewLightVec;");
                    add("float dotN;");
                    add("float lightDist;");
                    add("float attenuation;");

                    var light;

                    for (var i = 0, len = states.lights.lights.length; i < len; i++) {

                        light = states.lights.lights[i];

                        if (light.type === "ambient") {
                            continue;
                        }

                        add("viewLightVec = xeo_vViewLightVecAndDist" + i + ".xyz;");

                        if (light.type === "point") {

                            add("dotN = max(dot(normalize(viewNormalVec), normalize(viewLightVec)), 0.0);");

                            add("lightDist = xeo_vViewLightVecAndDist" + i + ".w;");

                            add("attenuation = 1.0 - (" +
                                "  xeo_uLightAttenuation" + i + "[0] + " +
                                "  xeo_uLightAttenuation" + i + "[1] * lightDist + " +
                                "  xeo_uLightAttenuation" + i + "[2] * lightDist * lightDist);");

                            add("diffuseLight += dotN * xeo_uLightColor" + i + " * attenuation;");

                            add("specularLight += specular * xeo_uLightIntensity" + i +
                                " * specular * pow(max(dot(reflect(normalize(-viewLightVec), normalize(-viewNormalVec)), normalize(-xeo_vViewPosition.xyz)), 0.0), shininess) * attenuation;");
                        }

                        if (light.type === "dir") {

                            add("dotN = max(dot(normalize(viewNormalVec), normalize(viewLightVec)), 0.0);");

                            add("diffuseLight += dotN * xeo_uLightColor" + i + ";");

                            add("specularLight += specular * xeo_uLightIntensity" + i +
                                " * pow(max(dot(reflect(normalize(-viewLightVec), normalize(-viewNormalVec)), normalize(-xeo_vViewPosition.xyz)), 0.0), shininess);");
                        }
                    }

                    add("fragColor = vec4(diffuse * diffuseLight, opacity);");
                //    add("fragColor = vec4((specularLight + diffuse * (diffuseLight + ambient)) + emissive, opacity);");


                } else { // No normals
                    add("fragColor = vec4((diffuse.rgb + (emissive * color.rgb)) * (vec3(1.0, 1.0, 1.0) + ambient.rgb), opacity);");
                }


            } // if (phongMqterial)

            if (depthTarget) {
                add("if (xeo_uDepthMode) {");
                add("  float depth = length(xeo_vViewPosition) / (xeo_uZFar - xeo_uZNear);");
                add("  const vec4 bias = vec4(1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0, 0.0);");
                add("  float r = depth;");
                add("  float g = fract(r * 255.0);");
                add("  float b = fract(g * 255.0);");
                add("  float a = fract(b * 255.0);");
                add("  vec4 colour = vec4(r, g, b, a);");
                add("  gl_FragColor = colour - (colour.yzww * bias);");
                add("} else {");
                add("  gl_FragColor = fragColor;");
                add("};");
            }

            add("}");

            return end();
        }


        // Start fresh program source
        function begin() {
            src = [""];
        }

        // Append to program source
        function add(txt) {
            src.push(txt);
        }

        // Finish building program source
        function end() {
            var result = src.join("\n");
       //     console.log(result);
            return result;
        }

        function getFSFloatPrecision(gl) {

            if (!gl.getShaderPrecisionFormat) {
                return "mediump";
            }

            if (gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT).precision > 0) {
                return "highp";
            }

            if (gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT).precision > 0) {
                return "mediump";
            }

            return "lowp";
        }

    })();

})();;(function () {

    "use strict";

    XEO.renderer.webgl = {

        /** Maps XEO component parameter names to WebGL enum names
         */
        enums: {
            funcAdd: "FUNC_ADD",
            funcSubtract: "FUNC_SUBTRACT",
            funcReverseSubtract: "FUNC_REVERSE_SUBTRACT",
            zero: "ZERO",
            one: "ONE",
            srcColor: "SRC_COLOR",
            oneMinusSrcColor: "ONE_MINUS_SRC_COLOR",
            dstColor: "DST_COLOR",
            oneMinusDstColor: "ONE_MINUS_DST_COLOR",
            srcAlpha: "SRC_ALPHA",
            oneMinusSrcAlpha: "ONE_MINUS_SRC_ALPHA",
            dstAlpha: "DST_ALPHA",
            oneMinusDstAlpha: "ONE_MINUS_DST_ALPHA",
            contantColor: "CONSTANT_COLOR",
            oneMinusConstantColor: "ONE_MINUS_CONSTANT_COLOR",
            constantAlpha: "CONSTANT_ALPHA",
            oneMinusConstantAlpha: "ONE_MINUS_CONSTANT_ALPHA",
            srcAlphaSaturate: "SRC_ALPHA_SATURATE",
            front: "FRONT",
            back: "BACK",
            frontAndBack: "FRONT_AND_BACK",
            never: "NEVER",
            less: "LESS",
            equal: "EQUAL",
            lequal: "LEQUAL",
            greater: "GREATER",
            notequal: "NOTEQUAL",
            gequal: "GEQUAL",
            always: "ALWAYS",
            cw: "CW",
            ccw: "CCW",
            linear: "LINEAR",
            nearest: "NEAREST",
            linearMipMapNearest: "LINEAR_MIPMAP_NEAREST",
            nearestMipMapNearest: "NEAREST_MIPMAP_NEAREST",
            nearestMipMapLinear: "NEAREST_MIPMAP_LINEAR",
            linearMipMapLinear: "LINEAR_MIPMAP_LINEAR",
            repeat: "REPEAT",
            clampToEdge: "CLAMP_TO_EDGE",
            mirroredRepeat: "MIRRORED_REPEAT",
            alpha: "ALPHA",
            rgb: "RGB",
            rgba: "RGBA",
            luminance: "LUMINANCE",
            luminanceAlpha: "LUMINANCE_ALPHA",
            textureBinding2D: "TEXTURE_BINDING_2D",
            textureBindingCubeMap: "TEXTURE_BINDING_CUBE_MAP",
            compareRToTexture: "COMPARE_R_TO_TEXTURE", // Hardware Shadowing Z-depth,
            unsignedByte: "UNSIGNED_BYTE"
        }
    };

})();;(function () {

    "use strict";

    /**
     * Buffer for vertices and indices
     *
     * @param gl WebGL
     * @param type  Eg. ARRAY_BUFFER, ELEMENT_ARRAY_BUFFER
     * @param values  WebGL array wrapper
     * @param numItems Count of items in array wrapper
     * @param itemSize Size of each item
     * @param usage Eg. STATIC_DRAW
     */
    XEO.renderer.webgl.ArrayBuffer = function (gl, type, values, numItems, itemSize, usage) {

        /**
         * True when this buffer is allocated and ready to go
         * @type {boolean}
         */
        this.allocated = false;

        this.gl = gl;

        this.type = type;

        this.itemType = values.constructor == Uint8Array ? gl.UNSIGNED_BYTE :
            values.constructor == Uint16Array ? gl.UNSIGNED_SHORT :
                values.constructor == Uint32Array ? gl.UNSIGNED_INT :
                    gl.FLOAT;

        this.numItems = numItems;

        this.itemSize = itemSize;

        this.usage = usage;

        this._allocate(values, numItems);
    };

    /**
     * Allocates this buffer
     *
     * @param values
     * @param numItems
     * @private
     */
    XEO.renderer.webgl.ArrayBuffer.prototype._allocate = function (values, numItems) {

        this.allocated = false;

        this._handle = this.gl.createBuffer();

        if (!this._handle) {
            throw "Failed to allocate WebGL ArrayBuffer";
        }

        if (this._handle) {
            this.gl.bindBuffer(this.type, this._handle);
            this.gl.bufferData(this.type, values, this.usage);
            this.gl.bindBuffer(this.type, null);
            this.numItems = numItems;
            this.length = values.length;
            this.allocated = true;
        }
    };

    /**
     * Updates values within this buffer, reallocating if needed.
     *
     * @param data
     * @param offset
     */
    XEO.renderer.webgl.ArrayBuffer.prototype.setData = function (data, offset) {

        if (!this.allocated) {
            return;
        }

        if (data.length > this.length) {

            // Needs reallocation

            this.destroy();

            this._allocate(data, data.length);

        } else {

            // No reallocation needed

            if (offset || offset === 0) {

                this.gl.bufferSubData(this.type, offset, data);

            } else {

                this.gl.bufferData(this.type, data);
            }
        }
    };

    /**
     * Binds this buffer
     */
    XEO.renderer.webgl.ArrayBuffer.prototype.bind = function () {

        if (!this.allocated) {
            return;
        }

        this.gl.bindBuffer(this.type, this._handle);
    };

    /**
     * Unbinds this buffer
     */
    XEO.renderer.webgl.ArrayBuffer.prototype.unbind = function () {

        if (!this.allocated) {
            return;
        }

        this.gl.bindBuffer(this.type, null);
    };

    /**
     * Destroys this buffer
     */
    XEO.renderer.webgl.ArrayBuffer.prototype.destroy = function () {

        if (!this.allocated) {
            return;
        }

        this.gl.deleteBuffer(this._handle);

        this._handle = null;

        this.allocated = false;
    };

})();

;(function () {

    "use strict";

    /**
     * An attribute within a {@link XEO.renderer.webgl.Shader}
     */
    XEO.renderer.webgl.Attribute = function (gl, location) {

        this.gl = gl;

        this.location = location;
    };

    XEO.renderer.webgl.Attribute.prototype.bindFloatArrayBuffer = function (buffer) {

        if (buffer) {

            buffer.bind();

            this.gl.enableVertexAttribArray(this.location);

            // Vertices are not homogeneous - no w-element
            this.gl.vertexAttribPointer(this.location, buffer.itemSize, this.gl.FLOAT, false, 0, 0);
        }
    };

    XEO.renderer.webgl.Attribute.prototype.bindInterleavedFloatArrayBuffer = function (components, stride, byteOffset) {

        this.gl.enableVertexAttribArray(this.location);

        // Vertices are not homogeneous - no w-element
        this.gl.vertexAttribPointer(this.location, components, this.gl.FLOAT, false, stride, byteOffset);
    };

})();;(function () {

    "use strict";

    /**
     * Wrapper for a WebGL program
     *
     * @param gl WebGL gl
     * @param vertex Source code for vertex shader
     * @param fragment Source code for fragment shader
     */
    XEO.renderer.webgl.Program = function (gl, vertex, fragment) {

        /**
         * True as soon as this program is allocated and ready to go
         * @type {boolean}
         */
        this.allocated = false;

        this.gl = gl;

        // Inputs for this program

        this.uniforms = {};
        this.samplers = {};
        this.attributes = {};

        // Shaders

        this._vertexShader = new XEO.renderer.webgl.Shader(gl, gl.VERTEX_SHADER, vertex);

        this._fragmentShader = new XEO.renderer.webgl.Shader(gl, gl.FRAGMENT_SHADER, fragment);

        var a, i, u, u_name, location, shader;

        // Program

        this.handle = gl.createProgram();

        if (this.handle) {

            if (this._vertexShader.valid) {
                gl.attachShader(this.handle, this._vertexShader.handle);
            }

            if (this._fragmentShader.valid) {
                gl.attachShader(this.handle, this._fragmentShader.handle);
            }

            gl.linkProgram(this.handle);

            console.error("vertex");
            console.error(gl.getShaderInfoLog(this._vertexShader.handle));
            console.error("fragment");
            console.error(gl.getShaderInfoLog(this._fragmentShader.handle));

            // Discover uniforms and samplers

            var numUniforms = gl.getProgramParameter(this.handle, gl.ACTIVE_UNIFORMS);
            var valueIndex = 0;

            for (i = 0; i < numUniforms; ++i) {

                u = gl.getActiveUniform(this.handle, i);

                if (u) {

                    u_name = u.name;

                    if (u_name[u_name.length - 1] === "\u0000") {
                        u_name = u_name.substr(0, u_name.length - 1);
                    }

                    location = gl.getUniformLocation(this.handle, u_name);

                    if ((u.type === gl.SAMPLER_2D) || (u.type === gl.SAMPLER_CUBE) || (u.type === 35682)) {

                        this.samplers[u_name] = new XEO.renderer.webgl.Sampler(gl, location);

                    } else {

                        this.uniforms[u_name] = new XEO.renderer.webgl.Uniform(gl, u.type, location);
                    }
                }
            }

            // Discover attributes

            var numAttribs = gl.getProgramParameter(this.handle, gl.ACTIVE_ATTRIBUTES);

            for (i = 0; i < numAttribs; i++) {

                a = gl.getActiveAttrib(this.handle, i);

                if (a) {

                    location = gl.getAttribLocation(this.handle, a.name);

                    this.attributes[a.name] = new XEO.renderer.webgl.Attribute(gl, location);
                }
            }

            this.allocated = true;
        }
    };

    XEO.renderer.webgl.Program.prototype.bind = function () {

        if (!this.allocated) {
            return;
        }

        this.gl.useProgram(this.handle);
    };

    XEO.renderer.webgl.Program.prototype.setUniform = function (name, value) {

        if (!this.allocated) {
            return;
        }

        var u = this.uniforms[name];

        if (u) {
            u.setValue(value);
        }
    };

    XEO.renderer.webgl.Program.prototype.getUniform = function (name) {

        if (!this.allocated) {
            return;
        }

        return this.uniforms[name];
    };

    XEO.renderer.webgl.Program.prototype.getAttribute = function (name) {

        if (!this.allocated) {
            return;
        }

        return this.attributes[name];
    };

    XEO.renderer.webgl.Program.prototype.bindFloatArrayBuffer = function (name, buffer) {

        if (!this.allocated) {
            return;
        }

        return this.attributes[name];
    };

    XEO.renderer.webgl.Program.prototype.bindTexture = function (name, texture, unit) {

        if (!this.allocated) {
            return false;
        }

        var sampler = this.samplers[name];

        if (sampler) {
            return sampler.bindTexture(texture, unit);

        } else {
            return false;
        }
    };

    XEO.renderer.webgl.Program.prototype.destroy = function () {

        if (!this.allocated) {
            return;
        }

        this.gl.deleteProgram(this.handle);
        this.gl.deleteShader(this._vertexShader.handle);
        this.gl.deleteShader(this._fragmentShader.handle);

        this.handle = null;
        this.attributes = null;
        this.uniforms = null;
        this.samplers = null;

        this.allocated = false;
    };

})();
;(function () {

    "use strict";

    XEO.renderer.webgl.RenderBuffer = function (cfg) {

        /**
         * True as soon as this buffer is allocated and ready to go
         */
        this.allocated = false;

        /**
         * The canvas, to synch buffer size with when its dimensions change
         */
        this.canvas = cfg.canvas;

        /**
         * WebGL context
         */
        this.gl = cfg.gl;

        /**
         * Buffer resources, set up in #_touch
         */
        this.buffer = null;

        /**
         * True while this buffer is bound
         */
        this.bound = false;
    };

    /**
     * Called after WebGL context is restored.
     */
    XEO.renderer.webgl.RenderBuffer.prototype.webglRestored = function (gl) {
        this.gl = gl;
        this.buffer = null;
        this.allocated = false;
        this.bound = false;
    };

    /**
     * Binds this buffer
     */
    XEO.renderer.webgl.RenderBuffer.prototype.bind = function () {

        this._touch();

        if (this.bound) {
            return;
        }

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.buffer.framebuf);

        this.bound = true;
    };

    XEO.renderer.webgl.RenderBuffer.prototype._touch = function () {

        var width = this.canvas.width;
        var height = this.canvas.height;

        if (this.buffer) {

            // Currently have a buffer

            if (this.buffer.width === width && this.buffer.height === height) {

                // Canvas size unchanged, buffer still good

                return;

            } else {

                // Buffer needs reallocation for new canvas size

                this.gl.deleteTexture(this.buffer.texture);
                this.gl.deleteFramebuffer(this.buffer.framebuf);
                this.gl.deleteRenderbuffer(this.buffer.renderbuf);
            }
        }

        this.buffer = {
            framebuf: this.gl.createFramebuffer(),
            renderbuf: this.gl.createRenderbuffer(),
            texture: this.gl.createTexture(),
            width: width,
            height: height
        };

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.buffer.framebuf);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.buffer.texture);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        try {

            // Do it the way the spec requires
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, width, height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);

        } catch (exception) {

            // Workaround for what appears to be a Minefield bug.
            var textureStorage = new WebGLUnsignedByteArray(width * height * 3);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, width, height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, textureStorage);
        }

        this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.buffer.renderbuf);
        this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, width, height);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.buffer.texture, 0);
        this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, this.buffer.renderbuf);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, null);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

        // Verify framebuffer is OK
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.buffer.framebuf);

        if (!this.gl.isFramebuffer(this.buffer.framebuf)) {
            throw "Invalid framebuffer";
        }

        var status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);

        switch (status) {

            case this.gl.FRAMEBUFFER_COMPLETE:
                break;

            case this.gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
                throw "Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_ATTACHMENT";

            case this.gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
                throw "Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT";

            case this.gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
                throw "Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_DIMENSIONS";

            case this.gl.FRAMEBUFFER_UNSUPPORTED:
                throw "Incomplete framebuffer: FRAMEBUFFER_UNSUPPORTED";

            default:
                throw "Incomplete framebuffer: " + status;
        }

        this.bound = false;
    };

    /**
     * Clears this renderbuffer
     */
    XEO.renderer.webgl.RenderBuffer.prototype.clear = function () {
        if (!this.bound) {
            throw "Render buffer not bound";
        }
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.disable(this.gl.BLEND);
    };

    /**
     * Reads buffer pixel at given coordinates
     */
    XEO.renderer.webgl.RenderBuffer.prototype.read = function (pickX, pickY) {
        var x = pickX;
        var y = this.canvas.height - pickY;
        var pix = new Uint8Array(4);
        this.gl.readPixels(x, y, 1, 1, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pix);
        return pix;
    };

    /**
     * Unbinds this renderbuffer
     */
    XEO.renderer.webgl.RenderBuffer.prototype.unbind = function () {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.bound = false;
    };

    /** Returns the texture
     */
    XEO.renderer.webgl.RenderBuffer.prototype.getTexture = function () {

        var self = this;

        return {

            bind: function (unit) {
                if (self.buffer && self.buffer.texture) {
                    self.gl.activeTexture(self.gl["TEXTURE" + unit]);
                    self.gl.bindTexture(self.gl.TEXTURE_2D, self.buffer.texture);
                    return true;
                }
                return false;
            },

            unbind: function (unit) {
                if (self.buffer && self.buffer.texture) {
                    self.gl.activeTexture(self.gl["TEXTURE" + unit]);
                    self.gl.bindTexture(self.gl.TEXTURE_2D, null);
                }
            }
        };
    };

    /** Destroys this buffer
     */
    XEO.renderer.webgl.RenderBuffer.prototype.destroy = function () {

        if (this.allocated) {

            this.gl.deleteTexture(this.buffer.texture);
            this.gl.deleteFramebuffer(this.buffer.framebuf);
            this.gl.deleteRenderbuffer(this.buffer.renderbuf);

            this.allocated = false;
            this.buffer = null;
            this.bound = false;
        }
    };

})();
;(function () {

    "use strict";

    XEO.renderer.webgl.Sampler = function (gl, location) {

        this.bindTexture = function (texture, unit) {

            if (texture.bind(unit)) {

                gl.uniform1i(location, unit);

                return true;
            }

            return false;
        };
    };

})();;(function () {

    "use strict";

    /**
     * A vertex/fragment shader in a program
     *
     * @param gl WebGL gl
     * @param type gl.VERTEX_SHADER | gl.FRAGMENT_SHADER
     * @param source Source code for shader
     */
    XEO.renderer.webgl.Shader = function (gl, type, source) {

        /**
         * True as soon as this shader is allocated and ready to go
         * @type {boolean}
         */
        this.allocated = false;

        this.handle = gl.createShader(type);

        if (!this.handle) {
            console.error("Failed to create WebGL shader");
            return;
        }

        gl.shaderSource(this.handle, source);
        gl.compileShader(this.handle);

        this.valid = (gl.getShaderParameter(this.handle, gl.COMPILE_STATUS) !== 0);

        if (!this.valid) {

            if (!gl.isContextLost()) { // Handled explicitly elsewhere, so won't re-handle here

                console.error("Shader program failed to compile: " + gl.getShaderInfoLog(this.handle));
                console.error("Shader source:");

                var lines = source.split('\n');

                for (var j = 0; j < lines.length; j++) {
                    console.error((j + 1) + ": " + lines[j]);
                }

                return;
            }
        }

        this.allocated = true;
    };

})();;(function () {

    "use strict";

    XEO.renderer.webgl.Texture2D = function (gl, cfg) {

        this.gl = gl;

        cfg = cfg || {};

        this.target = cfg.target || gl.TEXTURE_2D;

        this.texture = gl.createTexture();

        this.allocated = true;
    };

    XEO.renderer.webgl.Texture2D.prototype.setImage = function (image) {

        var gl = this.gl;

        gl.bindTexture(this.target, this.texture);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE,
            XEO.renderer.webgl.ensureImageSizePowerOfTwo(cfg.image));

        gl.bindTexture(this.target, null);
    };

    XEO.renderer.webgl.Texture2D.prototype.setProps = function (cfg) {

        var gl = this.gl;

        gl.bindTexture(this.target, this.texture);

        // Flip the image's Y axis to match the WebGL texture coordinate space.
        if (cfg.flipY === true || cfg.flipY === false) {
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, cfg.flipY);
        }

        if (cfg.minFilter) {

            var minFilter = this._getGLEnum(cfg.minFilter);

            if (minFilter) {

                gl.texParameteri(this.target, gl.TEXTURE_MIN_FILTER, minFilter);

                if (minFilter === gl.NEAREST_MIPMAP_NEAREST ||
                    minFilter === gl.LINEAR_MIPMAP_NEAREST ||
                    minFilter === gl.NEAREST_MIPMAP_LINEAR ||
                    minFilter === gl.LINEAR_MIPMAP_LINEAR) {

                    gl.generateMipmap(this.target);
                }
            }
        }

        if (cfg.magFilter) {
            var magFilter = this._getGLEnum(cfg.minFilter);
            if (magFilter) {
                gl.texParameteri(this.target, gl.TEXTURE_MAG_FILTER, magFilter);
            }
        }

        if (cfg.wrapS) {
            gl.texParameteri(this.target, gl.TEXTURE_WRAP_S, cfg.wrapS);
        }

        if (cfg.wrapT) {
            gl.texParameteri(this.target, gl.TEXTURE_WRAP_T, cfg.wrapT);
        }

        gl.bindTexture(this.target, null);
    };

    XEO.renderer.webgl.Texture2D.prototype._getGLEnum = function (name, defaultVal) {

        if (name === undefined) {
            return defaultVal;
        }

        var glName = XEO.renderer.webgl.enums[name];

        if (glName === undefined) {
            return defaultVal;
        }

        return this.gl[glName];
    };


    XEO.renderer.webgl.Texture2D.prototype.bind = function (unit) {

        if (!this.allocated) {
            return;
        }

        if (this.texture) {

            var gl = this.gl;

            gl.activeTexture(gl["TEXTURE" + unit]);

            gl.bindTexture(this.target, this.texture);

            return true;
        }

        return false;
    };

    XEO.renderer.webgl.Texture2D.prototype.unbind = function (unit) {

        if (!this.allocated) {
            return;
        }

        if (this.texture) {

            var gl = this.gl;

            gl.activeTexture(gl["TEXTURE" + unit]);

            gl.bindTexture(this.target, null);
        }
    };

    XEO.renderer.webgl.Texture2D.prototype.destroy = function () {

        if (!this.allocated) {
            return;
        }

        if (this.texture) {

            this.gl.deleteTexture(this.texture);

            this.texture = null;
        }
    };


    XEO.renderer.webgl.clampImageSize = function (image, numPixels) {

        var n = image.width * image.height;

        if (n > numPixels) {

            var ratio = numPixels / n;

            var width = image.width * ratio;
            var height = image.height * ratio;

            var canvas = document.createElement("canvas");

            canvas.width = XEO.renderer.webgl.nextHighestPowerOfTwo(width);
            canvas.height = XEO.renderer.webgl.nextHighestPowerOfTwo(height);

            var ctx = canvas.getContext("2d");

            ctx.drawImage(image, 0, 0, image.width, image.height, 0, 0, canvas.width, canvas.height);

            image = canvas;
        }

        return image;
    };

    XEO.renderer.webgl.ensureImageSizePowerOfTwo = function (image) {

        if (!XEO.renderer.webgl.isPowerOfTwo(image.width) || !XEO.renderer.webgl.isPowerOfTwo(image.height)) {

            var canvas = document.createElement("canvas");

            canvas.width = XEO.renderer.webgl.nextHighestPowerOfTwo(image.width);
            canvas.height = XEO.renderer.webgl.nextHighestPowerOfTwo(image.height);

            var ctx = canvas.getContext("2d");

            ctx.drawImage(image,
                0, 0, image.width, image.height,
                0, 0, canvas.width, canvas.height);
            image = canvas;
        }

        return image;
    };

    XEO.renderer.webgl.isPowerOfTwo = function (x) {
        return (x & (x - 1)) === 0;
    };

    XEO.renderer.webgl.nextHighestPowerOfTwo = function (x) {
        --x;
        for (var i = 1; i < 32; i <<= 1) {
            x = x | x >> i;
        }
        return x + 1;
    };

})();
;(function () {

    "use strict";

    XEO.renderer.webgl.Uniform = function (gl, type, location) {

        var func = null;

        var value = null;

        if (type === gl.BOOL) {

            func = function (v) {
                if (value === v) {
                    return;
                }
                value = v;
                gl.uniform1i(location, v);
            };

        } else if (type === gl.BOOL_VEC2) {

            func = function (v) {
                if (value !== null && value[0] === v[0] && value[1] === v[1]) {
                    return;
                }
                value = v;
                gl.uniform2iv(location, v);
            };

        } else if (type === gl.BOOL_VEC3) {

            func = function (v) {
                if (value !== null && value[0] === v[0] && value[1] === v[1] && value[2] === v[2]) {
                    return;
                }
                value = v;
                gl.uniform3iv(location, v);
            };

        } else if (type === gl.BOOL_VEC4) {

            func = function (v) {
                if (value !== null && value[0] === v[0] && value[1] === v[1] && value[2] === v[2] && value[3] === v[3]) {
                    return;
                }
                value = v;
                gl.uniform4iv(location, v);
            };

        } else if (type === gl.INT) {

            func = function (v) {
                if (value === v) {
                    return;
                }
                value = v;
                gl.uniform1iv(location, v);
            };

        } else if (type === gl.INT_VEC2) {

            func = function (v) {
                if (value !== null && value[0] === v[0] && value[1] === v[1]) {
                    return;
                }
                value = v;
                gl.uniform2iv(location, v);
            };

        } else if (type === gl.INT_VEC3) {

            func = function (v) {
                if (value !== null && value[0] === v[0] && value[1] === v[1] && value[2] === v[2]) {
                    return;
                }
                value = v;
                gl.uniform3iv(location, v);
            };

        } else if (type === gl.INT_VEC4) {

            func = function (v) {
                if (value !== null && value[0] === v[0] && value[1] === v[1] && value[2] === v[2] && value[3] === v[3]) {
                    return;
                }
                value = v;
                gl.uniform4iv(location, v);
            };

        } else if (type === gl.FLOAT) {

            func = function (v) {
                if (value === v) {
                    return;
                }
                value = v;
                gl.uniform1f(location, v);
            };

        } else if (type === gl.FLOAT_VEC2) {

            func = function (v) {
                if (value !== null && value[0] === v[0] && value[1] === v[1]) {
                    return;
                }
                value = v;
                gl.uniform2fv(location, v);
            };

        } else if (type === gl.FLOAT_VEC3) {

            func = function (v) {
                if (value !== null && value[0] === v[0] && value[1] === v[1] && value[2] === v[2]) {
                    return;
                }
                value = v;
                gl.uniform3fv(location, v);
            };

        } else if (type === gl.FLOAT_VEC4) {

            func = function (v) {
                if (value !== null && value[0] === v[0] && value[1] === v[1] && value[2] === v[2] && value[3] === v[3]) {
                    return;
                }
                value = v;
                gl.uniform4fv(location, v);
            };

        } else if (type === gl.FLOAT_MAT2) {

            func = function (v) {
                gl.uniformMatrix2fv(location, gl.FALSE, v);
            };

        } else if (type === gl.FLOAT_MAT3) {

            func = function (v) {
                gl.uniformMatrix3fv(location, gl.FALSE, v);
            };

        } else if (type === gl.FLOAT_MAT4) {

            func = function (v) {
                gl.uniformMatrix4fv(location, gl.FALSE, v);
            };

        } else {
            throw "Unsupported shader uniform type: " + type;
        }

        this.setValue = func;

        this.getLocation = function () {
            return location;
        };
    };

})();









;(function () {

    "use strict";

    /**
     * @class A chunk of WebGL state changes to render a XEO.renderer.State.
     *
     * @private
     */
    XEO.renderer.Chunk = function () {
    };

    /**
     * Initialises the chunk.
     *
     * @param {String} id Chunk ID
     * @param {XEO.renderer.Object} object renderer object to which this chunk belongs
     * @param {XEO.renderer.Program} program Program to render this chunk
     * @param {XEO.renderer.State} state The state rendered by this chunk
     */
    XEO.renderer.Chunk.prototype.init = function (id, object, program, state) {

        this.id = id;

        this.object = object;

        this.program = program;

        this.state = state;

        this.useCount = 0;

        if (this.build) {
            this.build();
        }
    };

})();
;(function () {

    "use strict";

    /**
     * @class Manages creation, reuse and destruction of {@link XEO.renderer.Chunk}s.
     */
    XEO.renderer.ChunkFactory = function () {

        this._chunks = {};
        this._chunkIDs = new XEO.utils.Map();

        this.chunkTypes = XEO.renderer.ChunkFactory.chunkTypes;
    };

    /**
     * Sub-classes of {@link XEO.renderer.Chunk} provided by this factory
     */
    XEO.renderer.ChunkFactory.chunkTypes = {};    // Supported chunk classes, installed by #createChunkType

    // Free pool of unused XEO.renderer.Chunk instances
    XEO.renderer.ChunkFactory._freeChunks = {};    // Free chunk pool for each type

    /**
     * Creates a chunk type.
     *
     * @param params Members to augment the chunk class prototype with
     * @param params.type Type name for the new chunk class
     * @param params.draw Method to render the chunk in draw render
     * @param params.pick Method to render the chunk in pick render
     * @param params.drawAndPick Method to render the chunk in both draw and pick renders
     */
    XEO.renderer.ChunkFactory.createChunkType = function (params) {

        if (!params.type) {
            throw "'type' expected in params";
        }

        var supa = XEO.renderer.Chunk;

        var chunkClass = function () { // Create the class

            this.useCount = 0;

            this.init.apply(this, arguments);
        };

        chunkClass.prototype = new supa();              // Inherit from base class
        chunkClass.prototype.constructor = chunkClass;

        if (params.drawAndPick) {                       // Common method for draw and pick render
            params.draw = params.pick = params.drawAndPick;
        }

        XEO._apply(params, chunkClass.prototype);   // Augment subclass

        XEO.renderer.ChunkFactory.chunkTypes[params.type] = chunkClass;

        XEO.renderer.ChunkFactory._freeChunks[params.type] = { // Set up free chunk pool for this type
            chunks: [],
            chunksLen: 0
        };

        return chunkClass;
    };

    /**
     * Gets a chunk from this factory.
     */
    XEO.renderer.ChunkFactory.prototype.getChunk = function (type, object, program, state) {

        var chunkClass = XEO.renderer.ChunkFactory.chunkTypes[type]; // Check type supported

        if (!chunkClass) {
            throw "chunk type not supported: '" + type + "'";
        }

        // Unique ID for our chunk

        var id = this._chunkIDs.addItem();

        // Try to recycle a free chunk

        var freeChunks = XEO.renderer.ChunkFactory._freeChunks[type];

        var chunk;

        if (freeChunks.chunksLen > 0) {
            chunk = freeChunks.chunks[--freeChunks.chunksLen];
        }

        if (chunk) {

            // Reinitialise the free chunk

            chunk.init(id, object, program, state);

        } else {

            // No free chunk, create a new one

            chunk = new chunkClass(id, object, program, state);
        }

        chunk.useCount = 1;

        this._chunks[id] = chunk;

        return chunk;
    };

    /**
     * Releases a chunk back to this factory.
     *
     * @param {XEO.renderer.Chunk} chunk Chunk to release
     */
    XEO.renderer.ChunkFactory.prototype.putChunk = function (chunk) {

        if (chunk.useCount === 0) { // In case of excess puts
            return;
        }

        // Free the chunk if use count now zero

        if (--chunk.useCount <= 0) {

          this._chunkIDs.removeItem(chunk.id);

            delete this._chunks[chunk.id];

            var freeChunks = XEO.renderer.ChunkFactory._freeChunks[chunk.type];

            freeChunks.chunks[freeChunks.chunksLen++] = chunk;
        }
    };

    /**
     * Restores the chunks in this factory after a WebGL context recovery.
     */
    XEO.renderer.ChunkFactory.prototype.webglRestored = function () {

        var chunk;

        for (var id in this._chunks) {

            if (this._chunks.hasOwnProperty(id)) {

                chunk = this._chunks[id];

                if (chunk.build) {
                    chunk.build();
                }
            }
        }
    };

})();
;(function () {

    "use strict";

    /**
     * Create display state chunk type for draw and pick render of user clipping planes
     */
    XEO.renderer.ChunkFactory.createChunkType({

        type: "clips",

        build: function () {

            this._uClipModeDraw = this._uClipModeDraw || [];
            this._uClipPlaneDraw = this._uClipPlaneDraw || [];

            var draw = this.program.draw;

            for (var i = 0, len = this.state.clips.length; i < len; i++) {
                this._uClipModeDraw[i] = draw.getUniform("xeo_uClipMode" + i);
                this._uClipPlaneDraw[i] = draw.getUniform("xeo_uClipPlane" + i)
            }

            this._uClipModePick = this._uClipModePick || [];
            this._uClipPlanePick = this._uClipPlanePick || [];

            var pick = this.program.pick;

            for (var i = 0, len = this.state.clips.length; i < len; i++) {
                this._uClipModePick[i] = pick.getUniform("xeo_uClipMode" + i);
                this._uClipPlanePick[i] = pick.getUniform("xeo_uClipPlane" + i)
            }
        },

        drawAndPick: function (frameCtx) {

            var uClipMode = (frameCtx.pick) ? this._uClipModePick : this._uClipModeDraw;
            var uClipPlane = (frameCtx.pick) ? this._uClipPlanePick : this._uClipPlaneDraw;

            var mode;
            var plane;
            var clips = this.state.clips;
            var clip;

            for (var i = 0, len = clips.length; i < len; i++) {

                mode = uClipMode[i];
                plane = uClipPlane[i];

                if (mode && plane) {

                    clip = clips[i];

                    if (clip.mode === "inside") {

                        mode.setValue(2);
                        plane.setValue(clip.plane);

                    } else if (clip.mode === "outside") {

                        mode.setValue(1);
                        plane.setValue(clip.plane);

                    } else {

                        // Disabled

                        mode.setValue(0);
                    }
                }
            }
        }
    });

})();;(function () {

    "use strict";

    /**
     *
     */
    XEO.renderer.ChunkFactory.createChunkType({

        type: "colorBuf",

        // Avoid re-application of this chunk after a program switch.
        programGlobal: true,

        build: function () {
        },

        drawAndPick: function (frameCtx) {

            if (!frameCtx.transparent) {

                // Blending forced while rendering a transparent bin

                var state = this.state;
                var blendEnabled = state.blendEnabled;

                var gl = this.program.gl;

                if (frameCtx.blendEnabled !== blendEnabled) {

                    if (blendEnabled) {
                        gl.enable(gl.BLEND);

                    } else {
                        gl.disable(gl.BLEND);
                    }

                    frameCtx.blendEnabled = blendEnabled;
                }

                var colorMask = state.colorMask;

                gl.colorMask(colorMask[0], colorMask[1], colorMask[2], colorMask[3]);
            }
        }
    });

})();
;(function () {

    "use strict";

    XEO.renderer.ChunkFactory.createChunkType({

        type: "cubemap",

        build: function () {
//            this._uCubeMapSampler = this._uCubeMapSampler || [];
//            this._uCubeMapIntensity = this._uCubeMapIntensity || [];
//            var layers = this.state.layers;
//            if (layers) {
//                var layer;
//                var draw = this.program.draw;
//                for (var i = 0, len = layers.length; i < len; i++) {
//                    layer = layers[i];
//                    this._uCubeMapSampler[i] = "xeo_uCubeMapSampler" + i;
//                    this._uCubeMapIntensity[i] = draw.getUniform("xeo_uCubeMapIntensity" + i);
//                }
//            }
        },

        draw: function (frameCtx) {
//            var layers = this.state.layers;
//            if (layers) {
//                var layer;
//                var draw = this.program.draw;
//                for (var i = 0, len = layers.length; i < len; i++) {
//                    layer = layers[i];
//                    if (this._uCubeMapSampler[i] && layer.texture) {
//                        draw.bindTexture(this._uCubeMapSampler[i], layer.texture, frameCtx.textureUnit++);
//                        if (this._uCubeMapIntensity[i]) {
//                            this._uCubeMapIntensity[i].setValue(layer.intensity);
//                        }
//                    }
//                }
//            }
//
//            if (frameCtx.textureUnit > 10) { // TODO: Find how many textures allowed
//                frameCtx.textureUnit = 0;
//            }
        }
    });

})();;(function () {

    "use strict";

    /**
     *
     */
    XEO.renderer.ChunkFactory.createChunkType({

        type: "depthBuf",

        // Avoid reapplication of this chunk after a program switch.
        programGlobal: true,

        drawAndPick: function (frameCtx) {

            var gl = this.program.gl;

            var state = this.state;
            var active = state.active;

            if (frameCtx.depthbufEnabled !== active) {

                if (!active) {
                    gl.enable(gl.DEPTH_TEST);

                } else {
                    gl.disable(gl.DEPTH_TEST);
                }

                frameCtx.depthbufEnabled = active;
            }

            var clearDepth = state.clearDepth;

            if (frameCtx.clearDepth !== clearDepth) {
                gl.clearDepth(clearDepth);
                frameCtx.clearDepth = clearDepth;
            }

            var depthFunc = state.depthFunc;

            if (frameCtx.depthFunc !== depthFunc) {
                gl.depthFunc(depthFunc);
                frameCtx.depthFunc = depthFunc;
            }

            if (state.clear) {
                gl.clear(gl.DEPTH_BUFFER_BIT);
            }
        }
    });

})();
;(function () {

    "use strict";

    /**
     *
     */
    XEO.renderer.ChunkFactory.createChunkType({

        type: "draw",

        // As we apply a list of state chunks in a {@link XEO.renderer.Renderer},
        // we track the ID of each chunk in order to avoid redundantly re-applying
        // the same chunk. We don't want that for draw chunks however, because
        // they contain GL drawElements calls, which we need to do for each object.
        unique: true,

        build: function () {

            this._depthModeDraw = this.program.draw.getUniform("xeo_uDepthMode");

            this._depthModePick = this.program.pick.getUniform("xeo_uDepthMode");

            this._uPickColor = this.program.pick.getUniform("xeo_uPickColor");
        },

        drawAndPick: function (frameCtx) {

            var state = this.state;

            var gl = this.program.gl;

            if (frameCtx.pick) {

                // TODO: Only set pick color when depthMode === false/0?

                if (this._uPickColor) {

                    frameCtx.pickObjects[frameCtx.pickIndex++] = this.object;

                    var b = frameCtx.pickIndex >> 16 & 0xFF;
                    var g = frameCtx.pickIndex >> 8 & 0xFF;
                    var r = frameCtx.pickIndex & 0xFF;

                    this._uPickColor.setValue([r / 255, g / 255, b / 255]);
                }

                if (this._depthModeDraw) {
                    this._depthModePick.setValue(frameCtx.depthMode);
                }

            } else {

                if (this._depthModePick) {
                this._depthModeDraw.setValue(frameCtx.depthMode);
                }
            }

            if (state.indices) {
                gl.drawElements(state.primitive, state.indices.numItems, state.indices.itemType, 0);
            }
        }
    });

})();
;(function () {

    "use strict";

    /**
     *  Create display state chunk type for draw and pick render of geometry
     */
    XEO.renderer.ChunkFactory.createChunkType({

        type: "geometry",

        build: function () {

            var draw = this.program.draw;

            this._aPositionDraw = draw.getAttribute("xeo_aPosition");
            this._aNormalDraw = draw.getAttribute("xeo_aNormal");
            this._aUVDraw = draw.getAttribute("xeo_aUV");
            this._aTangentDraw = draw.getAttribute("xeo_aTangent");
            this._aColorDraw = draw.getAttribute("xeo_aColor");

            var pick = this.program.pick;

            this._aPositionPick = pick.getAttribute("xeo_aPosition");
        },

        draw: function (frameCtx) {

            var state = this.state;

            if (this._aPositionDraw) {
                this._aPositionDraw.bindFloatArrayBuffer(state.positions);
            }

            if (this._aNormalDraw) {
                this._aNormalDraw.bindFloatArrayBuffer(state.normals);
            }

            if (this._aUVDraw) {
                this._aUVDraw.bindFloatArrayBuffer(state.uv);
            }

            if (this._aColorDraw) {
                this._aColorDraw.bindFloatArrayBuffer(state.colors);
            }

            if (this._aTangentDraw) {

                // Lazy-compute tangents
                //    this._aTangentDraw.bindFloatArrayBuffer(state2.tangentBuf || state2.getTangentBuf());
            }

            if (state.indices) {
                state.indices.bind();
            }
        },

        pick: function () {

            var state = this.state;

            if (this._aPositionPick) {
                this._aPositionPick.bindFloatArrayBuffer(state.positions);
            }

            if (state.indices) {
                state.indices.bind();
            }
        }
    });

})();;(function () {

    "use strict";

    XEO.renderer.ChunkFactory.createChunkType({

        type: "lights",

        build: function () {

            this._uLightAmbientColor = this._uLightAmbientColor || [];
            this._uLightAmbientIntensity = this._uLightAmbientIntensity || [];

            this._uLightColor = this._uLightColor || [];
            this._uLightIntensity = this._uLightIntensity || [];

            this._uLightDir = this._uLightDir || [];
            this._uLightPos = this._uLightPos || [];

            this._uLightAttenuation = this._uLightAttenuation || [];

            var lights = this.state.lights;
            var program = this.program;

            for (var i = 0, len = lights.length; i < len; i++) {

                switch (lights[i].type) {

                    case "ambient":
                        this._uLightAmbientColor[i] = program.draw.getUniform("xeo_uLightAmbientColor");
                        this._uLightAmbientIntensity[i] = program.draw.getUniform("xeo_uLightAmbientIntensity" + i);
                        break;

                    case "dir":
                        this._uLightColor[i] = program.draw.getUniform("xeo_uLightColor" + i);
                        this._uLightIntensity[i] = program.draw.getUniform("xeo_uLightIntensity" + i);
                        this._uLightPos[i] = null;
                        this._uLightDir[i] = program.draw.getUniform("xeo_uLightDir" + i);
                        break;

                    case "point":
                        this._uLightColor[i] = program.draw.getUniform("xeo_uLightColor" + i);
                        this._uLightIntensity[i] = program.draw.getUniform("xeo_uLightIntensity" + i);
                        this._uLightPos[i] = program.draw.getUniform("xeo_uLightPos" + i);
                        this._uLightDir[i] = null;
                        this._uLightAttenuation[i] = program.draw.getUniform("xeo_uLightAttenuation" + i);
                        break;
                }
            }
        },

        draw: function () {

            var lights = this.state.lights;
            var light;

            var gl = this.program.gl;

            for (var i = 0, len = lights.length; i < len; i++) {

                light = lights[i];

                // Ambient color

                if (this._uLightAmbientColor[i]) {
                    this._uLightAmbientColor[i].setValue(light.color);

                    if (this._uLightAmbientIntensity[i]) {
                        this._uLightAmbientIntensity[i].setValue(light.intensity);
                    }

                } else {

                    // Color and intensity

                    if (this._uLightColor[i]) {
                        this._uLightColor[i].setValue(light.color);
                    }

                    if (this._uLightIntensity[i]) {
                        this._uLightIntensity[i].setValue(light.intensity);
                    }

                    if (this._uLightPos[i]) {

                        // Position

                        this._uLightPos[i].setValue(light.pos);

                        // Attenuation

                        if (this._uLightAttenuation[i]) {
                            this._uLightAttenuation[i].setValue(light.attenuation);
                        }
                    }

                    // Direction

                    if (this._uLightDir[i]) {
                        this._uLightDir[i].setValue(light.dir);
                    }
                }
            }
        }
    });

})();
;(function () {

    "use strict";

    XEO.renderer.ChunkFactory.createChunkType({

        type: "modelTransform",

        build: function () {

            var draw = this.program.draw;

            this._uModelMatrixDraw = draw.getUniform("xeo_uModelMatrix");
            this._uModelNormalMatrixDraw = draw.getUniform("xeo_uModelNormalMatrix");

            var pick = this.program.pick;

            this._uModelMatrixPick = pick.getUniform("xeo_uModelMatrix");
        },

        draw: function () {

            var gl = this.program.gl;

            if (this._uModelMatrixDraw) {
                this._uModelMatrixDraw.setValue(this.state.matrix);
            }

            if (this._uModelNormalMatrixDraw) {
                this._uModelNormalMatrixDraw.setValue(this.state.normalMatrix);
            }
        },

        pick: function () {

            var gl = this.program.gl;

            if (this._uModelMatrixPick) {
                this._uModelMatrixPick.setValue(this.state.matrix);
            }
        }
    });

})();
;(function () {

    "use strict";

    XEO.renderer.ChunkFactory.createChunkType({

        type: "modes",

        build: function () {

            var draw = this.program.draw;

            this._uModesClippingDraw = draw.getUniform("xeo_uModesClipping");

            var pick = this.program.pick;

            this._uModesClippingPick = pick.getUniform("xeo_uModesClipping");
        },

        drawAndPick: function (frameCtx) {

            var state = this.state;
            var gl = this.program.gl;

            var backfaces = state.backfaces;

            if (frameCtx.backfaces !== backfaces) {

                if (backfaces) {
                    gl.disable(gl.CULL_FACE);

                } else {
                    gl.enable(gl.CULL_FACE);
                }

                frameCtx.backfaces = backfaces;
            }

            var frontface = state.frontface;

            if (frameCtx.frontface !== frontface) {

                // frontface is boolean for speed,
                // true == "ccw", false == "cw"

                if (frontface) {
                    gl.frontFace(gl.CCW);

                } else {
                    gl.frontFace(gl.CW);
                }

                frameCtx.frontface = frontface;
            }

            var transparent = state.transparent;

            if (frameCtx.transparent !== transparent) {

                if (!frameCtx.pick) {

                    if (transparent) {

                        // Entering a transparency bin

                        gl.enable(gl.BLEND);
                        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

                        frameCtx.blendEnabled = true;

                    } else {

                        // Leaving a transparency bin

                        gl.disable(gl.BLEND);

                        frameCtx.blendEnabled = false;
                    }
                }

                frameCtx.transparent = transparent;
            }

            if (frameCtx.pick) {

                if (this._uModesClippingPick) {
                    this._uModesClippingPick.setValue(state.clipping);
                }

            } else {
                if (this._uModesClippingDraw) {
                    this._uModesClippingDraw.setValue(state.clipping);
                }
            }
        }
    });
})();
;(function () {

    "use strict";

    XEO.renderer.ChunkFactory.createChunkType({

        type: "pbrMaterial",

        build: function () {

            var state = this.state;

            var draw = this.program.draw;

            this._uMetallic = draw.getUniform("xeo_uMetallic");

            this._uMaterialColor = draw.getUniform("xeo_uMaterialColor");
            
            if (state.colorMap) {
                this._uMaterialColorMap = draw.getUniform("xeo_uMaterialColorMap");
                this._uMaterialColorMapMatrix = draw.getUniform("xeo_uMaterialColorMapMatrix");
            }
            
            this._uMaterialEmissive = draw.getUniform("xeo_uMaterialEmissive");

            if (state.emissiveMap) {
                this._uMaterialEmissiveMap = draw.getUniform("xeo_uMaterialEmissiveMap");
                this._uMaterialEmissiveMapMatrix = draw.getUniform("xeo_uMaterialEmissiveMapMatrix");
            }

            this._uMaterialOpacity = draw.getUniform("xeo_uMaterialOpacity");

            if (state.opacityMap) {
                this._uMaterialOpacityMap = draw.getUniform("xeo_uMaterialOpacityMap");
                this._uMaterialOpacityMapMatrix = draw.getUniform("xeo_uMaterialOpacityMapMatrix");
            }

            this._uMaterialRoughness = draw.getUniform("xeo_uMaterialRoughness");

            if (state.roughnessMap) {
                this._uMaterialRoughnessMap = draw.getUniform("xeo_uMaterialRoughnessMap");
                this._uMaterialRoughnessMapMatrix = draw.getUniform("xeo_uMaterialRoughnessMapMatrix");
            }

            if (state.normalMap) {
                this._uMaterialNormalMap = draw.getUniform("xeo_uMaterialNormalMap");
                this._uMaterialNormalMapMatrix = draw.getUniform("xeo_uMaterialNormalMapMatrix");
            }

            this._uMaterialSpecular = draw.getUniform("xeo_uMaterialSpecular");
            
            if (state.specularMap) {
                this._uMaterialSpecularMap = draw.getUniform("xeo_uMaterialSpecularMap");
                this._uMaterialSpecularMapMatrix = draw.getUniform("xeo_uMaterialSpecularMapMatrix");
            }
        },

        draw: function (frameCtx) {

            frameCtx.textureUnit = 0;
            
            var draw = this.program.draw;
            var state = this.state;

            if (this._uMetallic) {
                this._uMetallic.setValue(state.metallic);
            }

            // Base color

            if (this._uMaterialColor) {
                this._uMaterialColor.setValue(state.color);
            }

            if ( this._uMaterialColorMap) {

                draw.bindTexture(this._uMaterialColorMap, state.colorMap.texture, frameCtx.textureUnit++);

                if (this._uMaterialColorMapMatrix) {
                    this._uMaterialColorMapMatrix.setValue(state.colorMap.matrix);
                }
            }

            // Emissive color

            if (this._uMaterialEmissive) {
                this._uMaterialEmissive.setValue(state.emissive);
            }

            if (this._uMaterialEmissiveMap) {

                draw.bindTexture(this._uMaterialEmissiveMap, state.emissiveMap.texture, frameCtx.textureUnit++);

                if (this._uMaterialEmissiveMapMatrix) {
                    this._uMaterialEmissiveMapMatrix.setValue(state.emissiveMap.matrix);
                }
            }

            // Opacity 

            if (this._uMaterialOpacity) {
                this._uMaterialOpacity.setValue(state.opacity);
            }
            
            if (this._uMaterialOpacityMap) {

                draw.bindTexture(this._uMaterialOpacityMap, state.opacityMap.texture, frameCtx.textureUnit++);

                if (this._uMaterialOpacityMapMatrix) {
                    this._uMaterialOpacityMapMatrix.setValue(state.opacityMap.matrix);
                }
            }
            
            // Roughness

            if (this._uMaterialRoughness) {
                this._uMaterialRoughness.setValue(state.roughness);
            }

            if (this._uMaterialRoughnessMap) {

                draw.bindTexture(this._uMaterialRoughnessMap, state.roughnessMap.texture, frameCtx.textureUnit++);

                if (this._uMaterialRoughnessMapMatrix) {
                    this._uMaterialRoughnessMapMatrix.setValue(state.roughnessMap.matrix);
                }
            }

            // Normal map

            if (this._uMaterialNormalMap) {

                draw.bindTexture(this._uMaterialNormalMap, state.normalMap.texture, frameCtx.textureUnit++);

                if (this._uMaterialNormalMapMatrix) {
                    this._uMaterialNormalMapMatrix.setValue(state.normalMap.matrix);
                }
            }

            // Specular 

            if (this._uMaterialSpecular) {
                this._uMaterialSpecular.setValue(state.specular);
            }

            if (this._uMaterialSpecularMap) {

                draw.bindTexture(this._uMaterialSpecularMap, state.specularMap.texture, frameCtx.textureUnit++);

                if (this._uMaterialSpecularMapMatrix) {
                    this._uMaterialSpecularMapMatrix.setValue(state.specularMap.matrix);
                }
            }
            

            if (frameCtx.textureUnit > 10) { // TODO: Find how many textures allowed
                frameCtx.textureUnit = 0;
            }
        }
    });

})();
;(function () {

    "use strict";

    XEO.renderer.ChunkFactory.createChunkType({

        type: "phongMaterial",

        build: function () {

            var state = this.state;

            var draw = this.program.draw;

            // Blinn-Phong base material

            this._uMaterialDiffuse = draw.getUniform("xeo_uMaterialDiffuse");
            this._uMaterialSpecular = draw.getUniform("xeo_uMaterialSpecular");
            this._uMaterialEmissive = draw.getUniform("xeo_uMaterialEmissive");
            this._uMaterialOpacity = draw.getUniform("xeo_uMaterialOpacity");
            this._uMaterialShininess = draw.getUniform("xeo_uMaterialShininess");

            // Textures

            if (state.diffuseMap) {
                this._uMaterialDiffuseMap = draw.getUniform("xeo_uMaterialDiffuseMap");
                this._uMaterialDiffuseMapMatrix = draw.getUniform("xeo_uMaterialDiffuseMapMatrix");
            }

            if (state.specularMap) {
                this._uSpecularMap = draw.getUniform("xeo_uSpecularMap");
                this._uSpecularMapMatrix = draw.getUniform("xeo_uSpecularMapMatrix");
            }

            if (state.emissiveMap) {
                this._uEmissiveMap = draw.getUniform("xeo_uEmissiveMap");
                this._uEmissiveMapMatrix = draw.getUniform("xeo_uEmissiveMapMatrix");
            }

            if (state.opacityMap) {
                this._uOpacityMap = draw.getUniform("xeo_uOpacityMap");
                this._uOpacityMapMatrix = draw.getUniform("xeo_uOpacityMapMatrix");
            }

            if (state.reflectivityMap) {
                this._uReflectivityMap = draw.getUniform("xeo_uReflectivityMap");
                this._uReflectivityMapMatrix = draw.getUniform("xeo_uReflectivityMapMatrix");
            }

            if (state.normalMap) {
                this._uBumpMap = draw.getUniform("xeo_uBumpMap");
                this._uBumpMapMatrix = draw.getUniform("xeo_uBumpMapMatrix");
            }

            // Fresnel effects

            if (state.diffuseFresnel) {
                this._uMaterialDiffuseFresnelBias = draw.getUniform("xeo_uMaterialDiffuseFresnelBias");
                this._uMaterialDiffuseFresnelPower = draw.getUniform("xeo_uMaterialDiffuseFresnelPower");
                this._uMaterialDiffuseFresnelLeftColor = draw.getUniform("xeo_uMaterialDiffuseFresnelLeftColor");
                this._uMaterialDiffuseFresnelRightColor = draw.getUniform("xeo_uMaterialDiffuseFresnelRightColor");
            }

            if (state.specularFresnel) {
                this._uSpecularFresnelBias = draw.getUniform("xeo_uSpecularFresnelBias");
                this._uSpecularFresnelPower = draw.getUniform("xeo_uSpecularFresnelPower");
                this._uSpecularFresnelLeftColor = draw.getUniform("xeo_uSpecularFresnelLeftColor");
                this._uSpecularFresnelRightColor = draw.getUniform("xeo_uSpecularFresnelRightColor");
            }

            if (state.opacityFresnel) {
                this._uOpacityFresnelBias = draw.getUniform("xeo_uOpacityFresnelBias");
                this._uOpacityFresnelPower = draw.getUniform("xeo_uOpacityFresnelPower");
                this._uOpacityFresnelLeftColor = draw.getUniform("xeo_uOpacityFresnelLeftColor");
                this._uOpacityFresnelRightColor = draw.getUniform("xeo_uOpacityFresnelRightColor");
            }

            if (state.reflectivityFresnel) {
                this._uReflectivityFresnelBias = draw.getUniform("xeo_uReflectivityFresnelBias");
                this._uReflectivityFresnelPower = draw.getUniform("xeo_uReflectivityFresnelPower");
                this._uReflectivityFresnelLeftColor = draw.getUniform("xeo_uReflectivityFresnelLeftColor");
                this._uReflectivityFresnelRightColor = draw.getUniform("xeo_uReflectivityFresnelRightColor");
            }

            if (state.emissiveFresnel) {
                this._uEmissiveFresnelBias = draw.getUniform("xeo_uEmissiveFresnelBias");
                this._uEmissiveFresnelPower = draw.getUniform("xeo_uEmissiveFresnelPower");
                this._uEmissiveFresnelLeftColor = draw.getUniform("xeo_uEmissiveFresnelLeftColor");
                this._uEmissiveFresnelRightColor = draw.getUniform("xeo_uEmissiveFresnelRightColor");
            }
        },

        draw: function (frameCtx) {

            var draw = this.program.draw;
            var state = this.state;

            // Diffuse color

            if (this._uMaterialDiffuse) {
                this._uMaterialDiffuse.setValue(state.diffuse);
            }

            // Specular color

            if (this._uMaterialSpecular) {
                this._uMaterialSpecular.setValue(state.specular);
            }

            // Emissive color

            if (this._uMaterialEmissive) {
                this._uMaterialEmissive.setValue(state.emissive);
            }

            // Opacity

            if (this._uMaterialOpacity) {
                this._uMaterialOpacity.setValue(state.opacity);
            }


            if (this._uMaterialShininess) {
                this._uMaterialShininess.setValue(state.shininess);
            }

            // Textures

            frameCtx.textureUnit = 0;

            // Diffuse map

            if ( this._uMaterialDiffuseMap) {

                draw.bindTexture(this._uMaterialDiffuseMap, state.diffuseMap.texture, frameCtx.textureUnit++);

                if (this._uMaterialDiffuseMapMatrix) {
                    this._uMaterialDiffuseMapMatrix.setValue(state.diffuseMap.matrix);
                }
            }

            // Specular map

            if (this._uSpecularMap) {

                draw.bindTexture(this._uSpecularMap, state.specularMap.texture, frameCtx.textureUnit++);

                if (this._uSpecularMapMatrix) {
                    this._uSpecularMapMatrix.setValue(state.specularMap.matrix);
                }
            }

            // Emissive map

            if (this._uEmissiveMap) {

                draw.bindTexture(this._uEmissiveMap, state.emissiveMap.texture, frameCtx.textureUnit++);

                if (this._uEmissiveMapMatrix) {
                    this._uEmissiveMapMatrix.setValue(state.emissiveMap.matrix);
                }
            }

            // Opacity map

            if (this._uOpacityMap) {

                draw.bindTexture(this._uOpacityMap, state.opacityMap.texture, frameCtx.textureUnit++);

                if (this._uOpacityMapMatrix) {
                    this._uOpacityMapMatrix.setValue(state.opacityMap.matrix);
                }
            }

            // Reflectivity map

            if (this._uReflectivityMap) {

                draw.bindTexture(this._uReflectivityMap, state.reflectivityMap.texture, frameCtx.textureUnit++);

                if (this._uReflectivityMapMatrix) {
                    this._uReflectivityMapMatrix.setValue(state.reflectivityMap.matrix);
                }
            }

            // Bump map

            if (this._uBumpMap) {

                draw.bindTexture(this._uBumpMap, state.normalMap.texture, frameCtx.textureUnit++);

                if (this._uBumpMapMatrix) {
                    this._uBumpMapMatrix.setValue(state.normalMap.matrix);
                }
            }


            if (frameCtx.textureUnit > 10) { // TODO: Find how many textures allowed
                frameCtx.textureUnit = 0;
            }


            // Fresnel effects

            if (state.diffuseFresnel) {

                if (this._uMaterialDiffuseFresnelBias) {
                    this._uMaterialDiffuseFresnelBias.setValue(state.diffuseFresnel.bias);
                }

                if (this._uMaterialDiffuseFresnelPower) {
                    this._uMaterialDiffuseFresnelPower.setValue(state.diffuseFresnel.power);
                }

                if (this._uMaterialDiffuseFresnelLeftColor) {
                    this._uMaterialDiffuseFresnelLeftColor.setValue(state.diffuseFresnel.leftColor);
                }

                if (this._uMaterialDiffuseFresnelRightColor) {
                    this._uMaterialDiffuseFresnelRightColor.setValue(state.diffuseFresnel.rightColor);
                }
            }

            if (state.specularFresnel) {

                if (this._uSpecularFresnelBias) {
                    this._uSpecularFresnelBias.setValue(state.specularFresnel.bias);
                }

                if (this._uSpecularFresnelPower) {
                    this._uSpecularFresnelPower.setValue(state.specularFresnel.power);
                }

                if (this._uSpecularFresnelLeftColor) {
                    this._uSpecularFresnelLeftColor.setValue(state.specularFresnel.leftColor);
                }

                if (this._uSpecularFresnelRightColor) {
                    this._uSpecularFresnelRightColor.setValue(state.specularFresnel.rightColor);
                }
            }

            if (state.opacityFresnel) {

                if (this._uOpacityFresnelBias) {
                    this._uOpacityFresnelBias.setValue(state.opacityFresnel.bias);
                }

                if (this._uOpacityFresnelPower) {
                    this._uOpacityFresnelPower.setValue(state.opacityFresnel.power);
                }

                if (this._uOpacityFresnelLeftColor) {
                    this._uOpacityFresnelLeftColor.setValue(state.opacityFresnel.leftColor);
                }

                if (this._uOpacityFresnelRightColor) {
                    this._uOpacityFresnelRightColor.setValue(state.opacityFresnel.rightColor);
                }
            }

            if (state.reflectivityFresnel) {

                if (this._uReflectivityFresnelBias) {
                    this._uReflectivityFresnelBias.setValue(state.reflectivityFresnel.bias);
                }

                if (this._uReflectivityFresnelPower) {
                    this._uReflectivityFresnelPower.setValue(state.reflectivityFresnel.power);
                }

                if (this._uReflectivityFresnelLeftColor) {
                    this._uReflectivityFresnelLeftColor.setValue(state.reflectivityFresnel.leftColor);
                }

                if (this._uReflectivityFresnelRightColor) {
                    this._uReflectivityFresnelRightColor.setValue(state.reflectivityFresnel.rightColor);
                }
            }

            if (state.emissiveFresnel) {

                if (this._uEmissiveFresnelBias) {
                    this._uEmissiveFresnelBias.setValue(state.emissiveFresnel.bias);
                }

                if (this._uEmissiveFresnelPower) {
                    this._uEmissiveFresnelPower.setValue(state.emissiveFresnel.power);
                }

                if (this._uEmissiveFresnelLeftColor) {
                    this._uEmissiveFresnelLeftColor.setValue(state.emissiveFresnel.leftColor);
                }

                if (this._uEmissiveFresnelRightColor) {
                    this._uEmissiveFresnelRightColor.setValue(state.emissiveFresnel.rightColor);
                }
            }
        }
    });

})();
;(function () {

    "use strict";

    XEO.renderer.ChunkFactory.createChunkType({

        type: "program",

        build: function () {

            // Note that "program" chunks are always after "renderTarget" chunks

            this._depthModeDraw = this.program.draw.getUniform("xeo_uDepthMode");
            this._depthModePick = this.program.pick.getUniform("xeo_uDepthMode");
            this._rayPickMode = this.program.pick.getUniform("xeo_uRayPickMode");
        },

        draw: function (frameCtx) {

            var draw = this.program.draw;

            draw.bind();

            frameCtx.textureUnit = 0;

            if (this._depthModeDraw) {
                this._depthModeDraw.setValue(frameCtx.depthMode);
            }

            frameCtx.drawProgram = draw;
        },

        pick: function (frameCtx) {

            var pick = this.program.pick;

            pick.bind();

            this._rayPickMode.setValue(frameCtx.rayPick);

            if (this._depthModePick) {
                this._depthModePick.setValue(frameCtx.depthMode);
            }

            frameCtx.textureUnit = 0;

            //for (var i = 0; i < 10; i++) {
            //    gl.disableVertexAttribArray(i);
            //}
        }
    });
})();



;(function () {

    "use strict";

    XEO.renderer.ChunkFactory.createChunkType({

        type: "projTransform",

        build: function () {

            this._uProjMatrixDraw = this.program.draw.getUniform("xeo_uProjMatrix");
            this._uZNearDraw = this.program.draw.getUniform("xeo_uZNear");
            this._uZFarDraw = this.program.draw.getUniform("xeo_uZFar");

            this._uProjMatrixPick = this.program.pick.getUniform("xeo_uProjMatrix");
            this._uZNearPick = this.program.pick.getUniform("xeo_uZNear");
            this._uZFarPick = this.program.pick.getUniform("xeo_uZFar");
        },

        draw: function (frameCtx) {

            var state = this.state;

            if (this._uProjMatrixDraw) {
                this._uProjMatrixDraw.setValue(state.matrix);
            }

            if (this._uZNearDraw) {
                this._uZNearDraw.setValue(state.near);
            }

            if (this._uZFarDraw) {
                this._uZFarDraw.setValue(state.far);
            }

            frameCtx.projMatrix = state.matrix;
        },


        pick: function (frameCtx) {

            var state = this.state;

            if (this._uProjMatrixPick) {
                this._uProjMatrixPick.setValue(state.matrix);
            }

            if (frameCtx.rayPick) {

                // Z-pick pass: feed near and far clip planes into shader

                if (this._uZNearPick) {
                    this._uZNearPick.setValue(state.near);
                }

                if (this._uZFarPick) {
                    this._uZFarPick.setValue(state.far);
                }
            }

            frameCtx.projMatrix = state.matrix;
        }
    });

})();;(function () {

    "use strict";

    /**
     *   Create display state chunk type for draw and pick render of renderTarget
     */
    XEO.renderer.ChunkFactory.createChunkType({

        type: "renderTarget",

        // Avoid reapplication of this chunk type after a program switch.
        programGlobal: true,

        draw: function (frameCtx) {
return;
            var gl = this.program.gl;
            var state = this.state;

            // Flush and unbind any render buffer already bound

            if (frameCtx.renderBuf) {
                gl.flush();
                frameCtx.renderBuf.unbind();
                frameCtx.renderBuf = null;
            }

            // Set depthMode false and bail if no render buffer for this chunk
            var renderBuf = state.renderBuf;
            if (!renderBuf) {
                frameCtx.depthMode = false;
                return;
            }

            // Bind this chunk's render buffer, set depthMode, enable blend if depthMode false, clear buffer
            renderBuf.bind();

            frameCtx.depthMode = (state.type === state.DEPTH);

            if (!frameCtx.depthMode) {

                //  Enable blending for non-depth targets
                if (frameCtx.blendEnabled) {
                    gl.enable(gl.BLEND);
                    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
                }
            }

            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

            gl.clearColor(frameCtx.ambientColor[0], frameCtx.ambientColor[1], frameCtx.ambientColor[2], 1.0);

            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

            frameCtx.renderBuf = renderBuf;
        }
    });

})();;(function () {

    "use strict";

    /**
     *
     */
    XEO.renderer.ChunkFactory.createChunkType({

        type: "shader",

        build: function () {
        },

        drawAndPick: function (frameCtx) {

            var params = this.state.params;

            if (params) {

                var program = frameCtx.pick ? this.program.pick : this.program.draw;
                var name;

                for (name in params) {
                    if (params.hasOwnProperty(name)) {
                        program.setUniform(name, params[name]);
                    }
                }
            }
        }
    });

})();;(function () {

    "use strict";

    /**
     *
     */
    XEO.renderer.ChunkFactory.createChunkType({

        type: "shaderParams",

        build: function () {
        },

        drawAndPick: function (frameCtx) {

            var params = this.state.params;

            if (params) {

                var program = frameCtx.pick ? this.program.pick : this.program.draw;
                var name;

                for (name in params) {
                    if (params.hasOwnProperty(name)) {
                        program.setUniform(name, params[name]);
                    }
                }
            }
        }
    });

})();;(function () {

    "use strict";

    XEO.renderer.ChunkFactory.createChunkType({

        type: "viewTransform",

        build: function () {

            this._uViewMatrixDraw = this.program.draw.getUniform("xeo_uViewMatrix");
            this._uViewNormalMatrixDraw = this.program.draw.getUniform("xeo_uViewNormalMatrix");
            this._uEyeDraw = this.program.draw.getUniform("xeo_uEye");

            this._uViewMatrixPick = this.program.pick.getUniform("xeo_uViewMatrix");
        },

        draw: function (frameCtx) {

            var state = this.state;

            if (this._uViewMatrixDraw) {
                this._uViewMatrixDraw.setValue(state.matrix);
            }

            if (this._uViewNormalMatrixDraw) {
                this._uViewNormalMatrixDraw.setValue(state.normalMatrix);
            }

            if (this._uEyeDraw) {
                this._uEyeDraw.setValue(state.eye);
            }

            frameCtx.viewMatrix = state.matrix;
        },

        pick: function (frameCtx) {

            var state = this.state;

            if (this._uViewMatrixPick) {
                this._uViewMatrixPick.setValue(state.matrix);
            }

            frameCtx.viewMatrix = state.matrix;
        }
    });

})();;/**
 * Components for reporting Scene statistics.
 *
 * @module XEO
 * @submodule reporting
 */;/**
 A **Stats** provides statistics on the parent {{#crossLink "Scene"}}{{/crossLink}}.

 ## Overview

 <ul>
 <li>Each {{#crossLink "Scene"}}Scene{{/crossLink}} provides a Stats instance on itself.</li>
 <li>You can manage your own statistics properties in a Stats, but take care not to clobber the properties that are
 provided by the {{#crossLink "Scene"}}{{/crossLink}} (see table below).</li>
 </ul>

 <img src="../../../assets/images/Stats.png"></img>

 ## Example

 This example shows how to subscribe to the "numGeometries' statistic, which indicates
 how many {{#crossLink "Geometry"}}{{/crossLink}} components are in the parent {{#crossLink "Scene"}}{{/crossLink}}.

 ````Javascript
 var scene = new XEO.Scene();

 // Get the statistics for a Scene
 var stats = scene.stats;

 // Subscribe to change of a statistic
 // The subscriber is also immediately notified of the current value via the callback.
 var handle = configs.on("numGeometries", function(value) {
     console.log("Number of Geometry components in the Scene is now " + value);
});

 // Unsubscribe
 configs.off(handle);

 // Read the current value of a statistic
 // Normally we would asynchronously subscribe with #on though, to be sure that
 // we're getting the latest changes to the statistic.
 var numGeometries = configs.props["numGeometries"];
 ````

 As mentioned, we can manage our own statistics as well (perhaps if we're extending xeoEngine):

 ````Javascript
 // Create a statistic
 configs.zero("myStatistic");

 // Increment our statistic
 configs.inc("myStatistic");

 // Decrement our statistic
 configs.dec("myStatistic");

 // Subscribe to change of our statistic
 handle2 = configs.on("myStatistic", function(value) {
    console.log("Value of myStatistic is now " + value);
});

 // Unsubscribe
 configs.off(handle2);

 // Read the current value of our statistic
 var myStatistic = configs.props["myStatistic"];
 ````

 ## Native xeoEngine statistics

 Listed below are are the statistics provided by the parent {{#crossLink "Scene"}}Scene{{/crossLink}}.

 Don't use these names for your own custom statistics properties.

 | Name  | Description|
 |---|---|
 | "numGeometries" | Number of {{#crossLink "Geometry"}}Geometrys{{/crossLink}} in the {{#crossLink "Scene"}}Scene{{/crossLink}} |
 | "numTextures"  | Number of {{#crossLink "Texture"}}Textures{{/crossLink}} in the {{#crossLink "Scene"}}Scene{{/crossLink}}  |
 | "numGameObjects"  | Number of {{#crossLink "GameObject"}}GameObjects{{/crossLink}} in the {{#crossLink "Scene"}}Scene{{/crossLink}}  |

 @class Stats
 @module XEO
 @submodule reporting
 @constructor
 @extends Component
 */
(function () {

    "use strict";

    XEO.Stats = XEO.Component.extend({

        type: "XEO.Stats",

        _init: function (cfg) {

            this.stats = {};

            for (var key in cfg) {
                if (cfg.hasOwnProperty(key)) {

                    this.stats[key] = cfg[key];

                    this.fire(key, this.stats[key]);
                }
            }
        },

        clear: function () {
            // TODO?
        },

        /**
         Increments the value of a statistic property within this Stats.

         Publishes the new value as an event with the same name as the property.

         @method inc
         @param {String} name The statistic property name.
         @param {Number} [count=1] Amount to add.
         */
        inc: function (name, count) {

            count = (count !== undefined && count != null) ? count : 1;

            if (this.stats[name] === undefined || this.stats[name] === null) {
                this.stats[name] = count;
            }

            this.stats[name] += count;

            this.fire(name, this.stats[name]);
        },

        /**
         Decrements the value of a statistic property within this Stats.

         Publishes the new value as an event with the same name as the property.

         @method dec
         @param {String} name The statistic property name.
         @param {Number} [count=1] Amount to subtract.
         */
        dec: function (name, count) {

            count = (count !== undefined && count != null) ? count : 1;

            if (this.stats[name] === undefined || this.stats[name] === null) {
                this.stats[name] = count;
            }

            this.stats[name] -= count;

            this.fire(name, this.stats[name]);
        },

        /**
         Zeroes the value of a statistic property within this Stats.

         Publishes the new value as an event with the same name as the property.

         @method zero
         @param {String} name The statistic property name.
         */
        zero: function (name) {

            if (this.stats[name] === undefined || this.stats[name] === null) {
                this.stats[name] = 0;
            }

            this.stats[name] = 0;

            this.fire(name, this.stats[name]);
        },

        _toJSON: function () {
            stats: return XEO._copy(this.stats);
        }
    });

})();
;/**
 A **Task** represents an asynchronously-running process within a {{#crossLink "Tasks"}}Tasks{{/crossLink}}.

 ## Overview

 See the {{#crossLink "Tasks"}}{{/crossLink}} documentation for more information.</li>

 <img src="../../../assets/images/Task.png"></img>

 @class Task
 @module XEO
 @submodule reporting
 @extends Component
 */
(function () {

    "use strict";

    XEO.Task = XEO.Component.extend({

        type: "XEO.Task",

        serializable: false,

        _init: function (cfg) {

            this.description = cfg.description || "";

            this.failed = false;

            this.completed = false;
        },

        /**
         * Sets this Task as successfully completed.
         *
         * Fires a  {{#crossLink "Task/completed:event"}}{{/crossLink}} event on this task, as well as
         * a {{#crossLink "Tasks/completed:event"}}{{/crossLink}} event on the parent  {{#crossLink "Tasks"}}Task{{/crossLink}}.
         *
         * @method setCompleted
         */
        setCompleted: function () {

            /**
             * Fired when this Task has successfully completed.
             *
             * @event completed
             */
            this.fire("completed", this.completed = true);
        },

        /**
         * Sets this Task as having failed.
         *
         * Fires a  {{#crossLink "Task/failed:event"}}{{/crossLink}} event on this task, as well as
         * a {{#crossLink "Tasks/failed:event"}}{{/crossLink}} event on the parent  {{#crossLink "Tasks"}}Tasks{{/crossLink}}.
         *
         * @method setFailed
         */
        setFailed: function () {

            /**
             * Fired when this Task has failed to complete successfully.
             *
             * @event failed
             */
            this.fire("failed", this.failed = true);
        },

        _destroy: function () {
            if (!this.completed && this.destroyed) {
                this.setCompleted();
            }
        }
    });

})();
;/**
 A **Tasks** tracks general asynchronous tasks running within a {{#crossLink "Scene"}}Scene{{/crossLink}}.

 ## Overview

 <ul>
 <li>Each {{#crossLink "Scene"}}Scene{{/crossLink}} has a Tasks component, available via the
 {{#crossLink "Scene"}}Scene{{/crossLink}}'s {{#crossLink "Scene/tasks:property"}}tasks{{/crossLink}} property,
 within which it will create and destroy {{#crossLink "Task"}}Task{{/crossLink}} components to indicate what processes
 it's running internally.</li>

 <li>You can also manage your own {{#crossLink "Task"}}Task{{/crossLink}} components within that, to indicate what
 application-level processes you are running.</li>
 </ul>

 <img src="../../../assets/images/Tasks.png"></img>

 ## Example

 This example shows how to manage tasks and subscribe to their life cycles.

 ````Javascript
// Create a Scene
var scene = new XEO.Scene();

// Get the Tasks tracker
var tasks = scene.tasks;

// Subscribe to all task creations
tasks.on("started", function(task) {
     console.log("Task started: " + task.id +", " + task.description);
});

// Subscribe to all task completions
tasks.on("completed", function(task) {
      console.log("Task completed: " + task.id +", " + task.description);
});

 // Subscribe to all task failures
tasks.on("failed", function(task) {
     console.log("Task failed: " + task.id +", " + task.description);
});

// Create and start Task "foo"
var taskFoo = tasks.create({
     id: "foo", // Optional, unique ID generated automatically when omitted
     description: "Loading something"
});

// Create and start Task "bar"
var taskBar = tasks.create({
     id: "bar",
     description: "Loading something else"
});

// Subscribe to completion of Task "foo"
taskFoo.on("completed", function(task) {
     console.log("Task completed: " + task.id +", " + task.description);
});

// Subscribe to failure of a specific task
taskFoo.on("failed", function(task) {
     console.log("Task failed: " + task.id +", " + task.description);
});

// Set Task "foo" as completed, via the Tasks
// Fires the "completed" handler we registered above, also fires "completed" on the Task itself
tasks.setCompleted("foo");

// Set Task "bar" as failed, this time directly on the Task in question
myTask2.setFailed();

````
 @class Tasks
 @module XEO
 @submodule reporting
 @constructor
 @extends Component
 */
(function () {

    "use strict";

    XEO.Tasks = XEO.Component.extend({

        type: "XEO.Tasks",

        serializable: false,

        _init: function (cfg) {

            this._idMap = new XEO.utils.Map();

            this.tasks = {};
        },

        /**
         * Creates and starts a new {{#crossLink "Task"}}Task{{/crossLink}} instance with this Tasks.
         *
         * If an ID is given for the new {{#crossLink "Task"}}Task{{/crossLink}} that is already in use for
         * another, will log an error message and return null.
         *
         * On success, fires a {{#crossLink "Tasks/started:event"}}{{/crossLink}} event and returns the new {{#crossLink "Task"}}Task{{/crossLink}}
         *  instance.
         *
         * @method create
         * @param params Task params.
         * @param [params.id] {String} Optional unique ID,
         * internally generated if not supplied.
         * @param [params.description] {String} Optional description.
         * @returns {Task|null} The new new {{#crossLink "Task"}}Task{{/crossLink}} instance, or null if there was an ID
         * clash with an existing {{#crossLink "Task"}}Task{{/crossLink}}.
         */
        create: function (params) {

            params = params || {};

            if (params.id) {
                if (this.tasks[params.id]) {
                    this.error("Task " + XEO._inQuotes(params.id) + "already exists");
                    return null;
                }
            } else {
                params.id = this._idMap.addItem({});
            }

            var task = new XEO.Tasks.Task(this, params);

            this.tasks[params.id] = task;

            var self = this;

            /**
             * Fired whenever a Task within this Tasks has successfully completed.
             *
             * @event completed
             * @param {Task} value The task that has completed
             */
            task.on("completed",
                function () {
                    delete self.tasks[task.id];
                    self._idMap.removeItem(task.id);
                    self.fire("completed", task, true);
                });

            /**
             * Fired whenever a Task within this Tasks has failed.
             *
             * @event failed
             * @param {Task} value The task that has failed
             */
            task.on("failed",
                function () {
                    delete self.tasks[task.id];
                    self._idMap.removeItem(task.id);
                    self.fire("failed", task, true);
                });

            self.fire("started", task, true);

            return task;
        },

        /**
         * Completes the {{#crossLink "Task"}}Task{{/crossLink}} with the given ID.
         *
         * Fires a {{#crossLink "Tasks/completed:event"}}{{/crossLink}} event, as well as separate
         * {{#crossLink "Task/completed:event"}}{{/crossLink}} event on the {{#crossLink "Task"}}Task{{/crossLink}} itself.
         *
         * Logs an error message if no task can be found for the given ID.
         *
         * @method setCompleted
         * @param {String} id ID of the {{#crossLink "Task"}}Task{{/crossLink}} to complete.
         */
        setCompleted: function (id) {

            var task = this.tasks[id];

            if (!task) {
                this.error("Task not found:" + XEO._inQuotes(id));
                return;
            }

            task.fire("completed", task, true);
        },

        /**
         * Fails the {{#crossLink "Task"}}Task{{/crossLink}} with the given ID.
         *
         * Fires a {{#crossLink "Tasks/failed:event"}}{{/crossLink}} event, as well as separate
         * {{#crossLink "Task/failed:event"}}{{/crossLink}} event on the {{#crossLink "Task"}}Task{{/crossLink}} itself.
         *
         * Logs an error message if no task can be found for the given ID.
         *
         * @method setFailed
         * @param {String} id ID of the {{#crossLink "Task"}}Task{{/crossLink}} to fail.
         */
        setFailed: function (id) {

            var task = this.tasks[id];

            if (!task) {
                this.error("Task not found:" + XEO._inQuotes(id));
                return;
            }

            task.fire("failed", task, true);
        },

        clear: function () {
            for (var id in this.tasks) {
                if (this.tasks.hasOwnProperty(id)) {
                    this.tasks[id].setCompleted();
                }
            }
        }
    });


})();
;/**
 * Components to support spatial queries (eg. collisions etc).
 *
 * @module XEO
 * @submodule spatial
 */;/**
 A **Boundary3D** provides the axis-aligned and object-aligned extents of its owner component.

 ## Overview

 A Boundary3D provides its spatial info in these properties:

 <ul>
 <li>{{#crossLink "Boundary3D/obb:property"}}{{/crossLink}} - object-aligned bounding box (OBB)</li>
 <li>{{#crossLink "Boundary3D/aabb:property"}}{{/crossLink}} - axis-aligned bounding box (AABB)</li>
 <li>{{#crossLink "Boundary3D/center:property"}}{{/crossLink}} - center coordinate </li>
 </ul>

 The following components have Boundary3Ds:

 <ul>
 <li>A {{#crossLink "Geometry"}}{{/crossLink}} provides its Model-space boundary via
 property {{#crossLink "Geometry/modelBoundary:property"}}{{/crossLink}}</li>
 <li>A {{#crossLink "GameObject"}}{{/crossLink}} provides its World and View-space boundaries via
 properties {{#crossLink "GameObject/worldBoundary:property"}}{{/crossLink}}
 and {{#crossLink "GameObject/viewBoundary:property"}}{{/crossLink}}</li>
 </ul>

 <img src="../../../assets/images/Boundary.png"></img>

 ## Example

 A {{#crossLink "GameObject"}}{{/crossLink}} provides its World-space boundary as a Boundary3D that encloses
 its {{#crossLink "Geometry"}}{{/crossLink}} {{#crossLink "Geometry/positions:property"}}{{/crossLink}} after
 their transformation by the GameObject's {{#crossLink "GameObject/transform:property"}}Modelling transform{{/crossLink}}.

 In this example we get the boundary and subscribe to updates on it, then animate the modelling transform,
 which gives us a running update of the moving boundary extents via our update handler.

 ```` javascript
 var scene = new XEO.Scene();

 // Geometry
 var geometry = new XEO.Geometry(myScene, {...});

 // Modelling transform
 var translate = new XEO.Translate(scene, {
    xyz: [-5, 0, 0]
 });

 // Game object that applies the modelling transform to the Geometry
 var object = new XEO.GameObject(myScene, {
       geometry: myGeometry,
       transform: translate
  });

 var worldBoundary = object.worldBoundary();

 // World-space OBB
 var obb = worldBoundary.obb;

 // World-space AABB
 var aabb = worldBoundary.aabb;

 // World-space center
 var center = worldBoundary.center;

 // Subscribe to updates to the Boundary3D
 worldBoundary.on("updated",
    function() {

        // Get the updated properties again

        obb = worldBoundary.obb;
        aabb = worldBoundary.aabb;
        center = worldBoundary.center;

        //...
    });

 // Animate the modelling transform;
 // on each tick, this will update the Boundary3D and fire our
 // handler, enabling us to track the changing boundary.

 var x = 0;

 scene.on("tick", function() {
    translate.xyz: [x, 0, 0];
    x += 0.5;
 });
 ````

 @class Boundary3D
 @module XEO
 @submodule spatial
 @constructor
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}Scene{{/crossLink}} - creates this Boundary within xeoEngine's default {{#crossLink "XEO/scene:property"}}scene{{/crossLink}} by default.
 @param [cfg] {*} Configs
 @param [cfg.id] {String} Optional ID, unique among all components in the parent {{#crossLink "Scene"}}Scene{{/crossLink}}, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this Boundary.
 @extends Component
 */

/**
 * Fired whenever this Boundary3D's {{#crossLink "Boundary3D/obb:property"}}{{/crossLink}},
 * {{#crossLink "Boundary3D/aabb:property"}}{{/crossLink}} or {{#crossLink "Boundary3D/center:property"}}{{/crossLink}}.
 * properties change.
 * @event updated
 */
(function () {

    "use strict";

    XEO.Boundary3D = XEO.Component.extend({

        type: "XEO.Boundary3D",

        _init: function (cfg) {

            // Owner injected callbacks to provide
            // resources on lazy-rebuild

            this._getDirty = cfg.getDirty;
            this._getOBB = cfg.getOBB;
            this._getMatrix = cfg.getMatrix;

            // Cached bounding boxes (oriented and axis-aligned) 

            this._obb = null;
            this._aabb = null;

            // Cached center point

            this._center = null;
        },

        _props: {

            /**
             * World-space oriented bounding box (OBB).
             *
             * @property obb
             * @final
             * @type {*}
             */
            obb: {

                get: function () {

                    if (this._getDirty()) {
                        this._build();
                    }

                    return this._obb;
                }
            },

            /**
             * World-space axis-aligned bounding box (AABB).
             *
             * @property aabb
             * @final
             * @type {*}
             */
            aabb: {

                get: function () {

                    if (this._getDirty()) {
                        this._build();
                    }

                    return this._aabb;
                }
            },

            /**
             * World-space center point.
             *
             * @property center
             * @final
             * @type {Array of Number}
             */
            center: {

                get: function () {

                    if (this._getDirty()) {
                        this._build();
                    }

                    return this._center;
                }
            }
        },


        // Lazy (re)builds the public
        // properties of this Boundary3D

        _build: function () {

            if (!this._obb) {

                // Lazy-allocate

                this._obb = [];

                this._aabb = {
                    xmin: 0, ymin: 0, zmin: 0,
                    xmax: 0, ymax: 0, zmax: 0
                };

                this._center = [0, 0, 0];
            }

            var aabb = this._getAABB ? this._getAABB() : null;

            if (aabb) {

                // Got AABB

                // Derive OBB and center

                this._aabb.xmin = aabb.xmin;
                this._aabb.ymin = aabb.ymin;
                this._aabb.zmin = aabb.zmin;
                this._aabb.xmax = aabb.xmax;
                this._aabb.ymax = aabb.ymax;
                this._aabb.zmax = aabb.zmax;

                XEO.math.AABB3ToOBB3(this._aabb, this._obb);
                XEO.math.getAABBCenter(this._aabb, this._center);

                return;
            }

            // Get resources through callbacks

            var positions = this._getPositions ? this._getPositions() : null;

            var matrix;

            if (positions) {

                // Got flattened WebGL positions array

                matrix = this._getMatrix ? this._getMatrix() : null;

                if (matrix) {

                    // Got transform matrix

                    // Transform OOBB by matrix,
                    // derive AABB and center

                    XEO.math.positions3ToAABB3(positions, this._aabb);
                    XEO.math.AABB3ToOBB3(this._aabb, this._obb);
                    XEO.math.transformPoints3(matrix, this._obb);
                    XEO.math.points3ToAABB3(this._obb, this._aabb);
                    XEO.math.getAABBCenter(this._aabb, this._center);

                } else {

                    // No transform matrix

                    XEO.math.positions3ToAABB3(positions, this._aabb);
                    XEO.math.AABB3ToOBB3(this._aabb, this._obb);
                    XEO.math.getAABBCenter(this._aabb, this._center);
                }

                return;
            }

            var obb = this._getOBB ? this._getOBB() : null;

            if (obb) {

                // Got OOBB (array of eight point objects)

                matrix = this._getMatrix ? this._getMatrix() : null;

                if (matrix) {

                   // Got transform matrix

                    // Transform OOBB by matrix,
                    // derive AABB and center

                    XEO.math.transformPoints3(matrix, obb, this._obb);
                    XEO.math.points3ToAABB3(this._obb, this._aabb);
                    XEO.math.getAABBCenter(this._aabb, this._center);

                } else {

                    // No transform matrix

                    // Copy OOBB, derive AABB and center

                    for (var i = 0, len = obb.length; i < lenl; i++) {
                        this._obb[i] = obb[i];
                    }

                    XEO.math.points3ToAABB3(this._obb, this._aabb);
                    XEO.math.getAABBCenter(this._aabb, this._center);
                }
            }
        }
    });

})();
;/**
 * Modelling transform components.
 *
 * @module XEO
 * @submodule transforms
 */;/**
 A **Transform** defines a modelling matrix to transform attached {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.

 ## Overview

 <ul>
 <li>Sub-classes of Transform are: {{#crossLink "Translate"}}{{/crossLink}},
 {{#crossLink "Scale"}}{{/crossLink}}, {{#crossLink "Rotate"}}{{/crossLink}}, and {{#crossLink "Quaternion"}}{{/crossLink}}</li>
 <li>Can be connected into hierarchies with other {{#crossLink "Transform"}}Transforms{{/crossLink}} and sub-classes</li>
 <li>{{#crossLink "GameObject"}}GameObjects{{/crossLink}} are connected to leaf Transforms
 in the hierarchy, and will be transformed by each Transform on the path up to the
 root, in that order.</li>
 <li>See <a href="./Shader.html#inputs">Shader Inputs</a> for the variables that Transforms create within xeoEngine's shaders.</li>
 </ul>

 <img src="../../../assets/images/Transform.png"></img>

 ## Example

 TODO

 @class Transform
 @module XEO
 @submodule transforms
 @constructor
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}Scene{{/crossLink}} - creates this Transform in the
 default {{#crossLink "Scene"}}Scene{{/crossLink}}  when omitted.
 @param [cfg] {*} Configs
 @param [cfg.id] {String} Optional ID, unique among all components in the parent {{#crossLink "Scene"}}Scene{{/crossLink}}, generated automatically when omitted.
 You only need to supply an ID if you need to be able to find the Transform by ID within the {{#crossLink "Scene"}}Scene{{/crossLink}}.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this Transform.
 @param [cfg.parent] {String|XEO.Transform} ID or instance of a parent Transform within the same {{#crossLink "Scene"}}Scene{{/crossLink}}.
 @param [cfg.matrix=[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]] {Array of Number} One-dimensional, sixteen element array of elements for the Transform, an identity matrix by default.
 @extends Component
 */
(function () {

    "use strict";

    XEO.Transform = XEO.Component.extend({

        type: "XEO.Transform",

        _init: function (cfg) {

            this._state = new XEO.renderer.ModelTransform({
                matrix: null,
                normalMatrix: null
            });

            this.parent = cfg.parent;
            this.matrix = cfg.matrix;
        },

        _props: {

            /**
             * The parent Transform.
             *
             * Fires a {{#crossLink "Transform/parent:event"}}{{/crossLink}} event on change.
             *
             * @property parent
             * @type Transform
             */
            parent: {

                set: function (value) {

                    this._parent = value;

                    /**
                     * Fired whenever this Transform's {{#crossLink "Transform/parent:property"}}{{/crossLink}} property changes.
                     * @event parent
                     * @param value The property's new value
                     */
                    this.fire("parent", this._parent);
                },

                get: function () {
                    return this._parent;
                }
            },

            /**
             * The elements of this Transform's matrix.
             *
             * Fires an {{#crossLink "Transform/matrix:event"}}{{/crossLink}} event on change.
             *
             * @property matrix
             * @default [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
             * @type {Array of Number}
             */
            matrix: {

                set: function (value) {

                    value = value || [
                            1, 0, 0, 0,
                            0, 1, 0, 0,
                            0, 0, 1, 0,
                            0, 0, 0, 1
                        ];

                    this._state.matrix = new Float32Array(value);

                    this._state.normalMatrix = new Float32Array(
                        XEO.math.transposeMat4(
                            new Float32Array(
                                XEO.math.inverseMat4(
                                    this._state.matrix, this._state.normalMatrix), this._state.normalMatrix)));

                    this._renderer.imageDirty = true;

                    /**
                     * Fired whenever this Transform's {{#crossLink "Transform/matrix:property"}}{{/crossLink}} property changes.
                     * @event matrix
                     * @param value The property's new value
                     */
                    this.fire("matrix", this._state.matrix);
                },

                get: function () {
                    return this._state.matrix;
                }
            }
        },

        _compile: function () {                    
          this._renderer.modelTransform = this._state;
        },

        _getJSON: function () {
            return {
                matrix: Array.prototype.slice.call(this._state.matrix)
            };
        }
    });

})();
;/**

 A **Rotate** applies a rotation transformation to associated {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.

 ## Overview

 <ul>
 <li>Rotate is a sub-class of {{#crossLink "Transform"}}{{/crossLink}}</li>
 <li>Can be connected into hierarchies with other {{#crossLink "Transform"}}Transforms{{/crossLink}} and sub-classes</li>
 <li>{{#crossLink "GameObject"}}GameObjects{{/crossLink}} are connected to leaf {{#crossLink "Transform"}}Transforms{{/crossLink}}
 in the hierarchy, and will be transformed by each {{#crossLink "Transform"}}Transform{{/crossLink}} on the path up to the
 root, in that order.</li>
 <li>See <a href="Shader.html#inputs">Shader Inputs</a> for the variables that Transforms create within xeoEngine's shaders.</li>
 </ul>

 <img src="../../../assets/images/Rotate.png"></img>

 ## Example

 In this example we have two {{#crossLink "GameObject"}}GameObjects{{/crossLink}} that are transformed by a hierarchy that contains
 Rotate, {{#crossLink "Translate"}}{{/crossLink}} and {{#crossLink "Scale"}}{{/crossLink}} transforms.
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
 @class Rotate
 @module XEO
 @submodule transforms
 @extends Transform
 */
(function () {

    "use strict";

    XEO.Rotate = XEO.Transform.extend({

        type: "XEO.Rotate",

        _init: function (cfg) {

            this._super(cfg);

            this._xyz = null;
            this._angle = null;

            // Set properties

            this.xyz = cfg.xyz;
            this.angle = cfg.angle;
        },

        _props: {

            /**
             * Vector indicating the axis of rotation.
             *
             * Fires an {{#crossLink "Rotate/xyz:event"}}{{/crossLink}} event on change.
             *
             * @property xyz
             * @default [0,1,0]
             * @type {Array of Number}
             */
            xyz: {

                set: function (value) {

                    value = value || [0, 1, 0];

                    this._xyz = this._xyz || [0, 0, 0];

                    this._xyz[0] = value[0];
                    this._xyz[1] = value[1];
                    this._xyz[2] = value[2];

                    /**
                     Fired whenever this Rotate's {{#crossLink "Rotate/xyz:property"}}{{/crossLink}} property changes.

                     @event xyz
                     @param value {Array of Number} The property's new value
                     */
                    this.fire("xyz", this._xyz);

                    this._update();
                },

                get: function () {
                    return this._xyz;
                }
            },

            /**
             * Angle of rotation in degrees.
             *
             * Fires an {{#crossLink "Rotate/angle:event"}}{{/crossLink}} event on change.
             *
             * @property angle
             * @default 0
             * @type {Number}
             */
            angle: {

                set: function (value) {

                    this._angle = value || 0;

                    /**
                     Fired whenever this Rotate's {{#crossLink "Rotate/angle:property"}}{{/crossLink}} property changes.

                     @event angle
                     @param value {Array of Number} The property's new value
                     */
                    this.fire("angle", this._angle);

                    this._update();
                },

                get: function () {
                    return this._angle;
                }
            }
        },

        _update: function () {

            if (this._xyz !== null && this._angle !== null) {

                // Both axis and angle have been set, so update the matrix.

                // Only do the update if both axis and angle have been set.

                // The update will be done once after both the axis and angle are set in the constructor,
                // and then subsequently every time that either the axis or angle is updated.
                //
                // This is wasteful for the case where both the axis and the angle are continually updated,
                // but that will be rarely be the case, where ormally it would just be the angle that is
                // continually updated.

                this.matrix = XEO.math.rotationMat4v(this._angle, this._xyz);
            }
        },

        _getJSON: function () {
            return {
                xyz: this._xyz,
                angle: this._angle
            };
        }
    });

})();
;/**

 A **Translate** applies a translation transformation to associated {{#crossLink "GameObject"}}GameObjects{{/crossLink}}.

 ## Overview

 <ul>

 <li>Translate is a sub-class of {{#crossLink "Transform"}}{{/crossLink}}</li>
 <li>Can be connected into hierarchies with other {{#crossLink "Transform"}}Transforms{{/crossLink}} and sub-classes</li>
 <li>{{#crossLink "GameObject"}}GameObjects{{/crossLink}} are connected to leaf {{#crossLink "Transform"}}Transforms{{/crossLink}}
 in the hierarchy, and will be transformed by each {{#crossLink "Transform"}}{{/crossLink}} on the path up to the
 root, in that order.</li>
 <li>See <a href="Shader.html#inputs">Shader Inputs</a> for the variables that Transforms create within xeoEngine's shaders.</li>

 </ul>

 <img src="../../../assets/images/Translate.png"></img>

 ## Example

 This example has two {{#crossLink "GameObject"}}GameObjects{{/crossLink}} that are transformed by a hierarchy that contains
 {{#crossLink "Rotate"}}{{/crossLink}}, Translate and {{#crossLink "Scale"}}{{/crossLink}} transforms.
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

 And just for fun, we'll start updating the second {{#crossLink "Translate"}}{{/crossLink}}:

 ````javascript
// Rotate 0.2 degrees on each frame
scene.on("tick", function(e) {
    var xyz = translate2.xyz;
    xyz[0] += 0.2;
    translate2.xyz = xyz;
});
 ````

 @class Translate
 @module XEO
 @submodule transforms
 @constructor
 @param [scene] {Scene} Parent {{#crossLink "Scene"}}Scene{{/crossLink}} - creates this Translate in the default
 {{#crossLink "Scene"}}Scene{{/crossLink}} when omitted.
 @param [cfg] {*} Configs
 @param [cfg.id] {String} Optional ID, unique among all components in the parent scene, generated automatically when omitted.
 @param [cfg.meta] {String:Object} Optional map of user-defined metadata to attach to this Translate.
 @param [cfg.xyzw=[0,0,0]] {Array(Number)} The translation vector
 @extends Transform
 */
(function () {

    "use strict";

    XEO.Translate = XEO.Transform.extend({

        type: "XEO.Translate",

        _init: function (cfg) {

            this._super(cfg);
            
            this.xyz = cfg.xyz;
        },

        _props: {

            /**
             * Vector indicating a translation amount for each axis.
             * Fires an {{#crossLink "Translate/xyz:event"}}{{/crossLink}} event on change.
             * @property xyz
             * @default [0,0,0]
             * @type {Array of Number}
             */
            xyz: {

                set: function (value) {

                    this._xyz = value || [1, 1, 1];

                    this.matrix = XEO.math.translationMat4v(this._xyz);

                    /**
                     Fired whenever this Translate's {{#crossLink "Translate/xyz:property"}}{{/crossLink}} property changes.
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
;/**

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
