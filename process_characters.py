from PIL import Image, ImageDraw
import os

# Source images
characters = {
    'cipher': 'generated_images/generated_image_4e883f5b-302f-4266-a57e-b665cb47b5a5_0.png',
    'nova': 'generated_images/generated_image_ed9821e5-3924-4fb6-98ef-fad46f3d3e91_0.png',
    'prism': 'generated_images/generated_image_ea44230e-75c0-4a7f-ac9a-d3a45f6db2ed_0.png',
}

output_dir = 'diss-launch-kit/website/images/characters'
os.makedirs(output_dir, exist_ok=True)

for name, src_path in characters.items():
    img = Image.open(src_path).convert('RGBA')
    
    # Resize to 512x512 (center crop if not square)
    w, h = img.size
    min_dim = min(w, h)
    left = (w - min_dim) // 2
    top = (h - min_dim) // 2
    img_cropped = img.crop((left, top, left + min_dim, top + min_dim))
    img_resized = img_cropped.resize((512, 512), Image.LANCZOS)
    
    # Save square version (for use with CSS border-radius)
    square_path = os.path.join(output_dir, f'{name}-portrait.png')
    img_resized.save(square_path, 'PNG', optimize=True)
    
    # Create circular version with transparent background
    mask = Image.new('L', (512, 512), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, 512, 512), fill=255)
    
    circular = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
    circular.paste(img_resized, (0, 0), mask)
    
    circular_path = os.path.join(output_dir, f'{name}-portrait-circle.png')
    circular.save(circular_path, 'PNG', optimize=True)
    
    # Get file sizes
    sq_size = os.path.getsize(square_path) / 1024
    circ_size = os.path.getsize(circular_path) / 1024
    
    print(f'{name.upper()}:')
    print(f'  Square:   {square_path} ({sq_size:.1f} KB)')
    print(f'  Circular: {circular_path} ({circ_size:.1f} KB)')
    print()

print("All character portraits processed successfully!")