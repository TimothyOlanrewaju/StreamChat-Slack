const express = require('express');
const { WebClient } = require('@slack/web-api');
const { StreamChat } = require('stream-chat');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Validate required environment variables
const requiredEnvVars = [
  'SLACK_BOT_TOKEN',
  'STREAM_API_KEY', 
  'STREAM_API_SECRET',
  'SLACK_CHANNEL_ID'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const streamClient = StreamChat.getInstance(process.env.STREAM_API_KEY, process.env.STREAM_API_SECRET);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const slackTest = await slack.auth.test();
    const testToken = streamClient.createToken('health-check-user');
    
    res.json({
      status: 'healthy',
      slack: { connected: true, team: slackTest.team },
      stream: { connected: true, tokenGenerated: !!testToken }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Generate Stream Chat token
function generateStreamToken(userId) {
  return streamClient.createToken(userId);
}

// Create Stream Chat user
async function createStreamUser(userId, name, role = 'user') {
  try {
    await streamClient.upsertUsers([{
      id: userId,
      name: name || `Customer ${userId}`,
      role: role,
      image: role === 'admin' ? 'https://via.placeholder.com/40x40.png?text=BOT' : 'https://via.placeholder.com/40x40.png?text=USER'
    }]);
    return true;
  } catch (error) {
    console.error('Error creating user:', error);
    return false;
  }
}

async function initializeSupportBot() {
  try {
    await streamClient.upsertUsers([{
      id: 'support-bot',
      name: 'Support Team',
      role: 'admin',
      image: 'https://via.placeholder.com/40x40.png?text=BOT'
    }]);
    return true;
  } catch (error) {
    console.error('Error initializing support bot:', error);
    return false;
  }
}

// Get or create customer channel
async function getOrCreateCustomerChannel(customerId) {
  try {
    const channelId = `feedback-${customerId}`;
    
    const channel = streamClient.channel('messaging', channelId, {
      name: `Feedback from ${customerId}`,
      custom: { 
        type: 'feedback',
        customerId: customerId
      },
      members: [customerId, 'support-bot']
    });

    await channel.create();
    return channel;
  } catch (error) {
    console.error('Error in getOrCreateCustomerChannel:', error);
    return null;
  }
}

// Submit feedback
app.post('/api/feedback/submit', async (req, res) => {
  const { customerId, message } = req.body;
  
  try {
    if (!customerId || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['customerId', 'message']
      });
    }

    const messageText = typeof message === 'string' ? message : String(message);
    const formattedCustomerId = customerId.startsWith('customer-') 
      ? customerId 
      : `customer-${customerId}`;

    // Create customer user
    const customerCreated = await createStreamUser(
      formattedCustomerId, 
      `Customer ${customerId}`, 
      'user'
    );

    if (!customerCreated) {
      return res.status(500).json({ error: 'Failed to create customer user' });
    }

    // Get or create channel
    const channel = await getOrCreateCustomerChannel(formattedCustomerId);
    if (!channel) {
      return res.status(500).json({ error: 'Failed to create channel' });
    }

    // Send customer message
    await channel.sendMessage({
      text: messageText,
      user_id: formattedCustomerId,
      custom: {
        type: 'customer_message',
        timestamp: new Date().toISOString()
      }
    });

    // Send bot response
    await channel.sendMessage({
      text: 'Thank you for your feedback! Our team will review and respond soon.',
      user_id: 'support-bot',
      custom: {
        type: 'bot_response',
        timestamp: new Date().toISOString()
      }
    });

    // Send to Slack
    try {
      await slack.chat.postMessage({
        channel: process.env.SLACK_CHANNEL_ID,
        text: `💬 *New Chat Message*\n*From:* ${formattedCustomerId}\n*Message:* ${messageText}`
      });
    } catch (slackError) {
    }

    res.status(200).json({ 
      success: true,
      message: 'Message sent successfully',
      customerId: formattedCustomerId,
      channelId: `feedback-${formattedCustomerId}`
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to submit message',
      details: error.message
    });
  }
});

// Get Stream Chat token
app.post('/api/stream-token', async (req, res) => {
  const { userId, role = 'user' } = req.body;
  
  try {
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const formattedUserId = userId.startsWith('customer-') 
      ? userId 
      : `customer-${userId}`;

    const userCreated = await createStreamUser(
      formattedUserId, 
      `Customer ${userId}`, 
      role
    );
    
    if (!userCreated) {
      return res.status(500).json({ error: 'Failed to create user' });
    }
    
    const token = generateStreamToken(formattedUserId);
    
    res.json({ 
      token,
      userId: formattedUserId,
      role: role
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to generate token',
      details: error.message
    });
  }
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await initializeSupportBot();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
