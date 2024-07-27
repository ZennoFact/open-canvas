Layer.counter = 0;

const app = new App("#canvas");

window.addEventListener('mouseup', () => {
    app.isDrawing = false;
});

const addLayerButton = document.querySelector('#addLayerButton');
addLayerButton.addEventListener('click', () => {
    app.createLayer();
});

// 画像の読込
document.querySelector('#loadButton').addEventListener('change', event => {
    const file = event.target.files;
    const reader = new FileReader();
    reader.onload = () => {
        const image = new Image();
        image.onload = event => {
            app.currentLayer.ctx.drawImage(image, 0, 0);
        }

        image.src = reader.result;
    }
    
    reader.readAsDataURL(file[0]);

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

// undo & redo
const undoButton = document.querySelector('#undoButton');
undoButton.addEventListener('click', () => app.undo());

const redoButton = document.querySelector('#redoButton');
redoButton.addEventListener('click', () => app.redo());
