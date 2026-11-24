import * as THREE from "three";
import type { GLTFLoader, GLTFLoaderPlugin, GLTFParser } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * Loads a model's embedded textures through an <img> (TextureLoader) rather than fetch().
 *
 * GLTFLoader's default ImageBitmapLoader fetches each embedded image from a blob: URL, which the
 * site's Content-Security-Policy refuses (connect-src has no blob:; img-src does). Textures that use
 * an extension (WebP, AVIF, Basis) are left to their own plugins.
 */
class ImageTextures implements GLTFLoaderPlugin {
  readonly name = "weatherhaven_image_textures";
  constructor(private readonly parser: GLTFParser) {}

  loadTexture(textureIndex: number): Promise<THREE.Texture> | null {
    const json = this.parser.json as { textures?: { source?: number; extensions?: Record<string, unknown> }[] };
    const def = json.textures?.[textureIndex];
    if (!def || def.source === undefined || (def.extensions && Object.keys(def.extensions).length > 0)) return null;
    const loader = new THREE.TextureLoader(this.parser.options.manager);
    return this.parser.loadTextureImage(textureIndex, def.source, loader);
  }
}

export function withImageTextures(loader: GLTFLoader): GLTFLoader {
  return loader.register((parser) => new ImageTextures(parser));
}
