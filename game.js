let updateImageReg = [];
window.updateImages = (url) => {
  textureCache.addTexturePromise("guinea pig", url).then(() => {
    updateImageReg.forEach(callback => callback());
  });
}

document.getElementById("file-input").addEventListener("input", (e) => {
  let file = e.target.files[0];
  console.log(file);
  
  var reader = new FileReader();
   reader.readAsDataURL(file);

   reader.onload = readerEvent => {
      var content = readerEvent.target.result;
      updateImages(content);
   }
});

const CONFIG = {
  vScaleX: 0.02, // scale warp factor
  vScaleY: -0.01, // scale warp factor
  propChangeFactor: 0.3, // rate at which the visual warp applies

  friction: 0.8, // vX slows down by this when colliding with floor
  gravity: 0.7, // vY increases by this when airborne
  
  bounce: 0.4, // velocity mult when bouncing off wall or floor
  floorBounceMinY: 1, // minimum vY to apply bounce (otherwise, stop)

  floorHeight: 100, // Y value of the floor
  ballHeight: 50, // size of the balls

  online: true,
}

let balls = [];

function initGame() {
  // create background
  let back = new PIXI.Graphics();
  back.beginFill(0x00ccff).drawRect(0, 0, appRect.width, appRect.height);
  back.interactive = true;

  // create grass
  let floor = new PIXI.Graphics();
  floor.beginFill(0x00ff00).lineStyle(1).drawRect(0, 0, appRect.width, CONFIG.floorHeight);
  floor.y = appRect.height - CONFIG.floorHeight;

  app.stage.addChild(back, floor);

  //create 3x Balls
  textureCache.addTexturePromise("guinea pig", "./assets/guinea-pig.png").then(() => {
    registerUser();
  });

  resizeCallbacks.push(() => {
    back.clear().beginFill(0x00ccff).drawRect(0, 0, appRect.width, appRect.height);
    floor.beginFill(0x00ff00).lineStyle(1).drawRect(0, 0, appRect.width, CONFIG.floorHeight);
    floor.y = appRect.height - CONFIG.floorHeight;
  })
}

let registerUser = () => {
  if (CONFIG.online) {
    dbRegister().then(() => {
      balls.push(addBall(0xffddff, true, dbPostObjectAction));

      dbFetchObjects().then(objects => {
        objects.forEach(obj => {
          let ball = addBall(0xffffff);
          ball.applyData(obj);
          balls.push(ball);
          dbRegisterObject(obj, ball.applyData);
        })
        // console.log('objects', objects);
      })
    });
  } else {
    balls.push(addBall(0xffffdd, true));
      balls.push(addBall(0xddffff, true));
      balls.push(addBall(0xffddff, true));
  }
}

function addBall(color, canControl, updateCallback) {
  ball = new Ball(color, canControl, updateCallback);
  ball.x = 100 + Math.random() * 100;
  ball.y = 100 + Math.random() * 100;
  app.stage.addChild(ball);

  app.ticker.add(ball.update);

  return ball;
}

class Ball extends PIXI.Graphics {
  display; // graphic that is shown
  _Tint;

  oX;
  oY;

  vX = 0; // velocities
  vY = 0;

  baseScale;

  cfloorHeight = CONFIG.floorHeight; // the floor in relation to this ball.  This way can adjust up and down as moves

  dragging = false; // dragging with mouse or not?
  mousePos; // what's the last known mouse position?
  airborne = false; // currently airborne?

  propertiesTo = { // property values being adjusted to
    scaleX: 1,
    scaleY: 1
  }

  canControl;
  updateCallback;

  constructor(color, canControl = false, updateCallback) {
    super();

    this._Tint = color;
    this.canControl = canControl;
    this.updateCallback = updateCallback;

    this.baseScale = 1; //this.display.scale.y;

    this.updateImage();
    updateImageReg.push(this.updateImage);
  }

