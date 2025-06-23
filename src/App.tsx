import { useState, useEffect } from 'react';
import { StreamChat } from 'stream-chat';
import { Chat } from 'stream-chat-react';
import 'stream-chat-react/dist/css/v2/index.css';
import './App.css';
import ChatWidget from './components/ChatWidget';

const client = StreamChat.getInstance(import.meta.env.VITE_STREAM_API_KEY);

function App() {
  const [isConnected, setIsConnected] = useState(false);
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
    let isMounted = true;

    const connectUser = async () => {
      try {
        setIsLoading(true);
        setConnectionError(null);

        if (client.userID) {
          setIsConnected(true);
          setIsLoading(false);
          return;
        }

        const apiUrl = getApiUrl();
        const tokenEndpoint = `${apiUrl}/api/stream-token`;

        try {
          const healthResponse = await fetch(`${apiUrl}/api/health`);
          if (!healthResponse.ok) {
            throw new Error(`Backend health check failed: ${healthResponse.status}`);
          }
        } catch (healthError) {
          throw new Error(`Cannot reach backend at ${apiUrl}. Is the server running on port 5000?`);
        }

        const response = await fetch(tokenEndpoint, {
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

        if (isMounted && !client.userID) {
          await client.connectUser(
            {
              id: currentUserId,
              name: `Customer ${currentUserId.split('-')[1]}`,
            },
            data.token
          );
          if (isMounted) {
            setIsConnected(true);
          }
        }
      } catch (error) {
        console.error('Error connecting user:', error);
        if (isMounted) {
          setConnectionError(error instanceof Error ? error.message : 'Unknown connection error');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    connectUser();

    return () => {
      isMounted = false;
      if (client.userID) {
        client.disconnectUser().catch(console.error);
      }
    };
  }, []);

  const toggleWidget = () => {
    setIsWidgetOpen((prev) => !prev);
  };

  if (isLoading) {
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

        {/* Toggle Button with data-state attribute */}
        <button
          className="chat-toggle-button"
          onClick={toggleWidget}
          data-state={isWidgetOpen ? 'open' : 'closed'}
          aria-label={isWidgetOpen ? 'Close chat widget' : 'Open chat widget'}
        ></button>

        {/* Chat Widget */}
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