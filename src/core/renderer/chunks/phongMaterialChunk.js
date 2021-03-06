(function () {

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
