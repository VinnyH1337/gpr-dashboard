const csvFile = "data.csv";

const state = {
  rows: [],
  dates: [],
  selectedIndex: 0,
  selectedCountry: null,
  mapMode: "index",
};

const els = {
  selectedValue: document.querySelector("#selected-value"),
  latestDate: document.querySelector("#latest-date"),
  selectedDate: document.querySelector("#selected-date"),
  dateSlider: document.querySelector("#date-slider"),
  dateSelect: document.querySelector("#date-select"),
  mapMode: document.querySelector("#map-mode"),
  selectedCountryName: document.querySelector("#selected-country-name"),
  selectedCountryValue: document.querySelector("#selected-country-value"),
  selectedCountrySeries: document.querySelector("#selected-country-series"),
  valueHeading: document.querySelector("#value-heading"),
  topCountries: document.querySelector("#top-countries"),
  countryTitle: document.querySelector("#country-title"),
};

init();

async function init() {
  const text = await fetch(csvFile).then((response) => response.text());
  state.rows = parseCsv(text).filter((row) => row.date && row.iso3);
  state.dates = [...new Set(state.rows.map((row) => row.date))].sort();

  if (!state.rows.length) {
    renderEmpty();
    return;
  }

  state.selectedIndex = state.dates.length - 1;
  state.selectedCountry = rowsForDate(state.dates[state.selectedIndex])[0] || state.rows[0];
  setupControls();
  updateDate(state.selectedIndex);
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length <= 1) return [];
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
  });
}

function setupControls() {
  els.dateSlider.disabled = false;
  els.dateSelect.disabled = false;
  els.dateSlider.max = String(state.dates.length - 1);

  const options = document.createDocumentFragment();
  state.dates.forEach((date, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = date;
    options.appendChild(option);
  });
  els.dateSelect.appendChild(options);

  els.dateSlider.addEventListener("input", (event) => updateDate(Number(event.target.value)));
  els.dateSelect.addEventListener("change", (event) => updateDate(Number(event.target.value)));
  els.mapMode.addEventListener("change", (event) => {
    state.mapMode = event.target.value;
    updateDate(state.selectedIndex);
  });
}

function updateDate(index) {
  state.selectedIndex = index;
  const date = state.dates[index];
  const rows = rowsForDate(date);

  els.dateSlider.value = String(index);
  els.dateSelect.value = String(index);
  els.selectedDate.textContent = date;
  els.latestDate.textContent = `Data through ${state.dates.at(-1)}`;

  if (!rows.some((row) => row.country === state.selectedCountry?.country)) {
    state.selectedCountry = rows[0];
  }

  renderMap(rows);
  renderTable(rows);
  renderSelected(rows);
  renderGlobalChart();
  renderCountryChart();
}

function rowsForDate(date) {
  return state.rows.filter((row) => row.date === date).sort((a, b) => valueOf(b) - valueOf(a));
}

function valueOf(row) {
  return state.mapMode === "share" ? numeric(row.raw_share) : numeric(row.index);
}

function renderMap(rows) {
  const trace = {
    type: "choropleth",
    locationmode: "ISO-3",
    locations: rows.map((row) => row.iso3),
    z: rows.map((row) => valueOf(row)),
    text: rows.map((row) => row.country),
    customdata: rows.map((row) => [row.country, row.iso3]),
    colorscale: [
      [0, "#f7eee7"],
      [0.25, "#edc3a5"],
      [0.5, "#df855e"],
      [0.75, "#c84b36"],
      [1, "#7f1d1d"],
    ],
    zmin: 0,
    zmax: Math.max(1, ...rows.map((row) => valueOf(row))),
    marker: { line: { color: "#ffffff", width: 0.35 } },
    colorbar: { title: state.mapMode === "share" ? "Raw share" : "Index", thickness: 12, len: 0.72 },
    hovertemplate: "<b>%{text}</b><br>Value: %{z:.2f}<extra></extra>",
  };

  Plotly.react("world-map", [trace], mapLayout(), { displayModeBar: false, responsive: true });
  document.querySelector("#world-map").on("plotly_click", (event) => {
    const country = event.points?.[0]?.customdata?.[0];
    const row = rows.find((item) => item.country === country);
    if (!row) return;
    state.selectedCountry = row;
    renderSelected(rows);
    renderCountryChart();
  });
}

