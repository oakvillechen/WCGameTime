import urllib.request
from bs4 import BeautifulSoup
import re
import json
import ssl
import time

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# Mapping exact Wikipedia page suffixes
TEAM_MAPPING = {
    "MEX": ("Mexico", "Mexico_national_football_team"),
    "RSA": ("South Africa", "South_Africa_national_soccer_team"),
    "KOR": ("South Korea", "South_Korea_national_football_team"),
    "CZE": ("Czechia", "Czech_Republic_national_football_team"),
    "CAN": ("Canada", "Canada_men's_national_soccer_team"),
    "BIH": ("Bosnia & Herzegovina", "Bosnia_and_Herzegovina_national_football_team"),
    "QAT": ("Qatar", "Qatar_national_football_team"),
    "SUI": ("Switzerland", "Switzerland_national_football_team"),
    "BRA": ("Brazil", "Brazil_national_football_team"),
    "MAR": ("Morocco", "Morocco_national_football_team"),
    "HAI": ("Haiti", "Haiti_national_football_team"),
    "SCO": ("Scotland", "Scotland_national_football_team"),
    "USA": ("United States", "United_States_men's_national_soccer_team"),
    "PAR": ("Paraguay", "Paraguay_national_football_team"),
    "AUS": ("Australia", "Australia_men's_national_soccer_team"),
    "TUR": ("Türkiye", "Turkey_national_football_team"),
    "GER": ("Germany", "Germany_national_football_team"),
    "CUW": ("Curaçao", "Cura%C3%A7ao_national_football_team"),
    "CIV": ("Côte d'Ivoire", "Ivory_Coast_national_football_team"),
    "ECU": ("Ecuador", "Ecuador_national_football_team"),
    "NED": ("Netherlands", "Netherlands_national_football_team"),
    "JPN": ("Japan", "Japan_national_football_team"),
    "SWE": ("Sweden", "Sweden_national_football_team"),
    "TUN": ("Tunisia", "Tunisia_national_football_team"),
    "BEL": ("Belgium", "Belgium_national_football_team"),
    "EGY": ("Egypt", "Egypt_national_football_team"),
    "IRN": ("Iran", "Iran_national_football_team"),
    "NZL": ("New Zealand", "New_Zealand_national_football_team"),
    "ESP": ("Spain", "Spain_national_football_team"),
    "CPV": ("Cape Verde", "Cape_Verde_national_football_team"),
    "KSA": ("Saudi Arabia", "Saudi_Arabia_national_football_team"),
    "URU": ("Uruguay", "Uruguay_national_football_team"),
    "FRA": ("France", "France_national_football_team"),
    "SEN": ("Senegal", "Senegal_national_football_team"),
    "IRQ": ("Iraq", "Iraq_national_football_team"),
    "NOR": ("Norway", "Norway_national_football_team"),
    "ARG": ("Argentina", "Argentina_national_football_team"),
    "ALG": ("Algeria", "Algeria_national_football_team"),
    "AUT": ("Austria", "Austria_national_football_team"),
    "JOR": ("Jordan", "Jordan_national_football_team"),
    "POR": ("Portugal", "Portugal_national_football_team"),
    "COD": ("DR Congo", "DR_Congo_national_football_team"),
    "UZB": ("Uzbekistan", "Uzbekistan_national_football_team"),
    "COL": ("Colombia", "Colombia_national_football_team"),
    "ENG": ("England", "England_national_football_team"),
    "CRO": ("Croatia", "Croatia_national_football_team"),
    "GHA": ("Ghana", "Ghana_national_football_team"),
    "PAN": ("Panama", "Panama_national_football_team"),
}

# The existing metadata for each team (group, confed, lat, lng, flag)
with open("src/data/teams.js", "r") as f:
    original_js = f.read()

# Very naive extraction of the existing team block structure to preserve coords/group
import ast

