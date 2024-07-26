Layer.counter = 0;

const tools = document.querySelectorAll('.tool-item');

const lineWidth = {
    sharp: 1,
    pen: 4,
    paint: 1,
    eraser: 5
};

const app = new App("#canvas");

const colorPicker = document.querySelector('#colorPicker');
let hexColorString = '#000000';
const hexColor = document.querySelector('#hexColor');
const rColor = document.querySelector('#rValue');
const gColor = document.querySelector('#gValue');
const bColor = document.querySelector('#bValue');
const rRange = document.querySelector('#rRange');
const gRange = document.querySelector('#gRange');
const bRange = document.querySelector('#bRange');
const brushSize = document.querySelector('#brushSize');

let currentMode = "sharp";

tools.forEach(tool => {
    tool.addEventListener('click', event => {
        tools.forEach(tool => {
            tool.classList.remove('active');
        });
        tool.classList.add('active');
        currentMode = tool.dataset.mode;

        brushSize.value = lineWidth[currentMode];

        if(currentMode === 'eraser') app.currentLayer.ctx.globalCompositeOperation = 'destination-out';
        else app.currentLayer.ctx.globalCompositeOperation = 'source-over';
    }, false);
});



rRange.addEventListener('input', event => {
    setColor();
});
gRange.addEventListener('input', event => {
    setColor();
});
bRange.addEventListener('input', event => {
    setColor();  
});
brushSize.addEventListener('input', event => {
    if(currentMode === 'sharp') return;
    lineWidth[currentMode] = brushSize.value;

    // TODO: この辺，きちんとクラスに持たせる
    app.effectScreen.setSize(lineWidth[currentMode]);
});

function setColor() {
    const r = ('00' + parseInt(rRange.value).toString(16)).slice(-2);
    const g = ('00' + parseInt(gRange.value).toString(16)).slice(-2);
    const b = ('00' + parseInt(bRange.value).toString(16)).slice(-2);
    rColor.innerHTML = rRange.value;
    gColor.innerHTML = gRange.value;
    bColor.innerHTML = bRange.value;
    const color = `#${r}${g}${b}`
    colorPicker.value = color;
    hexColor.innerHTML = color;
    app.changeColor(color);
}

colorPicker.addEventListener('input', e => setHexColorString() );

// TODO: alpha値を考慮するか検討
function setHexColorString(r, g, b) {
    if(r) {
        hexColorString = `#${('00' + r.toString(16)).slice(-2)}${('00' + g.toString(16)).slice(-2)}${('00' + b.toString(16)).slice(-2)}`;
        colorPicker.value = hexColorString;
    } else {
        hexColorString = colorPicker.value;
        r = parseInt(hexColorString.substring(1, 3), 16);
        g = parseInt(hexColorString.substring(3, 5), 16);
        b = parseInt(hexColorString.substring(5, 7), 16);
    }
    hexColor.innerHTML = hexColorString;
    rColor.innerHTML = r;
    rRange.value = r;
    gColor.innerHTML = g;
    gRange.value = g;
    bColor.innerHTML = b;
    bRange.value = b;

    // TODO: rangeの値を選択した要素の色で塗りつぶせるように

    app.changeColor(hexColorString);
}

const addLayerButton = document.querySelector('#addLayerButton');
addLayerButton.addEventListener('click', e => {
    app.createLayer();
});

// ここ，classの側に持たせたい
let uiOldPosition = { x: null, y: null };

// TODO: 線の描画を滑らかに
function draw(x, y) {
    if (!app.isDrawing) return;

    if(!app.currentLayer.isVisible) return;

    // TODO: ここ，要検討。どうやったら太い線がきれいに引ける？
    // if (currentMode === 'eraser') {
    //     app.currentLayer.ctx.linecap = 'butt';
    //     app.currentLayer.ctx.lineJoin = 'butt';
    // } else {
    //     app.currentLayer.ctx.linecap = 'round';
    //     app.currentLayer.ctx.lineJoin = 'round';
    // }
    app.currentLayer.ctx.lineWidth = lineWidth[currentMode];
    app.currentLayer.ctx.strokeStyle = app.color;
    if(app.lastPosition.x === null || app.lastPosition.y === null) {
        app.currentLayer.ctx.moveTo(x, y);
    } else {
        app.currentLayer.ctx.lineTo(x, y);
        app.currentLayer.ctx.stroke();
    }

    app.lastPosition.x = x;
    app.lastPosition.y = y;
}

app.layers.forEach(layer => {
    app.div.addEventListener('mousedown', (e) => {
        app.beforeDraw();

        switch (currentMode) {
            case 'paint':
                floodFill(app.currentLayer.ctx, e.offsetX, e.offsetY, app.color);
                break;
            case 'syringe':
                var imgData = app.currentLayer.ctx.getImageData(0, 0, app.currentLayer.canvas.width, app.currentLayer.canvas.height);
                const pixelPos = (e.offsetY * imgData.width + e.offsetX) * 4;
                const color = getColor(imgData.data, pixelPos);
                console.log(color);
                setHexColorString(color.r, color.g, color.b);
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
        draw(e.offsetX, e.offsetY);
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
        draw(e.offsetX, e.offsetY);
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
