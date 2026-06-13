const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
    await page.goto('https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures?country=&wtw-filter=ALL', { waitUntil: 'networkidle2' });
    
    await new Promise(r => setTimeout(r, 5000));

    const content = await page.evaluate(() => {
      const nextData = document.getElementById('__NEXT_DATA__');
      if (nextData) {
         return JSON.parse(nextData.textContent);
      }
      return null;
    });
    
    if (content) {
       console.log("Found NEXT_DATA with keys:", Object.keys(content));
       if (content.props && content.props.pageProps && content.props.pageProps.pageData) {
           const blocks = content.props.pageProps.pageData.blocks || [];
           console.log("Blocks found:", blocks.length);
           // Find match blocks
           const fs = require('fs');
           fs.writeFileSync('scratch/fifa_data.json', JSON.stringify(content, null, 2));
           console.log("Saved to scratch/fifa_data.json");
       } else {
           const fs = require('fs');
           fs.writeFileSync('scratch/fifa_data.json', JSON.stringify(content, null, 2));
           console.log("Saved to scratch/fifa_data.json");
       }
    } else {
       console.log("No NEXT_DATA.");
    }
    
    await browser.close();
  } catch (error) {
    console.error("Error:", error);
  }
})();
