# Weatherhaven site: demo script (about 8 minutes)

Live: https://can-weatherhaven.vercel.app

**Before you start:**
- Open the link in Chrome, full screen (Cmd+Ctrl+F on a Mac), laptop plugged in.
- Use a **new tab**, so the intro plays.
- Have your phone unlocked for the AR part.

## 1. Home hero (1 min)
- The intro plays, then the TRECC deploys on its own: "This is your TRECC, the actual CAD model, not an illustration."
- Drag it. Tap **Pack up**, then **Deploy**.
- Tap **Desert**, then **Temperate**, then **Tropical**. Each is a real place now: drifting clouds, grass, scrub and boulders, pine forest or palms, and a gravel pad under the unit. The paint changes automatically so the unit never disappears into the ground.
- Tap **More** and slide **time of day** to night. Turn **Storm** on, then off again.

## 2. Step inside and X-ray (1 min)
- Tap **Step inside**. The camera goes through the door into the real interior. Press Esc to come back out.
- Tap **More → X-ray**. The near half cuts away and fact pins appear inside.

## 3. The globe (1 min) — **new**
- Go to **Company → Where we've worked** (or scroll down the home page).
- Say: "All 162 sites from our own deployment map, in 94 countries plus Antarctica."
- Click **Night**, then **Play tour**. The globe flies to each story with a photo.
- Pause the tour and click any spike, for example in Afghanistan. The card shows the site, the type of mission, and our other sites in that country.

## 4. Everything at one scale (1 min) — **new**
- **Products → Ships small, opens big**.
- Every system with published dimensions, next to a 20′ container and a 6 ft person.
- Hit **Play**: everything unfolds from packed to deployed.

## 4b. Every mission has its own page (45 s) — **new**
- **Solutions → Military**. Scroll to **Where we've deployed**: every military deployment on Weatherhaven's map, by country. **See them on the globe** opens the globe filtered to military.
- **Solutions → Medical**. Each application shows key facts. Click **Field hospitals**: the full weatherhaven.com content, key facts, the systems used, and the other medical applications down the side.
- **Company → News**: all 61 articles from 2008 on, each with its own page here instead of links out to the old site.

- **Products → MECC**, scroll to **Where it's used**: the missions that name the MECC, and the news that mentions it.

## 5. Compare (45 s) — **new**
- **Products → Compare**. Pick ATEPS vs EHMECC vs RDMSS: every published fact side by side.
- **Copy link**: "You can send this exact comparison to a customer."

## 6. How to buy (1 min) — **new**
- **Products → How to buy & RFP checklist**.
- Tick a few items, for example Level 1 field hospital, Water purification and Polar cold.
- The summary builds on the right. **Send with a request** carries the list into the quote form.
- Say: "That's every capability from our RFP guide. A buyer can paste it straight into their RFP."

## 6b. Any product in 3D (1 min) — **new**
- **Products → MECC → 3D model**. It unfolds from a 20′ container on a forest site. Tap **Show inside**: the roof cuts away to a command post. Tap **Step inside** and drag to look round. **Back outside**.
- Tap **Studio** for the clean engineering view, then back to **Forest**. Say: "Every system stands where it's used: ATEPS and RDMSS in desert, the polar shelters on snow, Series 8 in the tropics."
- **Products → TRECC → 3D model**: Weatherhaven's own CAD on a desert site. Tap **Packed**, then **Deployed**: an orange scan line sweeps across as the packed unit becomes the open one. Try **Desert tan**.
- **Products → Polar shelters**: switch between Polarhaven, Polar Chief and Endurance.
- Every product has **See it full size** for AR.

## 7. Camp planner (45 s)
- **Products → Camp planner**. It opens on the command post example. Tap **3D**, drag a unit, tap **Quote**.

## 8. Present mode and AR (1 min)
- Back on the home page, press **P**. Captioned scenes loop on their own. Good to leave running while people talk. Press Esc to stop.
- **Products → TRECC → See it at full size in AR**. Scan the QR code with a phone, tap **View in your space**, and point at the floor.

## If something goes wrong
- **Page looks frozen:** press F5.
- **3D doesn't appear:** the computer has no graphics card, so the page shows the deploy video and photos with an **Open 3D model** button. Tap it, or carry on with the globe, compare and how-to-buy pages.
- **Don't send the contact form live** unless email has been set up on Vercel. Without it, the form says the preview isn't connected and nothing was sent.

## What to say when asked
- **"Can we go live?"** The code is ready. LAUNCH.md lists what Weatherhaven needs to sign off, three Vercel settings, and the domain switch. Every old weatherhaven.com link already redirects to its new page.
- **"Is that our real product?"**
  - The TRECC is Weatherhaven's own CAD, simplified for the browser.
  - The other products' 3D models are built from Weatherhaven's published specs and photos. They're accurate to the published sizes but not engineering CAD, and the page says so.
  - The fold motion and the forklift are illustrative.
- **"Is the content real?"** Every fact comes from weatherhaven.com:
  - the 162 sites are our public deployment map
  - the checklist is our RFP guide
  - the dimensions are published, except the TRECC, which is measured from the CAD
- **"What would it take to ship?"**
  - It already runs on Vercel.
  - Production needs someone to own the content (or a CMS), CAD for the other products, and legal/brand sign-off.
- **Known question:** weatherhaven.com says the TRECC gives 3× the floor area. The CAD measures about 2.1×. Worth checking before anyone repeats the 3× figure.
