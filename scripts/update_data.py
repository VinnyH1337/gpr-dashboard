#!/usr/bin/env python3
import csv
import json
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
COUNTRY_CSV_URL = "https://www.matteoiacoviello.com/ai_gpr_files/ai_gpr_country_monthly.csv"

EVENTS = [
    {"id": "cuban_missile_crisis", "label": "Cuban Missile Crisis", "date": "1962-10-16", "month": "1962-10-01"},
    {"id": "kuwait_invasion", "label": "Iraq invades Kuwait", "date": "1990-08-02", "month": "1990-08-01"},
    {"id": "gulf_war_begins", "label": "Gulf War begins", "date": "1991-01-17", "month": "1991-01-01"},
    {"id": "september_11", "label": "9/11 attacks", "date": "2001-09-11", "month": "2001-09-01"},
    {"id": "iraq_invasion", "label": "Iraq invasion", "date": "2003-03-20", "month": "2003-03-01"},
    {"id": "lehman_collapse", "label": "Lehman Brothers collapse", "date": "2008-09-15", "month": "2008-09-01"},
    {"id": "arab_spring", "label": "Arab Spring", "date": "2011-01-14", "month": "2011-01-01"},
    {"id": "crimea_annexation", "label": "Crimea annexation", "date": "2014-03-18", "month": "2014-03-01"},
    {"id": "brexit_referendum", "label": "Brexit referendum", "date": "2016-06-24", "month": "2016-06-01"},
    {"id": "covid_pandemic", "label": "Covid-19 pandemic declaration", "date": "2020-03-11", "month": "2020-03-01"},
    {"id": "ukraine_invasion", "label": "Russia invasion of Ukraine", "date": "2022-02-24", "month": "2022-03-01"},
    {"id": "israel_hamas_war", "label": "Israel-Hamas war", "date": "2023-10-07", "month": "2023-10-01"},
    {"id": "iran_israel_escalation", "label": "Iran-Israel escalation", "date": "2024-04-13", "month": "2024-04-01"},
    {"id": "israel_strikes_iran", "label": "Israel strikes Iran", "date": "2025-06-13", "month": "2025-06-01"},
    {"id": "us_strikes_iran", "label": "U.S. strikes Iran nuclear sites", "date": "2025-06-22", "month": "2025-06-01"},
]

INDICES = [
    {"group": "G7", "country": "United States", "index": "S&P 500", "symbol": "^GSPC"},
    {"group": "G7", "country": "Canada", "index": "S&P/TSX Composite", "symbol": "^GSPTSE"},
    {"group": "G7", "country": "United Kingdom", "index": "FTSE 100", "symbol": "^FTSE"},
    {"group": "G7", "country": "France", "index": "CAC 40", "symbol": "^FCHI"},
    {"group": "G7", "country": "Germany", "index": "DAX", "symbol": "^GDAXI"},
    {"group": "G7", "country": "Italy", "index": "FTSE MIB", "symbol": "FTSEMIB.MI"},
    {"group": "G7", "country": "Japan", "index": "Nikkei 225", "symbol": "^N225"},
    {"group": "E7", "country": "China", "index": "Shanghai Composite", "symbol": "000001.SS"},
    {"group": "E7", "country": "India", "index": "Nifty 50", "symbol": "^NSEI"},
    {"group": "E7", "country": "Brazil", "index": "Bovespa", "symbol": "^BVSP"},
    {"group": "E7", "country": "Mexico", "index": "IPC Mexico", "symbol": "^MXX"},
    {"group": "E7", "country": "Russia", "index": "MOEX Russia", "symbol": "IMOEX.ME"},
    {"group": "E7", "country": "Indonesia", "index": "Jakarta Composite", "symbol": "^JKSE"},
    {"group": "E7", "country": "Turkey", "index": "BIST 100", "symbol": "XU100.IS"},
]


def fetch_text(url):
    request = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(request, timeout=60) as response:
        return response.read().decode("utf-8")


def unix(date_text):
    return int(datetime.fromisoformat(date_text).replace(tzinfo=timezone.utc).timestamp())


def yahoo_daily(symbol):
    start = unix("1959-12-01")
    end = int((datetime.now(timezone.utc) + timedelta(days=10)).timestamp())
    url = (
        "https://query1.finance.yahoo.com/v8/finance/chart/"
        f"{quote(symbol, safe='')}?period1={start}&period2={end}&interval=1d"
    )
    data = json.loads(fetch_text(url))
    result = (data.get("chart", {}).get("result") or [None])[0]
    if not result:
        return []

    timestamps = result.get("timestamp") or []
    closes = ((result.get("indicators") or {}).get("quote") or [{}])[0].get("close") or []
    rows = []
    for timestamp, close in zip(timestamps, closes):
        if close is None:
            continue
        date = datetime.fromtimestamp(timestamp, timezone.utc).date().isoformat()
        rows.append({"date": date, "month": f"{date[:7]}-01", "close": float(close)})
    return rows


def market_stub(index, available):
    return {
        "group": index["group"],
        "country": index["country"],
        "index": index["index"],
        "symbol": index["symbol"],
        "available": available,
    }


def add_change(item, before, after):
    item.update(
        {
            "beforeDate": before["date"],
            "afterDate": after["date"],
            "beforeClose": round(before["close"], 4),
            "afterClose": round(after["close"], 4),
            "changePct": round(((after["close"] / before["close"]) - 1) * 100, 2),
        }
    )


def event_reaction(index, prices, event_date):
    before = next((row for row in reversed(prices) if row["date"] < event_date), None)
    after_rows = [row for row in prices if row["date"] >= event_date]
    after = after_rows[4] if len(after_rows) >= 5 else (after_rows[-1] if after_rows else None)
    item = market_stub(index, bool(before and after))
    if before and after:
        add_change(item, before, after)
    return item


def monthly_returns(index, prices, months):
    last_by_month = {}
    for row in prices:
        last_by_month[row["month"]] = row

    returns = {}
    last_before = None
    for month in months:
        current = last_by_month.get(month)
        item = market_stub(index, bool(last_before and current))
        if last_before and current:
            add_change(item, last_before, current)
        returns[month] = item
        if current:
            last_before = current
    return returns


def main():
    country_csv = fetch_text(COUNTRY_CSV_URL)
    (ROOT / "data.csv").write_text(country_csv, encoding="utf-8")

    months = [row["Date"] for row in csv.DictReader(country_csv.splitlines())]
    prices_by_symbol = {}
    for index in INDICES:
        prices_by_symbol[index["symbol"]] = yahoo_daily(index["symbol"])
        time.sleep(0.2)

    event_data = []
    for event in EVENTS:
        markets = [
            event_reaction(index, prices_by_symbol[index["symbol"]], event["date"])
            for index in INDICES
        ]
        event_data.append({**event, "markets": markets})

    monthly_data = {month: [] for month in months}
    for index in INDICES:
        returns = monthly_returns(index, prices_by_symbol[index["symbol"]], months)
        for month in months:
            monthly_data[month].append(returns[month])

    (ROOT / "market_reactions.json").write_text(
        json.dumps(event_data, separators=(",", ":")), encoding="utf-8"
    )
    (ROOT / "market_monthly.json").write_text(
        json.dumps(monthly_data, separators=(",", ":")), encoding="utf-8"
    )


if __name__ == "__main__":
    main()