def fetch_roster(wiki_slug):
    url = f"https://en.wikipedia.org/wiki/{wiki_slug}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    roster = []
    try:
        html = urllib.request.urlopen(req, context=ctx).read()
        soup = BeautifulSoup(html, 'html.parser')
        squad_header = soup.find(id='Current_squad')
        if not squad_header:
            squad_header = soup.find(id='Players')
            
        if squad_header:
            table = squad_header.find_parent().find_next_sibling('table', {'class': 'sortable'})
            if not table:
                curr = squad_header.parent.next_sibling
                while curr:
                    if curr.name == 'table' and 'sortable' in curr.get('class', []):
                        table = curr
                        break
                    curr = curr.next_sibling
            
            if table:
                rows = table.find_all('tr')
                for row in rows[1:27]: # top 26 players
                    cols = row.find_all(['td', 'th'])
                    if len(cols) >= 6:
                        no_text = cols[0].text.strip()
                        no = int(no_text) if no_text.isdigit() else 0
                        pos = cols[1].text.strip().replace('GK', 'GK').replace('DF', 'DF').replace('MF', 'MF').replace('FW', 'FW')
                        
                        # clean name
                        name_cell = cols[2]
                        if name_cell.find('a'):
                            name = name_cell.find('a').text.strip()
                        else:
                            name = name_cell.text.strip()
                        name = re.sub(r'\[.*?\]', '', name)
                        
                        age_text = cols[3].text.strip()
                        # Extract year and age
                        # e.g., (1985-07-13) 13 July 1985 (age 40)
                        birth_year_match = re.search(r'\b(19\d{2}|20\d{2})\b', age_text)
                        age_match = re.search(r'age\s*(\d+)', age_text)
                        
                        birthYear = int(birth_year_match.group(1)) if birth_year_match else None
                        age = int(age_match.group(1)) if age_match else None
                        
                        goals_text = cols[5].text.strip()
                        goals = int(goals_text) if goals_text.isdigit() else 0
                        
                        club_cell = cols[6] if len(cols)>6 else None
                        if club_cell:
                            club = club_cell.text.strip().split('\n')[0]
                            club = re.sub(r'\[.*?\]', '', club)
                        else:
                            club = ""
                            
                        # Basic height fallback (since it's not always in table)
                        height = "-"
                        
                        roster.append({
                            "number": no,
                            "name": name,
                            "pos": pos,
                            "club": club,
                            "age": age,
                            "birthYear": birthYear,
                            "height": height,
                            "goals": goals
                        })
    except Exception as e:
        print(f"Error fetching {wiki_slug}: {e}")
        
    return roster

# Load current data structure
team_meta = {}
for line in original_js.split('\n'):
    match = re.search(r'^\s*([A-Z]{3}):\s*\{\s*id:\s*"[^"]*",\s*name:\s*"[^"]*",\s*flag:\s*"[^"]*",\s*confed:\s*"[^"]*",\s*group:\s*"[^"]*",\s*lat:\s*[-.\d]+,\s*lng:\s*[-.\d]+', line)
    if match:
        id = match.group(1)
        team_meta[id] = line.split("roster:")[0] + "roster: [\n"

print("Starting fetch...")
final_output = "export const teams = {\n"
for idx, (team_id, (team_name, wiki_slug)) in enumerate(TEAM_MAPPING.items()):
    print(f"[{idx+1}/48] Fetching {team_name}...")
    roster = fetch_roster(wiki_slug)
    
    # If fetch failed or returned nothing, fallback to mock 1 player
    if not roster:
        roster = [{"number": 1, "name": "Unknown Player", "pos": "GK", "club": "Unknown", "age": 0, "birthYear": 0, "height": "-", "goals": 0}]
        
    final_output += team_meta[team_id]
    for i, p in enumerate(roster):
        comma = "," if i < len(roster)-1 else ""
        final_output += f'    {{ number: {p["number"]}, name: "{p["name"]}", pos: "{p["pos"]}", club: "{p["club"]}", age: {p["age"] or "null"}, birthYear: {p["birthYear"] or "null"}, height: "{p["height"]}", goals: {p["goals"]} }}{comma}\n'
    
    is_last = idx == len(TEAM_MAPPING)-1
    final_output += "  ]}" + ("," if not is_last else "") + "\n"
    
    time.append = 1 # fast fetch
    time.sleep(0.5)

final_output += "};\n"

with open("src/data/teams.js", "w") as f:
    f.write(final_output)

print("Done generating teams.js!")
