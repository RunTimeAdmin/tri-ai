# DISSENSUS — AI Debate Engine - Hostinger Deployment Files

**Ready to deploy!** This folder contains all the files you need to upload to Hostinger.

## What's Included

- `index.html` - Main entry point (360 KB)
- `assets/` - All JavaScript, CSS, and bundled resources
- `.htaccess` - Server configuration for HTTPS, caching, and routing
- `__manus__/` - Analytics configuration (keep this folder)

## Quick Upload Instructions

### Via FileZilla (Recommended)

1. **Connect to Hostinger:**
   - Protocol: SFTP (or FTP)
   - Host: Your FTP host
   - Port: 22 (SFTP) or 21 (FTP)
   - Username: Your FTP username
   - Password: Your FTP password

2. **Upload Files:**
   - Navigate to `public_html/` on the remote server
   - Drag and drop all files from this folder to `public_html/`
   - Wait for transfer to complete

3. **Verify:**
   - Visit `https://yourdomain.com`
   - You should see the DISSENSUS landing page

### Via Hostinger File Manager (Web)

1. Log in to Hostinger Control Panel
2. Click **File Manager**
3. Navigate to `public_html/`
4. Click **Upload**
5. Select all files from this folder
6. Upload them

## Important Notes

- ✅ **Keep the `.htaccess` file** - It handles HTTPS redirects and caching
- ✅ **Keep the `__manus__/` folder** - It contains analytics configuration
- ✅ **Keep the `assets/` folder intact** - All CSS and JavaScript are here
- ✅ **Ensure `index.html` is at root level** - Not in a subfolder

## File Sizes

- `index.html`: 360 KB
- `assets/index-*.css`: ~130 KB (gzipped: ~20 KB)
- `assets/index-*.js`: ~691 KB (gzipped: ~207 KB)

**Total uncompressed: ~1.2 MB**  
**Total gzipped: ~327 KB** (with Hostinger compression enabled)

## After Upload

1. **Enable SSL Certificate:**
   - Go to Hostinger Control Panel → SSL/TLS
   - Click "Install" or "Enable AutoSSL"
   - Wait 5-15 minutes for installation

2. **Enable Caching:**
   - Go to Hostinger Control Panel → Caching
   - Enable "Browser Caching"
   - Set expiration to 30 days

3. **Enable Compression:**
   - Go to Hostinger Control Panel → Performance
   - Enable "Gzip Compression"

4. **Test Your Site:**
   - Visit `https://yourdomain.com`
   - Check that all elements load
   - Test on mobile devices
   - Verify HTTPS is working (green lock icon)

## Troubleshooting

**Blank page or 404 error?**
- Verify all files were uploaded to `public_html/`
- Check that `index.html` is at the root (not in a subfolder)
- Clear browser cache (Ctrl+Shift+Delete)
- Hard refresh (Ctrl+F5)

**Images or styling not loading?**
- Verify `assets/` folder was uploaded completely
- Check file permissions (should be 644 for files, 755 for folders)
- Clear browser cache and hard refresh

**HTTPS not working?**
- Wait 24 hours for SSL certificate to fully propagate
- Go to Hostinger Control Panel and verify SSL is installed
- Check `.htaccess` file is present

## Support

For detailed deployment instructions, see `HOSTINGER_DEPLOYMENT_GUIDE.md` in the parent folder.

---

**Ready to go live! 🚀**

Upload these files to `public_html/` on your Hostinger account and your DISSENSUS website will be live!
