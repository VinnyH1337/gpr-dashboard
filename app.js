const csvFile = "data.csv";
const marketFile = "market_reactions.json";
const marketMonthlyFile = "market_monthly.json";

const iso3ByCountry = {
  USA: "USA",
  Russia: "RUS",
  Israel: "ISR",
  Vietnam: "VNM",
  Iraq: "IRQ",
  UK: "GBR",
  China: "CHN",
  Iran: "IRN",
  France: "FRA",
  Palestine: "PSE",
  Germany: "DEU",
  Syria: "SYR",
  Egypt: "EGY",
  "Saudi Arabia": "SAU",
  Afghanistan: "AFG",
  Pakistan: "PAK",
  Serbia: "SRB",
  Lebanon: "LBN",
  India: "IND",
  Cuba: "CUB",
  Japan: "JPN",
  Bosnia: "BIH",
  "North Korea": "PRK",
  Turkey: "TUR",
  "South Africa": "ZAF",
  Ukraine: "UKR",
  "South Korea": "KOR",
  Jordan: "JOR",
  Canada: "CAN",
  Libya: "LBY",
  Cambodia: "KHM",
  Italy: "ITA",
  Mexico: "MEX",
  Nicaragua: "NIC",
  Ireland: "IRL",
  Poland: "POL",
  Algeria: "DZA",
  Nigeria: "NGA",
  Greece: "GRC",
  "El Salvador": "SLV",
  Zimbabwe: "ZWE",
  Colombia: "COL",
  Spain: "ESP",
  Argentina: "ARG",
  Croatia: "HRV",
  Indonesia: "IDN",
  Philippines: "PHL",
  Laos: "LAO",
  Kuwait: "KWT",
  Venezuela: "VEN",
  Somalia: "SOM",
  Thailand: "THA",
  Haiti: "HTI",
  Congo: "COG",
  Sudan: "SDN",
  Yemen: "YEM",
  Taiwan: "TWN",
  Brazil: "BRA",
  DRC: "COD",
  Ethiopia: "ETH",
  Czechia: "CZE",
  Angola: "AGO",
  Belgium: "BEL",
  Australia: "AUS",
  Rwanda: "RWA",
  Portugal: "PRT",
  Chile: "CHL",
  "Sri Lanka": "LKA",
  Peru: "PER",
  Panama: "PAN",
  Honduras: "HND",
  Kenya: "KEN",
  Netherlands: "NLD",
  Uganda: "UGA",
  Myanmar: "MMR",
  Guatemala: "GTM",
  Cyprus: "CYP",
  Georgia: "GEO",
  "Dominican Republic": "DOM",
  Malaysia: "MYS",
  Morocco: "MAR",
  Hungary: "HUN",
  Albania: "ALB",
  Bangladesh: "BGD",
  Tanzania: "TZA",
  Liberia: "LBR",
  Sweden: "SWE",
  Romania: "ROU",
  Zambia: "ZMB",
  Tunisia: "TUN",
  UAE: "ARE",
  "Costa Rica": "CRI",
  Bolivia: "BOL",
  Norway: "NOR",
  Ghana: "GHA",
  Azerbaijan: "AZE",
  Armenia: "ARM",
  Austria: "AUT",
  Mozambique: "MOZ",
  Chad: "TCD",
  Switzerland: "CHE",
  Lithuania: "LTU",
  Denmark: "DNK",
  Qatar: "QAT",
  Burundi: "BDI",
  Ecuador: "ECU",
  "Sierra Leone": "SLE",
  "New Zealand": "NZL",
  Macedonia: "MKD",
  Bulgaria: "BGR",
  "Ivory Coast": "CIV",
  Belarus: "BLR",
  Eritrea: "ERI",
  "South Sudan": "SSD",
  Namibia: "NAM",
  Nepal: "NPL",
  Guinea: "GIN",
  Estonia: "EST",
  Uzbekistan: "UZB",
  Uruguay: "URY",
  Bahrain: "BHR",
  Singapore: "SGP",
  Latvia: "LVA",
  Kazakhstan: "KAZ",
  Mali: "MLI",
  Finland: "FIN",
  Grenada: "GRD",
  "East Timor": "TLS",
  Senegal: "SEN",
  Slovenia: "SVN",
  Tajikistan: "TJK",
  Jamaica: "JAM",
  Montenegro: "MNE",
  Kyrgyzstan: "KGZ",
  "Central African Republic": "CAF",
  Niger: "NER",
  Guyana: "GUY",
  Paraguay: "PRY",
  Moldova: "MDA",
  Oman: "OMN",
  Cameroon: "CMR",
  Mauritania: "MRT",
  Botswana: "BWA",
  Slovakia: "SVK",
  Iceland: "ISL",
  Togo: "TGO",
  "Burkina Faso": "BFA",
  Fiji: "FJI",
  Malta: "MLT",
  Malawi: "MWI",
};

const monthFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const state = {
  rows: [],
  dates: [],
  countries: [],
  countryStats: new Map(),
  marketReactions: [],
  marketMonthly: {},
  absoluteMax: 1,
  mapMode: "percentile",
  marketMode: "monthly",
  selectedIndex: 0,
  selectedEventId: null,
  selectedCountry: null,
  mapClickBound: false,
};

const els = {
  globalValue: document.querySelector("#global-value"),
  latestDate: document.querySelector("#latest-date"),
  selectedMonth: document.querySelector("#selected-month"),
  monthSlider: document.querySelector("#month-slider"),
  monthSelect: document.querySelector("#month-select"),
  mapMode: document.querySelector("#map-mode"),
  eventSelect: document.querySelector("#event-select"),
  topCountries: document.querySelector("#top-countries"),
  valueHeading: document.querySelector("#value-heading"),
  countryTitle: document.querySelector("#country-title"),
  selectedCountryName: document.querySelector("#selected-country-name"),
  selectedCountryValue: document.querySelector("#selected-country-value"),
  selectedCountrySeries: document.querySelector("#selected-country-series"),
  marketTitle: document.querySelector("#market-title"),
  marketMeta: document.querySelector("#market-meta"),
  marketMode: document.querySelector("#market-mode"),
  marketWindow: document.querySelector("#market-window"),
  marketReactions: document.querySelector("#market-reactions"),
};

init();

async function init() {
  try {
    const [text, marketText, marketMonthlyText] = await Promise.all([
      fetch(csvFile).then((response) => {
        if (!response.ok) throw new Error(`Could not load ${csvFile}`);
        return response.text();
      }),
      fetch(marketFile).then((response) => {
        if (!response.ok) return "[]";
        return response.text();
      }),
      fetch(marketMonthlyFile).then((response) => {
        if (!response.ok) return "{}";
        return response.text();
      }),
    ]);

    state.rows = parseCsv(text);
    state.marketReactions = JSON.parse(marketText);
    state.marketMonthly = JSON.parse(marketMonthlyText);
    state.dates = state.rows.map((row) => row.Date);
    state.countries = getCountries(state.rows[0]);
    state.absoluteMax = maxCountryValue(state.rows, state.countries);
    state.countryStats = buildCountryStats(state.rows, state.countries);
    state.selectedIndex = state.rows.length - 1;
    state.selectedCountry = state.countries.find((country) => country.name === "USA") || state.countries[0];
    els.latestDate.textContent = `Data through ${formatMonth(state.dates.at(-1))}`;

    setupControls();
    renderGlobalChart();
    renderCountryChart();
    updateMonth(state.selectedIndex);
    setupResize();
  } catch (error) {
    document.body.innerHTML = `<main class="note"><h1>Dashboard could not load</h1><p>${error.message}</p></main>`;
  }
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",");

  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });
}

function getCountries(row) {
  return Object.keys(row)
    .filter((column) => column.endsWith("_all"))
    .map((column) => {
      const name = column.replace(/_all$/, "");
      return {
        name,
        column,
        iso3: iso3ByCountry[name],
      };
    })
    .filter((country) => country.iso3);
}

function getMapPoints(row, index) {
  return state.countries.map((country) => getMapPoint(country, row, index));
}

function getMapPoint(country, row, index) {
  const raw = numeric(row[country.column]);
  const stats = state.countryStats.get(country.name);
  let value = raw;
  let shortValue = formatNumber(raw);
  let displayValue = `Raw country GPR: ${formatNumber(raw)}`;
  let detail = "Raw _all level";

  if (state.mapMode === "percentile") {
    value = percentileRank(stats.sorted, raw);
    shortValue = `${formatNumber(value)} pct`;
    displayValue = `Own-history percentile: ${formatNumber(value)}`;
    detail = "Compared with this country's full sample";
  }

  return {
    country,
    raw,
    value,
    shortValue,
    displayValue,
    detail,
  };
}

