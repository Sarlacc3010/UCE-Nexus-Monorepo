"""
RAG Engine — ChromaDB-based retrieval for the UCE knowledge base.
Indexes markdown documents and performs semantic search.
"""
import os
import hashlib
import logging
from pathlib import Path

import chromadb
from chromadb.utils import embedding_functions
from pypdf import PdfReader

logger = logging.getLogger("rag")

# ChromaDB persisted locally inside the service directory
CHROMA_PATH = os.path.join(os.path.dirname(__file__), "..", "chroma_db")
KNOWLEDGE_BASE_PATH = os.path.join(os.path.dirname(__file__), "..", "knowledge_base")
COLLECTION_NAME = "uce_nexus_knowledge"

# Use sentence-transformers for embeddings (free, local)
EMBEDDING_MODEL = "all-MiniLM-L6-v2"


class RAGEngine:
    def __init__(self):
        self.client = chromadb.PersistentClient(path=CHROMA_PATH)
        self.embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name=EMBEDDING_MODEL
        )
        self.collection = self.client.get_or_create_collection(
            name=COLLECTION_NAME,
            embedding_function=self.embedding_fn,
            metadata={"hnsw:space": "cosine"},
        )
        self._indexed = False

    def _chunk_markdown(self, text: str, chunk_size: int = 800, overlap: int = 100) -> list[str]:
        """Split markdown text into logical chunks, ensuring no tiny or empty chunks."""
        # Split by double newline first (paragraphs)
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        chunks = []
        current = ""

        for para in paragraphs:
            # Skip noise like horizontal lines or very short lines
            clean_para = para.replace("-", "").replace("*", "").strip()
            if len(clean_para) < 10:
                continue

            if not current:
                current = para
            elif len(current) + len(para) + 2 < chunk_size:
                current += "\n\n" + para
            else:
                chunks.append(current)
                current = para

        if current:
            clean_current = current.replace("-", "").replace("*", "").strip()
            if len(clean_current) >= 20:
                chunks.append(current)

        # Post-process chunks to ensure none are tiny or empty
        final_chunks = []
        for c in chunks:
            c_clean = c.strip()
            if len(c_clean) < 40:
                if final_chunks:
                    final_chunks[-1] += "\n\n" + c_clean
                else:
                    final_chunks.append(c_clean)
            else:
                final_chunks.append(c_clean)

        return final_chunks

    def index_documents(self, force: bool = False) -> int:
        """
        Index all markdown files in the knowledge_base directory.
        Skips files that haven't changed (by hash).
        Returns the number of new chunks added.
        """
        kb_path = Path(KNOWLEDGE_BASE_PATH)
        if not kb_path.exists():
            logger.warning(f"Knowledge base path not found: {KNOWLEDGE_BASE_PATH}")
            return 0

        new_chunks = 0
        for md_file in kb_path.glob("*.md"):
            content = md_file.read_text(encoding="utf-8")
            file_hash = hashlib.md5(content.encode()).hexdigest()
            doc_id_prefix = md_file.stem

            # Check if this file version is already indexed
            existing = self.collection.get(
                where={"$and": [{"source": md_file.name}, {"hash": file_hash}]},
                limit=1,
            )
            if existing["ids"] and not force:
                logger.debug(f"Skipping already-indexed file: {md_file.name}")
                continue

            # Remove old chunks from this file if re-indexing
            old = self.collection.get(where={"source": md_file.name})
            if old["ids"]:
                self.collection.delete(ids=old["ids"])
                logger.info(f"Re-indexing {md_file.name} ({len(old['ids'])} old chunks removed)")

            # Chunk and index
            chunks = self._chunk_markdown(content)
            ids = [f"{doc_id_prefix}_{i}" for i in range(len(chunks))]
            metadatas = [
                {"source": md_file.name, "hash": file_hash, "chunk": i}
                for i in range(len(chunks))
            ]

            self.collection.add(documents=chunks, ids=ids, metadatas=metadatas)
            new_chunks += len(chunks)
            logger.info(f"Indexed {md_file.name}: {len(chunks)} chunks")

        # Index PDF files
        for pdf_file in kb_path.glob("*.pdf"):
            try:
                content_bytes = pdf_file.read_bytes()
                file_hash = hashlib.md5(content_bytes).hexdigest()
                doc_id_prefix = pdf_file.stem

                # Check if this file version is already indexed
                existing = self.collection.get(
                    where={"$and": [{"source": pdf_file.name}, {"hash": file_hash}]},
                    limit=1,
                )
                if existing["ids"] and not force:
                    logger.debug(f"Skipping already-indexed PDF: {pdf_file.name}")
                    continue

                # Remove old chunks from this file if re-indexing
                old = self.collection.get(where={"source": pdf_file.name})
                if old["ids"]:
                    self.collection.delete(ids=old["ids"])
                    logger.info(f"Re-indexing PDF {pdf_file.name} ({len(old['ids'])} old chunks removed)")

                # Extract text page by page and chunk it
                reader = PdfReader(pdf_file)
                pdf_chunks = []
                pdf_metadatas = []
                pdf_ids = []
                chunk_idx = 0

                for page_num, page in enumerate(reader.pages):
                    page_text = page.extract_text()
                    if not page_text or not page_text.strip():
                        continue

                    # Clean lines and split
                    lines = [line.strip() for line in page_text.split("\n") if line.strip()]

                    current_lines = []
                    current_len = 0
                    header = f"[Documento: {pdf_file.name}, Página {page_num + 1}]\n"

                    for line in lines:
                        if current_lines and current_len + len(line) + 1 > 600:
                            chunk_text = header + "\n".join(current_lines)
                            pdf_chunks.append(chunk_text)
                            pdf_metadatas.append({"source": pdf_file.name, "hash": file_hash, "chunk": chunk_idx})
                            pdf_ids.append(f"{doc_id_prefix}_{chunk_idx}")
                            chunk_idx += 1
                            current_lines = []
                            current_len = 0

                        current_lines.append(line)
                        current_len += len(line) + 1

                    if current_lines:
                        chunk_text = header + "\n".join(current_lines)
                        pdf_chunks.append(chunk_text)
                        pdf_metadatas.append({"source": pdf_file.name, "hash": file_hash, "chunk": chunk_idx})
                        pdf_ids.append(f"{doc_id_prefix}_{chunk_idx}")
                        chunk_idx += 1

                if not pdf_chunks:
                    logger.warning(f"No text extracted from PDF: {pdf_file.name}")
                    continue

                self.collection.add(documents=pdf_chunks, ids=pdf_ids, metadatas=pdf_metadatas)
                new_chunks += len(pdf_chunks)
                logger.info(f"Indexed PDF {pdf_file.name}: {len(pdf_chunks)} chunks")
            except Exception as e:
                logger.error(f"Error indexing PDF {pdf_file.name}: {e}", exc_info=True)

        self._indexed = True
        return new_chunks

    def search(self, query: str, n_results: int = 15) -> list[dict]:
        """
        Semantic search in the knowledge base.

        Returns list of {text, source, score} dicts.
        """
        if not self._indexed:
            self.index_documents()

        results = self.collection.query(
            query_texts=[query],
            n_results=n_results,
            include=["documents", "metadatas", "distances"],
        )

        hits = []
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            hits.append({
                "text": doc,
                "source": meta.get("source", "unknown"),
                "score": round(1 - dist, 4),  # cosine distance → similarity
            })

        return hits

    def format_context(self, hits: list[dict], max_chars: int = 8000) -> str:
        """Format search results into a context string for the LLM prompt."""
        context_parts = []
        total = 0
        for hit in hits:
            if total + len(hit["text"]) > max_chars:
                break
            source = hit["source"].replace(".md", "").replace("_", " ").title()
            context_parts.append(f"[Fuente: {source}]\n{hit['text']}")
            total += len(hit["text"])

        return "\n\n---\n\n".join(context_parts)


# Singleton
rag_engine = RAGEngine()
