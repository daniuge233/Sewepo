const API_URL = "https://v1.hitokoto.cn/";
// const API_URL = "https://api.example.com/";

function getSourceText(data) {
	const from = data?.from || "未知来源";
	const fromWho = data?.from_who ? ` / ${data.from_who}` : "";
	return `来源：${from}${fromWho}`;
}

async function fetchQuote() {
	const response = await fetch(API_URL, {
		headers: {
			Accept: "application/json"
		}
	});

	if (!response.ok) {
		throw new Error(`请求失败: ${response.status}`);
	}

	const data = await response.json();
	if (!data?.hitokoto) {
		throw new Error("返回数据不完整");
	}

	return data;
}

function formatTime() {
	const now = new Date();
	const hh = String(now.getHours()).padStart(2, "0");
	const mm = String(now.getMinutes()).padStart(2, "0");
	return `${hh}:${mm}`;
}

function updateLoadingState(isLoading) {
	const statusEl = document.getElementById("joStatus");
	const refreshBtn = document.getElementById("joRefreshBtn");

	refreshBtn.disabled = isLoading;
	refreshBtn.textContent = isLoading ? "加载中..." : "换一个";
	statusEl.textContent = isLoading ? "正在请求新句子" : `更新于 ${formatTime()}`;
}

function renderQuote(data) {
	document.getElementById("joQuote").textContent = data.hitokoto;
	document.getElementById("joSource").textContent = getSourceText(data);
}

function renderError(message) {
	document.getElementById("joQuote").textContent = "今天的句子暂时迷路了。";
	document.getElementById("joSource").textContent = "来源：网络";
	document.getElementById("joStatus").textContent = `加载失败：${message}`;
}

async function refreshQuote() {
	try {
		updateLoadingState(true);
		const data = await fetchQuote();
		renderQuote(data);
		updateLoadingState(false);
	} catch (error) {
		updateLoadingState(false);
		renderError(error.message || "未知错误");
	}
}

window.addEventListener("load", () => {
	const refreshBtn = document.getElementById("joRefreshBtn");
	refreshBtn.addEventListener("click", refreshQuote);
	refreshQuote();
});
