import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import WhatsappLog from '../models/whatsappLog.model.js';
import CivicIssue from '../models/civicIssue.model.js';
import { User } from '../models/user.model.js';
import axios from 'axios';


// ── Helpers ──────────────────────────────────────────────────────────────────

export const sendWhatsappMessage = async (phoneNumber, message) => {
  try {
    const response = await axios.post(
      `${process.env.WHAPI_INSTANCE_URL}/messages/text`,
      { to: phoneNumber, body: message },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHAPI_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    await WhatsappLog.create({
      messageId: response.data.id || `out-${Date.now()}`,
      phoneNumber,
      messageType: 'text',
      content: { text: message },
      direction: 'outbound',
      status: 'sent'
    });

    return response.data;
  } catch (error) {
    console.error('WhatsApp send error:', error.message);
  }
};

const extractCategory = (text) => {
  const categories = {
    Pothole: ['pothole', 'hole', 'road damage', 'broken road', 'crater'],
    Garbage: ['garbage', 'trash', 'litter', 'dump', 'waste', 'kachra'],
    Safety: ['unsafe', 'dangerous', 'accident', 'hazard', 'crime'],
    Waterlogging: ['waterlog', 'flood', 'water', 'stagnant', 'paani', 'naali'],
    Streetlight: ['light', 'lamp', 'dark', 'broken light', 'batti'],
    Drainage: ['drain', 'blockage', 'sewer', 'pipe', 'nala'],
  };

  const lower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some((kw) => lower.includes(kw))) return category;
  }
  return 'Other';
};