function mapViewConfig() {
  if (state.mapMode === "raw") {
    return {
      legend: "Raw _all",
      tableHeading: "Raw",
      zmin: 0,
      zmax: state.absoluteMax,
    };
  }

  return {
    legend: "Own-history<br>percentile",
    tableHeading: "Percentile",
    zmin: 0,
    zmax: 100,
  };
}

function setupControls() {
  els.monthSlider.max = String(state.rows.length - 1);
  els.monthSlider.value = String(state.selectedIndex);

  const options = document.createDocumentFragment();
  state.dates.forEach((date, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = formatMonth(date);
    options.appendChild(option);
  });
  els.monthSelect.appendChild(options);
  els.monthSelect.value = String(state.selectedIndex);

  const eventOptions = document.createDocumentFragment();
  state.marketReactions.forEach((event) => {
    const index = state.dates.indexOf(event.month);
    if (index === -1) return;
    const option = document.createElement("option");
    option.value = event.id;
    option.textContent = `${event.label} (${formatMonth(event.date)})`;
    eventOptions.appendChild(option);
  });
  els.eventSelect.appendChild(eventOptions);

  els.monthSlider.addEventListener("input", (event) => {
    state.marketMode = "monthly";
    els.marketMode.value = state.marketMode;
    updateMonth(Number(event.target.value));
  });

  els.monthSelect.addEventListener("change", (event) => {
    state.marketMode = "monthly";
    els.marketMode.value = state.marketMode;
    updateMonth(Number(event.target.value));
  });

  els.eventSelect.addEventListener("change", (event) => {
    if (!event.target.value) return;
    const selectedEvent = findMarketEvent(event.target.value);
    if (!selectedEvent) return;
    const index = state.dates.indexOf(selectedEvent.month);
    if (index === -1) return;
    state.marketMode = "event";
    els.marketMode.value = state.marketMode;
    updateMonth(index, selectedEvent.id);
  });

  els.mapMode.addEventListener("change", (event) => {
    state.mapMode = event.target.value;
    renderMap(state.rows[state.selectedIndex]);
    renderTopCountries(state.rows[state.selectedIndex]);
    renderSelectedCountryValue(state.rows[state.selectedIndex]);
  });

  els.marketMode.addEventListener("change", (event) => {
    state.marketMode = event.target.value;
    renderMarketReactions();
  });
}

function syncEventSelect(index, eventId = null) {
  const selectedDate = state.dates[index];
  const matchingEvent = eventId
    ? findMarketEvent(eventId)
    : state.marketReactions.find((event) => event.month === selectedDate);
  state.selectedEventId = matchingEvent?.month === selectedDate ? matchingEvent.id : null;
  els.eventSelect.value = state.selectedEventId || "";
}

function updateMonth(index, eventId = null) {
  state.selectedIndex = index;
  const row = state.rows[index];

  els.monthSlider.value = String(index);
  els.monthSelect.value = String(index);
  syncEventSelect(index, eventId);
  els.selectedMonth.textContent = formatMonth(row.Date);
  els.globalValue.textContent = formatNumber(row.GPR_AI);

  renderMap(row);
  renderTopCountries(row);
  renderGlobalMarker(row);
  renderCountryMarker(row);
  renderSelectedCountryValue(row);
  renderMarketReactions();
}

