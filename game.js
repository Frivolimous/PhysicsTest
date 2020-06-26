const CONFIG = {
  vScaleX: 0.02, // scale warp factor
  vScaleY: -0.01, // scale warp factor
  propChangeFactor: 0.3, // rate at which the visual warp applies

  friction: 0.8, // vX slows down by this when colliding with floor
  gravity: 0.7, // vY increases by this when airborne
  
  bounce: 0.4, // velocity mult when bouncing off wall or floor
  floorBounceMinY: 1, // minimum vY to apply bounce (otherwise, stop)

  floorY: 400, // Y value of the floor
  ballRadius: 30, // size of the balls
}

function initGame() {
  // create background
  let back = new PIXI.Graphics();
  back.beginFill(0x00ccff).drawRect(0, 0, appRect.width, appRect.height);
  back.interactive = true;

  // create grass
  let floor = new PIXI.Graphics();
  floor.beginFill(0x00ff00).lineStyle(1).drawRect(0, 0, appRect.width, (appRect.height - CONFIG.floorY));
  floor.y = CONFIG.floorY;

  app.stage.addChild(back, floor);

  //create 3x Balls
  textureCache.addTexturePromise("guinea pig", "./assets/guinea-pig.png").then(() => {
    addBall(0xffffdd);
    addBall(0xddffff);
    addBall(0xffddff);
  })
}

function addBall(color) {
  ball = new Ball(color);
  ball.x = 100 + Math.random() * 100;
  ball.y = 100 + Math.random() * 100;
  app.stage.addChild(ball);

  app.ticker.add(ball.update);
}

class Ball extends PIXI.Graphics {
  display; // graphic that is shown

  vX = 0; // velocities
  vY = 0;

  baseScale;

  cfloorY = CONFIG.floorY + 20; // the floor in relation to this ball.  This way can adjust up and down as moves

  dragging = false; // dragging with mouse or not?
  mousePos; // what's the last known mouse position?
  airborne = false; // currently airborne?

  propertiesTo = { // property values being adjusted to
    scaleX: 1,
    scaleY: 1
  }

  constructor(color) {
    super();

    this.display = PIXI.Sprite.from("guinea pig");
    this.display.height = CONFIG.ballRadius;
    this.display.scale.x = this.display.scale.y;
    this.display.tint = color;

    this.baseScale = 1; //this.display.scale.y;

    this.display.buttonMode = true;
    this.display.interactive = true;
    this.display.anchor.set(0.5);
    this.addChild(this.display);

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
      this.dragging = false;
    });

    app.stage.addListener("pointerupoutside", () => {
      this.dragging = false;
    });
  }

  update = () => {
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
    if (this.x - CONFIG.ballRadius < 0) {
      this.x = CONFIG.ballRadius;
      this.vX = 0
    } else if (this.x + CONFIG.ballRadius > appRect.right) {
      this.x = appRect.right - CONFIG.ballRadius;
      this.vX = 0
    }

    if (this.y - CONFIG.ballRadius < 0) {
      this.y = CONFIG.ballRadius;
      this.vY = 0;
    } else if (this.y + CONFIG.ballRadius > this.cfloorY) {
      this.y = this.cfloorY - CONFIG.ballRadius;
      this.vY = 0;
    }
  }

  updateFree() {
    // if not dragging, move according to gravity and last known velocity
    this.vY += CONFIG.gravity;
      
    this.x += this.vX;
    this.y += this.vY;

    // floor collision check
    if (this.y + CONFIG.ballRadius > this.cfloorY) {
      this.vX *= CONFIG.friction;

      this.y = this.cfloorY - CONFIG.ballRadius;

      if (this.vY > CONFIG.floorBounceMinY) {
        this.vY = -this.vY * CONFIG.bounce;
      } else {
        this.vY = 0;
      }
    }

    // wall collision check
    if (this.x - CONFIG.ballRadius < 0) {
      this.x = CONFIG.ballRadius;
      this.vX *= -CONFIG.bounce;
    } else if (this.x + CONFIG.ballRadius > appRect.right) {
      this.x = appRect.right - CONFIG.ballRadius;
      this.vX *= -CONFIG.bounce;
    }
  }
}