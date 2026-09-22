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

## தங்கம் / வெள்ளி Rate — Logo பக்கத்தில் + Rate Details Page

Admin → **Rates** page-ல் தங்கம் (1 கிராம்) மற்றும் வெள்ளி (1 கிராம்)
விலையை போடலாம். Save பண்ணின தேதியே automatic-ஆ காட்டப்படும் (தனியா
தேதி type பண்ண வேண்டாம்).

இந்த rate, header-ல் **Logo/Vizhuthugal Media பெயருக்கு பக்கத்திலேயே**
ஒரு periya ticker-ஆ காட்டப்படும் ("புதுச்சேரி விலை விபரம்" title-ஓடு,
update தேதி உட்பட) — "1 கிராம்" விலை இருந்து "1 பவுன்" (தங்கம்) /
"1 கிலோ" (வெள்ளி) விலைக்கு ஒவ்வொரு சில நொடிக்கும் மாறி மாறி (animate
ஆகி) தெரியும். இந்த ticker-ஐ click பண்ணினா `/rates` பக்கத்திற்கு
போகும். Menu bar-ல் தனி link எதுவும் இல்லை.

## Latest Headlines Ticker (Social belt)

Header-க்கு கீழே social icons இருக்கிற belt-ல், சமீபத்தில் publish
பண்ண 6 செய்திகளின் headline ஒவ்வொன்றா, மேலிருந்து fade+slide ஆகி
("top-in" effect) ஒவ்வொரு 4 வினாடிக்கும் மாறி மாறி தெரியும். எந்த
headline-ஐயும் click பண்ணா அந்த செய்திக்கே நேரடியா போகலாம்.

## Menu — Horizontal scroll (all screen sizes) + Bold

Menu bar ippo எல்லா screen size-லேயும் (mobile உட்பட) ஒரே horizontal
row-ஆ இருக்கு — hamburger (☰) button கிடையாது. Categories/menu items
அதிகமா இருந்தா, left-right swipe/scroll பண்ணி பாக்கலாம். Puதிய
category add பண்ணினா இதே row-ல் தானாகவே சேர்ந்துகொள்ளும். Menu text
இப்போ bold-ஆ இருக்கும், hover பண்ணினா ஒரு animated underline + slight
lift தெரியும். Logo மற்றும் site name-உம் முன்பை விட periya-ஆ இருக்கும்.

## செய்தி URL-கள் — "article" வார்த்தை இல்லாம, Tamil-லேயே

செய்தியின் title-ஐ base-ஆ வெச்சு URL slug தானாகவே உருவாகும் (Tamil
title கொடுத்தா, URL-உம் Tamil-லேயே இருக்கும் — e.g.
`/news/தமிழகத்தில்-மழை-எச்சரிக்கை`). முன்பு non-English title-க்கு
"article-1", "article-2" மாதிரி generic word fallback ஆகிட்டு
இருந்தது — அதை fix பண்ணிட்டேன். Reader-facing எந்த URL-லேயும்
"article" வார்த்தை இனி வராது (`/news/...` prefix use பண்றோம்).

## Reader Comments + Banned Words Filter

ஒவ்வொரு செய்தி பக்கத்திலும் keezhe ஒரு "கருத்துகள்" section இருக்கு
— readers பெயர் + comment type பண்ணி submit பண்ணலாம். **Comment
உடனே public-ஆ காட்டப்படும்** — admin approve பண்ண தேவையில்லை.

Admin → **Comments** page-ல் மேலே ஒரு "Banned Words" list வைக்கலாம்
(comma அல்லது புதிய வரியில் பிரிச்சு). அந்த வார்த்தை எதுவும் ஒரு
comment-ல் (பெயர் அல்லது message-ல்) இருந்தா, அது **automatic-ஆ
block** ஆகி (site-ல் தெரியாம) admin page-ல் "🚫 Blocked" status-ஆ
காட்டப்படும் — நீங்க பாத்து Approve (தவறுதலா block ஆனா) அல்லது
Delete பண்ணலாம். Blocked இல்லாத எந்த comment-ஐயும் எப்பொழுது
வேணும்னாலும் Delete பண்ணலாம் (உதாரணமா, யாராவது தகாத வார்த்தை
பண்ணி பிறகு comment போட்டா).

## View Count Remove பண்ணப்பட்டது

செய்தி பக்கத்தில் "X பார்வைகள்" எண் இனி காட்டப்படாது (database-ல்
track ஆகிக்கிட்டே இருக்கும், UI-ல் மட்டும் hide பண்ணிருக்கேன்).

## Image Upload — AVIF Support

Image upload செய்யும்போது jpg/png/webp/gif மட்டுமல்லாம் **AVIF**
format-உம் ஏற்கப்படும் (article images, banner ads எல்லாத்திற்கும்).

## Rate Price History

Admin → Rates page-ல் ஒவ்வொரு தடவை rate save பண்ணும்போதும், அன்றைய
தேதிக்கு அந்த gold/silver rate history-ல் தானாகவே பதிவு ஆகும் (ஒரே
நாளில் பல தடவை save பண்ணினா, அன்றைய entry மட்டும் update ஆகும் —
duplicate rows வராது). இதனால் நாள்பட நாள் rate history தானாகவே
சேர்ந்துகொண்டே இருக்கும்.

