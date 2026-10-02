import { S3Event } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { CohereClient } from "cohere-ai";
import { OpenSearchBaseClient } from './opensearch';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'eu-west-1' });
const cohere = new CohereClient({ token: process.env.COHERE_API_KEY || '' });

export const handler = async (event: S3Event) => {
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    
    try {
      const getObjectCommand = new GetObjectCommand({ Bucket: bucket, Key: key });
      const { Body } = await s3Client.send(getObjectCommand);
      const text = await Body?.transformToString('utf-8') || '';
      
      const chunks = chunkText(text);
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        // Get embedding
        const embedResponse = await cohere.embed({
          texts: [chunk],
          model: 'embed-multilingual-v3.0',
          inputType: 'search_document'
        });
        
        // Handling both possible Cohere response formats
        const embedding = Array.isArray(embedResponse.embeddings) 
          ? (embedResponse.embeddings as number[][])[0]
          : ((embedResponse.embeddings as any).float as number[][])[0];
        
        // Index to OpenSearch
        await OpenSearchBaseClient.indexChunk({
          chunk_id: `${key}-${i}`,
          document_id: key,
          document_name: key,
          page: 1,
          chunk_index: i,
          text: chunk,
          embedding
        });
      }
    } catch (error) {
      console.error(`Error processing ${key}:`, error);
    }
  }
};

function chunkText(text: string, chunkSize = 800, overlap = 100): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let i = 0;
  while (i < words.length) {
    chunks.push(words.slice(i, i + chunkSize).join(' '));
    i += chunkSize - overlap;
  }
  return chunks;
}
