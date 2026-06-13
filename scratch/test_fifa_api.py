import urllib.request
import ssl
import json

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# Try to guess the FIFA api endpoint
urls_to_test = [
    "https://api.fifa.com/api/v3/calendar/matches?language=en&count=500&idCompetition=2000000100", # Old API format
    "https://api.fifa.com/api/v3/matches",
]

for url in urls_to_test:
    print("Testing:", url)
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        response = urllib.request.urlopen(req, context=ctx).read()
        print("Success! Length:", len(response))
    except Exception as e:
        print("Error:", e)
