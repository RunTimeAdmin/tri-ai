from PIL import Image
import os

output_dir = 'diss-launch-kit/website/images/characters'

for filename in os.listdir(output_dir):
    if filename.endswith('.png'):
        filepath = os.path.join(output_dir, filename)
        img = Image.open(filepath).convert('RGBA')
        
        # Convert to RGB with dark background for JPEG-like compression
        # But keep as PNG for transparency support - just reduce quality via resize trick
        # Better approach: save as optimized WebP or compressed PNG
        
        # For web: convert to JPEG (no transparency needed since CSS handles circular)
        # Save square versions as JPEG for much smaller size
        if 'circle' not in filename:
            rgb_img = Image.new('RGB', img.size, (10, 10, 15))  # dark bg matching site
            rgb_img.paste(img, mask=img.split()[3] if img.mode == 'RGBA' else None)
            jpg_path = filepath.replace('.png', '.jpg')
            rgb_img.save(jpg_path, 'JPEG', quality=85, optimize=True)
            jpg_size = os.path.getsize(jpg_path) / 1024
            png_size = os.path.getsize(filepath) / 1024
            print(f'{filename}: PNG={png_size:.0f}KB -> JPG={jpg_size:.0f}KB')
        else:
            # For circular versions, optimize PNG
            img.save(filepath, 'PNG', optimize=True)
            size = os.path.getsize(filepath) / 1024
            print(f'{filename}: {size:.0f}KB (optimized PNG)')

print("\nDone! Using JPG for square versions (CSS will handle circular crop)")