function renderMap(row) {
  const points = getMapPoints(row, state.selectedIndex);
  const view = mapViewConfig();

  const trace = {
    type: "choropleth",
    locationmode: "ISO-3",
    locations: points.map((point) => point.country.iso3),
    z: points.map((point) => point.value),
    text: points.map((point) => point.country.name),
    customdata: points.map((point) => [
      point.country.name,
      point.country.column,
      point.raw,
      point.displayValue,
      point.detail,
    ]),
    colorscale: [
      [0, "#f7eee7"],
      [0.25, "#edc3a5"],
      [0.5, "#df855e"],
      [0.75, "#c84b36"],
      [1, "#7f1d1d"],
    ],
    zmin: view.zmin,
    zmax: view.zmax,
    marker: {
      line: {
        color: "#ffffff",
        width: 0.35,
      },
    },
    colorbar: {
      title: view.legend,
      thickness: 12,
      len: 0.72,
    },
    hovertemplate:
      "<b>%{text}</b><br>Series: %{customdata[1]}<br>%{customdata[3]}<br>Raw GPR: %{customdata[2]:.2f}<br>%{customdata[4]}<extra></extra>",
  };

  const layout = {
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

  Plotly.react("world-map", [trace], layout, {
    displayModeBar: false,
    responsive: true,
  });

  const map = document.querySelector("#world-map");
  if (!state.mapClickBound) {
    map.on("plotly_click", (event) => {
      const clicked = event.points?.[0]?.customdata;
      if (!clicked) return;
      const country = state.countries.find((item) => item.name === clicked[0]);
      if (!country) return;
      selectCountry(country);
    });
    state.mapClickBound = true;
  }
}

function renderTopCountries(row) {
  const top = getMapPoints(row, state.selectedIndex)
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);

  els.valueHeading.textContent = mapViewConfig().tableHeading;
  els.topCountries.innerHTML = "";
  top.forEach((point) => {
    const tr = document.createElement("tr");
    tr.classList.toggle("is-selected", point.country.name === state.selectedCountry?.name);
    tr.innerHTML = `<td>${point.country.name}</td><td>${point.shortValue}</td>`;
    tr.addEventListener("click", () => {
      selectCountry(point.country);
    });
    els.topCountries.appendChild(tr);
  });
}

function selectCountry(country) {
  state.selectedCountry = country;
  renderCountryChart();
  renderCountryMarker(state.rows[state.selectedIndex]);
  renderSelectedCountryValue(state.rows[state.selectedIndex]);
  renderTopCountries(state.rows[state.selectedIndex]);
}

function renderSelectedCountryValue(row) {
  if (!state.selectedCountry) return;
  const point = getMapPoint(state.selectedCountry, row, state.selectedIndex);
  els.selectedCountryName.textContent = state.selectedCountry.name;
  els.selectedCountryValue.textContent = point.shortValue;
  els.selectedCountrySeries.textContent = `${state.selectedCountry.column} | raw ${formatNumber(point.raw)}`;
}

function renderMarketReactions() {
  if (state.marketMode === "monthly") {
    renderMonthlyMarketReturns();
    return;
  }

  const event = findMarketEvent(state.selectedEventId);
  els.marketReactions.innerHTML = "";

  if (!event) {
    els.marketTitle.textContent = "Event market reaction";
    els.marketMeta.textContent = "Choose an event shortcut to show the event-window reaction.";
    els.marketWindow.textContent = "Previous close to fifth trading close";
    return;
  }

  els.marketTitle.textContent = event.label;
  els.marketMeta.textContent = `${formatExactDate(event.date)} | GPR map month: ${formatMonth(event.month)}`;
  els.marketWindow.textContent = "Previous close to fifth trading close";

  event.markets.forEach((market) => {
    const tr = document.createElement("tr");
    const changeClass = market.available
      ? market.changePct >= 0
        ? "change-positive"
        : "change-negative"
      : "";
    const change = market.available ? `${formatSigned(market.changePct)}%` : "n/a";
    const window = market.available ? `${market.beforeDate} to ${market.afterDate}` : "n/a";

    tr.innerHTML = `
      <td>${market.group}</td>
      <td>${market.country}</td>
      <td>${market.index}</td>
      <td class="${changeClass}">${change}</td>
      <td>${window}</td>
    `;
    els.marketReactions.appendChild(tr);
  });
}

