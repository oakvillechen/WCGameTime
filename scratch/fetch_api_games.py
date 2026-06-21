import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://worldcup26.ir/get/games"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req, context=ctx) as response:
        data = json.loads(response.read().decode())
        if 'games' in data:
            print("Keys:", list(data['games'][0].keys()))
            for g in data['games'][:10]:
                print(f"ID: {g.get('id')}, Group: {g.get('group')}, HomeID: {g.get('home_team_id')}, AwayID: {g.get('away_team_id')}, Date: {g.get('local_date')}, Stadium: {g.get('stadium_id')}, HomeScore: {g.get('home_score')}, AwayScore: {g.get('away_score')}, Finished: {g.get('finished')}")
        else:
            print("No games in response")
except Exception as e:
    print("Error:", e)
