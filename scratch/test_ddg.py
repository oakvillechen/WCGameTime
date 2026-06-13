import urllib.request
from bs4 import BeautifulSoup
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://html.duckduckgo.com/html/?q=south+korea+vs+czechia+football+score"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    html = urllib.request.urlopen(req, context=ctx).read()
    soup = BeautifulSoup(html, 'html.parser')
    text = soup.get_text()
    print("Length of text:", len(text))
    print(text[:1000])
except Exception as e:
    print("Error:", e)
