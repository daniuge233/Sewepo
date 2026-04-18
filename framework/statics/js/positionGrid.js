/**
 * 虚拟定位点网格系统
 * 将页面分成等距的网格点，用于快速定位元素
 */
class PositionGrid {
    constructor(config = {}) {
        // 网格配置
        this.cols = config.cols || 24;      // 列数固定（默认24列）
        this.rows = 0;                      // 行数会根据屏幕高度动态计算
        this.showGrid = config.showGrid || false;  // 是否显示网格
        
        // 容器信息
        this.container = config.container || document.body;
        this.containerWidth = 0;
        this.containerHeight = 0;
        
        // 定位点缓存
        this.points = {};
        
        // 初始化
        this.init();
    }

    /**
     * 初始化网格系统
     */
    init() {
        window.addEventListener('resize', () => this.updateGridPoints());
        this.updateGridPoints();
        
        if (this.showGrid) {
            this.renderGrid();
        }
    }

    /**
     * 更新容器尺寸和定位点
     */
    updateGridPoints() {
        // 获取容器实际尺寸
        const rect = this.container.getBoundingClientRect();
        this.containerWidth = this.container.clientWidth || window.innerWidth;
        this.containerHeight = this.container.clientHeight || window.innerHeight;

        // 根据列数和容器宽度计算正方形网格的大小
        const cellSize = this.containerWidth / this.cols;
        
        // 根据高度动态计算行数，以铺满整个屏幕
        this.rows = Math.ceil(this.containerHeight / cellSize);
        
        // 统一设置网格尺寸（正方形）
        this.cellWidth = cellSize;
        this.cellHeight = cellSize;

        // 清空缓存
        this.points = {};

        // 生成所有定位点
        for (let row = 0; row <= this.rows; row++) {
            for (let col = 0; col <= this.cols; col++) {
                const key = `${col},${row}`;
                this.points[key] = {
                    col,
                    row,
                    x: col * this.cellWidth,
                    y: row * this.cellHeight
                };
            }
        }
    }

    /**
     * 获取指定坐标的定位点
     * @param {number} col - 列坐标
     * @param {number} row - 行坐标
     * @returns {object} 包含 x, y 坐标的对象
     */
    getPoint(col, row) {
        const key = `${col},${row}`;
        if (this.points[key]) {
            return { ...this.points[key] };
        }
        return null;
    }

    /**
     * 获取定位点之间的距离（像素）
     * @param {number} startCol - 起始列
     * @param {number} startRow - 起始行
     * @param {number} endCol - 结束列
     * @param {number} endRow - 结束行
     * @returns {object} 宽高对象 {width, height}
     */
    getDistance(startCol, startRow, endCol, endRow) {
        const width = Math.abs(endCol - startCol) * this.cellWidth;
        const height = Math.abs(endRow - startRow) * this.cellHeight;
        return { width, height };
    }

    /**
     * 快速设置元素位置和尺寸
     * @param {HTMLElement} element - 目标元素
     * @param {number} startCol - 起始列
     * @param {number} startRow - 起始行
     * @param {number} endCol - 结束列
     * @param {number} endRow - 结束行
     */
    setElementPosition(element, startCol, startRow, endCol, endRow) {
        const startPoint = this.getPoint(startCol, startRow);
        const distance = this.getDistance(startCol, startRow, endCol, endRow);

        if (!startPoint) return;

        element.style.position = 'absolute';
        element.style.left = startPoint.x + 'px';
        element.style.top = startPoint.y + 'px';
        element.style.width = distance.width + 'px';
        element.style.height = distance.height + 'px';
    }

    /**
     * 快速设置多个元素
     * @param {Array} positions - 位置配置数组
     * 例如: [
     *   { element: elem1, startCol: 0, startRow: 0, endCol: 12, endRow: 8 },
     *   { element: elem2, startCol: 12, startRow: 0, endCol: 24, endRow: 8 }
     * ]
     */
    setElementsPosition(positions) {
        positions.forEach(pos => {
            this.setElementPosition(
                pos.element,
                pos.startCol,
                pos.startRow,
                pos.endCol,
                pos.endRow
            );
        });
    }

    /**
     * 在页面上显示网格（用于调试）
     */
    renderGrid() {
        const gridContainer = document.createElement('div');
        gridContainer.id = 'position-grid-debug';
        gridContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999;
        `;

        // 绘制竖线
        for (let col = 0; col <= this.cols; col++) {
            const line = document.createElement('div');
            const x = col * this.cellWidth;
            line.style.cssText = `
                position: absolute;
                left: ${x}px;
                top: 0;
                width: 1px;
                height: 100%;
                background: rgba(0, 100, 255, 0.3);
            `;
            gridContainer.appendChild(line);
        }

        // 绘制横线
        for (let row = 0; row <= this.rows; row++) {
            const line = document.createElement('div');
            const y = row * this.cellHeight;
            line.style.cssText = `
                position: absolute;
                left: 0;
                top: ${y}px;
                width: 100%;
                height: 1px;
                background: rgba(0, 100, 255, 0.3);
            `;
            gridContainer.appendChild(line);
        }

        // 绘制定位点
        for (let col = 0; col <= this.cols; col++) {
            for (let row = 0; row <= this.rows; row++) {
                const point = document.createElement('div');
                const x = col * this.cellWidth;
                const y = row * this.cellHeight;
                point.title = `(${col}, ${row})`;
                point.style.cssText = `
                    position: absolute;
                    left: ${x - 3}px;
                    top: ${y - 3}px;
                    width: 6px;
                    height: 6px;
                    background: rgba(0, 100, 255, 0.8);
                    border-radius: 50%;
                `;
                gridContainer.appendChild(point);
            }
        }

        document.body.appendChild(gridContainer);
    }

    /**
     * 移除网格显示
     */
    removeGrid() {
        const gridContainer = document.getElementById('position-grid-debug');
        if (gridContainer) {
            gridContainer.remove();
        }
    }

    /**
     * 切换网格显示
     */
    toggleGrid() {
        this.showGrid = !this.showGrid;
        if (this.showGrid) {
            this.renderGrid();
        } else {
            this.removeGrid();
        }
    }

    /**
     * 获取网格信息
     */
    getGridInfo() {
        return {
            cols: this.cols,
            rows: this.rows,
            containerWidth: this.containerWidth,
            containerHeight: this.containerHeight,
            cellWidth: this.cellWidth,
            cellHeight: this.cellHeight
        };
    }
}