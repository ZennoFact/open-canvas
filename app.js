// TODO: Canvasのサイズ変更を実装する
// TODO: コード綺麗にする
class App {
    constructor(selector) {
        Layer.counter = 0;

        this.colorPicker = new ColorPicker(this);

        this.tools = Array.from(document.querySelectorAll('.tool-item'))
                            .map(item => new Tool(this, item));
        this.mode = this.tools[0].mode;
        this.lineWidth = {
            sharp: 1,
            pen: 4,
            paint: 1,
            eraser: 5,
            syringe: 1
        };

        this.brushSize = document.querySelector('#brushSize');
        this.brushSize.addEventListener('input', event => {
            this.lineWidth[this.mode] = this.brushSize.value;
            this.effectScreen.setSize(this.brushSize.value);
        });


        this.div = document.querySelector(selector);
        this.width = 600;
        this.height = 400;
        this.isDrawing = false;
        this.color = '#000000';
        this.lastPosition = { x: null, y: null };

        this.effectScreen = new EffectScreen(this.width, this.height);
        this.div.append(this.effectScreen.canvas);

        this.layerList = document.querySelector('#layerList');
        this.layers = [];
        this.createLayer('default');

        this.div.addEventListener('mousedown', event => {
            this.beforeDraw();

            switch (this.mode) {
                case 'paint':
                    this.currentLayer.floodFill(event.offsetX, event.offsetY, this.color);
                    break;
                case 'syringe':
                    var imgData = this.currentLayer.ctx.getImageData(0, 0, this.currentLayer.canvas.width, this.currentLayer.canvas.height);
                    const pixelPos = (event.offsetY * imgData.width + event.offsetX) * 4;
                    const color = Color.getColor(imgData.data, pixelPos);
                    this.colorPicker.updateHex(color.red, color.green, color.blue);
                    break;
                default:
                    this.isDrawing = true;
                    this.lastPosition.x = null;
                    this.lastPosition.y = null;
            
                    this.currentLayer.ctx.beginPath();
                    this.currentLayer.ctx.moveTo(this.lastPosition.x, this.lastPosition.y);
            }
        });

        this.div.addEventListener('mousemove', event => {
            this.effectScreen.update(event.offsetX, event.offsetY);
            this.draw(event.offsetX, event.offsetY);
        });

        this.div.addEventListener('mouseleave', event => {
            this.effectScreen.clear();
            this.lastPosition.x = null;
            this.lastPosition.y = null;
        });

        this.div.addEventListener('mouseenter', event => {
            this.lastPosition.x = null;
            this.lastPosition.y = null;
            if (app.isDrawing) {
                app.draw(event.offsetX, event.offsetY);
            }
        });

        this.div.addEventListener('mouseup', () => {
            this.isDrawing = false;
            this.lastPosition.x = null;
            this.lastPosition.y = null;
        });

        this.currentLayer = this.layers[0];

        this.stack_max_size = 20;
        this.undoStack = [];
        this.redoStack = [];

        this.brushSize = document.querySelector('#brushSize');
    }

    // 描画用ツールの選択
    selectTool(mode) {
        this.mode = mode;
        switch(this.mode) {
            case 'sharp':
            case 'paint':
            case 'syringe':
                this.brushSize.disabled = true;
                break;
            default:
                this.brushSize.disabled = false;
        }

        this.brushSize.value = this.lineWidth[this.mode];
        this.effectScreen.setSize(this.lineWidth[this.mode]);

        if(this.mode === 'eraser') this.currentLayer.ctx.globalCompositeOperation = 'destination-out';
        else this.currentLayer.ctx.globalCompositeOperation = 'source-over';
    }

    beforeDraw() {
        this.redoStack = [];

        // スタックの最大保持数を超えるようなら，末尾の要素を削除
        if (this.undoStack.length >= this.stack_max_size) {
            this.undoStack.pop();
        }

        // 現在のレイヤーのデータをスタックに追加
        this.undoStack.unshift({
            ctx: this.currentLayer.ctx,
            data: this.currentLayer.ctx.getImageData(0, 0, this.width, this.height)
        });
    }

    draw(x, y) {
        if (!this.isDrawing) return;
    
        if(!this.currentLayer.isVisible) return;
    
        // TODO: ここ，要検討。どうやったら太い線がきれいに引ける？太い線のスタート時に乱れる
        // if (currentMode === 'eraser') {
        //     app.currentLayer.ctx.linecap = 'butt';
        //     app.currentLayer.ctx.lineJoin = 'butt';
        // } else {
        //     app.currentLayer.ctx.linecap = 'round';
        //     app.currentLayer.ctx.lineJoin = 'round';
        // }
        this.currentLayer.ctx.lineWidth = this.lineWidth[this.mode];
        this.currentLayer.ctx.strokeStyle = this.color;
        if(this.lastPosition.x === null || this.lastPosition.y === null) {
            this.currentLayer.ctx.moveTo(x, y);
        } else {
            this.currentLayer.ctx.lineTo(x, y);
            this.currentLayer.ctx.stroke();
        }
    
        this.lastPosition.x = x;
        this.lastPosition.y = y;
    }