  updateImage = () => {
    if (this.display) {
      this.display.destroy();
    }
    
    this.display = new PIXI.Sprite(textureCache.getTexture("guinea pig"));
    this.display.height = CONFIG.ballHeight;
    this.display.scale.x = this.display.scale.y;
    this.display.tint = this._Tint;

    this.display.anchor.set(0.5);
    this.addChild(this.display);

    if (this.canControl) {
      this.display.buttonMode = true;
      this.display.interactive = true;
      
      // super cheap and dirty mouse listeners
      this.display.addListener("pointerdown",(e) => {
        this.dragging = true;
        this.mousePos = e.data.getLocalPosition(app.stage);
        app.stage.addChild(this);
      });

      app.stage.addListener("pointermove", (e) => {
        if (this.dragging) {
          this.mousePos = e.data.getLocalPosition(app.stage);
        }
      });

      app.stage.addListener("pointerup", () => {
        if (this.dragging) {
          this.dragging = false;
        }
      });

      app.stage.addListener("pointerupoutside", () => {
        this.dragging = false;
      });
    }
  }

  applyData = data => {
    this.dragging = data.dragging;
    if (data.dragging) {
      this.mousePos = {x: data.x, y: data.y};
    } else {
      this.x = data.x;
      this.y = data.y;
      this.vX = data.vX;
      this.vY = data.vY;
    }
  }

  update = () => {
    this.oX = this.x;
    this.oY = this.y;

    if (this.dragging) {
      this.updateDragging();
    } else {
      this.updateFree();
    }

    if (this.updateCallback && (Math.abs(this.oX - this.x) > 1 || Math.abs(this.oY - this.y) > 1)) {
      if (this.dragging) {
        this.updateCallback(this.mousePos.x, this.mousePos.y, this.vX, this.vY, this.dragging);
      } else {
        this.updateCallback(this.x, this.y, this.vX, this.vY, this.dragging);
      }
    }

    this.runAnimations();
  }

  runAnimations() {
    // adjusts the rotation and scaling factor based on velocities.
    let mult = CONFIG.propChangeFactor;

    let direction = Math.atan2(this.vY, this.vX);
    let mag = Math.sqrt(this.vY * this.vY + this.vX * this.vX);

    // this.display.skew.x = this.vX * 0.03;
    // this.display.skew.y = this.vY * 0.03;
    this.propertiesTo.scaleX = this.baseScale * (1 + mag * CONFIG.vScaleX);
    this.propertiesTo.scaleY = this.baseScale * (1 + mag * CONFIG.vScaleY);

    this.display.rotation = -direction;
    this.rotation = direction;
    this.scale.x += (this.propertiesTo.scaleX - this.scale.x) * mult;
    this.scale.y += (this.propertiesTo.scaleY - this.scale.y) * mult;
  }

  updateDragging() {
// if dragging, move towards last known mouse position
    if (this.mousePos) {
      this.vX += (this.mousePos.x - this.x) * 0.5;
      this.vY += (this.mousePos.y - this.y) * 0.5;

      this.vX *= 0.2;
      this.vY *= 0.2;

      this.x += this.vX;
      this.y += this.vY;
    }

    // collision check
    if (this.x - this.display.width / 2 < 0) {
      this.x = this.display.width / 2;
      this.vX = 0
    } else if (this.x + this.display.width / 2 > appRect.right) {
      this.x = appRect.right - this.display.width / 2;
      this.vX = 0
    }

    if (this.y - this.display.height / 2 < 0) {
      this.y = this.display.height / 2;
      this.vY = 0;
    } else if (this.y + this.display.height / 2 > appRect.height - this.cfloorHeight) {
      this.y = appRect.height - this.cfloorHeight - this.display.height / 2;
      this.vY = 0;
    }
  }

  updateFree() {
    // if not dragging, move according to gravity and last known velocity
    this.vY += CONFIG.gravity;
      
    this.x += this.vX;
    this.y += this.vY;

    // floor collision check
    if (this.y + this.display.height / 2 > appRect.height - this.cfloorHeight) {
      this.vX *= CONFIG.friction;

      this.y = appRect.height - this.cfloorHeight - this.display.height / 2;

      if (this.vY > CONFIG.floorBounceMinY) {
        this.vY = -this.vY * CONFIG.bounce;
      } else {
        this.vY = 0;
      }
    }

    // wall collision check
    if (this.x - this.display.width / 2 < 0) {
      this.x = this.display.width / 2;
      this.vX *= -CONFIG.bounce;
    } else if (this.x + this.display.width / 2 > appRect.right) {
      this.x = appRect.right - this.display.width / 2;
      this.vX *= -CONFIG.bounce;
    }
  }
}
