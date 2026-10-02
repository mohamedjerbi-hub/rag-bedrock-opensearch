import { CohereClient } from "cohere-ai";
import { OpenSearchBaseClient } from './opensearch';

const cohere = new CohereClient({ token: process.env.COHERE_API_KEY || '' });

export const handler = async (event: any) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const question = body.question;
    
    if (!question) {
      return { statusCode: 400, body: JSON.stringify({ error: { code: 'VALIDATION_ERROR', message: 'Question required' } }) };
    }

    // Call OpenSearch to get similar chunks
    const sources = await OpenSearchBaseClient.search(question);
    
    const documents = sources.map(s => ({ id: s.document_name, text: s.excerpt }));

    const response = await cohere.chat({
      message: question,
      model: "command-r",
      documents: documents
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/event-stream', // Keeping this header although we are returning JSON for simplicity
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
      body: JSON.stringify({
        answer: response.text,
        sources
      })
    };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } }) };
  }
};