    undo() {
        if(this.undoStack <= 0) return;

        const undoData = this.undoStack.shift();
        this.redoStack.unshift({
            ctx: undoData.ctx,
            data: undoData.ctx.getImageData(0, 0, this.width, this.height)
        });
        undoData.ctx.putImageData(undoData.data, 0, 0);
    }

    redo() {
        if(this.redoStack <= 0) return;
        this.undoStack.unshift({
            ctx: this.currentLayer.ctx,
            data: this.currentLayer.ctx.getImageData(0, 0, this.width, this.height)
        });
        
        const redoData = this.redoStack.shift();
        redoData.ctx.putImageData(redoData.data, 0, 0);
    }

    resizeCanvas(layer) {
        this.div.style.width = this.width + 'px';
        this.div.style.height = this.height + 'px';
        layer.canvas.width = this.width;
        layer.canvas.height = this.height;
    }

    changeColor(color) {
        this.effectScreen.setColor(color);
        this.color = color;
    }

    createLayer() {
        const layer = new Layer();
        
        this.layerList.prepend(layer.info);
        this.layers.push(layer);
        this.div.append(layer.canvas);

        layer.info.querySelector('div input').addEventListener('change', event => {
            // event.prependDefault();
            if(event.target.checked) {
                layer.canvas.classList.remove('hidden');
                layer.isVisible = true;
            } else {
                layer.canvas.classList.add('hidden');
                layer.isVisible = false;
            }
        }, false);

        layer.info.querySelector('div button.button-delete').addEventListener('click', event => {
            if(layer.id === 0) return;

            if(this.currentLayer === layer) {
                const index = 0;
                this.currentLayer = this.layers[index];
                this.layers[index].info.classList.add("active");
            }

            this.layerList.removeChild(layer.info);        
            this.layers.splice(layer.id, 1);
            this.div.removeChild(layer.canvas);
        }, false);


        layer.info.addEventListener('click', event => {
            if(event.target === layer.info.querySelector('div input')
                || event.target === layer.info.querySelector('div button.button-delete')) return;

            this.currentLayer = layer;
            this.selectLayer(layer);
        });

        this.currentLayer = layer;
        this.selectLayer(layer);
        this.resizeCanvas(layer);
    }

    selectLayer(layer) {
        this.layers.forEach(layer => {
            layer.info.classList.remove('active')
        });
        layer.info.classList.add('active');
    }
}

class Layer {
    constructor() {
        this.isVisible = true;

        // クラス変数のようなものを外部から作成して参照
        this.id = Layer.counter++;

        this.title = (this.id === 0) ? 'default' : "Layer " + this.id;
        this.isTransparent = false;
        
        this.canvas = document.createElement('canvas');
        this.canvas.classList.add('layer');

        const template = document.querySelector('#layerInfoTemplate');
        const clone = template.content.cloneNode(true);
        clone.querySelector('.layer-title').innerHTML = this.title;
        clone.querySelector('.change-visibility').addEventListener('change', () => {
            this.isTransparent = !this.isTransparent;
            if(this.isTransparent) this.canvas.classList.add('hidden');
            else this.canvas.classList.remove('hidden');
        });

        this.info = clone.querySelector('.layer-item');
        // console.log(Layer.counter);

        this.ctx = this.getContext();
    }

    getContext() {
        return this.canvas.getContext('2d');
    }

