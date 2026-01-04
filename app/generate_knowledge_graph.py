from langchain_experimental.graph_transformers import LLMGraphTransformer
from langchain_openai import ChatOpenAI
from langchain_core.documents import Document
import os
from dotenv import load_dotenv

async def generate_knowledge_graph(text: str):
    """Generate a knowledge graph from the provided data."""

    load_dotenv()
    api_key = os.getenv("OPENAI_API_KEY")

    llm = ChatOpenAI(
        model="openai/gpt-4o-mini",
        api_key=api_key,
        base_url="https://models.github.ai/inference"
    )

    graph_transformer = LLMGraphTransformer(llm=llm)
    documents = [Document(page_content=text)]
    return await graph_transformer.aconvert_to_graph_documents(documents)