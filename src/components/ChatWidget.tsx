import React, { useEffect, useState } from 'react';
import { Channel, ChannelHeader, MessageList, MessageInput, Window } from 'stream-chat-react';
import { useChatContext } from 'stream-chat-react';
import { Channel as StreamChannel } from 'stream-chat';

interface ChatWidgetProps {
  customerId: string;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ customerId }) => {
  const { client } = useChatContext();
  const [channel, setChannel] = useState<StreamChannel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initChannel = async () => {
      try {
        const formattedCustomerId = customerId.startsWith('customer-') 
          ? customerId 
          : `customer-${customerId}`;

        const channelId = `feedback-${formattedCustomerId}`;
        
        const newChannel = client.channel('messaging', channelId, {
          members: [formattedCustomerId, 'support-bot'],
        });

        await newChannel.watch();
        setChannel(newChannel);
      } catch (error) {
        console.error('Error initializing channel:', error);
      } finally {
        setLoading(false);
      }
    };

    if (client && customerId) {
      initChannel();
    }
  }, [client, customerId]);

  const handleMessageSubmit = async (params: { 
    cid: string; 
    localMessage: any; 
    message: any; 
    sendOptions: any; 
  }) => {    
    const messageText = params.message.text;

    if (!messageText || typeof messageText !== 'string' || !messageText.trim()) {
      return;
    }

    const formattedCustomerId = customerId.startsWith('customer-') 
      ? customerId 
      : `customer-${customerId}`;

    const payload = {
      customerId: formattedCustomerId,
      message: messageText.trim(),
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/feedback/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error('API Error:', response.status);
      }
    } catch (error) {
      console.error('Network error:', error);
    }
  };

  if (loading) {
    return (
      <div className="chat-widget chat-widget--loading">
        Loading chat...
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="chat-widget chat-widget--error">
        Failed to load chat
      </div>
    );
  }

  return (
    <div className="chat-widget">
      <Channel channel={channel}>
        <Window>
          <ChannelHeader />
          <MessageList messageLimit={100} />
          <MessageInput 
            overrideSubmitHandler={handleMessageSubmit}
          />
        </Window>
      </Channel>
    </div>
  );
};

export default ChatWidget;