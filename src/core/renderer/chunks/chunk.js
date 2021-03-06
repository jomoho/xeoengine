(function () {

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
