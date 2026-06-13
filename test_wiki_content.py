import urllib.request
import json
import ssl
from bs4 import BeautifulSoup

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://en.wikipedia.org/w/api.php?action=parse&page=2026_FIFA_World_Cup_squads&format=json"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req, context=ctx) as response:
        data = json.loads(response.read().decode())
        if 'parse' in data:
            html = data['parse']['text']['*']
            soup = BeautifulSoup(html, 'html.parser')
            print("Page title:", soup.title)
            # Find the first few h3 headers (teams)
            for h in soup.find_all('h3')[:5]:
                print(h.text)
        else:
            print("No parse data")
except Exception as e:
    print("Error:", e)