function renderMonthlyMarketReturns() {
  const date = state.dates[state.selectedIndex];
  const rows = state.marketMonthly[date] || [];
  els.marketReactions.innerHTML = "";
  els.marketTitle.textContent = `Stock-index returns in ${formatMonth(date)}`;
  els.marketMeta.textContent = "G7 and E7 headline stock indices for the selected GPR month.";
  els.marketWindow.textContent = "Previous month-end close to selected month-end close";

  if (!rows.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="5">No market data available for this month.</td>`;
    els.marketReactions.appendChild(tr);
    return;
  }

  rows.forEach((market) => {
    const tr = document.createElement("tr");
    const changeClass = market.available
      ? market.changePct >= 0
        ? "change-positive"
        : "change-negative"
      : "";
    const change = market.available ? `${formatSigned(market.changePct)}%` : "n/a";
    const window = market.available ? `${market.beforeDate} to ${market.afterDate}` : "n/a";

    tr.innerHTML = `
      <td>${market.group}</td>
      <td>${market.country}</td>
      <td>${market.index}</td>
      <td class="${changeClass}">${change}</td>
      <td>${window}</td>
    `;
    els.marketReactions.appendChild(tr);
  });
}

function findMarketEvent(id) {
  return state.marketReactions.find((event) => event.id === id) || null;
}

function renderGlobalChart() {
  const trace = {
    x: state.dates,
    y: state.rows.map((row) => numeric(row.GPR_AI)),
    type: "scatter",
    mode: "lines",
    line: { color: "#1f6f78", width: 2 },
    hovertemplate: "%{x|%b %Y}<br>Global AI GPR: %{y:.2f}<extra></extra>",
  };

  const marker = {
    x: [state.dates[state.selectedIndex]],
    y: [numeric(state.rows[state.selectedIndex].GPR_AI)],
    type: "scatter",
    mode: "markers",
    marker: { color: "#b9342a", size: 9 },
    hovertemplate: "%{x|%b %Y}<br>Selected: %{y:.2f}<extra></extra>",
  };

  Plotly.react("global-chart", [trace, marker], smallLayout("Global AI GPR"), smallConfig());
}

function renderGlobalMarker(row) {
  Plotly.restyle("global-chart", {
    x: [[row.Date]],
    y: [[numeric(row.GPR_AI)]],
  }, [1]);
}

function renderCountryChart() {
  const country = state.selectedCountry;
  els.countryTitle.textContent = `${country.name} over time`;

  const trace = {
    x: state.dates,
    y: state.rows.map((row) => numeric(row[country.column])),
    type: "scatter",
    mode: "lines",
    line: { color: "#b9342a", width: 2 },
    hovertemplate: `%{x|%b %Y}<br>${country.name}: %{y:.2f}<extra></extra>`,
  };

  const marker = {
    x: [state.dates[state.selectedIndex]],
    y: [numeric(state.rows[state.selectedIndex][country.column])],
    type: "scatter",
    mode: "markers",
    marker: { color: "#1f6f78", size: 9 },
    hovertemplate: "%{x|%b %Y}<br>Selected: %{y:.2f}<extra></extra>",
  };

  Plotly.react("country-chart", [trace, marker], smallLayout(country.name), smallConfig());
}

function renderCountryMarker(row) {
  if (!state.selectedCountry) return;
  Plotly.restyle("country-chart", {
    x: [[row.Date]],
    y: [[numeric(row[state.selectedCountry.column])]],
  }, [1]);
}

function smallLayout(title) {
  return {
    margin: { t: 8, r: 18, b: 38, l: 48 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    showlegend: false,
    xaxis: {
      showgrid: false,
      zeroline: false,
    },
    yaxis: {
      title,
      gridcolor: "#edf0ec",
      zeroline: false,
    },
  };
}

function smallConfig() {
  return {
    displayModeBar: false,
    responsive: true,
  };
}

function setupResize() {
  window.addEventListener("resize", () => {
    Plotly.Plots.resize(document.querySelector("#world-map"));
    Plotly.Plots.resize(document.querySelector("#global-chart"));
    Plotly.Plots.resize(document.querySelector("#country-chart"));
  });
}

function buildCountryStats(rows, countries) {
  const stats = new Map();

  countries.forEach((country) => {
    const values = rows.map((row) => numeric(row[country.column]));
    const sorted = [...values].sort((a, b) => a - b);

    stats.set(country.name, {
      values,
      sorted,
    });
  });

  return stats;
}

function percentileRank(sorted, value) {
  let low = 0;
  let high = sorted.length;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (sorted[mid] <= value) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return (low / sorted.length) * 100;
}

function maxCountryValue(rows, countries) {
  let max = 1;
  rows.forEach((row) => {
    countries.forEach((country) => {
      max = Math.max(max, numeric(row[country.column]));
    });
  });
  return max;
}

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatNumber(value) {
  return numeric(value).toLocaleString("en", {
    maximumFractionDigits: 1,
  });
}

function formatSigned(value) {
  const number = numeric(value);
  return `${number > 0 ? "+" : ""}${number.toLocaleString("en", {
    maximumFractionDigits: 1,
  })}`;
}

function formatMonth(dateText) {
  return monthFormatter.format(new Date(`${dateText}T00:00:00Z`));
}

function formatExactDate(dateText) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateText}T00:00:00Z`));
}
