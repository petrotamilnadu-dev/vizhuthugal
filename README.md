# Vizhuthugal Media — News Website

Tamil news website with an admin panel to publish, edit and delete news.
Built with Node.js + Express + SQLite (free/low-budget hosting friendly).

## Local-la run panna (testing)

```
npm install
cp .env.example .env
npm start
```

Site: http://localhost:3000
Admin: http://localhost:3000/admin/login

First time run pannumbodhu, terminal-la default admin username/password
print aagum (`.env`-la ADMIN_USER / ADMIN_PASS set pannalana, default
`admin` / `ChangeMe@123`). Login pannitu udhane **கடவுச்சொல்** page-ல
password-a maathitunga.

## Render-la free/kammiyana budget-la deploy panna eppadi

1. **GitHub-la code push pannunga.** (Ungal `shopvisit-app` maadhiri — oru
   pudhu repo create pannunga, e.g. `vizhuthugal-media`.)
2. Render dashboard → **New → Web Service** → andha GitHub repo-va connect
   pannunga.
3. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance type:** Starter plan recommend pannuren (free plan-la disk
     add panna mudiyadhu, so uploaded photos + database daily restart-la
     poidum. Starter plan mothama kammiyana cost, but persistent disk
     kudukkum).
4. **Persistent Disk add pannunga** (Render dashboard → your service →
   Disks): Mount path `/data`, size 1GB podhum aarambichukka.
5. **Environment variables** set pannunga:
   - `DATA_DIR` = `/data`
   - `ADMIN_USER` = ungal admin username
   - `ADMIN_PASS` = ungal strong password
   - `SESSION_SECRET` = ethachum random string
   - `SITE_NAME` / `SITE_NAME_EN` = venumna maathikonga
6. Deploy pannunga. First deploy-la logs-la admin credentials print aagum
   (adha use pannitu login pannunga, appuram password change pannikonga).

**Mukkiyam:** `DATA_DIR=/data` set pannama vittа, database + photos
ephemeral storage-la poidum, app restart aana ellame poidum (indha issue
ungal shop-visit app-layum earlier vandhudhu, so idha miss pannaadheenga).

### Cost estimate
- Render **Starter** web service + 1GB disk = mothamana kammiyana monthly
  cost (exact pricing Render site-la check pannunga, mாறிக்கிட்டே irukkum).
- Free tier venumna use pannalam, aana adhula service idle-ah irundha
  sleep aagum, aduthu request vandha wake-up aaga konjam time edukkum, and
  free tier-la persistent disk kidaikadhu (so photos/data restart-la poidum).

## Admin panel-la enna pannalam

- **செய்திகள் (Articles):** add/edit/delete, title, summary, image,
  category, content, published/draft toggle
- **முகப்பு வரிசை (Homepage Order):** முகப்புப்பக்கத்தில் எந்த செய்தி
  எங்க வரணும்-ன்னு நீங்களே கட்டுப்படுத்தலாம் — கீழே detail இருக்கு
- **Banner Ads:** 3 இடங்களில் ad banner upload பண்ணலாம் — கீழே detail
  இருக்கு
- **பிரிவுகள் (Categories):** add/delete categories (article இருந்தா அந்த
  category-a delete பண்ண முடியாது)
- **Social Media:** Instagram/Facebook/YouTube page links + Instagram
  video auto-embed setup
- **Preview:** Mobile/Tablet/PC-ல் site எப்படி தெரியும்-ன்னு பார்க்கலாம்
- **கடவுச்சொல்:** admin password change பண்ண

## முகப்பு வரிசை (Homepage news placement)

Default-ஆ புதுசா போடற செய்தி முகப்புல மேலே தான் வரும் (latest-first,
automatic). ஆனா நீங்க exact order-ஐ manual-ஆ மாற்றணும்னா:

Admin → **முகப்பு வரிசை** page-க்கு போங்க. அங்க வெளியிடப்பட்ட எல்லா
செய்திகளும் தற்போதைய order-ல list ஆகி இருக்கும். ஒவ்வொரு செய்திக்கும்
▲ / ▼ பொத்தான் இருக்கும் — அதை அழுத்தி மேலே/கீழே நகர்த்தலாம்.

- **1வது இடம்** = முகப்பில் பெரிய முதன்மை (hero) செய்தி
- **2, 3வது இடம்** = hero-க்கு பக்கத்துல சிறிய 2 செய்திகள்
- **மீதி எல்லாம்** = கீழே "சமீபத்திய செய்திகள்" grid-ல அதே order-ல

## Banner Advertisement

Admin → **Banner Ads** page-ல 3 slots இருக்கு:

| Slot | எங்க தெரியும் | Recommended size |
|---|---|---|
| Top | முகப்பு மேல் பகுதி | 1200 × 150 px |
| In-feed | செய்திகளுக்கும் Instagram section-க்கும் நடுவே | 1200 × 150 px |
| Article | ஒவ்வொரு செய்தி பக்கத்திலும், content-க்கு கீழே | 336 × 280 px |

