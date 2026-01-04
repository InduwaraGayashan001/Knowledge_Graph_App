import wikipedia

def search_wikipedia(query: str) -> str:
    """Search Wikipedia for a given query and return the complete summary."""
    try:
        summary = wikipedia.summary(query)
        return summary
    except Exception as e:
        return f"An error occurred while searching Wikipedia: {str(e)}"