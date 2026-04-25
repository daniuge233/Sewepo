/**
 * 智能配色工具
 * 输入主色调，生成一套可用的主题色。
 */

const HEX_3 = /^#?([a-f\d]{3})$/i;
const HEX_6 = /^#?([a-f\d]{6})$/i;

/**
 * 将十六进制颜色标准化为 #rrggbb
 * @param {string} color
 * @returns {string}
 */
function normalizeHex(color) {
	if (typeof color !== "string") {
		return "#409eff";
	}

	const trimmed = color.trim();
	const short = trimmed.match(HEX_3);
	if (short) {
		const [r, g, b] = short[1].split("");
		return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
	}

	const long = trimmed.match(HEX_6);
	if (long) {
		return `#${long[1]}`.toLowerCase();
	}

	return "#409eff";
}

/**
 * @param {string} hex
 * @returns {{r:number,g:number,b:number}}
 */
function hexToRgb(hex) {
	const safeHex = normalizeHex(hex).slice(1);
	return {
		r: parseInt(safeHex.slice(0, 2), 16),
		g: parseInt(safeHex.slice(2, 4), 16),
		b: parseInt(safeHex.slice(4, 6), 16)
	};
}

/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {string}
 */
function rgbToHex(r, g, b) {
	const toHex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {{h:number,s:number,l:number}}
 */
function rgbToHsl(r, g, b) {
	const rn = r / 255;
	const gn = g / 255;
	const bn = b / 255;

	const max = Math.max(rn, gn, bn);
	const min = Math.min(rn, gn, bn);
	const delta = max - min;

	let h = 0;
	let s = 0;
	const l = (max + min) / 2;

	if (delta !== 0) {
		s = delta / (1 - Math.abs(2 * l - 1));

		switch (max) {
			case rn:
				h = 60 * (((gn - bn) / delta) % 6);
				break;
			case gn:
				h = 60 * ((bn - rn) / delta + 2);
				break;
			default:
				h = 60 * ((rn - gn) / delta + 4);
				break;
		}
	}

	if (h < 0) {
		h += 360;
	}

	return {
		h,
		s: s * 100,
		l: l * 100
	};
}

/**
 * @param {number} h
 * @param {number} s
 * @param {number} l
 * @returns {{r:number,g:number,b:number}}
 */
function hslToRgb(h, s, l) {
	const hs = ((h % 360) + 360) % 360;
	const sn = Math.max(0, Math.min(100, s)) / 100;
	const ln = Math.max(0, Math.min(100, l)) / 100;

	const c = (1 - Math.abs(2 * ln - 1)) * sn;
	const x = c * (1 - Math.abs((hs / 60) % 2 - 1));
	const m = ln - c / 2;

	let rn = 0;
	let gn = 0;
	let bn = 0;

	if (hs < 60) {
		rn = c;
		gn = x;
	} else if (hs < 120) {
		rn = x;
		gn = c;
	} else if (hs < 180) {
		gn = c;
		bn = x;
	} else if (hs < 240) {
		gn = x;
		bn = c;
	} else if (hs < 300) {
		rn = x;
		bn = c;
	} else {
		rn = c;
		bn = x;
	}

	return {
		r: (rn + m) * 255,
		g: (gn + m) * 255,
		b: (bn + m) * 255
	};
}

/**
 * @param {string} hex
 * @returns {number}
 */
function getLuminance(hex) {
	const { r, g, b } = hexToRgb(hex);
	const toLinear = (channel) => {
		const n = channel / 255;
		return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
	};

	const rL = toLinear(r);
	const gL = toLinear(g);
	const bL = toLinear(b);
	return 0.2126 * rL + 0.7152 * gL + 0.0722 * bL;
}

/**
 * @param {string} bgHex
 * @returns {string}
 */
function pickReadableText(bgHex) {
	const lum = getLuminance(bgHex);
	return lum > 0.45 ? "#222220" : "#f5f7fa";
}

/**
 * 通过旋转色相和调整饱和度/明度来得到变体颜色。
 * @param {string} baseHex
 * @param {{h?:number,s?:number,l?:number}} delta
 * @returns {string}
 */
function transformColor(baseHex, delta = {}) {
	const { r, g, b } = hexToRgb(baseHex);
	const { h, s, l } = rgbToHsl(r, g, b);

	const newH = h + (delta.h ?? 0);
	const newS = s + (delta.s ?? 0);
	const newL = l + (delta.l ?? 0);

	const rgb = hslToRgb(newH, newS, newL);
	return rgbToHex(rgb.r, rgb.g, rgb.b);
}

/**
 * 生成智能配色方案。
 * @param {string} primaryColor - 主色
 * @param {{
 *   scheme?: "analogous"|"complementary",  // 配色策略：邻近色/互补色
 *   backgroundMode?: "light"|"dark"         // 背景模式：浅色/深色
 * }} options - 生成方案时的可选参数
 * @returns {{
 *   primary:string,              // 主色：核心品牌色，用于主要按钮/重点块
 *   secondary:string,            // 副色：与主色协调，用于次级按钮/辅助区域
 *   accent:string,               // 强调色：用于提醒、徽标、数据高亮等视觉强调
 *   background:string,           // 页面背景色：整个页面的大面积底色
 *   surface:string,              // 表层背景色：卡片、面板、弹窗等容器底色
 *   border:string,               // 边框色：分隔线、输入框边线、卡片描边
 *   textOnPrimary:string,        // 主色上的文字色：保证在主色背景上的可读性
 *   textOnBackground:string,     // 背景上的文字色：保证在页面背景上的可读性
 *   states:{
 *     hover:string,              // 悬停态颜色：按钮/可交互元素 hover 颜色
 *     active:string,             // 激活态颜色：按钮按下/选中时颜色
 *     disabled:string            // 禁用态颜色：不可交互状态颜色
 *   }
 * }} 一套可直接映射到 CSS 变量的主题配色
 */
export function generateSmartPalette(primaryColor, options = {}) {
	const primary = normalizeHex(primaryColor);
	const scheme = options.scheme === "complementary" ? "complementary" : "analogous";
	const backgroundMode = options.backgroundMode === "dark" ? "dark" : "light";
	const baseHsl = rgbToHsl(...Object.values(hexToRgb(primary)));

	const secondaryHueShift = scheme === "complementary" ? 180 : 28;
	const accentHueShift = scheme === "complementary" ? -26 : -34;

	const secondary = transformColor(primary, {
		h: secondaryHueShift,
		s: -8,
		l: 6
	});

	const accent = transformColor(primary, {
		h: accentHueShift,
		s: 10,
		l: -3
	});

	const hover = transformColor(primary, { l: 8, s: 2 });
	const active = transformColor(primary, { l: -8, s: 6 });
	const disabled = transformColor(primary, { s: -28, l: 22 });

	let background;
	let surface;
	let border;

	if (backgroundMode === "dark") {
		background = rgbToHex(...Object.values(hslToRgb(baseHsl.h, Math.max(10, baseHsl.s * 0.4), 10)));
		surface = rgbToHex(...Object.values(hslToRgb(baseHsl.h, Math.max(12, baseHsl.s * 0.45), 16)));
		border = rgbToHex(...Object.values(hslToRgb(baseHsl.h, Math.max(14, baseHsl.s * 0.5), 26)));
	} else {
		background = rgbToHex(...Object.values(hslToRgb(baseHsl.h, Math.max(8, baseHsl.s * 0.18), 97)));
		surface = rgbToHex(...Object.values(hslToRgb(baseHsl.h, Math.max(10, baseHsl.s * 0.22), 93)));
		border = rgbToHex(...Object.values(hslToRgb(baseHsl.h, Math.max(12, baseHsl.s * 0.28), 84)));
	}

	return {
		primary,
		secondary,
		accent,
		background,
		surface,
		border,
		textOnPrimary: pickReadableText(primary),
		textOnBackground: pickReadableText(background),
		states: {
			hover,
			active,
			disabled
		}
	};
}

export default {
	generateSmartPalette,
};