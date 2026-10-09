"""Export the approved illustration for skin display without changing its composition."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
source = root / 'source/approved-final-illustration.png'
destination = root.parents[2] / 'avatars/skins/mage-female-starlight-rose.webp'

with Image.open(source) as illustration:
    # Keep the original aspect ratio and magical background. UI uses object-fit: contain.
    profile = illustration.copy()
    profile.thumbnail((512, 1024), Image.Resampling.LANCZOS)
    profile.save(destination, 'WEBP', quality=92, method=6)
    assert abs(profile.width / profile.height - illustration.width / illustration.height) < .002
    assert profile.width == 512

print(f'Exported approved non-SD illustration: {profile.width}x{profile.height}.')
