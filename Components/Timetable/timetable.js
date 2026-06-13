function getTodayKey() {
	const day = new Date().getDay();
	return day === 0 ? "7" : String(day);
}

function isWeekend(dayKey) {
	return dayKey === "6" || dayKey === "7";
}

function toSeconds(time) {
	if (typeof window.time2sec === "function") {
		return window.time2sec(time);
	}

	const [h, m] = String(time).split(":").map(Number);
	if (!Number.isInteger(h) || !Number.isInteger(m)) {
		return NaN;
	}
	return h * 3600 + m * 60;
}

function nowSeconds() {
	const now = new Date();
	return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
}

function getNextDayKey(dayKey) {
	const next = Number(dayKey) + 1;
	return next > 7 ? "1" : String(next);
}

function getDayLabel(dayKey) {
	const labels = {
		"1": "周一",
		"2": "周二",
		"3": "周三",
		"4": "周四",
		"5": "周五",
		"6": "周六",
		"7": "周日"
	};

	return labels[dayKey] || "未知";
}

function getDisplayDayInfo(config) {
	const todayKey = getTodayKey();
	const endTime = isWeekend(todayKey)
		? config?.Time_when_Day_Ends_Weekends
		: config?.Time_when_Day_Ends_Normal;

	if (typeof endTime !== "string") {
		return {
			dayKey: todayKey,
			isNextDay: false
		};
	}

	const endSec = toSeconds(endTime);
	if (!Number.isFinite(endSec)) {
		return {
			dayKey: todayKey,
			isNextDay: false
		};
	}

	if (nowSeconds() > endSec) {
		return {
			dayKey: getNextDayKey(todayKey),
			isNextDay: true
		};
	}

	return {
		dayKey: todayKey,
		isNextDay: false
	};
}

function updateHighlight(rows) {
	const now = nowSeconds();
	let activeIndex = -1;

	for (let i = 0; i < rows.length; i += 1) {
		const currentStart = rows[i].startSec;
		const nextStart = i + 1 < rows.length ? rows[i + 1].startSec : Number.POSITIVE_INFINITY;

		if (Number.isFinite(currentStart) && now >= currentStart && now < nextStart) {
			activeIndex = i;
			break;
		}
	}

	rows.forEach((row, idx) => {
		row.element.classList.toggle("is-active", idx === activeIndex);
	});
}

function clearHighlight(rows) {
	rows.forEach((row) => {
		row.element.classList.remove("is-active");
	});
}

function renderRows(listEl, classes, schedule) {
	const rows = [];

	classes.forEach((classLabel, idx) => {
		const startTime = schedule[idx] || "--:--";
		const row = document.createElement("div");
		row.className = "tt-row";
		row.innerHTML = `
			<span class="tt-period">${classLabel}</span>
			<span class="tt-time">${startTime}</span>
		`;

		listEl.appendChild(row);
		rows.push({
			element: row,
			startSec: startTime === "--:--" ? NaN : toSeconds(startTime)
		});
	});

	return rows;
}

function getDisplayToken(displayInfo) {
	return `${displayInfo.dayKey}|${displayInfo.isNextDay ? "1" : "0"}`;
}

function renderTimetableView(config, displayInfo, listEl, metaEl, titleEl) {
	const dayKey = displayInfo.dayKey;
	const scopeLabel = displayInfo.isNextDay ? "明日" : "今日";
	titleEl.textContent = `${scopeLabel}课表`;

	const dayClasses = Array.isArray(config?.Classes?.[dayKey]) ? config.Classes[dayKey] : [];
	const schedule = isWeekend(dayKey)
		? (Array.isArray(config?.Timetable_Weekends) ? config.Timetable_Weekends : [])
		: (Array.isArray(config?.Timetable_Normal) ? config.Timetable_Normal : []);

	listEl.innerHTML = "";

	if (dayClasses.length === 0) {
		metaEl.textContent = `${scopeLabel}无课程`;
		listEl.innerHTML = `<p class="tt-empty">${scopeLabel}没有需要显示的课程。</p>`;
		return [];
	}

	metaEl.textContent = `${scopeLabel} ${getDayLabel(dayKey)} · 共 ${dayClasses.length} 节`;
	return renderRows(listEl, dayClasses, schedule);
}

async function initTimetableCard() {
	const listEl = document.getElementById("ttList");
	const metaEl = document.getElementById("ttMeta");
	const titleEl = document.getElementById("ttTitle");

	if (!listEl || !metaEl || !titleEl) {
		return;
	}

	try {
		const resp = await fetch("./config.json", { cache: "no-store" });
		if (!resp.ok) {
			throw new Error(`读取配置失败: ${resp.status}`);
		}

		const config = await resp.json();
		let displayInfo = getDisplayDayInfo(config);
		let displayToken = getDisplayToken(displayInfo);
		let rows = renderTimetableView(config, displayInfo, listEl, metaEl, titleEl);

		if (displayInfo.isNextDay) {
			clearHighlight(rows);
		} else {
			updateHighlight(rows);
		}

		setInterval(() => {
			const nextInfo = getDisplayDayInfo(config);
			const nextToken = getDisplayToken(nextInfo);

			if (nextToken !== displayToken) {
				displayInfo = nextInfo;
				displayToken = nextToken;
				rows = renderTimetableView(config, displayInfo, listEl, metaEl, titleEl);
			}

			if (displayInfo.isNextDay) {
				clearHighlight(rows);
			} else {
				updateHighlight(rows);
			}
		}, 5000);
	} catch (error) {
		metaEl.textContent = "课表加载失败";
		listEl.innerHTML = '<p class="tt-empty">无法读取课表配置，请检查 config.json。</p>';
		console.error(error);
	}
}

window.addEventListener("load", initTimetableCard);
