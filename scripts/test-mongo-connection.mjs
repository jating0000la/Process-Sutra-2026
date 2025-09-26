// Test MongoDB connection
import 'dotenv/config';
import { getFormResponsesCollection } from '../server/mongo/client.js';

async function testMongoConnection() {
  try {
    console.log('Testing MongoDB connection...');
    console.log('MONGODB_URI:', process.env.MONGODB_URI);
    console.log('MONGODB_DB:', process.env.MONGODB_DB);
    
    const col = await getFormResponsesCollection();
    console.log('✅ Successfully connected to MongoDB');
    
    // Test a simple query
    const count = await col.countDocuments({});
    console.log(`📊 Total form responses in MongoDB: ${count}`);
    
    // Test inserting a sample document (remove after testing)
    const sampleDoc = {
      orgId: "test-org",
      flowId: "test-flow",
      taskId: "test-task",
      taskName: "Test Task",
      formId: "test-form",
      submittedBy: "test@example.com",
      formData: { testField: "testValue" },
      createdAt: new Date()
    };
    
    const insertResult = await col.insertOne(sampleDoc);
    console.log('✅ Sample document inserted:', insertResult.insertedId);
    
    // Clean up - remove the test document
    await col.deleteOne({ _id: insertResult.insertedId });
    console.log('🧹 Test document cleaned up');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

testMongoConnection();
