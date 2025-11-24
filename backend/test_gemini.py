import google.generativeai as genai
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure API key
api_key = os.getenv('GOOGLE_API_KEY')
if not api_key:
    print("❌ GOOGLE_API_KEY not found in environment variables")
    exit(1)

print(f"✓ API Key found: {api_key[:10]}...")
genai.configure(api_key=api_key)

print("\n📋 Listing available models...")
try:
    models = genai.list_models()
    print("\n✅ Available models:")
    for model in models:
        # Check if model supports generateContent
        if 'generateContent' in model.supported_generation_methods:
            print(f"  - {model.name}")
            if hasattr(model, 'supported_generation_methods'):
                print(f"    Methods: {', '.join(model.supported_generation_methods)}")
except Exception as e:
    print(f"❌ Error listing models: {e}")
    exit(1)

print("\n🧪 Testing text generation with gemini-1.5-flash...")
try:
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content("Say 'Hello, TandavAI!' if you can hear me.")
    print(f"✅ Response: {response.text}")
except Exception as e:
    print(f"❌ Error: {e}")
    exit(1)

print("\n✅ All tests passed! Your API key is working correctly.")
