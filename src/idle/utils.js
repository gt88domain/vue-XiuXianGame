// ===== 工具函数 =====

// 随机整数 [min, max]
export const rint = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

// 随机浮点 [min, max)
export const rfloat = (min, max) => Math.random() * (max - min) + min;

// 随机取一个数组元素
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// 概率判定
export const chance = p => Math.random() < p;

// 深拷贝
export const deepClone = obj => JSON.parse(JSON.stringify(obj));

// 唯一ID
let _uid = 0;
export const uid = () => Date.now() * 1000 + (_uid = (_uid + 1) % 1000);

// 中文数字单位格式化(来自 vue-XiuXianGame main.js)
export const fmt = (number) => {
    number = Number(number);
    if (!isFinite(number)) return '∞';
    number = number > 0 ? Math.floor(number) : 0;
    const units = ['', '万', '亿', '兆', '京', '垓', '秭', '穰', '沟', '涧', '正', '载', '极'];
    const bigTenThousand = 10000n;
    let num = BigInt(number);
    let unitIndex = 0;
    let additionalUnits = '';
    while (num >= bigTenThousand) {
        num /= bigTenThousand;
        unitIndex++;
        if (unitIndex >= units.length - 1) {
            additionalUnits += '极';
            unitIndex = 0;
        }
    }
    return num.toString() + units[unitIndex] + additionalUnits;
};

// 百分比显示
export const pct = (v, digits = 1) => `${(v * 100).toFixed(digits)}%`;

// 时间秒数格式化
export const fmtTime = (sec) => {
    sec = Math.max(0, Math.floor(sec));
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (d > 0) return `${d}天${h}小时`;
    if (h > 0) return `${h}小时${m}分`;
    if (m > 0) return `${m}分${s}秒`;
    return `${s}秒`;
};