    // 塗りつぶし関数
    floodFill(startX, startY, fillColor) {
        var imgData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        var data = imgData.data;
        var width = imgData.width;
        var height = imgData.height;
    
        var startPos = (startY * width + startX) * 4;
        var startR = data[startPos];
        var startG = data[startPos + 1];
        var startB = data[startPos + 2];
        var startA = data[startPos + 3];
    
        var targetColor = { red: startR, green: startG, blue: startB, alpha: startA };
        var fillColor = Color.hexToRGBA(fillColor);
        if (!Color.match(targetColor, fillColor)) {
            var pixelStack = [[startX, startY]];
    
            while (pixelStack.length) {
                var newPos, x, y, pixelPos, reachLeft, reachRight;
                newPos = pixelStack.pop();
                x = newPos[0];
                y = newPos[1];
    
                pixelPos = (y * width + x) * 4;
                while (y >= 0 && Color.match(Color.getColor(data, pixelPos), targetColor)) {
                    y--;
                    pixelPos -= width * 4;
                }
    
                pixelPos += width * 4;
                y++;
                reachLeft = false;
                reachRight = false;
    
                while (y < height && Color.match(Color.getColor(data, pixelPos), targetColor)) {
                    Color.fill(data, pixelPos, fillColor);
    
                    if (x > 0) {
                        if (Color.match(Color.getColor(data, pixelPos - 4), targetColor)) {
                            if (!reachLeft) {
                                pixelStack.push([x - 1, y]);
                                reachLeft = true;
                            }
                        } else if (reachLeft) {
                            reachLeft = false;
                        }
                    }
    
                    if (x < width - 1) {
                        if (Color.match(Color.getColor(data, pixelPos + 4), targetColor)) {
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
    
            this.ctx.putImageData(imgData, 0, 0);
        }
    }
}

class EffectScreen {
    constructor(w, h) {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'effectScreen';
        this.canvas.width = w;
        this.canvas.height = h;
        this.size = 1;
        this.ctx = this.canvas.getContext('2d');
        this.ctx.strokeStyle = '#000000';
    }

    setColor(color) {
        this.ctx.strokeStyle = color;
    }

    update(x, y) {
        if (this.size <= 1) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.size / 2, 0, Math.PI * 2, true);
        this.ctx.stroke();
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    setSize(size) {
        this.size = size;
    }
}

class ColorPicker {
    constructor(app) {
        this.app = app;

        this.color = '#000000';
        this.picker = document.querySelector('#colorPicker');
        this.picker.addEventListener('change', event => {
            this.color = event.target.value;
        }, false);
        
        this.hexColor = document.querySelector('#hexColor');

        this.colorParts = {
            red: {
                label: document.querySelector('#rValue'),
                range: document.querySelector('#rRange')
            },
            green: {
                label: document.querySelector('#gValue'),
                range: document.querySelector('#gRange')
            },
            blue: {
                label: document.querySelector('#bValue'),
                range: document.querySelector('#bRange')
            }
        }

        this.picker.addEventListener('change', event => {
            this.updateHex();
        }, false);

        Object.keys(this.colorParts).forEach(key => {
            this.colorParts[key].range.addEventListener('input', event => {
                const value = ('00' + parseInt(event.target.value).toString(16)).slice(-2);
                this.colorParts[key].label.innerHTML = value;

                const color = this.getHex();

                this.picker.value = color;
                this.hexColor.innerHTML = color;
                this.app.changeColor(color);
            }, false);
        });
    }

    getHex() {
        const r = ('00' + parseInt(rRange.value).toString(16)).slice(-2);
        const g = ('00' + parseInt(gRange.value).toString(16)).slice(-2);
        const b = ('00' + parseInt(bRange.value).toString(16)).slice(-2);
        return `#${r}${g}${b}`
    }

    getColor() {
        return this.color;
    }

    // TODO: ここ，もうちょっとスマートに書けるはず
    updateHex(r, g, b) {
        if(r !== undefined) {
            this.color = Color.RGBAtoHex(r, g, b);
            this.picker.value = this.color;
            console.log(this.color);
        } else {
            this.color = this.picker.value;
            r = parseInt(this.color.substring(1, 3), 16);
            g = parseInt(this.color.substring(3, 5), 16);
            b = parseInt(this.color.substring(5, 7), 16);
        }
        this.hexColor.innerHTML = this.color;
        this.colorParts.red.label.innerHTML = r;
        this.colorParts.red.range.value = r;
        this.colorParts.green.label.innerHTML = g;
        this.colorParts.green.range.value = g;
        this.colorParts.blue.label.innerHTML = b;
        this.colorParts.blue.range.value = b;

        this.app.changeColor(this.color);
    }
}

class Tool {
    constructor(app, item) {
        this.app = app;
        this.mode = item.dataset.mode;

        // TODO: このイベントリスナー，Appクラスで定義すべき？
        item.addEventListener('click', event => {
            event.target.parentNode.parentNode.querySelectorAll('.tool-item').forEach(i => i.classList.remove('active'));

            item.classList.add('active');

            app.selectTool(this.mode);
        }, false);
    }
}

class Color {
    static getColor(data, pos) {
        return { red: data[pos], green: data[pos + 1], blue: data[pos + 2], alpha: data[pos + 3] };
    }

    static fill(data, pos, color) {
        data[pos] = color.red;
        data[pos + 1] = color.green;
        data[pos + 2] = color.blue;
        data[pos + 3] = color.alpha;
    }

    static match(color1, color2) {
        return color1.red === color2.red && color1.green === color2.green && color1.blue === color2.blue && color1.alpha === color2.alpha;
    }

    static hexToRGBA(hex) {
        return {
            red: parseInt(hex.substring(1, 3), 16),
            green: parseInt(hex.substring(3, 5), 16),
            blue: parseInt(hex.substring(5, 7), 16),
            alpha: 255
        }
    }

    static RGBAtoHex(r, g, b) {
        return `#${('00' + r.toString(16)).slice(-2)}${('00' + g.toString(16)).slice(-2)}${('00' + b.toString(16)).slice(-2)}`;
    }
}