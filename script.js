const API_KEY = "12cefbe785acf2c59fc5c5ee9fab7279"; 

const searchBtn = document.getElementById("searchBtn");
const searchInput = document.getElementById("searchInput");
const weatherResult = document.getElementById("weatherResult");
const geoBtn = document.getElementById("geoBtn");
const recentToggle = document.getElementById("recentToggle");
const recentList = document.getElementById("recentList");
const alertsContainer = document.getElementById("alerts");
const modal = document.getElementById("modal");
const modalMsg = document.getElementById("modalMsg");
const modalClose = document.getElementById("modalClose");

let recentCities = JSON.parse(localStorage.getItem("recentCities") || "[]");
let baseTodayTempC = null;
let todayUnit = "C";

searchBtn.addEventListener("click", () => {
  const city = searchInput.value.trim();
  if (!city) {
    showPopup("Please enter a city name.");
    return;
  }
  fetchWeather(city);
});

geoBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    showPopup("Geolocation not supported.");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
    () => showPopup("Unable to retrieve your location.")
  );
});

recentToggle.addEventListener("click", () => {
  recentList.classList.toggle("hidden");
});
document.addEventListener("click", (e) => {
  if (!recentToggle.contains(e.target) && !recentList.contains(e.target)) {
    recentList.classList.add("hidden");
  }
});
modalClose.addEventListener("click", () => modal.classList.add("hidden"));

renderRecentList();

async function fetchWeather(city) {
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${API_KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (res.ok) {
      renderCurrentWeather(data);
      fetchForecast(city);
      pushRecentCity(data.name);
    } else {
      showPopup(data.message);
    }
  } catch (err) {
    showPopup("Error fetching weather.");
  }
}

async function fetchWeatherByCoords(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (res.ok) {
      renderCurrentWeather(data);
      fetchForecast(data.name);
      pushRecentCity(data.name);
    } else {
      showPopup(data.message);
    }
  } catch (err) {
    showPopup("Error fetching weather.");
  }
}

function renderCurrentWeather(data) {
  baseTodayTempC = data.main.temp;
  todayUnit = "C";

  weatherResult.innerHTML = `
    <div class="p-4 bg-white rounded shadow">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold">${data.name}, ${data.sys.country}</h2>
        <button id="unitToggle" class="px-2 py-1 border rounded text-sm">°F</button>
      </div>
      <p class="text-gray-600 capitalize">${data.weather[0].description}</p>
      <div class="flex items-center gap-4 mt-2">
        <img src="https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png" />
        <p id="tempToday" class="text-3xl font-bold">${Math.round(baseTodayTempC)}°C</p>
      </div>
      <p>Humidity: ${data.main.humidity}% | Wind: ${data.wind.speed} m/s</p>
    </div>
  `;

  alertsContainer.innerHTML = "";
  if (baseTodayTempC >= 40) {
    appendAlert("Extreme Heat Alert: ≥ 40°C", "red");
  } else if (baseTodayTempC <= 0) {
    appendAlert("Extreme Cold Alert: ≤ 0°C", "blue");
  }

  setBackgroundForWeather(data.weather[0].main);

  document.getElementById("unitToggle").addEventListener("click", toggleUnitForToday);
}

async function fetchForecast(city) {
  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${API_KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (res.ok) {
      renderForecast(data);
    } else {
      document.getElementById("forecastGrid").innerHTML = `<p class="text-red-500">${data.message}</p>`;
    }
  } catch (err) {
    document.getElementById("forecastGrid").innerHTML = `<p class="text-red-500">Error loading forecast.</p>`;
  }
}

function renderForecast(data) {
  const forecastGrid = document.getElementById("forecastGrid");
  forecastGrid.innerHTML = "";

  const daily = {};
  data.list.forEach(item => {
    const date = item.dt_txt.split(" ")[0];
    if (!daily[date]) daily[date] = [];
    daily[date].push(item);
  });

  const dates = Object.keys(daily).slice(0, 5);

  dates.forEach(date => {
    const items = daily[date];
    const midday = items.find(i => i.dt_txt.includes("12:00:00")) || items[Math.floor(items.length/2)];

    forecastGrid.innerHTML += `
      <div class="p-4 bg-white rounded shadow text-center">
        <h3 class="font-bold">${new Date(date).toDateString()}</h3>
        <img src="https://openweathermap.org/img/wn/${midday.weather[0].icon}@2x.png" class="mx-auto" />
        <p class="text-lg font-semibold">${Math.round(midday.main.temp)}°C</p>
        <p class="text-gray-600 text-sm capitalize">${midday.weather[0].description}</p>
        <p class="text-xs">Humidity: ${midday.main.humidity}% | Wind: ${midday.wind.speed} m/s</p>
      </div>
    `;
  });
}

function pushRecentCity(city) {
  const normalized = city.trim();
  recentCities = recentCities.filter(c => c.toLowerCase() !== normalized.toLowerCase());
  recentCities.unshift(normalized);
  if (recentCities.length > 5) recentCities.pop();
  localStorage.setItem("recentCities", JSON.stringify(recentCities));
  renderRecentList();
}

function renderRecentList() {
  recentList.innerHTML = "";
  if (recentCities.length === 0) {
    recentList.innerHTML = `<div class="p-2 text-gray-500 text-sm">No recent searches</div>`;
    return;
  }
  recentCities.forEach(city => {
    const el = document.createElement("div");
    el.className = "px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm";
    el.textContent = city;
    el.addEventListener("click", () => {
      recentList.classList.add("hidden");
      fetchWeather(city);
    });
    recentList.appendChild(el);
  });
  const clearBtn = document.createElement("div");
  clearBtn.className = "px-3 py-2 border-t text-sm text-red-600 cursor-pointer";
  clearBtn.textContent = "Clear recent";
  clearBtn.addEventListener("click", () => {
    recentCities = [];
    localStorage.removeItem("recentCities");
    renderRecentList();
  });
  recentList.appendChild(clearBtn);
}

function toggleUnitForToday() {
  const tempToday = document.getElementById("tempToday");
  const unitToggle = document.getElementById("unitToggle");
  if (!tempToday) return;

  if (todayUnit === "C") {
    const f = Math.round((baseTodayTempC * 9) / 5 + 32);
    tempToday.textContent = `${f}°F`;
    unitToggle.textContent = "°C";
    todayUnit = "F";
  } else {
    tempToday.textContent = `${Math.round(baseTodayTempC)}°C`;
    unitToggle.textContent = "°F";
    todayUnit = "C";
  }
}

function appendAlert(msg, color) {
  const el = document.createElement("div");
  el.className = `p-2 rounded text-sm ${color === "red" ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}`;
  el.textContent = msg;
  alertsContainer.appendChild(el);
}

function setBackgroundForWeather(main) {
  document.body.classList.remove("bg-sunny","bg-cloudy","bg-rainy","bg-clear");
  const m = main.toLowerCase();
  if (m.includes("rain") || m.includes("drizzle") || m.includes("thunder")) {
    document.body.classList.add("bg-rainy");
  } else if (m.includes("cloud")) {
    document.body.classList.add("bg-cloudy");
  } else if (m.includes("clear") || m.includes("sun")) {
    document.body.classList.add("bg-sunny");
  } else {
    document.body.classList.add("bg-clear");
  }
}

function showPopup(message) {
  modalMsg.textContent = message;
  modal.classList.remove("hidden");
}
