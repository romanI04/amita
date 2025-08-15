// Test script for streaming analyze endpoint
const text = `This is a test document that needs to be analyzed for AI detection. 
It contains multiple sentences to provide enough content for analysis. 
The text should trigger the streaming response and show quick fixes.
We want to see if the streaming implementation is working correctly.
This text is long enough to meet the minimum requirements.`;

async function testStreaming() {
  console.log('Testing streaming analyze endpoint...\n');
  
  try {
    const response = await fetch('http://localhost:3000/api/analyze/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        title: 'Test Analysis'
      })
    });

    if (!response.ok) {
      console.error('Response not OK:', response.status, response.statusText);
      const text = await response.text();
      console.error('Response body:', text);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    console.log('Streaming response:');
    console.log('-------------------');
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log('\n-------------------');
        console.log('Stream complete!');
        break;
      }
      
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event = JSON.parse(line.slice(6));
            console.log(`\n[${event.type}]`, event.data);
          } catch (e) {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
testStreaming();