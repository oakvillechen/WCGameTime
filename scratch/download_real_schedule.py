import urllib.request
import ssl
import re
import datetime
from bs4 import BeautifulSoup

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# 1. Map team names to FIFA codes from teams.js
team_name_to_fifa = {}
with open("src/data/teams.js", "r") as f:
    teams_content = f.read()

matches = re.finditer(r'([A-Z]{3}):\s*\{\s*id:\s*"[^"]*",\s*name:\s*"([^"]*)"', teams_content)
for m in matches:
    fifa = m.group(1)
    name = m.group(2)
    team_name_to_fifa[name] = fifa

# Manual overrides for name variations on Wikipedia
team_name_to_fifa["Czechia"] = "CZE"
team_name_to_fifa["Czech Republic"] = "CZE"
team_name_to_fifa["United States"] = "USA"
team_name_to_fifa["Bosnia and Herzegovina"] = "BIH"
team_name_to_fifa["Bosnia & Herzegovina"] = "BIH"
team_name_to_fifa["Côte d'Ivoire"] = "CIV"
team_name_to_fifa["Ivory Coast"] = "CIV"
team_name_to_fifa["Curaçao"] = "CUW"
team_name_to_fifa["DR Congo"] = "COD"
team_name_to_fifa["Türkiye"] = "TUR"
team_name_to_fifa["Turkey"] = "TUR"

# Venue mappings
venue_mapping = {
    "Estadio Azteca": "mexico_city",
    "Estadio Akron": "guadalajara",
    "Estadio BBVA": "monterrey",
    "BMO Field": "toronto",
    "BC Place": "vancouver",
    "MetLife Stadium": "new_york",
    "SoFi Stadium": "los_angeles",
    "AT&T Stadium": "dallas",
    "Mercedes-Benz Stadium": "atlanta",
    "NRG Stadium": "houston",
    "Lincoln Financial Field": "philadelphia",
    "Hard Rock Stadium": "miami",
    "Lumen Field": "seattle",
    "Levi's Stadium": "san_francisco",
    "Arrowhead Stadium": "kansas_city",
    "GEHA Field": "kansas_city",
    "Gillette Stadium": "boston"
}

def clean_team_name(name):
    name = re.sub(r'\[.*?\]', '', name)
    name = name.strip()
    return name

def parse_to_utc(date_str, time_str):
    # Standardize spaces and unicode minus signs
    date_str = date_str.replace('\xa0', ' ').strip()
    time_str = time_str.replace('\xa0', ' ').replace('−', '-').replace('—', '-').strip()
    
    # Parse Date
    date_match = re.search(r'(\d{4}-\d{2}-\d{2})', date_str)
    if date_match:
        dt = datetime.datetime.strptime(date_match.group(1), "%Y-%m-%d")
    else:
        # e.g., "June 11, 2026"
        dt = datetime.datetime.strptime(date_str, "%B %d, %Y")
        
    # Parse Time & Timezone offset
    # Matches: "1:00 p.m. UTC-6" or "8:00 p.m. UTC-4" or "20:00 UTC-5"
    m = re.search(r'(\d+):(\d+)\s*(a\.m\.|p\.m\.)?\s*UTC([+-]\d+)', time_str, re.IGNORECASE)
    if not m:
        # Try without offset, just UTC
        m = re.search(r'(\d+):(\d+)\s*(a\.m\.|p\.m\.)?\s*UTC', time_str, re.IGNORECASE)
        if m:
            hour = int(m.group(1))
            minute = int(m.group(2))
            ampm = m.group(3)
            if ampm:
                ampm = ampm.lower().replace('.', '')
                if ampm == 'pm' and hour < 12: hour += 12
                elif ampm == 'am' and hour == 12: hour = 0
            offset_hours = 0
        else:
            # Fallback to noon local time
            hour, minute, offset_hours = 12, 0, 0
    else:
        hour = int(m.group(1))
        minute = int(m.group(2))
        ampm = m.group(3)
        if ampm:
            ampm = ampm.lower().replace('.', '')
            if ampm == 'pm' and hour < 12: hour += 12
            elif ampm == 'am' and hour == 12: hour = 0
        offset_hours = int(m.group(4))
        
    dt = dt.replace(hour=hour, minute=minute)
    utc_dt = dt - datetime.timedelta(hours=offset_hours)
    return utc_dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")

groups = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"]
all_matches = []

print("Scraping groups A to L...")
for g in groups:
    url = f"https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_Group_{g}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            html = response.read().decode()
            soup = BeautifulSoup(html, 'html.parser')
            boxes = soup.find_all(class_='footballbox')
            for box in boxes:
                fdate = box.find(class_='fdate')
                ftime = box.find(class_='ftime')
                fhome = box.find(class_='fhome')
                faway = box.find(class_='faway')
                fright = box.find(class_='fright')
                
                date_text = fdate.text.strip() if fdate else ""
                time_text = ftime.text.strip() if ftime else ""
                
                home_name = clean_team_name(fhome.text) if fhome else ""
                away_name = clean_team_name(faway.text) if faway else ""
                
                home_fifa = team_name_to_fifa.get(home_name)
                away_fifa = team_name_to_fifa.get(away_name)
                
                if not home_fifa or not away_fifa:
                    print(f"Warning: Could not map teams: {home_name} ({home_fifa}) vs {away_name} ({away_fifa})")
                    continue
                    
                utc_date = parse_to_utc(date_text, time_text)
                
                venue_text = fright.text.strip() if fright else ""
                venue_id = "unknown"
                for v_name, v_id in venue_mapping.items():
                    if v_name in venue_text:
                        venue_id = v_id
                        break
                
                all_matches.append({
                    "date": utc_date,
                    "group": g,
                    "home": home_fifa,
                    "away": away_fifa,
                    "venue": venue_id,
                    "stage": "Group Stage",
                    "score": None
                })
    except Exception as e:
        print(f"Error fetching Group {g}: {e}")

print(f"Scraped {len(all_matches)} matches.")

# Sort chronologically by date/time
all_matches.sort(key=lambda x: x["date"])

# Format output as JS ES Module
js_output = "export const matches = [\n"
for idx, m in enumerate(all_matches):
    m_id = idx + 1
    comma = "," if idx < len(all_matches) - 1 else ""
    js_output += f'  {{\n'
    js_output += f'    "id": {m_id},\n'
    js_output += f'    "date": "{m["date"]}",\n'
    js_output += f'    "group": "{m["group"]}",\n'
    js_output += f'    "home": "{m["home"]}",\n'
    js_output += f'    "away": "{m["away"]}",\n'
    js_output += f'    "venue": "{m["venue"]}",\n'
    js_output += f'    "stage": "{m["stage"]}",\n'
    js_output += f'    "score": null\n'
    js_output += f'  }}{comma}\n'
js_output += "];\n"

# Overwrite matches.js
with open("src/data/matches.js", "w") as f:
    f.write(js_output)

print("Successfully generated src/data/matches.js with the official schedule!")
