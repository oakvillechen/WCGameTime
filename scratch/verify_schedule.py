import urllib.request
import ssl
import re
import datetime
from bs4 import BeautifulSoup

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# 1. Parse teams.js to map team names to FIFA codes
team_name_to_fifa = {}
with open("src/data/teams.js", "r") as f:
    teams_content = f.read()
    
matches = re.finditer(r'([A-Z]{3}):\s*\{\s*id:\s*"[^"]*",\s*name:\s*"([^"]*)"', teams_content)
for m in matches:
    fifa = m.group(1)
    name = m.group(2)
    team_name_to_fifa[name] = fifa
    
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

# 2. Parse matches.js to get the local list of matches
with open("src/data/matches.js", "r") as f:
    matches_content = f.read()

match_objs = []
matches_blocks = re.findall(r'\{\s*"id":\s*(\d+),\s*"date":\s*"([^"]*)",\s*"group":\s*"([^"]*)",\s*"home":\s*"([^"]*)",\s*"away":\s*"([^"]*)",\s*"venue":\s*"([^"]*)"', matches_content)
for m in matches_blocks:
    match_objs.append({
        "id": int(m[0]),
        "date": m[1],
        "group": m[2],
        "home": m[3],
        "away": m[4],
        "venue": m[5]
    })

print(f"Loaded {len(match_objs)} matches from matches.js")

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
    date_str = date_str.replace('\xa0', ' ').strip()
    time_str = time_str.replace('\xa0', ' ').replace('−', '-').replace('—', '-').strip()
    
    date_match = re.search(r'(\d{4}-\d{2}-\d{2})', date_str)
    if date_match:
        dt = datetime.datetime.strptime(date_match.group(1), "%Y-%m-%d")
    else:
        dt = datetime.datetime.strptime(date_str, "%B %d, %Y")
        
    m = re.search(r'(\d+):(\d+)\s*(a\.m\.|p\.m\.)?\s*UTC([+-]\d+)', time_str, re.IGNORECASE)
    if not m:
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

wiki_matches = []
groups = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"]

print("Fetching official schedule from Wikipedia...")
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
                
                utc_date = parse_to_utc(date_text, time_text)
                
                venue_text = fright.text.strip() if fright else ""
                venue_id = "unknown"
                for v_name, v_id in venue_mapping.items():
                    if v_name in venue_text:
                        venue_id = v_id
                        break
                        
                wiki_matches.append({
                    "date": utc_date,
                    "home": home_fifa,
                    "away": away_fifa,
                    "venue": venue_id,
                    "group": g,
                    "raw_venue": venue_text.split(',')[0].strip()
                })
    except Exception as e:
        print(f"Error fetching Group {g}: {e}")

print(f"Parsed {len(wiki_matches)} matches from Wikipedia")

# Compare schedule
discrepancies = []
for idx, w_match in enumerate(wiki_matches):
    local_match = None
    for l_match in match_objs:
        if (l_match["home"] == w_match["home"] and l_match["away"] == w_match["away"]):
            local_match = l_match
            break
            
    if not local_match:
        discrepancies.append(f"Match not found in matches.js: {w_match['home']} vs {w_match['away']} (Group {w_match['group']})")
    else:
        w_date = w_match["date"]
        l_date = local_match["date"]
        
        w_venue = w_match["venue"]
        l_venue = local_match["venue"]
        
        diffs = []
        if w_date != l_date:
            diffs.append(f"Date mismatch: local={l_date}, wiki={w_date}")
        if w_venue != l_venue:
            diffs.append(f"Venue mismatch: local={l_venue}, wiki={w_venue} ({w_match['raw_venue']})")
            
        if diffs:
            discrepancies.append(f"Match {local_match['id']} ({local_match['home']} vs {local_match['away']}): " + ", ".join(diffs))

if discrepancies:
    print(f"\nFound {len(discrepancies)} discrepancies:")
    for d in discrepancies:
        print(f" - {d}")
else:
    print("\nNo discrepancies found! Schedule matches FIFA official exactly.")
