from duckduckgo_search import DDGS

def get_latest_news(query: str, max_results: int = 3):
    """
    Fetches the latest news for a given legal or general query using DuckDuckGo.
    This acts as our 'live knowledge till now' layer without needing a massive vector DB update.
    """
    try:
        results = []
        with DDGS() as ddgs:
            # First try a news specific search
            for r in ddgs.news(query, max_results=max_results):
                results.append(f"[LIVE NEWS: {r.get('date', '')}] {r.get('title', '')} - {r.get('body', '')}")
                
        if not results:
            # Fallback to standard web search if no news
            with DDGS() as ddgs:
                for r in ddgs.text(query, max_results=max_results):
                    results.append(f"[LIVE WEB SEARCH] {r.get('title', '')} - {r.get('body', '')}")
                    
        return "\n".join(results)
    except Exception as e:
        print(f"Web search error: {e}")
        return ""
