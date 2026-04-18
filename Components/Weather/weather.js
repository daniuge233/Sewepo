function normalizeText(value) {
	return String(value || "").trim().toLowerCase();
}

function scoreLocationMatch(query, location) {
	const normalizedQuery = normalizeText(query);
	const fields = [location?.name, location?.adm2, location?.adm1, location?.country]
		.map(normalizeText)
		.filter(Boolean);

	let score = 0;

	fields.forEach((field, index) => {
		const weight = index === 0 ? 100 : index === 1 ? 70 : index === 2 ? 45 : 10;

		if (field === normalizedQuery) {
			score += weight;
		} else if (field.startsWith(normalizedQuery) || normalizedQuery.startsWith(field)) {
			score += weight * 0.7;
		} else if (field.includes(normalizedQuery) || normalizedQuery.includes(field)) {
			score += weight * 0.45;
		}
	});

	const rank = Number(location?.rank);
	if (Number.isFinite(rank)) {
		score += Math.max(0, 40 - rank * 0.8);
	}

	if (location?.type === "city") {
		score += 8;
	}

	return score;
}

function pickBestLocation(city, locations) {
	if (!Array.isArray(locations) || locations.length === 0) {
		throw new Error("未查询到城市信息");
	}

	return locations
		.map((location) => ({
			location,
			score: scoreLocationMatch(city, location)
		}))
		.sort((left, right) => right.score - left.score)[0].location;
}

async function fetchJson(url, params) {
	const endpoint = new URL(url);
	Object.entries(params).forEach(([key, value]) => {
		endpoint.searchParams.set(key, value);
	});

	const response = await fetch(endpoint.toString(), {
		headers: {
			Accept: "application/json"
		}
	});

	if (!response.ok) {
		throw new Error(`请求失败: ${response.status}`);
	}

	return response.json();
}

function formatWeekday(dateString) {
	const date = new Date(dateString);
	return ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][date.getDay()];
}

function formatDate(dateString) {
	const date = new Date(dateString);
	return `${date.getMonth() + 1}/${date.getDate()}`;
}

function setIcon(element, iconCode) {
	element.className = `weather-icon qi-${iconCode || "999"}`;
}

function getPrecipText(day) {
	if (day?.pop !== undefined && day?.pop !== null && day?.pop !== "") {
		return `${day.pop}%`;
	}

	if (day?.precip !== undefined && day?.precip !== null && day?.precip !== "") {
		return `${day.precip} mm`;
	}

	return "--";
}

function getUvText(day) {
	if (day?.uvIndex !== undefined && day?.uvIndex !== null && day?.uvIndex !== "") {
		return String(day.uvIndex);
	}

	return "--";
}

function createForecastItem(day) {
	const item = document.createElement("div");
	item.className = "forecast-item sw-panel";
	item.innerHTML = `
		<span class="forecast-weekday">${formatWeekday(day.fxDate)}</span>
		<span class="forecast-date">${formatDate(day.fxDate)}</span>
		<i class="forecast-icon qi-${day.iconDay || "999"}" aria-hidden="true"></i>
		<span class="forecast-text">${day.textDay || "未知"}</span>
		<span class="forecast-temp">${day.tempMin}° / ${day.tempMax}°</span>
		<span class="forecast-precip">降水 ${getPrecipText(day)}</span>
		<span class="forecast-uv">紫外线 ${getUvText(day)}</span>
	`;
	return item;
}

function renderWeather(cityInfo, forecast) {
	const today = forecast[0];
	const upcoming = forecast.slice(1, 7);

	document.getElementById("weatherCity").textContent = `${cityInfo.name}${cityInfo.adm1 ? ` · ${cityInfo.adm1}` : ""}`;
	document.getElementById("weatherText").textContent = today.textDay || "未知天气";
	document.getElementById("weatherPrecip").textContent = `降水 ${getPrecipText(today)}`;
	document.getElementById("weatherUv").textContent = `紫外线 ${getUvText(today)}`;
	document.getElementById("weatherTemp").textContent = `${today.tempMin}° / ${today.tempMax}°`;
	setIcon(document.getElementById("weatherIcon"), today.iconDay);

	const forecastList = document.getElementById("forecastList");
	forecastList.innerHTML = "";
	upcoming.forEach((day) => {
		forecastList.appendChild(createForecastItem(day));
	});
}

function renderError(message) {
	document.getElementById("weatherCity").textContent = "天气加载失败";
	document.getElementById("weatherText").textContent = message;
	document.getElementById("weatherPrecip").textContent = "降水 --";
	document.getElementById("weatherUv").textContent = "紫外线 --";
	document.getElementById("weatherTemp").textContent = "-- / --";
	setIcon(document.getElementById("weatherIcon"), "999");
	document.getElementById("forecastList").innerHTML = "";
}

async function initWeather() {
	try {
		const configResponse = await fetch("./config.json", { cache: "no-store" });
		if (!configResponse.ok) {
			throw new Error("无法读取天气配置");
		}

		const config = await configResponse.json();
		const city = config?.City;
		const geoApi = config?.GeoAPI;
		const baseUrl = config?.BaseURL;
		const apiKey = config?.API_Key;

		if (!city || !geoApi || !baseUrl || !apiKey) {
			throw new Error("天气配置不完整");
		}

		const geoData = await fetchJson(geoApi, {
			location: city,
			key: apiKey
		});

		if (geoData.code !== "200") {
			throw new Error(`城市查询失败: ${geoData.code}`);
		}

		const cityInfo = pickBestLocation(city, geoData.location);
		const weatherData = await fetchJson(baseUrl, {
			location: cityInfo.id,
			key: apiKey
		});

		if (weatherData.code !== "200" || !Array.isArray(weatherData.daily)) {
			throw new Error(`天气查询失败: ${weatherData.code || "unknown"}`);
		}

		renderWeather(cityInfo, weatherData.daily.slice(0, 7));
	} catch (error) {
		console.error(error);
		renderError(error.message || "无法获取天气数据");
	}
}

window.addEventListener("load", initWeather);
