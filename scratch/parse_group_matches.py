import urllib.request
import ssl
import re
from bs4 import BeautifulSoup

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_Group_A"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req, context=ctx) as response:
        html = response.read().decode()
        soup = BeautifulSoup(html, 'html.parser')
        boxes = soup.find_all(class_='footballbox')
        for idx, box in enumerate(boxes):
            fdate = box.find(class_='fdate')
            ftime = box.find(class_='ftime')
            fhome = box.find(class_='fhome')
            faway = box.find(class_='faway')
            
            date_text = fdate.text.strip() if fdate else ""
            time_text = ftime.text.strip() if ftime else ""
            home_text = fhome.text.strip() if fhome else ""
            away_text = faway.text.strip() if faway else ""
            
            print(f"Match {idx+1}: {home_text} vs {away_text}")
            print(f"  Date raw: {repr(date_text)}")
            print(f"  Time raw: {repr(time_text)}")
except Exception as e:
    print("Error:", e)
