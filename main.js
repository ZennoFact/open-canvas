Layer.counter = 0;

const tools = document.querySelectorAll('.tool-item');

const app = new App("#canvas");

const addLayerButton = document.querySelector('#addLayerButton');
addLayerButton.addEventListener('click', e => {
    app.createLayer();
});

// ここ，classの側に持たせたい
let uiOldPosition = { x: null, y: null };


app.layers.forEach(layer => {
    app.div.addEventListener('mousedown', (e) => {
        app.beforeDraw();

        switch (app.mode) {
            case 'paint':
                floodFill(app.currentLayer.ctx, e.offsetX, e.offsetY, app.color);
                break;
            case 'syringe':
                var imgData = app.currentLayer.ctx.getImageData(0, 0, app.currentLayer.canvas.width, app.currentLayer.canvas.height);
                const pixelPos = (e.offsetY * imgData.width + e.offsetX) * 4;
                const color = getColor(imgData.data, pixelPos);
                app.colorPicker.updateHex(color.r, color.g, color.b);
                break;
            default:
                app.isDrawing = true;
                app.lastPosition.x = null;
                app.lastPosition.y = null;
        
                app.currentLayer.ctx.beginPath();
                app.currentLayer.ctx.moveTo(app.lastPosition.x, app.lastPosition.y);
        }

    });
    
    app.div.addEventListener('mousemove', (e) => {
        app.effectScreen.update(e.offsetX, e.offsetY);
        app.draw(e.offsetX, e.offsetY);
    });

})

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


// 機能群の実装

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

function getImagefromCanvas(layer){
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = (e) => reject(e);
      image.src = layer.ctx.canvas.toDataURL();
    });
}

// TODO: コード綺麗にする
// 塗りつぶし関数
function floodFill(ctx, startX, startY, fillColor) {
    var imgData = ctx.getImageData(0, 0, app.currentLayer.canvas.width, app.currentLayer.canvas.height);
    var data = imgData.data;
    var width = imgData.width;
    var height = imgData.height;

    var startPos = (startY * width + startX) * 4;
    var startR = data[startPos];
    var startG = data[startPos + 1];
    var startB = data[startPos + 2];
    var startA = data[startPos + 3];

    var targetColor = { r: startR, g: startG, b: startB, a: startA };
    var fillColor = hexToRGBA(fillColor);

    if (!colorMatch(targetColor, fillColor)) {
        var pixelStack = [[startX, startY]];

        while (pixelStack.length) {
            var newPos, x, y, pixelPos, reachLeft, reachRight;
            newPos = pixelStack.pop();
            x = newPos[0];
            y = newPos[1];

            pixelPos = (y * width + x) * 4;
            while (y >= 0 && colorMatch(getColor(data, pixelPos), targetColor)) {
                y--;
                pixelPos -= width * 4;
            }

            pixelPos += width * 4;
            y++;
            reachLeft = false;
            reachRight = false;

            while (y < height && colorMatch(getColor(data, pixelPos), targetColor)) {
                fill(data, pixelPos, fillColor);

                if (x > 0) {
                    if (colorMatch(getColor(data, pixelPos - 4), targetColor)) {
                        if (!reachLeft) {
                            pixelStack.push([x - 1, y]);
                            reachLeft = true;
                        }
                    } else if (reachLeft) {
                        reachLeft = false;
                    }
                }

                if (x < width - 1) {
                    if (colorMatch(getColor(data, pixelPos + 4), targetColor)) {
                        if (!reachRight) {
                            pixelStack.push([x + 1, y]);
                            reachRight = true;
                        }
                    } else if (reachRight) {
                        reachRight = false;
                    }
                }

                y++;
                pixelPos += width * 4;
            }
        }

        ctx.putImageData(imgData, 0, 0);
    }
}

function getColor(data, pos) {
    return { r: data[pos], g: data[pos + 1], b: data[pos + 2], a: data[pos + 3] };
}

function fill(data, pos, color) {
    data[pos] = color.r;
    data[pos + 1] = color.g;
    data[pos + 2] = color.b;
    data[pos + 3] = color.a;
}

function colorMatch(a, b) {
    return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
}

function hexToRGBA(hex) {
    return {
        r: parseInt(hex.substring(1, 3), 16),
        g: parseInt(hex.substring(3, 5), 16),
        b: parseInt(hex.substring(5, 7), 16),
        a: 255
    }
}


// undo / redo
const undoButton = document.querySelector('#undoButton');
undoButton.addEventListener('click', event => app.undo());

const redoButton = document.querySelector('#redoButton');
redoButton.addEventListener('click', event => app.redo());
