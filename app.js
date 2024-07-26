// TODO: Canvasのサイズ変更を実装する
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

        this.currentLayer = this.layers[0];

        this.stack_max_size = 10;
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
            layer: this.currentLayer,
            data: this.currentLayer.ctx.getImageData(0, 0, this.width, this.height)
        });
    }

    draw(x, y) {
        if (!this.isDrawing) return;
    
        if(!this.currentLayer.isVisible) return;
    
        // TODO: ここ，要検討。どうやったら太い線がきれいに引ける？
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

        // TODO: currentLayer動かされてからのundoされると厳しい。
        this.redoStack.unshift({
            layer: this.currentLayer,
            data: this.currentLayer.ctx.getImageData(0, 0, this.width, this.height)
        });
        const undoData = this.undoStack.shift();
        undoData.layer.ctx.putImageData(undoData.data, 0, 0);
    }

    redo() {
        if(this.redoStack <= 0) return;
        this.undoStack.unshift({
            layer: this.currentLayer,
            data: this.currentLayer.ctx.getImageData(0, 0, this.width, this.height)
        });
        const redoData = this.redoStack.shift();
        redoData.layer.ctx.putImageData(redoData.data, 0, 0);
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
            this.color = `#${('00' + r.toString(16)).slice(-2)}${('00' + g.toString(16)).slice(-2)}${('00' + b.toString(16)).slice(-2)}`;
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