ஒவ்வொரு slot-க்கும் தனியா image upload பண்ணலாம், click பண்ணா எந்த
page-க்கு போகணும்-ன்னு link கொடுக்கலாம், active/inactive toggle
பண்ணலாம். Active-ஆ இருந்து image இருந்தா மட்டும் andha banner site-ல
தெரியும் — இல்லாட்டி அந்த இடம் காலியா இருக்கும் (broken image காட்டாது).

## Mobile/Tablet/PC Preview

Admin → **Preview** page-ல முகப்புப்பக்கம் ஒரு iframe-ல load ஆகி
இருக்கும், மேலே Mobile/Tablet/PC பொத்தான்கள் அழுத்தி அந்த width-ல
எப்படி தெரியும்-ன்னு பாக்கலாம். Order மாத்தினது/banner upload
பண்ணது/புதிய செய்தி சேர்த்தது எல்லாத்தையும் இங்க refresh பண்ணி
உடனே பாக்கலாம்.

## தங்கம் / வெள்ளி Rate Belt + Rate Details Page

Admin → **Rates** page-ல் தங்கம் (1 கிராம்) மற்றும் வெள்ளி (1 கிராம்)
விலையை போடலாம். Save பண்ணின தேதியே automatic-ஆ காட்டப்படும் (தனியா
தேதி type பண்ண வேண்டாம்). இது header-க்கு கீழே Social Media icons-ஓடு
சேர்ந்த ஒரு "belt" strip-ல் "புதுச்சேரி தங்கம் (1g)" nu காட்டப்படும்.
ரேட் கொடுக்காம விட்டா, andha belt-ல் social icons மட்டும் காட்டப்படும்.

Menu bar-ல் "💰 புதுச்சேரியில் தங்கம் வெள்ளி விலை விபரம்" nu ஒரு
நிரந்தர link இருக்கு — அது ஒரு தனி பக்கத்தை (`/rates`) திறக்கும், அங்க
1 கிராம் + 1 பவுன் (8 கிராம்) தங்கம் விலை, 1 கிராம் வெள்ளி விலை, update
தேதி — எல்லாம் பெரிசா, தெளிவா காட்டப்படும்.

## Menu — Horizontal scroll (all screen sizes)

Menu bar ippo எல்லா screen size-லேயும் (mobile உட்பட) ஒரே horizontal
row-ஆ இருக்கு — hamburger (☰) button கிடையாது. Categories/menu items
அதிகமா இருந்தா, left-right swipe/scroll பண்ணி பாக்கலாம். Puதிய
category add பண்ணினா இதே row-ல் தானாகவே சேர்ந்துகொள்ளும்.

## செய்தி Pin செய்ய (Fixed position)

ஒவ்வொரு செய்தியையும் add/edit பண்றப்போ "📌 Pin செய்" checkbox இருக்கு.
Pin பண்ணின செய்திகள் எப்போதும் முகப்புப்பக்கத்தில் **மேலே ஒரு தனி
block-ஆ** இருக்கும் — புதிய செய்தி publish பண்ணினாலும், pin பண்ணாத
செய்திகள் எவ்வளவு reorder பண்ணினாலும் pin பண்ணின செய்திகளின் position
மாறாது. Homepage Order page-ல் pin பண்ணின செய்திகள் தனி group-ஆ
காட்டப்படும், அதுக்குள்ளே மட்டும் ▲/▼ மூலம் order மாத்தலாம்.

## Featured YouTube Video + Live Auto-detect

Admin → Social Media page-ல் "முகப்புல ஒரு குறிப்பிட்ட வீடியோ Feature
பண்ண" section-ல் எந்த ஒரு YouTube video link-ஐயும் paste பண்ணலாம் —
அது முகப்புப்பக்கத்தில் "சிறப்பு வீடியோ" section-ஆ தோன்றும் (இதுக்கு
API key கூட தேவையில்லை, YouTube-ஓட public oEmbed use பண்றோம்).

YouTube API Key + Channel ID already connect பண்ணி இருந்தா, ungal
channel **Live** போன உடனே, அந்த live stream automatic-ஆ முகப்புப்பக்கத்தின்
**மிக மேலே** ஒரு "🔴 LIVE" banner-ஆ தோன்றும் (featured video-க்கு பதிலா).
Live status ஒவ்வொரு 5 நிமிடத்துக்கும் ஒரு தடவை மட்டும் check பண்ணப்படும்
(YouTube API-ல் live-check கொஞ்சம் அதிக quota எடுக்கும், so அடிக்கடி
check பண்ணாம constrain பண்ணி வச்சிருக்கேன்). Free quota (10,000
units/day) பொதுவா போதும், aana traffic ரொம்ப அதிகமா இருந்தா, Google
Cloud Console-ல் quota-வை (Quotas & System Limits) கூட்டிக்கலாம் — idhu
free-ஆவே செய்யலாம்.

## Menu order மாற்ற (Categories reorder)

Admin → **பிரிவுகள்** page-ல் ஒவ்வொரு category-க்கும் ▲/▼ பொத்தான்
இருக்கு — அழுத்தி menu bar order-ஐ மாத்தலாம். **முகப்பு** மற்றும்
**வீடியோக்கள்** menu items எப்போதும் மேலே ஃபிக்ஸ்ட்-ஆ இருக்கும்
(இவை reorder ஆகாது) — categories மட்டும் அதற்கு அடுத்து, நீங்க
வைக்கிற order-ல வரும்.

