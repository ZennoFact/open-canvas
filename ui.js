// TODO: Canvasのサイズ変更を実装する
class App {
    constructor(selector) {
        Layer.counter = 0;

        this.div = document.querySelector(selector);
        this.width = 600;
        this.height = 400;
        this.isDrawing = false;
        this.color = '#000000';
        this.lastPosition = { x: null, y: null };
        // this.lineWidth = 1;

        this.effectScreen = new EffectScreen(this.width, this.height);

        this.div.append(this.effectScreen.canvas);

        
        this.layerList = document.querySelector('#layerList');
        this.layers = [];
        this.createLayer('default');

        this.currentLayer = this.layers[0];

        this.stack_max_size = 10;
        this.undoStack = [];
        this.redoStack = [];
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
        console.log(color);
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
        console.log(this.size);
    }
}
