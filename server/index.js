require('dotenv').config();
const express    = require('express');
const nodemailer = require('nodemailer');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const path       = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

/*  Middleware  */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS — allow requests from the same origin or localhost dev
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
  methods: ['GET', 'POST'],
}));

// Serve the portfolio static files from the parent folder
app.use(express.static(path.join(__dirname, '..')));

/*  Rate Limiter — max 5 form submissions per IP per 15 min  */
const contactLimiter = rateLimit({
  windowMs : 15 * 60 * 1000, // 15 minutes
  max      : 5,
  message  : { ok: false, error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders  : false,
});

/*  Nodemailer Transport  */
function createTransport() {
  // Gmail via App Password (recommended)
  if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS, // Gmail App Password (not your account password)
      },
    });
  }

  // Generic SMTP fallback (e.g. Mailtrap, SendGrid SMTP, etc.)
  return nodemailer.createTransport({
    host  : process.env.SMTP_HOST   || 'smtp.mailtrap.io',
    port  : Number(process.env.SMTP_PORT)  || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth  : {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/*  Input Sanitizer (basic XSS strip)  */
function sanitize(str = '') {
  return String(str)
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim();
}

/*  Validation  */
function validateContactPayload({ name, email, message }) {
  const errors = [];
  if (!name || name.trim().length < 2)
    errors.push('Name must be at least 2 characters.');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.push('A valid email address is required.');
  if (!message || message.trim().length < 10)
    errors.push('Message must be at least 10 characters.');
  return errors;
}

/*  Routes  */

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Serve projects JSON (keeps fetch() working with the server running)
app.get('/api/projects', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'data', 'projects.json'));
});

// Contact form submission
app.post('/api/contact', contactLimiter, async (req, res) => {
  const { name, email, project_type, message } = req.body;

  // Validate
  const errors = validateContactPayload({ name, email, message });
  if (errors.length) {
    return res.status(400).json({ ok: false, errors });
  }

  // Build mail options
  const safeName        = sanitize(name);
  const safeEmail       = sanitize(email);
  const safeProjectType = sanitize(project_type || 'Not specified');
  const safeMessage     = sanitize(message);

  const recipientEmail = process.env.RECIPIENT_EMAIL || process.env.GMAIL_USER || 'mjortizpepito@gmail.com';

  const mailOptions = {
    from   : `"${safeName}" <${process.env.GMAIL_USER || process.env.SMTP_USER}>`,
    to     : recipientEmail,
    replyTo: safeEmail,
    subject: `[Portfolio Contact] New message from ${safeName}`,
    text: [
      `Name:         ${safeName}`,
      `Email:        ${safeEmail}`,
      `Project Type: ${safeProjectType}`,
      '',
      'Message:',
      safeMessage,
    ].join('\n'),
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#0f051a;color:#fbcfe8;padding:32px;border-radius:12px;">
        <h2 style="color:#f472b6;margin-top:0;">✦ New Portfolio Message</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#a78bfa;font-weight:600;width:120px;">Name</td>
            <td style="padding:8px 0;">${safeName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#a78bfa;font-weight:600;">Email</td>
            <td style="padding:8px 0;"><a href="mailto:${safeEmail}" style="color:#f472b6;">${safeEmail}</a></td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#a78bfa;font-weight:600;">Project Type</td>
            <td style="padding:8px 0;">${safeProjectType}</td>
          </tr>
        </table>
        <hr style="border:1px solid rgba(244,114,182,0.2);margin:24px 0;" />
        <h3 style="color:#a78bfa;margin-top:0;">Message</h3>
        <p style="line-height:1.7;white-space:pre-wrap;">${safeMessage}</p>
        <hr style="border:1px solid rgba(244,114,182,0.2);margin:24px 0;" />
        <p style="font-size:0.78rem;color:rgba(251,207,232,0.4);">Sent via Merille Pepito's portfolio contact form</p>
      </div>
    `,
  };

  try {
    const transporter = createTransport();
    const info = await transporter.sendMail(mailOptions);
    console.log(`[contact] Mail sent → ${info.messageId}`);
    return res.json({ ok: true, message: 'Message sent successfully!' });
  } catch (err) {
    console.error('[contact] Mail error:', err.message);
    return res.status(500).json({
      ok   : false,
      error: 'Failed to send message. Please try again or email directly.',
    });
  }
});

// 404 fallback for unknown API routes
app.use('/api/{*splat}', (_req, res) => {
  res.status(404).json({ ok: false, error: 'API route not found.' });
});

// For all other routes
app.get('{*splat}', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

/*  Start  */
app.listen(PORT, () => {
  console.log(`\n✦ Portfolio server running → http://localhost:${PORT}`);
  console.log(`  Static files  : ../  (portfolio root)`);
  console.log(`  API health    : http://localhost:${PORT}/api/health`);
  console.log(`  Contact POST  : http://localhost:${PORT}/api/contact\n`);
});