## வீடியோக்கள் menu (YouTube auto-embed)

முகப்பு menu-ல "வீடியோக்கள்" nu ஒரு புதிய page இருக்கு — இதுல ஒரு
grid-ல் ungal YouTube channel-oda latest uploads தானாகவே தோன்றும்.
Video thumbnail click பண்ணா, **site-லேயே** (redirect ஆகாம) video
play ஆகும்.

Idha connect panna (free, code venaam, konjam setup):

1. [console.cloud.google.com](https://console.cloud.google.com) -ல்
   login பண்ணி ஒரு புதிய project create பண்ணுங்க.
2. "APIs & Services" → "Library" → "YouTube Data API v3" தேடி
   **Enable** பண்ணுங்க.
3. "APIs & Services" → "Credentials" → "Create Credentials" →
   **API Key** — இது உடனே generate ஆகும், copy பண்ணுங்க.
4. Ungal YouTube channel-க்கு போய் → profile picture → "Your channel"
   → "..." → "Share channel" → **"Copy channel ID"** (இது எப்போதும்
   `UC` -ல் start ஆகும், `@VizhuthugalMedia` handle இல்ல).
5. Admin → **Social Media** page-ல் "YouTube Video Feed" section-ல்
   API Key மற்றும் Channel ID paste பண்ணி **சேமி** பண்ணுங்க.
6. "வீடியோக்கள்" menu-ல் automatic-ah latest uploads தோன்றும்.

Instagram-ஐ விட இது ரொம்ப simple — business account maathanum,
manual app review காத்திருக்கணும் எதுவும் இல்ல, API key ஒண்ணு
போதும்.

## Social media icons + Instagram auto-embed

Menu bar-க்கு கீழே ஒரு thin strip-la Instagram/Facebook/YouTube icons
already added pannirukken (ungal links already pre-filled: instagram.com/
vizhuthugalmedia, facebook.com/Vizuthugal, youtube.com/@VizhuthugalMedia).
Icon click pannா andha page நேரடியா new tab-la open aagும். Venumna
Admin → Social Media page-la links maathikonga.

### Instagram video feed — main page-la automatic-ah embed aaga

Ungal Instagram-la upload panra video/reels main page-la automatic-ah
தோன்றணும்னா, Instagram oda official Graph API use panrom (idhu free,
aana connect panna konjam one-time setup venum, code illama panna
mudiyadhu — Meta idha kட்டாயமா manual verification-oda thaan approve
pannும்):

1. Ungal Instagram account **Professional (Business/Creator)** account-ah
   maathunga (Instagram app → Settings → Account type).
2. [developers.facebook.com](https://developers.facebook.com) -la login
   pannunga, **"Create App"** → type: **"Other"** → use case-la
   **"Instagram"** select pannunga.
3. App dashboard-la **"Instagram API with Instagram Login"** product-ah
   add pannunga, adhula ungal Instagram professional account-a connect
   pannunga (login flow varum).
4. Adhே dashboard-la **"Generate token"** option irukkum — click pannitta
   oru **long-lived access token** kidaikkum (idhu ~60 days valid).
5. Andha token-a copy pannitu, ungal site-oda **Admin → Social Media**
   page-la "Instagram Access Token" field-la paste panni **சேமி** pannunga.
6. Adhுthapadi, main page load aagumbodhu automatic-ah ungal latest
   video/reels fetch aagi, site-லேயே embed aagi காட்டும். Video-va click
   pannா, adhே site-லேயே play aagும் (Instagram-oda official embed
   player mூலம்).

**Token expiry gurichi kவலைப்பட வேண்டாம்:** site automatic-ah 50 days
kழிக்கும்போது token-a refresh pannikkum. Aனாலும், 60 days-ku innum
refresh aagalை-nu app-la connection revoke aagi irundha, admin panel-la
puthusa token generate panni paste pannunga.

Instagram API setup konjam technical-ah irukkalam — indha step
edilaavadhu stuck aana, screenshot vecha help pannuven.

## Structure

```
server.js          - routes (public + admin)
db.js               - SQLite setup, default admin + categories seed
instagram.js         - Instagram Graph API helper (settings, token refresh, media fetch)
youtube.js            - YouTube Data API helper (latest channel uploads)
settings.js            - shared key-value settings helper (used by instagram.js, youtube.js, banners)
views/               - EJS templates (public pages + admin/*)
public/              - CSS + logo images
data/                - SQLite DB + uploaded images (local dev; on Render
                       this should point to the persistent disk via DATA_DIR)
```

## Future upgrades (later, budget irundha)

- Custom domain add pannalam (Render settings-la)
- Rich text editor (bold/italic/links) content field-ku
- WhatsApp/Facebook share buttons article page-la
- Cloud image storage (Cloudinary free tier) — persistent disk-a
  vida even more reliable, especially multiple server instances vekkanumna
