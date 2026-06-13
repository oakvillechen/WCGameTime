import urllib.request
from bs4 import BeautifulSoup
import re

import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://en.wikipedia.org/wiki/Mexico_national_football_team"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    html = urllib.request.urlopen(req, context=ctx).read()
    soup = BeautifulSoup(html, 'html.parser')
    squad_header = soup.find(id='Current_squad')
    if squad_header:
        table = squad_header.find_parent().find_next_sibling('table', {'class': 'sortable'})
        if not table:
            # Try next elements
            curr = squad_header.parent.next_sibling
            while curr:
                if curr.name == 'table' and 'sortable' in curr.get('class', []):
                    table = curr
                    break
                curr = curr.next_sibling

        if table:
            rows = table.find_all('tr')
            print(f"Found {len(rows)-1} players!")
            for row in rows[1:4]: # skip header
                cols = row.find_all(['td', 'th'])
                if len(cols) >= 6:
                    no = cols[0].text.strip()
                    pos = cols[1].text.strip()
                    name = cols[2].text.strip()
                    
                    # Clean up name (remove references like [1])
                    name = re.sub(r'\[.*?\]', '', name)
                    # Get age/birth year from cols[3]
                    age_text = cols[3].text.strip()
                    
                    caps = cols[4].text.strip()
                    goals = cols[5].text.strip()
                    club = cols[6].text.strip() if len(cols)>6 else ""
                    print(f"{no} - {pos} - {name} - AgeText: {age_text} - Goals: {goals} - {club}")
        else:
            print("Table not found")
except Exception as e:
    print("Error:", e)
