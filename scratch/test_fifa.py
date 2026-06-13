import urllib.request
from bs4 import BeautifulSoup
import re
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://api.allorigins.win/get?url=https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/match-center"
try:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    response = urllib.request.urlopen(req, context=ctx).read()
    data = json.loads(response)
    html = data.get('contents', '')
    soup = BeautifulSoup(html, 'html.parser')
    next_data = soup.find('script', id='__NEXT_DATA__')
    if next_data:
        print("Found __NEXT_DATA__")
    else:
        print("No next data found")
except Exception as e:
    print("Error:", e)
