========================================
HOSTINGER DEPLOYMENT - $DISS Dissensus
========================================

DEPLOYMENT STEPS:
-----------------
1. Log into your Hostinger hPanel
2. Go to File Manager
3. Navigate to public_html (or your domain's root folder)
4. Upload this entire folder's contents, OR upload the dissensus-hostinger.zip
5. If using zip: Upload the zip, then right-click → Extract
6. Ensure index.html is in the root of public_html
7. Ensure images/ folder contains: diss-pumpfun-token.png, diss-pfp.png, 
   and images/characters/ with cipher-portrait.jpg, nova-portrait.jpg, prism-portrait.jpg

FOLDER STRUCTURE (after upload):
-----------------
public_html/
  index.html
  styles.css
  images/
    diss-pumpfun-token.png
    diss-pfp.png
    IMAGES_NEEDED.txt
    characters/
      cipher-portrait.jpg
      nova-portrait.jpg
      prism-portrait.jpg

IMAGES:
-------
If images are missing, add them per IMAGES_NEEDED.txt. The site will 
load but show broken image placeholders until you add the assets.

LIVE APP:
---------
The "Launch App" / "Launch Debate Engine" buttons point to app.dissensus.fun.
That's a separate Node.js app - this package is the landing/marketing page only.