`/rates` பக்கத்தில் தற்போதைய விலைக்கு கீழே "விலை வரலாறு" table
காட்டப்படும் — கடந்த 20 நாட்களின் rate, இன்றைய rate-ஓடு ஒப்பிடும்போது
எவ்வளவு வித்தியாசம் (▲ ஏறினது / ▼ இறங்கினது) என்பதும் தெரியும்.

## Multiple Images per News

செய்தி add/edit பண்ணும்போது, முதல் "படம்" field (featured image, cards/
hero-ல் காட்டப்படும்) தவிர, "கூடுதல் படங்கள் (Multiple Images)" field-ல்
ஒரே தடவையில் பல படங்களை select பண்ணலாம் (Ctrl/Cmd அழுத்தி). இந்த
படங்கள் செய்தி content-ல் **பத்திகளுக்கு நடுவே தானாகவே பரவி**
காட்டப்படும் (select பண்ணின வரிசைப்படி) — manual-ஆ எந்த padam எங்க
வரணும்-ன்னு வைக்க தேவையில்லை. Edit page-ல் ஏற்கனவே சேர்த்த படங்களை
பார்க்கலாம், தேவையில்லாததை தனித்தனியா (&times; பொத்தான்) நீக்கவும்
செய்யலாம். Edit பண்ணும்போது புதிதா படம் சேர்த்தா, இருக்கிற படங்களுடன்
கூடுதலா சேரும் (replace ஆகாது).

## ஒவ்வொரு News-க்கும் தொடர்புடைய YouTube Video

Article add/edit பண்ணும்போது "தொடர்புடைய YouTube Video" field-ல் ஒரு
YouTube video link paste பண்ணலாம் (optional). Andha video செய்தி
பக்கத்தில் content-க்கு கீழே தனியா ஒரு section-ஆ காட்டப்படும் —
thumbnail-ல் click பண்ணா **site-லேயே** (redirect ஆகாம) periya popup-ல்
play ஆகும். Video link காலியா விட்டா, andha section-ஏ காட்டப்படாது.
இது `/videos` page-ல் தோன்றும் channel-oda முழு feed-ஐ விட வேற —
இது ஒரு specific news-க்கு மட்டும் ஒரு specific video attach பண்றது.

## Mobile Home Screen Shortcut (App-like)

யாராவது site-ஐ mobile phone-ல் "Add to Home Screen" பண்ணினா:
- Ungal logo icon-ஆ home screen-ல் தெரியும் (browser generic icon இல்ல)
- Open பண்ணும்போது browser address bar இல்லாம, ஒரு app மாதிரியே
  full-screen-ஆ திறக்கும் (Android Chrome-ல் "standalone" mode,
  iPhone Safari-ல் "Add to Home Screen"-லேயும் இதே மாதிரி வேலை செய்யும்)

இதுக்கு எந்த admin setup-உம் தேவையில்லை — logo image-ஐ வெச்சே
தேவையான icon sizes (192px, 512px, Apple touch icon) தானாகவே
generate பண்ணி வச்சிருக்கேன்.

## Image Watermark

News article image (featured image) மற்றும் gallery images upload
பண்ணும்போது, **automatic-ஆ** ஒரு "vizhuthugal.live" watermark band
கீழ பகுதியில் சேர்க்கப்படும் (semi-transparent dark strip-ல் domain
name repeat ஆகி, full width-ல் தெரியும்). இது server-side-லேயே நடக்கும்
— admin எதுவும் தனியா பண்ண தேவையில்லை. (Banner ad images-க்கு watermark
இல்லை — அவை வேற தரப்பினரின் ad creative-ஆ இருக்கலாம் என்பதால்.)

இது `sharp` nu ஒரு image-processing library use பண்றது (package.json-ல்
already சேர்த்திருக்கேன், `npm install` பண்ணும்போது தானாகவே கிடைக்கும்).
better-sqlite3 மாதிரியே, இதுவும் Node version-க்கு specific-ஆ prebuilt
binary தேவைப்படும் — Render-ல் `NODE_VERSION=20` already set பண்ணி
இருந்தா (README-ல் முன்பே சொன்ன fix), இதுவும் problem இல்லாம வேலை
செய்யும்.

## Social Media Share (WhatsApp/Facebook) + Link Preview Thumbnail

ஒவ்வொரு செய்தி பக்கத்திலும் தலைப்புக்கு கீழே **WhatsApp, Facebook,
Copy Link** — 3 share buttons இருக்கு. Click பண்ணா அந்த செய்தியின்
title + link நேரடியா share panna ready-ஆ open ஆகும்.

இதோடு, ஒவ்வொரு செய்தி பக்கத்திலும் **Open Graph meta tags**
(WhatsApp/Facebook/Telegram போன்ற apps தான் link preview எப்படி
காட்டணும்-ன்னு தெரிஞ்சுக்கிற standard tags) automatic-ஆ சேர்க்கப்பட்டு
இருக்கு. இதனால்:
- Link share பண்ணும்போது, செய்தியோட **படம் thumbnail-ஆ** தெரியும்
- Title Tamil font-ல் **சரியா readable-ஆ** தெரியும் (raw URL/garbled
  text காட்டாம)
- Summary (இல்ல content-ன் முதல் வரிகள்) description-ஆ தெரியும்

இது வேலை பண்ண, site custom domain-ல் (https://) live-ஆ இருக்கணும் —
Render-ல deploy பண்ணின உடனே இது தானாகவே வேலை செய்யும்.

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