const processMessageWithAI = async (text, messageType) => {
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: `You are NagarHelp, a civic issue reporting bot for India. A citizen sent the following WhatsApp message: "${text}".

Analyze this message and respond ONLY with a valid JSON object (no markdown, no explanation) in this exact format:
{
  "isCivicIssue": true or false,
  "category": "Pothole|Garbage|Safety|Waterlogging|Streetlight|Drainage|Other",
  "title": "brief 5-word issue title",
  "description": "clean description of the issue from the message",
  "reply": "friendly reply in the same language as the user. If it's a civic issue, confirm it was registered and give a reference format. If not civic, guide them to use the NagarHelp Web App for SOS emergencies."
}`
          }]
        }]
      }
    );

    const raw = response.data.candidates[0].content.parts[0].text;
    const cleaned = raw.replace(/```json?\\s*/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('AI processing error:', error.message);
    return {
      isCivicIssue: true,
      category: extractCategory(text),
      title: 'Civic Issue Reported',
      description: text,
      reply: `Thank you for reporting! We have logged your civic issue. Our team will review it shortly. Reference will be sent to you.`
    };
  }
};

import { verifyCivicImageWithAI } from '../utils/aiService.js';
import exifr from 'exifr';

// ── Webhook Handler ───────────────────────────────────────────────────────────

export const handleWhatsappWebhook = asyncHandler(async (req, res) => {
  // Whapi sends messages in different structures; normalize
  const messages = req.body.messages || [];

  if (messages.length === 0) {
    return res.status(200).json(new ApiResponse(200, {}, 'No messages'));
  }

  for (const message of messages) {
    // Skip outbound messages we sent ourselves
    if (message.from_me) continue;

    const { id, from, text, type } = message;
    const messageText = text?.body || message.body || '';
    const isImage = type === 'image';
    const isLocation = type === 'location';

    if (!messageText && !isImage && !isLocation) continue;

    // Log inbound message
    const whatsappLog = await WhatsappLog.create({
      messageId: id || `in-${Date.now()}`,
      phoneNumber: from,
      messageType: type || 'text',
      content: { text: messageText || '[Image Received]' },
      direction: 'inbound',
      status: 'received'
    });

    // Handle explicit location sharing
    if (isLocation && message.location) {
      // Find the most recent issue from this user that is either Draft or Pending
      const recentIssue = await CivicIssue.findOne({ 
        reporterPhone: from, 
        status: { $in: ['Draft', 'Pending'] } 
      }).sort({ createdAt: -1 });

      if (recentIssue) {
        recentIssue.location.coordinates = [message.location.longitude, message.location.latitude];
        if (message.location.address || message.location.name) {
          recentIssue.location.address = message.location.address || message.location.name;
        }
        await recentIssue.save();
        await sendWhatsappMessage(from, `📍 Location updated successfully! Our team will use this exact spot to locate the issue.`);
      } else {
        await sendWhatsappMessage(from, `We received your location, but you don't have an active report. Please describe your issue first.`);
      }
      continue;
    }

    // Check if user is currently in a "Draft" state (waiting for an image)
    const existingDraft = await CivicIssue.findOne({ reporterPhone: from, status: 'Draft' });

    if (existingDraft) {
      if (isImage) {
        try {
          const imageUrl = message.image?.link;
          if (!imageUrl) {
            await sendWhatsappMessage(from, "We couldn't read your image. Please try sending it again.");
            continue;
          }

          // Fetch the image from Whapi to send to Gemini
          const imageResponse = await axios.get(imageUrl, {
            headers: { Authorization: `Bearer ${process.env.WHAPI_TOKEN}` },
            responseType: 'arraybuffer'
          });
          const imageBuffer = Buffer.from(imageResponse.data, 'binary');
          const imageBase64 = imageBuffer.toString('base64');
          const mimeType = message.image?.mime_type || 'image/jpeg';

          let gps = null;
          try {
            // Attempt to extract EXIF GPS data (works if sent as Document)
            gps = await exifr.gps(imageBuffer);
          } catch (e) {
            console.error('EXIF extraction error:', e.message);
          }

          // Verify with AI
          await sendWhatsappMessage(from, "🔍 *AI is analyzing your image...*");
          const verification = await verifyCivicImageWithAI(imageBase64, mimeType);

          if (verification.isReal) {
            existingDraft.status = 'Pending';
            existingDraft.category = verification.category !== 'Other' ? verification.category : existingDraft.category;
            existingDraft.images.push(imageUrl); // Store the Whapi URL temporarily
            existingDraft.aiAnalysis = {
              isReal: true,
              summary: verification.summary,
              category: verification.category,
              analyzedAt: new Date()
            };
            
            if (gps && gps.latitude && gps.longitude) {
              existingDraft.location.coordinates = [gps.longitude, gps.latitude];
            }
            
            await existingDraft.save();

            whatsappLog.linkedCivicIssue = existingDraft._id;
            await whatsappLog.save();

            let confirmationMsg = `✅ *Issue Verified & Submitted!*\n\nOur AI confirmed your report (${verification.summary}).\n\n📋 *Issue ID:* ${existingDraft._id.toString().slice(-8).toUpperCase()}\nStatus: Under Review\n\nTrack at: nagarhelp.in/civic/feed`;
            
            if (gps && gps.latitude && gps.longitude) {
              confirmationMsg += `\n\n📍 *Location detected from image!* Our team will use it to find the issue.`;
            } else {
              confirmationMsg += `\n\n📍 *Optional:* Please reply with your exact Location using WhatsApp's "Location" pin so our workers can find it easily.`;
            }
            
            await sendWhatsappMessage(from, confirmationMsg);
          } else {
            // Delete the invalid draft
            await CivicIssue.findByIdAndDelete(existingDraft._id);
            await sendWhatsappMessage(from, `❌ *Report Rejected*\n\nOur AI determined this image does not show a valid civic issue. (${verification.summary}). Report cancelled.`);
          }
        } catch (imgError) {
          console.error('Image processing error:', imgError.message);
          await sendWhatsappMessage(from, "Sorry, there was an error processing your image. Please try again.");
        }
      } else {
        // Expected an image, but got text
        await sendWhatsappMessage(from, "We are still waiting for a photo. Please reply with a photo of the issue so we can verify it.");
      }
      continue; // Skip the rest of the loop, handled draft state
    }

    // --- No draft exists. Treat as a brand new report ---
    if (!messageText) {
      await sendWhatsappMessage(from, "Please describe the issue first before sending photos.");
      continue;
    }

    // Analyze text with AI
    const aiResult = await processMessageWithAI(messageText, type);
    whatsappLog.aiResponse = aiResult;
    await whatsappLog.save();

    // ✅ Auto-create CivicIssue as DRAFT if detected
    if (aiResult.isCivicIssue) {
      try {
        const last10 = from.slice(-10);
        let reporter = await User.findOne({ phone: { $regex: last10 + '$' } });
        if (!reporter) {
          reporter = await User.create({
            name: `WhatsApp User (${from.slice(-4)})`,
            email: `wa_${from}@nagarhelp.com`,
            password: `wa_${from}_pass`,
            phone: from
          });
        }

        const civicIssue = await CivicIssue.create({
          title: aiResult.title || 'Civic Issue from WhatsApp',
          description: aiResult.description || messageText,
          category: aiResult.category || 'Other',
          status: 'Draft', // Important: Starts as Draft waiting for image
          location: {
            type: 'Point',
            coordinates: [0, 0],
            address: `WhatsApp report from ${from}`
          },
          reportedBy: reporter._id,
          source: 'whatsapp',
          reporterPhone: from,
          images: []
        });

        whatsappLog.linkedCivicIssue = civicIssue._id;
        await whatsappLog.save();

        // Ask for the photo
        const promptMsg = aiResult.reply + `\n\n📸 *Action Required:* Please reply to this message with a photo of the issue so our AI can verify it.`;
        await sendWhatsappMessage(from, promptMsg);
      } catch (civicError) {
        console.error('Failed to create civic issue draft:', civicError.message);
        await sendWhatsappMessage(from, aiResult.reply);
      }
    } else {
      // Non-civic message — still send AI reply
      await sendWhatsappMessage(from, aiResult.reply);
    }
  }

  // Always respond 200 to Whapi immediately
  return res.status(200).json(new ApiResponse(200, {}, 'Processed'));
});

