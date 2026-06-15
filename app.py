import time
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Feed URL
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache
cache = {
    "data": None,
    "timestamp": 0
}
CACHE_DURATION = 600  # 10 minutes

def fetch_and_parse_feed(bypass_cache=False):
    global cache
    current_time = time.time()
    
    # Return cached data if valid and bypass is not requested
    if not bypass_cache and cache["data"] is not None and (current_time - cache["timestamp"]) < CACHE_DURATION:
        return cache["data"], "cache"
    
    try:
        # Fetch xml data from the Google Cloud feeds
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        req = urllib.request.Request(FEED_URL, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
            
        # Parse XML
        root = ET.fromstring(xml_data)
        
        # Atom feed namespace
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        entries = []
        for entry in root.findall('atom:entry', ns):
            title_el = entry.find('atom:title', ns)
            id_el = entry.find('atom:id', ns)
            updated_el = entry.find('atom:updated', ns)
            content_el = entry.find('atom:content', ns)
            
            # Find link with rel="alternate" or the first link
            link_url = ""
            links = entry.findall('atom:link', ns)
            for l in links:
                if l.attrib.get('rel') == 'alternate' or not link_url:
                    link_url = l.attrib.get('href', '')
            
            entries.append({
                "id": id_el.text if id_el is not None else "",
                "title": title_el.text if title_el is not None else "",
                "updated": updated_el.text if updated_el is not None else "",
                "link": link_url,
                "content": content_el.text if content_el is not None else ""
            })
            
        cache["data"] = entries
        cache["timestamp"] = current_time
        return entries, "fresh"
        
    except urllib.error.URLError as e:
        print(f"Network error fetching feed: {e}")
        # Fallback to cache if network fails, even if expired
        if cache["data"] is not None:
            return cache["data"], "fallback_cache"
        raise e
    except Exception as e:
        print(f"Error parsing feed: {e}")
        if cache["data"] is not None:
            return cache["data"], "fallback_cache"
        raise e

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    # Allow client to force refresh using ?refresh=true query param
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    try:
        entries, source = fetch_and_parse_feed(bypass_cache=force_refresh)
        return jsonify({
            "status": "success",
            "source": source,
            "count": len(entries),
            "data": entries
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == '__main__':
    # Run server locally
    app.run(debug=True, port=5000)
