import nodemailer from 'nodemailer';
import axios from 'axios';

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Send WhatsApp notification via Whapi.cloud
 */
export const sendWhatsAppNotification = async (phoneNumber, message) => {
  try {
    if (!process.env.WHAPI_TOKEN || !process.env.WHAPI_INSTANCE_URL) {
      console.warn('WhatsApp credentials not configured');
      return { success: false, error: 'WhatsApp not configured' };
    }

    const response = await axios.post(
      `${process.env.WHAPI_INSTANCE_URL}/messages/text`,
      {
        to: phoneNumber.replace('+', ''),
        body: message
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHAPI_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✓ WhatsApp sent to ${phoneNumber}`);
    return { success: true, messageId: response.data.id };
  } catch (error) {
    console.error('WhatsApp send error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send Email notification
 */
export const sendEmailNotification = async (email, subject, htmlContent) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('Email credentials not configured');
      return { success: false, error: 'Email not configured' };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || `NagarHelp <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✓ Email sent to ${email}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send SMS notification via Twilio
 */
export const sendSmsNotification = async (phoneNumber, message) => {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.warn('SMS/Twilio credentials not configured - skipping SMS');
      return { success: false, error: 'Twilio not configured' };
    }

    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });

    console.log(`✓ SMS sent to ${phoneNumber}:`, result.sid);
    return { success: true, messageId: result.sid };
  } catch (error) {
    console.error('SMS send error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Notify admins about new civic issue
 */
export const notifyAdminsAboutNewIssue = async (issue, user) => {
  try {
    const adminPhone = process.env.ADMIN_WHATSAPP_NUMBER;
    const adminEmail = process.env.ADMIN_EMAIL;

    // Create notification messages
    const issueTitle = issue.title || 'New Civic Issue';
    const category = issue.category || 'General';
    const location = issue.location?.address || 'Unknown Location';
    const reportedBy = user?.name || 'Anonymous';

    const whatsappMessage = `🚨 *New Civic Issue Report*\n\n*Issue:* ${issueTitle}\n*Category:* ${category}\n*Location:* ${location}\n*Reported By:* ${reportedBy}\n\nReview: NagarHelp App`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
        <div style="background: white; padding: 20px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 3px solid #2563eb; padding-bottom: 10px;">🚨 New Civic Issue Report</h2>
          <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; font-weight: bold; color: #555; width: 30%;">Issue:</td>
              <td style="padding: 8px; color: #333;">${issueTitle}</td>
            </tr>
            <tr style="background: #f9f9f9;">
              <td style="padding: 8px; font-weight: bold; color: #555;">Category:</td>
              <td style="padding: 8px; color: #333;">${category}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold; color: #555;">Location:</td>
              <td style="padding: 8px; color: #333;">${location}</td>
            </tr>
            <tr style="background: #f9f9f9;">
              <td style="padding: 8px; font-weight: bold; color: #555;">Reported By:</td>
              <td style="padding: 8px; color: #333;">${reportedBy}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold; color: #555;">Time:</td>
              <td style="padding: 8px; color: #333;">${new Date().toLocaleString()}</td>
            </tr>
          </table>
          <p style="color: #666; font-size: 14px; margin-top: 20px;">
            <a href="${process.env.FRONTEND_URL}" style="color: #2563eb; text-decoration: none; font-weight: bold;">View in Dashboard →</a>
          </p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">NagarHelp Admin Notification</p>
        </div>
      </div>
    `;

    const results = {};

    // Send WhatsApp notification
    if (adminPhone) {
      results.whatsapp = await sendWhatsAppNotification(adminPhone, whatsappMessage);
    }

    // Send Email notification
    if (adminEmail) {
      results.email = await sendEmailNotification(adminEmail, `🚨 New Civic Issue: ${issueTitle}`, emailHtml);
    }

    // Send SMS if configured
    if (adminPhone && process.env.TWILIO_ACCOUNT_SID) {
      results.sms = await sendSmsNotification(adminPhone, `New civic issue: ${issueTitle} at ${location}`);
    }

    console.log('Admin notifications sent:', results);
    return results;
  } catch (error) {
    console.error('Error notifying admins:', error.message);
    return { error: error.message };
  }
};

/**
 * Notify user about issue confirmation
 */
export const notifyUserAboutSubmission = async (user, issue) => {
  try {
    const userPhone = user?.phone;
    const userEmail = user?.email;

    const confirmationMessage = `✅ Your civic issue has been reported!\n\n*Title:* ${issue.title}\n*Reference ID:* ${issue._id}\n*Status:* Pending Review\n\nThank you for helping improve your city!\n- NagarHelp Team`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
        <div style="background: white; padding: 20px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981; border-bottom: 3px solid #10b981; padding-bottom: 10px;">✅ Issue Reported Successfully</h2>
          <p style="color: #333; font-size: 16px;">Thank you for reporting this civic issue! Your contribution helps us make the city better.</p>
          <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Reference ID:</strong> ${issue._id}</p>
            <p style="margin: 5px 0;"><strong>Issue:</strong> ${issue.title}</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> Pending Review</p>
          </div>
          <p style="color: #666; font-size: 14px;">You'll receive updates as the issue progresses.</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">NagarHelp Team</p>
        </div>
      </div>
    `;

    const results = {};

    // Send WhatsApp confirmation
    if (userPhone && userPhone.startsWith('+')) {
      results.whatsapp = await sendWhatsAppNotification(userPhone, confirmationMessage);
    }

    // Send Email confirmation
    if (userEmail) {
      results.email = await sendEmailNotification(userEmail, '✅ Civic Issue Reported - ' + issue.title, emailHtml);
    }

    console.log('User notifications sent:', results);
    return results;
  } catch (error) {
    console.error('Error notifying user:', error.message);
    return { error: error.message };
  }
};

export default {
  sendWhatsAppNotification,
  sendEmailNotification,
  sendSmsNotification,
  notifyAdminsAboutNewIssue,
  notifyUserAboutSubmission
};
