// ===== 挂机心跳 Worker =====
// 独立线程每秒 tick, 页面切到后台也不会被浏览器节流太久
setInterval(() => {
    self.postMessage({ type: 'tick', t: Date.now() });
}, 1000);