function mapLayout() {
  return {
    margin: { t: 0, r: 0, b: 0, l: 0 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    geo: {
      projection: { type: "natural earth" },
      showframe: false,
      showcoastlines: false,
      showland: true,
      landcolor: "#e8ece7",
      bgcolor: "rgba(0,0,0,0)",
      lataxis: { range: [-55, 85] },
    },
  };
}

function renderTable(rows) {
  els.valueHeading.textContent = state.mapMode === "share" ? "Share" : "Index";
  els.topCountries.innerHTML = "";
  rows.slice(0, 12).forEach((row) => {
    const tr = document.createElement("tr");
    tr.classList.toggle("is-selected", row.country === state.selectedCountry?.country);
    tr.innerHTML = `<td>${row.country}</td><td>${formatNumber(valueOf(row))}</td>`;
    tr.addEventListener("click", () => {
      state.selectedCountry = row;
      renderSelected(rows);
      renderCountryChart();
      renderTable(rows);
    });
    els.topCountries.appendChild(tr);
  });
}

function renderSelected(rows) {
  const row = rows.find((item) => item.country === state.selectedCountry?.country) || rows[0];
  if (!row) return;
  state.selectedCountry = row;
  els.selectedValue.textContent = formatNumber(valueOf(row));
  els.selectedCountryName.textContent = row.country;
  els.selectedCountryValue.textContent = formatNumber(valueOf(row));
  els.selectedCountrySeries.textContent = `${row.iso3} | ${row.country_gpr_articles || 0} country GPR articles`;
}

function renderGlobalChart() {
  const y = state.dates.map((date) => {
    const rows = rowsForDate(date);
    return rows.reduce((sum, row) => sum + numeric(row.country_gpr_articles), 0);
  });
  const markerY = y[state.selectedIndex] || 0;

  Plotly.react(
    "global-chart",
    [
      { x: state.dates, y, type: "scatter", mode: "lines", line: { color: "#1f6f78", width: 2 } },
      { x: [state.dates[state.selectedIndex]], y: [markerY], type: "scatter", mode: "markers", marker: { color: "#b9342a", size: 9 } },
    ],
    smallLayout("GPR country-article count"),
    smallConfig(),
  );
}

function renderCountryChart() {
  const country = state.selectedCountry?.country;
  if (!country) return;
  els.countryTitle.textContent = `${country} over time`;
  const y = state.dates.map((date) => {
    const row = state.rows.find((item) => item.date === date && item.country === country);
    return row ? valueOf(row) : 0;
  });

  Plotly.react(
    "country-chart",
    [
      { x: state.dates, y, type: "scatter", mode: "lines", line: { color: "#b9342a", width: 2 } },
      { x: [state.dates[state.selectedIndex]], y: [y[state.selectedIndex] || 0], type: "scatter", mode: "markers", marker: { color: "#1f6f78", size: 9 } },
    ],
    smallLayout(country),
    smallConfig(),
  );
}

function renderEmpty() {
  renderEmptyMap();
  Plotly.react("global-chart", [], smallLayout("No data"), smallConfig());
  Plotly.react("country-chart", [], smallLayout("No data"), smallConfig());
}

function renderEmptyMap() {
  Plotly.react(
    "world-map",
    [{ type: "choropleth", locationmode: "ISO-3", locations: [], z: [] }],
    mapLayout(),
    { displayModeBar: false, responsive: true },
  );
}

function smallLayout(title) {
  return {
    margin: { t: 8, r: 18, b: 38, l: 48 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    showlegend: false,
    xaxis: { showgrid: false, zeroline: false },
    yaxis: { title, gridcolor: "#edf0ec", zeroline: false },
  };
}

function smallConfig() {
  return { displayModeBar: false, responsive: true };
}

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatNumber(value) {
  return numeric(value).toLocaleString("en", { maximumFractionDigits: 2 });
}
