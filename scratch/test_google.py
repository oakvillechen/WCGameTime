import urllib.request
from bs4 import BeautifulSoup
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# Use a generic User-Agent to avoid getting completely blocked, but simple enough to get a basic HTML
url = "https://www.google.com/search?q=world+cup+scores+today"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
try:
    html = urllib.request.urlopen(req, context=ctx).read()
    soup = BeautifulSoup(html, 'html.parser')
    
    # Try to find common sports widget classes
    scores = soup.select('.imso_mh__score, .imspo_mt__scr')
    if scores:
        print("Found scores via standard classes:")
        for s in scores:
            print(s.text)
    else:
        print("No standard classes found. Looking for ' - ' or similar text in span/div")
        # Just dump a bit of the text to see if scores are there
        text = soup.get_text()
        print("Length of text:", len(text))
        print(text[1000:2000])
except Exception as e:
    print("Error:", e)
