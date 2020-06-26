
//== Main Initialization ==\\

let appRect = new PIXI.Rectangle(0, 0, 800, 500);
var app = new PIXI.Application(appRect.width, appRect.height, {backgroundColor:0xf1f1f1});
document.getElementById("game-canvas").append(app.view);

//== Initialize Supporting Structures ==\\

app.stage.interactive=true;

let text = new PIXI.Text("HELLO WORLD");
app.stage.addChild(text);

window.text = text;

initGame();