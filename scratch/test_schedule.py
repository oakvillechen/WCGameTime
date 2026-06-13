import urllib.request
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures?country=&wtw-filter=ALL"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'})
try:
    html = urllib.request.urlopen(req, context=ctx).read().decode('utf-8', errors='ignore')
    print("Length:", len(html))
    if len(html) < 10000:
        print(html[:1000])
    else:
        print("Large HTML received. Checking for __NEXT_DATA__ or matches...")
        if '__NEXT_DATA__' in html:
            print("Found __NEXT_DATA__")
        else:
            print("No __NEXT_DATA__ found.")
except Exception as e:
    print("Error:", e)
