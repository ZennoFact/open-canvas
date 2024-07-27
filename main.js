Layer.counter = 0;

const tools = document.querySelectorAll('.tool-item');

const app = new App("#canvas");

const addLayerButton = document.querySelector('#addLayerButton');
addLayerButton.addEventListener('click', e => {
    app.createLayer();
});

app.div.addEventListener('mouseleave', (e) => {
    app.effectScreen.clear();
    app.lastPosition.x = null;
    app.lastPosition.y = null;
});

app.div.addEventListener('mouseenter', (e) => {
    app.lastPosition.x = null;
    app.lastPosition.y = null;
    if (app.isDrawing) {
        app.draw(e.offsetX, e.offsetY);
    }
});


document.addEventListener('mouseup', (e) => {
    app.isDrawing = false;
    app.lastPosition.x = null;
    app.lastPosition.y = null;
});


// TODO: 画像の保存
const saveButton = document.querySelector('#saveButton');
saveButton.addEventListener('click', event => {
    concatAndSave(app.layers);
}, false);

function concatAndSave(layers) {
    const result = document.createElement('canvas');
    result.width = app.width;
    result.height = app.height;
    const ctx = result.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, result.width, result.height);

    for(let i = 0; i < layers.length; i++) {
        ctx.drawImage(layers[i].canvas, 0, 0);
    }

    const dataURL = result.toDataURL();
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'image.png';
    link.click();
}

// undo / redo
const undoButton = document.querySelector('#undoButton');
undoButton.addEventListener('click', () => app.undo());

const redoButton = document.querySelector('#redoButton');
redoButton.addEventListener('click', () => app.redo());
