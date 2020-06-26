let textureCache = new class TextureCache {
  // an intermediary to the PIXI.Loader and PIXI.resources.  Preloads and caches resources used in this project.
  // we could also use the native PIXI TextureCache, but this is easier to manipulate especially when
  // related to hotloading
  _cache = {};

  addTextureFromImage = (id, url) => {
    let m = PIXI.Texture.from(url);

    this._cache[id] = m;
    return m;
  }

  addTexturePromise = (id, url, overwrite = false) => {
    return new Promise((resolve) => {
      let loader = new PIXI.Loader;
      
      if (!overwrite && loader.resources[id]) {
        resolve();
      } else {
        loader.add(id, url, {crossOrigin: true});
        loader.load((loader, res) => {
          this._cache[id] = res[id].texture;
          resolve();
        });
      }
    });
  }

  /**
 * @param {[string, string][]} idUrlPairs input pair of strings to create a texture from the second string and store under name of the first
 */
  addTexturesPromise = (idUrlPairs) => {
    return new Promise((resolve) => {
      let loader = new PIXI.Loader;
      idUrlPairs.forEach(([id, url]) => {
        if (!loader.resources[id]) {
          loader.add(id, url, {crossOrigin: true});
        }
      });

      if (loader.length === 0) {
        resolve();
        return;
      }
      loader.load((loader, res) => {
        idUrlPairs.forEach(([id, url]) => {
          this._cache[id] = res[id].texture;
        });
        resolve();
      });
    });
  }

  addTextureFromGraphic = (id, graphic) => {
    let m = APPLICATION.pixiApp.renderer.generateTexture(graphic);
    if (this._cache[id]) {
      console.warn('overwriting texture', id);
    }
    this._cache[id] = m;
    return m;
  }

  getTexture = (id) => {
    return this._cache[id] || PIXI.Texture.WHITE;
  }

  destroy() {
    PIXI.utils.clearTextureCache();
  }
}

function debounce(ms, callback) {
  let timeout;
  let later = () => {
    console.log("A");
    timeout = null;
    callback();
  }

  return (now = false) => {
    clearTimeout(timeout);

    if (now) {
      later();
    } else {
      timeout = setTimeout(later, ms);
    }
  }
}
