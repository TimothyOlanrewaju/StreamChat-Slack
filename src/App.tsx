import { useState, useEffect, useCallback } from 'react';
import { useCreateChatClient, Chat } from 'stream-chat-react';
import 'stream-chat-react/dist/css/v2/index.css';
import './App.css';
import ChatWidget from './components/ChatWidget';

function App() {
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  
  const [currentUserId] = useState(() => {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substr(2, 5);
    return `customer-${timestamp}-${randomStr}`;
  });

  const getApiUrl = () => {
    const envUrl = import.meta.env.VITE_API_URL;
    const fallbackUrl = 'http://localhost:5000';
    return envUrl || fallbackUrl;
  };

  useEffect(() => {
    const apiKey = import.meta.env.VITE_STREAM_API_KEY;
    if (!apiKey) {
      setConnectionError('VITE_STREAM_API_KEY is not configured');
      setIsLoading(false);
      return;
    }
  }, []);

  // Token provider function for useCreateChatClient
  const tokenProvider = useCallback(async () => {
    try {
      const apiUrl = getApiUrl();
      const healthResponse = await fetch(`${apiUrl}/api/health`);
      if (!healthResponse.ok) {
        throw new Error(`Backend health check failed: ${healthResponse.status}`);
      }

      const response = await fetch(`${apiUrl}/api/stream-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ userId: currentUserId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get Stream token: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.token) {
        throw new Error('No token received from backend');
      }

      return data.token;
    } catch (error) {
      console.error('Token provider error:', error);
      throw error;
    }
  }, [currentUserId]);

  const user = {
    id: currentUserId,
    name: `Customer ${currentUserId.split('-')[1]}`,
  };

  const client = useCreateChatClient({
    apiKey: import.meta.env.VITE_STREAM_API_KEY,
    tokenOrProvider: tokenProvider,
    userData: user,
  });

  useEffect(() => {
    if (client) {
      setIsLoading(false);
      setConnectionError(null);
      
      
      const handleConnectionError = (error: any) => {
        console.error('Stream connection error:', error);
        setConnectionError(`Connection failed: ${error.message}`);
      };

      client.on('connection.error', handleConnectionError);
      
      return () => {
        client.off('connection.error', handleConnectionError);
      };
    }
  }, [client]);

  useEffect(() => {
    if (!import.meta.env.VITE_STREAM_API_KEY) {
      return;
    }

    const timer = setTimeout(() => {
      if (!client && !connectionError) {
        setConnectionError('Connection timeout - please check your network and backend service');
        setIsLoading(false);
      }
    }, 10000); 

    return () => clearTimeout(timer);
  }, [client, connectionError]);

  const toggleWidget = () => {
    setIsWidgetOpen((prev) => !prev);
  };

  if (connectionError) {
    return (
      <div className="loading-container">
        <h3>Connection Error</h3>
        <p>{connectionError}</p>
        <p>User ID: {currentUserId}</p>
        <p>API: {getApiUrl()}</p>
      </div>
    );
  }

  if (isLoading || !client) {
    return (
      <div className="loading-container">
        <h3>Connecting to chat service...</h3>
        <p>User ID: {currentUserId}</p>
        <p>API: {getApiUrl()}</p>
      </div>
    );
  }

  return (
    <Chat client={client} theme="messaging light">
      <div className="app-container">
        <header className="app-header">
          <h1>Welcome to User Feedback Collector</h1>
          <h3 className="session-id">Your session ID: {currentUserId}</h3>
          <h3 className="connection-status">✅ Connected to chat service</h3>
        </header>

        <button
          className="chat-toggle-button"
          onClick={toggleWidget}
          data-state={isWidgetOpen ? 'open' : 'closed'}
          aria-label={isWidgetOpen ? 'Close chat widget' : 'Open chat widget'}
        ></button>

        {isWidgetOpen && (
          <div className="chat-widget-container">
            <ChatWidget customerId={currentUserId} />
          </div>
        )}
      </div>
    </Chat>
  );
}

export default App;
