// test-config.js - Run this to debug your configuration
const { WebClient } = require('@slack/web-api');
const { StreamChat } = require('stream-chat');
require('dotenv').config();

async function testConfiguration() {
  console.log('🔍 Testing Configuration...\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log('SLACK_BOT_TOKEN:', process.env.SLACK_BOT_TOKEN ? '✅ Set' : '❌ Missing');
  console.log('STREAM_API_KEY:', process.env.STREAM_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('STREAM_API_SECRET:', process.env.STREAM_API_SECRET ? '✅ Set' : '❌ Missing');
  console.log('SLACK_CHANNEL_ID:', process.env.SLACK_CHANNEL_ID ? '✅ Set' : '❌ Missing');
  console.log('');

  // Test Slack connection
  console.log('📱 Testing Slack Connection...');
  try {
    const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
    const slackTest = await slack.auth.test();
    console.log('✅ Slack connection successful!');
    console.log('   Team:', slackTest.team);
    console.log('   User:', slackTest.user);
    console.log('   Bot ID:', slackTest.bot_id);
    console.log('');
  } catch (error) {
    console.error('❌ Slack connection failed:');
    console.error('   Error:', error.message);
    console.error('   Code:', error.code);
    
    if (error.message.includes('invalid_auth')) {
      console.error('   💡 Solution: Check your SLACK_BOT_TOKEN - it might be invalid or expired');
    }
    console.log('');
  }

  // Test Stream Chat connection
  console.log('💬 Testing Stream Chat Connection...');
  try {
    const streamClient = StreamChat.getInstance(
      process.env.STREAM_API_KEY, 
      process.env.STREAM_API_SECRET
    );
    
    // Test by creating a simple user
    const testUser = await streamClient.upsertUser({
      id: 'test-user-' + Date.now(),
      name: 'Test User'
    });
    
    console.log('✅ Stream Chat connection successful!');
    console.log('   User created:', testUser.users ? 'Yes' : 'No');
    console.log('');
  } catch (error) {
    console.error('❌ Stream Chat connection failed:');
    console.error('   Error:', error.message);
    
    if (error.message.includes('API key')) {
      console.error('   💡 Solution: Check your STREAM_API_KEY and STREAM_API_SECRET');
    }
    console.log('');
  }

  // Test Slack channel access
  if (process.env.SLACK_CHANNEL_ID) {
    console.log('📢 Testing Slack Channel Access...');
    try {
      const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
      const channelInfo = await slack.conversations.info({
        channel: process.env.SLACK_CHANNEL_ID
      });
      console.log('✅ Channel access successful!');
      console.log('   Channel name:', channelInfo.channel.name);
      console.log('   Channel ID:', channelInfo.channel.id);
      console.log('');
    } catch (error) {
      console.error('❌ Channel access failed:');
      console.error('   Error:', error.message);
      
      if (error.message.includes('channel_not_found')) {
        console.error('   💡 Solution: Check your SLACK_CHANNEL_ID - channel might not exist');
      } else if (error.message.includes('not_in_channel')) {
        console.error('   💡 Solution: Add your bot to the channel first');
      }
      console.log('');
    }
  }

  console.log('🎯 Next Steps:');
  console.log('1. Fix any failed connections above');
  console.log('2. Make sure your Slack app has the right permissions');
  console.log('3. Ensure your bot is added to the channel');
  console.log('4. Restart your server after fixing issues');
}

testConfiguration().catch(console.error);