# BigQuery Release Notes Dashboard

A modern, highly polished web application built with **Python Flask** on the backend and **plain vanilla HTML, CSS, and JavaScript** on the frontend. It fetches, caches, parses, and displays the Google Cloud BigQuery Release Notes feed.

## Features

- **Automated XML Parsing**: Pulls the Google Cloud BigQuery release notes Atom feed (`https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`) using Python's standard `xml.etree.ElementTree`.
- **Itemized Breakdown**: Uses client-side DOM parsing to split daily updates (which often group multiple features/fixes) into individual, standalone cards categorized by update type (*Feature, Changed, Deprecated, Fixed, Known Issue*).
- **Intelligent In-Memory Caching**: Caches feed contents for 10 minutes to ensure blazing-fast loads while offering an explicit **Refresh** button with a custom loading spinner to pull live, fresh updates.
- **Advanced Controls**:
  - **Keyword Search**: Performs deep text matching on dates, update types, and descriptions with live text highlighting.
  - **Category Chips**: Filter by specific release types with real-time update count indicators.
  - **Date Sorting**: Toggle chronologically between *Newest First* and *Oldest First*.
- **Interactive Tweet Composer**:
  - Automatically prepares a neat, pre-formatted tweet summarizing the selected update.
  - Live character limit gauge (280 characters standard) with an interactive SVG circular progress indicator that changes colors (Blue -> Yellow -> Red) based on remaining space.
  - Quick-add hashtag suggestions.
  - Action buttons to **Copy Text** (triggering a sleek toast notification) or **Post to X** (opening the Twitter share intent).
- **Premium Aesthetics**: Fully customized dark mode UI, glowing accent buttons, modern typography (*Outfit* & *Plus Jakarta Sans*), responsive layout, and smooth CSS keyframe animations.

## Directory Structure

```
bq-release-notes/
│
├── app.py                 # Flask server with feed parser and cache endpoints
├── README.md              # Project documentation
│
├── static/
│   ├── css/
│   │   └── style.css      # Custom dark-theme styling, modal, animations
│   └── js/
│       └── app.js         # Frontend engine: DOM parsing, state, compose
│
└── templates/
    └── index.html         # Main dashboard layout
```

## Setup and Running

1. **Prerequisites**: Ensure you have Python 3 installed. Flask is the only dependency.
2. **Install dependencies** (if not already installed):
   ```bash
   pip install Flask
   ```
3. **Run the application**:
   ```bash
   python app.py
   ```
4. **Access the application**:
   Open your browser and navigate to: [http://127.0.5000/](http://127.0.0.1:5000) or `http://localhost:5000/`
