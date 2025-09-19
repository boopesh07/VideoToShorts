#!/usr/bin/env python3
"""
Test script to verify that all required dependencies are installed
"""

import sys
import subprocess

def test_import(module_name, package_name=None):
    """Test if a module can be imported"""
    try:
        __import__(module_name)
        print(f"✅ {module_name} - OK")
        return True
    except ImportError as e:
        pkg = package_name or module_name
        print(f"❌ {module_name} - MISSING (install with: pip install {pkg})")
        print(f"   Error: {e}")
        return False

def test_command(command, package_name):
    """Test if a command line tool is available"""
    try:
        result = subprocess.run([command, "--version"],
                              capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print(f"✅ {command} - OK")
            return True
        else:
            print(f"❌ {command} - ERROR")
            return False
    except (subprocess.TimeoutExpired, FileNotFoundError) as e:
        print(f"❌ {command} - MISSING (install: {package_name})")
        return False

def main():
    print("🔍 Testing VideoToShorts Dependencies\n")

    print("Python Packages:")
    print("=" * 50)

    success = True

    # Test Python packages
    packages = [
        ("fastapi", "fastapi"),
        ("uvicorn", "uvicorn[standard]"),
        ("pydantic", "pydantic"),
        ("dotenv", "python-dotenv"),
        ("apify_client", "apify-client"),
        ("genai", "google-genai"),
        ("yt_dlp", "yt-dlp"),
        ("ffmpeg", "ffmpeg-python")
    ]

    for module, package in packages:
        if not test_import(module, package):
            success = False

    print("\nCommand Line Tools:")
    print("=" * 50)

    # Test command line tools
    commands = [
        ("yt-dlp", "pip install yt-dlp"),
        ("ffmpeg", "brew install ffmpeg (macOS) or apt install ffmpeg (Ubuntu)")
    ]

    for command, install_cmd in commands:
        if not test_command(command, install_cmd):
            success = False

    print("\n" + "=" * 50)

    if success:
        print("🎉 All dependencies are installed correctly!")
        print("\nTo start the backend server:")
        print("cd backend && python main.py")
        print("\nTo start the frontend:")
        print("cd frontend && npm run dev")
    else:
        print("⚠️  Some dependencies are missing.")
        print("Please install the missing packages and try again.")
        return 1

    return 0

if __name__ == "__main__":
    sys.exit(main())