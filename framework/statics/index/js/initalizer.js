// 监听页面加载完成
window.addEventListener('load', function () {

    // 初始化定位点网格系统
    const positionGrid = new PositionGrid({
        cols: 24,              // 24列
        rows: 16,              // 16行
        showGrid: false,       // 显示网格
        container: document.body
    });

    /**
     * 向 iframe 注入组件的依赖资源
     * @param {HTMLIFrameElement} iframe
     * @param {Array} dependencies - component.json 中的 Dependencies 数组
     */
    function injectDependencies(iframe, dependencies) {
        if (!Array.isArray(dependencies) || dependencies.length === 0) return;
        
        iframe.addEventListener('load', function () {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            dependencies.forEach(dep => {
                let el;
                if (dep.Type === 'text/css') {
                    el = iframeDoc.createElement('link');
                    el.rel = 'stylesheet';
                    el.href = dep.Src;
                } else if (dep.Type === 'text/javascript') {
                    el = iframeDoc.createElement('script');
                    el.type = 'text/javascript';
                    el.src = dep.Src;
                } else {
                    return;
                }
                iframeDoc.head.appendChild(el);
            });
        });
    }

    /**
     * 获取组件列表并渲染
     */
    async function loadComponents() {
        try {
            const compList = await axios.get("/api/Component/listComponent");
            if (compList) {
                const components = compList.data.data.components;
                components.forEach(async comp => {
                    const srcURL = await axios.get(`/api/Component/getComponentSrc?name=${comp.Name}`);
                    const iframe = document.createElement('iframe');
                    const src = srcURL.data.data.src;
                    iframe.src = src;
                    iframe.style.position = 'absolute';
                    iframe.style.border = 'none';
                    document.body.appendChild(iframe);

                    const Top = comp.Size.Top;
                    const Left = comp.Size.Left;
                    const Width = comp.Size.Width;
                    const Height = comp.Size.Height;

                    positionGrid.setElementPosition(iframe, Left, Top, Left + Width, Top + Height);

                    injectDependencies(iframe, comp.Dependencies);
                });
            }
        } catch (error) {
            console.error('加载组件失败:', error);
        }
    }

    loadComponents();
});