import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

// In-memory OTP store (in production, use Redis)
const otpStore = new Map();

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export const sendOTP = async (req, res) => {
    const { type, contact } = req.body;

    if (!type || !contact) {
        return res.status(400).json({ success: false, message: 'type and contact are required' });
    }

    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpStore.set(contact, { otp, expiresAt, type });

    if (type === 'email') {
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_FROM || `NagarHelp <${process.env.EMAIL_USER}>`,
                to: contact,
                subject: '🔐 Your NagarHelp OTP Code',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f8fafc; border-radius: 12px;">
                        <h2 style="color: #1e40af; margin-bottom: 8px;">NagarHelp Verification</h2>
                        <p style="color: #475569;">Your OTP code is:</p>
                        <div style="font-size: 40px; font-weight: bold; color: #1e293b; letter-spacing: 8px; text-align: center; padding: 24px; background: white; border-radius: 8px; border: 2px dashed #e2e8f0; margin: 16px 0;">
                            ${otp}
                        </div>
                        <p style="color: #94a3b8; font-size: 13px;">This code expires in 10 minutes. Do not share it with anyone.</p>
                        <p style="color: #94a3b8; font-size: 11px;">If you did not request this OTP, please ignore this email.</p>
                    </div>
                `,
            });
            return res.json({ success: true, message: 'OTP sent to email' });
        } catch (error) {
            console.error('Email send error:', error);
            return res.status(500).json({ success: false, message: 'Failed to send OTP email' });
        }
    }

    return res.status(400).json({ success: false, message: 'Invalid OTP type. Use "email".' });
};

export const verifyOTP = async (req, res) => {
    const { contact, otp } = req.body;

    if (!contact || !otp) {
        return res.status(400).json({ success: false, message: 'contact and otp are required' });
    }

    const stored = otpStore.get(contact);

    if (!stored) {
        return res.status(400).json({ success: false, message: 'OTP not found or expired. Please request a new one.' });
    }

    if (Date.now() > stored.expiresAt) {
        otpStore.delete(contact);
        return res.status(400).json({ success: false, message: 'OTP expired. Please request a new one.' });
    }

    if (stored.otp !== otp.toString()) {
        return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
    }

    otpStore.delete(contact);
    return res.json({ success: true, message: 'OTP verified successfully' });
};
