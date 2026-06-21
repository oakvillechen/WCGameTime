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
            for g in data['games']:
                h = int(g['home_team_id'])
                a = int(g['away_team_id'])
                if (h == 22 and a == 24) or (h == 24 and a == 22):
                    print(f"Match found in API: ID={g['id']}, Group={g['group']}, Home={h}, Away={a}, Date={g['local_date']}, Stadium={g['stadium_id']}, Score={g['home_score']}-{g['away_score']}")
        else:
            print("No games in response")
except Exception as e:
    print("Error:", e)
