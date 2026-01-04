from langchain_experimental.graph_transformers import LLMGraphTransformer
from langchain_openai import ChatOpenAI
from langchain_core.documents import Document
from langchain_classic.text_splitter import RecursiveCharacterTextSplitter
import os
import logging
import asyncio
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def generate_knowledge_graph(text: str, progress_callback=None):
    """Generate a knowledge graph from the provided data."""

    load_dotenv()
    api_key = os.getenv("OPENAI_API_KEY")

    llm = ChatOpenAI(
        model="openai/gpt-4.1-mini",
        api_key=api_key,
        base_url="https://models.github.ai/inference"
    )

    graph_transformer = LLMGraphTransformer(llm=llm)
    
    # Estimate token count (roughly 4 characters per token)
    estimated_tokens = len(text) // 4
    logger.info(f"Input text length: {len(text)} characters (~{estimated_tokens} tokens)")
    
    # If text exceeds 3000 tokens (leaving buffer for system prompt), use chunking strategy
    if estimated_tokens > 3000:
        logger.info("Text exceeds 3000 tokens. Initiating chunking strategy...")
        
        # Split text into chunks with overlap to maintain context
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=10000,  # ~2500 tokens per chunk (leaving buffer for prompt/response)
            chunk_overlap=2000,  # ~500 tokens overlap
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
        
        chunks = text_splitter.split_text(text)
        logger.info(f"Split text into {len(chunks)} chunks")
        
        if progress_callback:
            await progress_callback.put({"progress": 0, "total": len(chunks), "current": 0, "status": "Starting"})
        
        documents = [Document(page_content=chunk) for chunk in chunks]
        
        # Process all chunks and merge results
        all_graph_docs = []
        for idx, doc in enumerate(documents, 1):
            logger.info(f"Processing chunk {idx}/{len(chunks)} ({len(doc.page_content)} characters)")
            
            if progress_callback:
                await progress_callback.put({
                    "progress": (idx - 1) / len(chunks) * 100,
                    "total": len(chunks),
                    "current": idx,
                    "status": f"Processing chunk {idx} of {len(chunks)}"
                })
            
            try:
                graph_docs = await graph_transformer.aconvert_to_graph_documents([doc])
                all_graph_docs.extend(graph_docs)
                logger.info(f"Chunk {idx}/{len(chunks)} processed: {len(graph_docs)} graph documents generated")
                
                # Add delay between chunks to avoid rate limiting (except for the last chunk)
                if idx < len(chunks):
                    logger.info(f"Waiting 5 seconds before processing next chunk to avoid rate limits...")
                    await asyncio.sleep(5)
                    
            except Exception as e:
                logger.error(f"Error processing chunk {idx}/{len(chunks)}: {str(e)}")
                raise
        
        if progress_callback:
            await progress_callback.put({"progress": 100, "total": len(chunks), "current": len(chunks), "status": "Complete"})
        
        logger.info(f"Chunking complete. Total graph documents: {len(all_graph_docs)}")
        return all_graph_docs
    else:
        logger.info("Text within token limit. Processing normally...")
        
        if progress_callback:
            await progress_callback.put({"progress": 50, "total": 1, "current": 1, "status": "Processing"})
        
        # Process normally if within token limit
        documents = [Document(page_content=text)]
        result = await graph_transformer.aconvert_to_graph_documents(documents)
        
        if progress_callback:
            await progress_callback.put({"progress": 100, "total": 1, "current": 1, "status": "Complete"})
        
        return result