// ── Other exports ─────────────────────────────────────────────────────────────

export const getWhatsappLogs = asyncHandler(async (req, res) => {
  const { phoneNumber, page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const filter = {};
  if (phoneNumber) filter.phoneNumber = phoneNumber;

  const logs = await WhatsappLog.find(filter)
    .sort('-createdAt')
    .skip(skip)
    .limit(parseInt(limit))
    .populate('linkedCivicIssue', 'title category status');

  const total = await WhatsappLog.countDocuments(filter);

  return res.status(200).json(
    new ApiResponse(200, {
      logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    }, 'WhatsApp logs retrieved')
  );
});

export const linkMessageToCivicIssue = asyncHandler(async (req, res) => {
  const { messageId, issueId } = req.body;

  const log = await WhatsappLog.findByIdAndUpdate(
    messageId,
    { linkedCivicIssue: issueId },
    { new: true }
  );

  if (!log) throw new ApiError(404, 'WhatsApp message not found');

  return res.status(200).json(new ApiResponse(200, log, 'Message linked'));
});

export const sendBroadcastMessage = asyncHandler(async (req, res) => {
  const { phoneNumbers, message } = req.body;

  if (!phoneNumbers?.length || !message) {
    throw new ApiError(400, 'phoneNumbers and message are required');
  }

  const results = [];
  for (const phoneNumber of phoneNumbers) {
    try {
      const response = await sendWhatsappMessage(phoneNumber, message);
      results.push({ phoneNumber, status: 'sent', messageId: response?.id });
    } catch (error) {
      results.push({ phoneNumber, status: 'failed', error: error.message });
    }
  }

  return res.status(200).json(
    new ApiResponse(200, {
      results,
      successCount: results.filter((r) => r.status === 'sent').length,
      failureCount: results.filter((r) => r.status === 'failed').length
    }, 'Broadcast sent')
  );
});

// Admin: notify civic issue reporter via WhatsApp on status update
export const notifyReporterStatusUpdate = asyncHandler(async (req, res) => {
  const { issueId, newStatus, note } = req.body;

  const issue = await CivicIssue.findById(issueId).populate('reportedBy', 'phone');
  if (!issue) throw new ApiError(404, 'Civic issue not found');

  const phone = issue.reporterPhone || (issue.reportedBy && issue.reportedBy.phone);

  if (phone) {
    const statusMsg = `🔔 *NagarHelp Update*\n\nYour reported issue "*${issue.title}*" has been updated.\n\n📌 *New Status:* ${newStatus}${note ? `\n📝 *Note:* ${note}` : ''}\n\n📋 *Issue ID:* ${issue._id.toString().slice(-8).toUpperCase()}\n\nThank you for helping improve your city! 🏙️`;
    await sendWhatsappMessage(phone, statusMsg).catch(e => console.error("WA notify error:", e.message));
  }

  issue.status = newStatus;
  if (note) issue.adminNote = note;
  await issue.save();

  return res.status(200).json(new ApiResponse(200, issue, 'Status updated and reporter notified'));
});
