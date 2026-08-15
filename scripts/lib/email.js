const nodemailer = require("nodemailer");

let transporter;
function getTransporter() {
  if (!transporter) {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    if (!user || !pass) throw new Error("GMAIL_USER / GMAIL_APP_PASSWORD not set");
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }
  return transporter;
}

async function sendEmail({ to, subject, html, text }) {
  const info = await getTransporter().sendMail({
    from: `"Exam Signal Board" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, " "),
  });
  return info;
}

module.exports = { sendEmail };
