
//== Main Initialization ==\\
let element = document.getElementById('game-canvas');

let appRect = new PIXI.Rectangle(0, 0, 800, 500);
var app = new PIXI.Application({
  backgroundColor: 0x770000,
  antialias: true,
  resolution: 1,
  width: appRect.width,
  height: appRect.height,
});
element.append(app.view);

//== Initialize Supporting Structures ==\\

app.stage.interactive=true;

let resizeCallbacks = [];
let finishResize = debounce(300, () => {
  this.app.view.width = appRect.width = element.offsetWidth;
  this.app.view.height = appRect.height = element.offsetHeight;

  resizeCallbacks.forEach(callback => callback());
});

finishResize(true);

window.addEventListener('resize', () => finishResize());

initGame();