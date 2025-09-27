# Space Explorer AI

A voice-enabled space education app for kids. Ask questions about space and track satellites in real-time.

**Live Demo:** [https://tinyurl.com/space-explorer-ai]()

## Features

- **Real-time satellite tracking** with live coordinates
- **AI chat** powered by Google Gemini - ask anything about space
- **Voice input/output** - perfect for kids who prefer talking
- **Mobile-friendly** - works great on phones and tablets

## Quick Start

1. **Clone and setup**
   ```bash
   git clone <https://gitlab.com/arslanashfaq/space-explorer-app.git>
   cd space-explorer-app
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Add API keys to .env**
   ```bash
   GOOGLE_API_KEY=your_gemini_key
   N2YO_API_KEY=your_satellite_key
   SECRET_KEY=your_secret
   ```

3. **Run locally**
   ```bash
   python app.py
   # Visit http://127.0.0.1:5000
   ```

## Get API Keys

- **Google Gemini:** [aistudio.google.com](https://aistudio.google.com/app/apikey)
- **N2YO Satellites:** [n2yo.com/api](https://www.n2yo.com/api/)

## Deploy to Cloud.

Use own method.

## Tech Stack

- **Backend:** Python/Flask + Google Gemini AI + Google Text-to-Speech
- **Frontend:** JavaScript + Web Speech API
- **Deploy:** Google Cloud Run + Docker

---

Built for curious kids who want to explore the universe!