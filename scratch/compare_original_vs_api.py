import urllib.request
import json
import ssl
import re

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

# 2. Parse matches.js (currently restored to 33e4970)
with open("src/data/matches.js", "r") as f:
    matches_content = f.read()

local_matches = {}
matches_blocks = re.findall(r'\{\s*"id":\s*(\d+),\s*"date":\s*"([^"]*)",\s*"group":\s*"([^"]*)",\s*"home":\s*"([^"]*)",\s*"away":\s*"([^"]*)",\s*"venue":\s*"([^"]*)"', matches_content)
for m in matches_blocks:
    local_matches[int(m[0])] = {
        "id": int(m[0]),
        "date": m[1],
        "group": m[2],
        "home": m[3],
        "away": m[4],
        "venue": m[5]
    }

# 3. Load teams from API to build ID -> FIFA map
api_team_fifa = {}
url_teams = "https://worldcup26.ir/get/teams"
req_teams = urllib.request.Request(url_teams, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req_teams, context=ctx) as response:
        t_data = json.loads(response.read().decode())
        for t in t_data['teams']:
            api_team_fifa[int(t['id'])] = t['fifa_code']
except Exception as e:
    print("Error fetching teams:", e)

# 4. Load games from API and compare
url_games = "https://worldcup26.ir/get/games"
req_games = urllib.request.Request(url_games, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req_games, context=ctx) as response:
        g_data = json.loads(response.read().decode())
        games = g_data['games']
        print(f"API has {len(games)} games. local_matches has {len(local_matches)} matches.")
        
        discrepancies = []
        for g in games:
            g_id = int(g['id'])
            # Only check group stage (1 to 72)
            if g_id > 72:
                continue
                
            home_fifa = api_team_fifa.get(int(g['home_team_id']), "UNK")
            away_fifa = api_team_fifa.get(int(g['away_team_id']), "UNK")
            
            l_match = local_matches.get(g_id)
            if not l_match:
                discrepancies.append(f"Match ID {g_id} not found in local_matches")
            else:
                # Compare teams
                if (l_match['home'] != home_fifa or l_match['away'] != away_fifa) and \
                   (l_match['home'] != away_fifa or l_match['away'] != home_fifa):
                    discrepancies.append(f"Match ID {g_id} teams mismatch: local={l_match['home']} vs {l_match['away']}, API={home_fifa} vs {away_fifa}")
                    
        if discrepancies:
            print(f"Found {len(discrepancies)} discrepancies between local matches and API games:")
            for d in discrepancies[:20]:
                print(" -", d)
        else:
            print("All local match IDs match the API game pairings perfectly!")
except Exception as e:
    print("Error fetching games:", e)
