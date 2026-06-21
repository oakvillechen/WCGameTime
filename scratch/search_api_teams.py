import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://worldcup26.ir/get/teams"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req, context=ctx) as response:
        data = json.loads(response.read().decode())
        if 'teams' in data:
            print(f"API returned {len(data['teams'])} teams.")
            for t in data['teams']:
                print(f"ID: {t['id']}, Name: {t['name_en']}, FIFA: {t['fifa_code']}")
        else:
            print("No teams in response")
except Exception as e:
    print("Error:", e)
