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
      console.log('reg');
      dbFetchObjects().then(objects => {
        objects.forEach(obj => {
          let ball = addBall(obj, (data, instant) => {
            if (instant) {
              dbPostObjectActionInstant(data);
            } else {
              dbPostObjectAction(data);
            }
          });
          ball.applyData(obj);
          dbRegisterObject(obj, ball.applyData);
          balls.push(ball);
        });
      });
    });
  } else {
    balls.push(addBall({tint: 0xffffdd}));
    balls.push(addBall({tint: 0xddffff}));
    balls.push(addBall({tint: 0xffddff}));
  }
}

function addBall(data, updateCallback) {
  ball = new Ball(data, updateCallback);
  ball.x = 100 + Math.random() * 100;
  ball.y = 100 + Math.random() * 100;
  app.stage.addChild(ball);

  app.ticker.add(ball.update);

  return ball;
}

class Ball extends PIXI.Graphics {
  display; // graphic that is shown
  grabDisplay = new PIXI.Graphics();

  data;
  
  oX;
  oY;

  vX = 0; // velocities
  vY = 0;

  baseScale;

  cfloorHeight = CONFIG.floorHeight; // the floor in relation to this ball.  This way can adjust up and down as moves

  dragging = false; // dragging with mouse or not?
  mousePos; // what's the last known mouse position?

  propertiesTo = { // property values being adjusted to
    scaleX: 1,
    scaleY: 1
  }

  canControl;
  updateCallback;
  updateOnStop = false;

  constructor(data, updateCallback) {
    super();

    this.data = data;
    this.updateCallback = updateCallback;

    this.baseScale = 1; //this.display.scale.y;

    this.updateImage();
    updateImageReg.push(this.updateImage);
    this.grabDisplay.lineStyle(3, 0xffff00).drawCircle(0, 0, 50);
    this.addChild(this.grabDisplay);
    this.grabDisplay.visible = false;
  }

  updateImage = () => {
    if (this.display) {
      this.display.destroy();
    }
    
    this.display = new PIXI.Sprite(textureCache.getTexture("guinea pig"));
    this.display.height = CONFIG.ballHeight;
    this.display.scale.x = this.display.scale.y;
    this.display.tint = this.data.tint || 0xffffff;

    this.display.anchor.set(0.5);
    this.addChild(this.display);

    this.display.buttonMode = true;
    this.display.interactive = true;

    this.grabDisplay.width = this.display.width * 1.3;
    this.grabDisplay.height = this.display.height * 1.3;
    
    // super cheap and dirty mouse listeners
    this.display.addListener("pointerdown",(e) => {
      if (this.dragging === false) {
        this.dragging = true;
        this.mousePos = e.data.getLocalPosition(app.stage);
        this.sendData(true);  
        app.stage.addChild(this);
      }
    });

    app.stage.addListener("pointermove", (e) => {
      if (this.dragging === true) {
        this.mousePos = e.data.getLocalPosition(app.stage);
        this.sendData();
      }
    });

    app.stage.addListener("pointerup", () => {
      if (this.dragging === true) {
        this.dragging = false;
        this.sendData(true);
        this.updateOnStop = true;
      }
    });

    app.stage.addListener("pointerupoutside", () => {
      if (this.dragging === true) {
        this.dragging = false;
        this.sendData(true);
        this.updateOnStop = true;
      }
    });
  }

  applyData = data => {
    if (data.dragging) {
      this.mousePos = {x: data.x, y: data.y};
      this.dragging = "remote";
      this.grabDisplay.visible = true;
      this.updateOnStop = false;
    } else {
      this.x = data.x;
      this.y = data.y;
      this.vX = data.vX;
      this.vY = data.vY;
      this.dragging = false;
      this.grabDisplay.visible = false;
    }
  }

  sendData(instant) {
    if (this.updateCallback && (Math.abs(this.data.x - this.x) > 1 || Math.abs(this.data.x - this.y) > 1)) {
      if (this.dragging) {
        this.data.x = this.mousePos.x;
        this.data.y = this.mousePos.y;
        this.data.vX = this.vX;
        this.data.vY = this.vY;
        this.data.dragging = true;
        this.updateCallback(this.data, instant);
      } else {
        this.data.x = this.x;
        this.data.y = this.y;
        this.data.vX = this.vX;
        this.data.vY = this.vY;
        this.data.dragging = false;
        this.updateCallback(this.data, instant);
      }
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
      if (Math.abs(this.vX) < 1) {
        this.vX = 0;
      }
      
      this.y = appRect.height - this.cfloorHeight - this.display.height / 2;

      if (this.vY > CONFIG.floorBounceMinY) {
        this.vY = -this.vY * CONFIG.bounce;
      } else {
        this.vY = 0;
        if (this.updateOnStop && this.vX === 0) {
          this.sendData(true);
          this.updateOnStop = false;
        }
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
